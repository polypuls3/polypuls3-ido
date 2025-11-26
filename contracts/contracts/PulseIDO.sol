// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PulseIDO
 * @dev Configurable IDO contract with dynamic pools and vesting schedules
 * @notice Manages token sales with tiered vesting (TGE unlock + cliff + linear vesting)
 */
contract PulseIDO is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct VestingSchedule {
        uint256 tgePercent;      // Percentage unlocked at TGE (0-100)
        uint256 cliffDuration;   // Cliff period in seconds
        uint256 vestingDuration; // Linear vesting duration in seconds
    }

    struct Pool {
        string name;              // Pool name (e.g., "Seed Sale")
        uint256 totalAllocated;   // Total tokens allocated in this pool
        uint256 totalClaimed;     // Total tokens claimed from this pool
        uint256 pricePerToken;    // Price in payment token (6 decimals for USDC)
        uint256 hardCap;          // Maximum tokens that can be allocated
        VestingSchedule vesting;  // Vesting schedule for this pool
        bool isPurchasable;       // Can users contribute directly?
        bool isActive;            // Is the pool currently accepting contributions?
    }

    struct Allocation {
        uint256 totalAmount;       // Total tokens allocated to user
        uint256 claimedAmount;     // Tokens already claimed
        uint256 contributedAmount; // Payment tokens contributed
        uint256 allocationTime;    // Timestamp of allocation
    }

    // ============ State Variables ============

    IERC20 public saleToken;      // Token being sold (PULSE)
    IERC20 public paymentToken;   // Token used for payment (USDC/USDT)
    address public treasury;       // Address receiving sale proceeds

    uint256 public tgeTime;        // Token Generation Event timestamp
    bool public isInitialized;     // Prevents re-initialization

    Pool[] public pools;           // Array of all pools

    // poolId => user => allocation
    mapping(uint256 => mapping(address => Allocation)) public allocations;

    // poolId => participant count
    mapping(uint256 => uint256) public participantCounts;

    // poolId => user => has allocation (for counting)
    mapping(uint256 => mapping(address => bool)) private hasAllocation;

    // ============ Events ============

    event Initialized(address saleToken, address paymentToken, address treasury);
    event PoolAdded(uint256 indexed poolId, string name, uint256 hardCap, bool isPurchasable);
    event PoolStatusChanged(uint256 indexed poolId, bool isActive);
    event Contribution(uint256 indexed poolId, address indexed user, uint256 paymentAmount, uint256 tokenAmount);
    event AllocationAdded(uint256 indexed poolId, address indexed user, uint256 amount);
    event TokensClaimed(uint256 indexed poolId, address indexed user, uint256 amount);
    event TGETimeSet(uint256 tgeTime);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event TokensWithdrawn(address indexed to, uint256 amount);

    // ============ Modifiers ============

    modifier onlyInitialized() {
        require(isInitialized, "PulseIDO: not initialized");
        _;
    }

    modifier validPool(uint256 poolId) {
        require(poolId < pools.length, "PulseIDO: invalid pool ID");
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Initialization ============

    /**
     * @dev Initialize the IDO contract with token addresses
     * @param _saleToken Address of the token being sold
     * @param _paymentToken Address of the payment token (USDC/USDT)
     * @param _treasury Address to receive sale proceeds
     */
    function initialize(
        address _saleToken,
        address _paymentToken,
        address _treasury
    ) external onlyOwner {
        require(!isInitialized, "PulseIDO: already initialized");
        require(_saleToken != address(0), "PulseIDO: sale token is zero address");
        require(_paymentToken != address(0), "PulseIDO: payment token is zero address");
        require(_treasury != address(0), "PulseIDO: treasury is zero address");

        saleToken = IERC20(_saleToken);
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
        isInitialized = true;

        emit Initialized(_saleToken, _paymentToken, _treasury);
    }

    // ============ Pool Management (Owner) ============

    /**
     * @dev Add a new pool with custom vesting schedule
     * @param _name Pool name
     * @param _pricePerToken Price per token in payment token units (0 for non-purchasable pools)
     * @param _hardCap Maximum tokens for this pool
     * @param _tgePercent Percentage unlocked at TGE (0-100)
     * @param _cliffDuration Cliff period in seconds
     * @param _vestingDuration Linear vesting duration in seconds
     * @param _isPurchasable Whether users can contribute directly
     */
    function addPool(
        string calldata _name,
        uint256 _pricePerToken,
        uint256 _hardCap,
        uint256 _tgePercent,
        uint256 _cliffDuration,
        uint256 _vestingDuration,
        bool _isPurchasable
    ) external onlyOwner onlyInitialized {
        require(_hardCap > 0, "PulseIDO: hard cap must be greater than 0");
        require(_tgePercent <= 100, "PulseIDO: TGE percent must be <= 100");

        if (_isPurchasable) {
            require(_pricePerToken > 0, "PulseIDO: purchasable pool must have price > 0");
        }

        Pool memory newPool = Pool({
            name: _name,
            totalAllocated: 0,
            totalClaimed: 0,
            pricePerToken: _pricePerToken,
            hardCap: _hardCap,
            vesting: VestingSchedule({
                tgePercent: _tgePercent,
                cliffDuration: _cliffDuration,
                vestingDuration: _vestingDuration
            }),
            isPurchasable: _isPurchasable,
            isActive: false
        });

        pools.push(newPool);
        uint256 poolId = pools.length - 1;

        emit PoolAdded(poolId, _name, _hardCap, _isPurchasable);
    }

    /**
     * @dev Set pool active status
     * @param poolId Pool ID
     * @param _isActive New active status
     */
    function setPoolActive(uint256 poolId, bool _isActive) external onlyOwner validPool(poolId) {
        pools[poolId].isActive = _isActive;
        emit PoolStatusChanged(poolId, _isActive);
    }

    /**
     * @dev Set the TGE (Token Generation Event) timestamp
     * @param _tgeTime Unix timestamp for TGE
     */
    function setTGETime(uint256 _tgeTime) external onlyOwner {
        require(_tgeTime > 0, "PulseIDO: TGE time must be greater than 0");
        tgeTime = _tgeTime;
        emit TGETimeSet(_tgeTime);
    }

    // ============ User Contributions ============

    /**
     * @dev Contribute to a purchasable pool
     * @param poolId Pool ID to contribute to
     * @param paymentAmount Amount of payment tokens to contribute
     */
    function contribute(
        uint256 poolId,
        uint256 paymentAmount
    ) external nonReentrant whenNotPaused onlyInitialized validPool(poolId) {
        Pool storage pool = pools[poolId];

        require(pool.isPurchasable, "PulseIDO: pool is not purchasable");
        require(pool.isActive, "PulseIDO: pool is not active");
        require(paymentAmount > 0, "PulseIDO: payment amount must be greater than 0");

        // Calculate token amount (payment token has 6 decimals, sale token has 18 decimals)
        // pricePerToken is in 6 decimals (e.g., 10000 = $0.01)
        // tokenAmount = paymentAmount * 10^18 / pricePerToken
        uint256 tokenAmount = (paymentAmount * 1e18) / pool.pricePerToken;

        require(
            pool.totalAllocated + tokenAmount <= pool.hardCap,
            "PulseIDO: exceeds pool hard cap"
        );

        // Transfer payment tokens from user to this contract
        paymentToken.safeTransferFrom(msg.sender, address(this), paymentAmount);

        // Update allocation
        Allocation storage allocation = allocations[poolId][msg.sender];

        if (!hasAllocation[poolId][msg.sender]) {
            hasAllocation[poolId][msg.sender] = true;
            participantCounts[poolId]++;
        }

        allocation.totalAmount += tokenAmount;
        allocation.contributedAmount += paymentAmount;
        if (allocation.allocationTime == 0) {
            allocation.allocationTime = block.timestamp;
        }

        // Update pool totals
        pool.totalAllocated += tokenAmount;

        emit Contribution(poolId, msg.sender, paymentAmount, tokenAmount);
    }

    // ============ Admin Allocations ============

    /**
     * @dev Add allocation for a user (admin function for team, advisors, etc.)
     * @param poolId Pool ID
     * @param user User address
     * @param amount Token amount to allocate
     */
    function addAllocation(
        uint256 poolId,
        address user,
        uint256 amount
    ) external onlyOwner onlyInitialized validPool(poolId) {
        require(user != address(0), "PulseIDO: user is zero address");
        require(amount > 0, "PulseIDO: amount must be greater than 0");

        Pool storage pool = pools[poolId];
        require(
            pool.totalAllocated + amount <= pool.hardCap,
            "PulseIDO: exceeds pool hard cap"
        );

        Allocation storage allocation = allocations[poolId][user];

        if (!hasAllocation[poolId][user]) {
            hasAllocation[poolId][user] = true;
            participantCounts[poolId]++;
        }

        allocation.totalAmount += amount;
        if (allocation.allocationTime == 0) {
            allocation.allocationTime = block.timestamp;
        }

        pool.totalAllocated += amount;

        emit AllocationAdded(poolId, user, amount);
    }

    /**
     * @dev Batch add allocations for multiple users
     * @param poolId Pool ID
     * @param users Array of user addresses
     * @param amounts Array of token amounts
     */
    function batchAddAllocation(
        uint256 poolId,
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyOwner onlyInitialized validPool(poolId) {
        require(users.length == amounts.length, "PulseIDO: arrays length mismatch");
        require(users.length > 0, "PulseIDO: empty arrays");

        Pool storage pool = pools[poolId];
        uint256 totalToAllocate = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            totalToAllocate += amounts[i];
        }

        require(
            pool.totalAllocated + totalToAllocate <= pool.hardCap,
            "PulseIDO: exceeds pool hard cap"
        );

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amount = amounts[i];

            require(user != address(0), "PulseIDO: user is zero address");
            require(amount > 0, "PulseIDO: amount must be greater than 0");

            Allocation storage allocation = allocations[poolId][user];

            if (!hasAllocation[poolId][user]) {
                hasAllocation[poolId][user] = true;
                participantCounts[poolId]++;
            }

            allocation.totalAmount += amount;
            if (allocation.allocationTime == 0) {
                allocation.allocationTime = block.timestamp;
            }

            pool.totalAllocated += amount;

            emit AllocationAdded(poolId, user, amount);
        }
    }

    // ============ Token Claiming ============

    /**
     * @dev Claim vested tokens from a pool
     * @param poolId Pool ID to claim from
     */
    function claimTokens(uint256 poolId) external nonReentrant whenNotPaused onlyInitialized validPool(poolId) {
        require(tgeTime > 0 && block.timestamp >= tgeTime, "PulseIDO: TGE not started");

        Allocation storage allocation = allocations[poolId][msg.sender];
        require(allocation.totalAmount > 0, "PulseIDO: no allocation");

        uint256 vestedAmount = _calculateVestedAmount(poolId, msg.sender);
        uint256 claimableAmount = vestedAmount - allocation.claimedAmount;

        require(claimableAmount > 0, "PulseIDO: nothing to claim");

        allocation.claimedAmount += claimableAmount;
        pools[poolId].totalClaimed += claimableAmount;

        saleToken.safeTransfer(msg.sender, claimableAmount);

        emit TokensClaimed(poolId, msg.sender, claimableAmount);
    }

    /**
     * @dev Claim tokens from all pools
     */
    function claimAllTokens() external nonReentrant whenNotPaused onlyInitialized {
        require(tgeTime > 0 && block.timestamp >= tgeTime, "PulseIDO: TGE not started");

        uint256 totalClaimed = 0;

        for (uint256 poolId = 0; poolId < pools.length; poolId++) {
            Allocation storage allocation = allocations[poolId][msg.sender];

            if (allocation.totalAmount == 0) continue;

            uint256 vestedAmount = _calculateVestedAmount(poolId, msg.sender);
            uint256 claimableAmount = vestedAmount - allocation.claimedAmount;

            if (claimableAmount > 0) {
                allocation.claimedAmount += claimableAmount;
                pools[poolId].totalClaimed += claimableAmount;
                totalClaimed += claimableAmount;

                emit TokensClaimed(poolId, msg.sender, claimableAmount);
            }
        }

        require(totalClaimed > 0, "PulseIDO: nothing to claim");
        saleToken.safeTransfer(msg.sender, totalClaimed);
    }

    // ============ Vesting Calculation ============

    /**
     * @dev Calculate vested amount for a user in a pool
     * @param poolId Pool ID
     * @param user User address
     * @return Vested token amount
     */
    function _calculateVestedAmount(uint256 poolId, address user) internal view returns (uint256) {
        Allocation memory allocation = allocations[poolId][user];
        Pool memory pool = pools[poolId];

        if (allocation.totalAmount == 0) return 0;
        if (tgeTime == 0 || block.timestamp < tgeTime) return 0;

        // Calculate TGE unlock amount
        uint256 tgeAmount = (allocation.totalAmount * pool.vesting.tgePercent) / 100;

        // If still in cliff period, only TGE amount is vested
        uint256 cliffEnd = tgeTime + pool.vesting.cliffDuration;
        if (block.timestamp < cliffEnd) return tgeAmount;

        // If vesting duration is 0, everything is unlocked after cliff
        if (pool.vesting.vestingDuration == 0) return allocation.totalAmount;

        // Calculate linear vesting
        uint256 vestingEnd = cliffEnd + pool.vesting.vestingDuration;
        if (block.timestamp >= vestingEnd) return allocation.totalAmount;

        // Calculate proportional vesting
        uint256 timeSinceCliff = block.timestamp - cliffEnd;
        uint256 linearAmount = allocation.totalAmount - tgeAmount;
        uint256 vestedLinear = (linearAmount * timeSinceCliff) / pool.vesting.vestingDuration;

        return tgeAmount + vestedLinear;
    }

    // ============ View Functions ============

    /**
     * @dev Get number of pools
     */
    function getPoolCount() external view returns (uint256) {
        return pools.length;
    }

    /**
     * @dev Get pool details
     * @param poolId Pool ID
     */
    function getPool(uint256 poolId) external view validPool(poolId) returns (Pool memory) {
        return pools[poolId];
    }

    /**
     * @dev Get all pools
     */
    function getAllPools() external view returns (Pool[] memory) {
        return pools;
    }

    /**
     * @dev Get user allocation in a pool
     * @param poolId Pool ID
     * @param user User address
     */
    function getUserAllocation(uint256 poolId, address user) external view validPool(poolId) returns (Allocation memory) {
        return allocations[poolId][user];
    }

    /**
     * @dev Get all allocations for a user across all pools
     * @param user User address
     */
    function getAllUserAllocations(address user) external view returns (Allocation[] memory) {
        Allocation[] memory userAllocations = new Allocation[](pools.length);
        for (uint256 i = 0; i < pools.length; i++) {
            userAllocations[i] = allocations[i][user];
        }
        return userAllocations;
    }

    /**
     * @dev Get vested amount for a user in a pool
     * @param poolId Pool ID
     * @param user User address
     */
    function getVestedAmount(uint256 poolId, address user) external view validPool(poolId) returns (uint256) {
        return _calculateVestedAmount(poolId, user);
    }

    /**
     * @dev Get claimable amount for a user in a pool
     * @param poolId Pool ID
     * @param user User address
     */
    function getClaimableAmount(uint256 poolId, address user) external view validPool(poolId) returns (uint256) {
        Allocation memory allocation = allocations[poolId][user];
        if (allocation.totalAmount == 0) return 0;

        uint256 vestedAmount = _calculateVestedAmount(poolId, user);
        return vestedAmount > allocation.claimedAmount ? vestedAmount - allocation.claimedAmount : 0;
    }

    /**
     * @dev Get total claimable amount across all pools for a user
     * @param user User address
     */
    function getTotalClaimableAmount(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            Allocation memory allocation = allocations[i][user];
            if (allocation.totalAmount == 0) continue;

            uint256 vestedAmount = _calculateVestedAmount(i, user);
            if (vestedAmount > allocation.claimedAmount) {
                total += vestedAmount - allocation.claimedAmount;
            }
        }
        return total;
    }

    /**
     * @dev Get vesting status for a user in a pool
     * @param poolId Pool ID
     * @param user User address
     */
    function getVestingStatus(
        uint256 poolId,
        address user
    ) external view validPool(poolId) returns (
        uint256 totalAmount,
        uint256 vestedAmount,
        uint256 claimedAmount,
        uint256 claimableAmount,
        uint256 vestingPercentage
    ) {
        Allocation memory allocation = allocations[poolId][user];

        totalAmount = allocation.totalAmount;
        vestedAmount = _calculateVestedAmount(poolId, user);
        claimedAmount = allocation.claimedAmount;
        claimableAmount = vestedAmount > claimedAmount ? vestedAmount - claimedAmount : 0;
        vestingPercentage = totalAmount > 0 ? (vestedAmount * 100) / totalAmount : 0;
    }

    // ============ Admin Functions ============

    /**
     * @dev Withdraw accumulated payment tokens to treasury
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "PulseIDO: no funds to withdraw");

        paymentToken.safeTransfer(treasury, balance);
        emit FundsWithdrawn(treasury, balance);
    }

    /**
     * @dev Withdraw unsold/unclaimed sale tokens
     * @param amount Amount to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseIDO: amount must be greater than 0");

        uint256 balance = saleToken.balanceOf(address(this));
        require(balance >= amount, "PulseIDO: insufficient balance");

        saleToken.safeTransfer(owner(), amount);
        emit TokensWithdrawn(owner(), amount);
    }

    /**
     * @dev Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "PulseIDO: treasury is zero address");
        treasury = _treasury;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
