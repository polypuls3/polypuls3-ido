// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title PulseSwapV1
 * @dev A simple fixed-rate token swap contract for PULSE tokens.
 * Allows bidirectional swaps between PULSE and USDC at admin-set rates.
 * Includes a configurable swap fee.
 * Uses UUPS upgradeable pattern.
 */
contract PulseSwapV1 is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // Token addresses
    IERC20 public pulseToken;
    IERC20 public usdcToken;

    // Exchange rates (scaled)
    // usdcRate: USDC amount per PULSE (scaled by 1e6, since USDC has 6 decimals)
    // Example: 10000 = 0.01 USDC per PULSE
    uint256 public usdcRate;

    // Swap fee in basis points (100 = 1%, 250 = 2.5%)
    uint256 public swapFeeBps;
    uint256 public constant MAX_FEE_BPS = 1000; // Max 10% fee
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Accumulated fees
    uint256 public accumulatedPulseFees;
    uint256 public accumulatedUsdcFees;

    // Events
    event SwapPulseForUsdc(address indexed user, uint256 pulseAmount, uint256 usdcAmount, uint256 fee);
    event SwapUsdcForPulse(address indexed user, uint256 usdcAmount, uint256 pulseAmount, uint256 fee);
    event UsdcRateUpdated(uint256 oldRate, uint256 newRate);
    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);
    event PulseDeposited(uint256 amount);
    event UsdcDeposited(uint256 amount);
    event PulseWithdrawn(uint256 amount);
    event UsdcWithdrawn(uint256 amount);
    event FeesWithdrawn(uint256 pulseAmount, uint256 usdcAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract (replaces constructor for upgradeable contracts)
     */
    function initialize(
        address _pulseToken,
        address _usdcToken,
        uint256 _initialUsdcRate,
        uint256 _initialSwapFeeBps
    ) public initializer {
        require(_pulseToken != address(0), "PulseSwap: Invalid PULSE address");
        require(_usdcToken != address(0), "PulseSwap: Invalid USDC address");
        require(_initialUsdcRate > 0, "PulseSwap: USDC rate must be > 0");
        require(_initialSwapFeeBps <= MAX_FEE_BPS, "PulseSwap: Fee too high");

        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        pulseToken = IERC20(_pulseToken);
        usdcToken = IERC20(_usdcToken);
        usdcRate = _initialUsdcRate;
        swapFeeBps = _initialSwapFeeBps;
    }

    /**
     * @dev Required by UUPS pattern - only owner can upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Returns the contract version
     */
    function version() public pure virtual returns (string memory) {
        return "1.0.0";
    }

    // ============ User Swap Functions ============

    /**
     * @dev Swap PULSE tokens for USDC
     * @param pulseAmount Amount of PULSE to swap
     */
    function swapPulseForUsdc(uint256 pulseAmount) external whenNotPaused nonReentrant {
        require(pulseAmount > 0, "PulseSwap: Amount must be > 0");

        // Calculate gross USDC output (before fee)
        uint256 grossUsdcAmount = calculateUsdcOutputGross(pulseAmount);
        require(grossUsdcAmount > 0, "PulseSwap: Output amount too small");

        // Calculate fee (deducted from output)
        uint256 fee = (grossUsdcAmount * swapFeeBps) / BPS_DENOMINATOR;
        uint256 netUsdcAmount = grossUsdcAmount - fee;

        require(usdcToken.balanceOf(address(this)) >= grossUsdcAmount, "PulseSwap: Insufficient USDC liquidity");

        // Transfer PULSE from user to contract
        pulseToken.safeTransferFrom(msg.sender, address(this), pulseAmount);

        // Track fee
        accumulatedUsdcFees += fee;

        // Transfer net USDC to user
        usdcToken.safeTransfer(msg.sender, netUsdcAmount);

        emit SwapPulseForUsdc(msg.sender, pulseAmount, netUsdcAmount, fee);
    }

    /**
     * @dev Swap USDC for PULSE tokens
     * @param usdcAmount Amount of USDC to swap
     */
    function swapUsdcForPulse(uint256 usdcAmount) external whenNotPaused nonReentrant {
        require(usdcAmount > 0, "PulseSwap: Amount must be > 0");

        // Calculate gross PULSE output (before fee)
        uint256 grossPulseAmount = calculatePulseOutputGross(usdcAmount);
        require(grossPulseAmount > 0, "PulseSwap: Output amount too small");

        // Calculate fee (deducted from output)
        uint256 fee = (grossPulseAmount * swapFeeBps) / BPS_DENOMINATOR;
        uint256 netPulseAmount = grossPulseAmount - fee;

        require(pulseToken.balanceOf(address(this)) >= grossPulseAmount, "PulseSwap: Insufficient PULSE liquidity");

        // Transfer USDC from user to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Track fee
        accumulatedPulseFees += fee;

        // Transfer net PULSE to user
        pulseToken.safeTransfer(msg.sender, netPulseAmount);

        emit SwapUsdcForPulse(msg.sender, usdcAmount, netPulseAmount, fee);
    }

    // ============ View Functions ============

    /**
     * @dev Calculate gross USDC output (before fee) for a given PULSE amount
     * @param pulseAmount Amount of PULSE to swap
     * @return USDC amount before fee deduction
     */
    function calculateUsdcOutputGross(uint256 pulseAmount) public view returns (uint256) {
        // PULSE has 18 decimals, USDC has 6 decimals
        // usdcRate is USDC per PULSE (scaled by 1e6)
        // Formula: (pulseAmount * usdcRate) / 1e18
        return (pulseAmount * usdcRate) / 1e18;
    }

    /**
     * @dev Calculate net USDC output (after fee) for a given PULSE amount
     * @param pulseAmount Amount of PULSE to swap
     * @return USDC amount user will actually receive
     */
    function calculateUsdcOutput(uint256 pulseAmount) public view returns (uint256) {
        uint256 grossAmount = calculateUsdcOutputGross(pulseAmount);
        uint256 fee = (grossAmount * swapFeeBps) / BPS_DENOMINATOR;
        return grossAmount - fee;
    }

    /**
     * @dev Calculate gross PULSE output (before fee) for a given USDC amount
     * @param usdcAmount Amount of USDC to swap
     * @return PULSE amount before fee deduction
     */
    function calculatePulseOutputGross(uint256 usdcAmount) public view returns (uint256) {
        // Inverse of calculateUsdcOutputGross
        // Formula: (usdcAmount * 1e18) / usdcRate
        require(usdcRate > 0, "PulseSwap: USDC rate not set");
        return (usdcAmount * 1e18) / usdcRate;
    }

    /**
     * @dev Calculate net PULSE output (after fee) for a given USDC amount
     * @param usdcAmount Amount of USDC to swap
     * @return PULSE amount user will actually receive
     */
    function calculatePulseOutputFromUsdc(uint256 usdcAmount) public view returns (uint256) {
        uint256 grossAmount = calculatePulseOutputGross(usdcAmount);
        uint256 fee = (grossAmount * swapFeeBps) / BPS_DENOMINATOR;
        return grossAmount - fee;
    }

    /**
     * @dev Calculate fee amount for a given output
     * @param amount The gross output amount
     * @return Fee amount that will be deducted
     */
    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * swapFeeBps) / BPS_DENOMINATOR;
    }

    /**
     * @dev Get contract's PULSE balance (excluding accumulated fees)
     */
    function getPulseBalance() external view returns (uint256) {
        uint256 total = pulseToken.balanceOf(address(this));
        return total > accumulatedPulseFees ? total - accumulatedPulseFees : 0;
    }

    /**
     * @dev Get contract's USDC balance (excluding accumulated fees)
     */
    function getUsdcBalance() external view returns (uint256) {
        uint256 total = usdcToken.balanceOf(address(this));
        return total > accumulatedUsdcFees ? total - accumulatedUsdcFees : 0;
    }

    /**
     * @dev Get accumulated fees
     */
    function getAccumulatedFees() external view returns (uint256 pulseFees, uint256 usdcFees) {
        return (accumulatedPulseFees, accumulatedUsdcFees);
    }

    // ============ Admin Functions ============

    /**
     * @dev Set USDC exchange rate
     * @param _rate New USDC rate (USDC per PULSE, scaled by 1e6)
     */
    function setUsdcRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "PulseSwap: Rate must be > 0");
        uint256 oldRate = usdcRate;
        usdcRate = _rate;
        emit UsdcRateUpdated(oldRate, _rate);
    }

    /**
     * @dev Set swap fee in basis points
     * @param _feeBps New fee in basis points (250 = 2.5%)
     */
    function setSwapFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "PulseSwap: Fee too high");
        uint256 oldFee = swapFeeBps;
        swapFeeBps = _feeBps;
        emit SwapFeeUpdated(oldFee, _feeBps);
    }

    /**
     * @dev Withdraw accumulated fees to owner
     */
    function withdrawFees() external onlyOwner {
        uint256 pulseFees = accumulatedPulseFees;
        uint256 usdcFees = accumulatedUsdcFees;

        accumulatedPulseFees = 0;
        accumulatedUsdcFees = 0;

        if (pulseFees > 0) {
            pulseToken.safeTransfer(msg.sender, pulseFees);
        }
        if (usdcFees > 0) {
            usdcToken.safeTransfer(msg.sender, usdcFees);
        }

        emit FeesWithdrawn(pulseFees, usdcFees);
    }

    /**
     * @dev Deposit PULSE tokens into the contract
     * @param amount Amount of PULSE to deposit
     */
    function depositPulse(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        pulseToken.safeTransferFrom(msg.sender, address(this), amount);
        emit PulseDeposited(amount);
    }

    /**
     * @dev Deposit USDC tokens into the contract
     * @param amount Amount of USDC to deposit
     */
    function depositUsdc(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        emit UsdcDeposited(amount);
    }

    /**
     * @dev Withdraw PULSE tokens from the contract
     * @param amount Amount of PULSE to withdraw
     */
    function withdrawPulse(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        uint256 available = pulseToken.balanceOf(address(this)) - accumulatedPulseFees;
        require(available >= amount, "PulseSwap: Insufficient balance");
        pulseToken.safeTransfer(msg.sender, amount);
        emit PulseWithdrawn(amount);
    }

    /**
     * @dev Withdraw USDC tokens from the contract
     * @param amount Amount of USDC to withdraw
     */
    function withdrawUsdc(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        uint256 available = usdcToken.balanceOf(address(this)) - accumulatedUsdcFees;
        require(available >= amount, "PulseSwap: Insufficient balance");
        usdcToken.safeTransfer(msg.sender, amount);
        emit UsdcWithdrawn(amount);
    }

    /**
     * @dev Pause all swap functions
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause all swap functions
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw all tokens to owner
     */
    function emergencyWithdrawAll() external onlyOwner {
        uint256 pulseBalance = pulseToken.balanceOf(address(this));
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        // Reset accumulated fees since we're withdrawing everything
        accumulatedPulseFees = 0;
        accumulatedUsdcFees = 0;

        if (pulseBalance > 0) {
            pulseToken.safeTransfer(msg.sender, pulseBalance);
        }
        if (usdcBalance > 0) {
            usdcToken.safeTransfer(msg.sender, usdcBalance);
        }
    }
}
