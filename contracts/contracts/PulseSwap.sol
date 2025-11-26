// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PulseSwap
 * @dev A simple fixed-rate token swap contract for PULSE tokens.
 * Allows bidirectional swaps between PULSE and USDC/POL at admin-set rates.
 */
contract PulseSwap is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Token addresses
    IERC20 public immutable pulseToken;
    IERC20 public immutable usdcToken;

    // Exchange rates (scaled)
    // usdcRate: USDC amount per PULSE (scaled by 1e6, since USDC has 6 decimals)
    // Example: 10000 = 0.01 USDC per PULSE
    uint256 public usdcRate;

    // polRate: POL wei per PULSE (scaled by 1e18)
    // Example: 1e16 = 0.01 POL per PULSE
    uint256 public polRate;

    // Events
    event SwapPulseForUsdc(address indexed user, uint256 pulseAmount, uint256 usdcAmount);
    event SwapUsdcForPulse(address indexed user, uint256 usdcAmount, uint256 pulseAmount);
    event SwapPulseForPol(address indexed user, uint256 pulseAmount, uint256 polAmount);
    event SwapPolForPulse(address indexed user, uint256 polAmount, uint256 pulseAmount);
    event UsdcRateUpdated(uint256 oldRate, uint256 newRate);
    event PolRateUpdated(uint256 oldRate, uint256 newRate);
    event PulseDeposited(uint256 amount);
    event UsdcDeposited(uint256 amount);
    event PolDeposited(uint256 amount);
    event PulseWithdrawn(uint256 amount);
    event UsdcWithdrawn(uint256 amount);
    event PolWithdrawn(uint256 amount);

    constructor(
        address _pulseToken,
        address _usdcToken,
        uint256 _initialUsdcRate,
        uint256 _initialPolRate
    ) Ownable(msg.sender) {
        require(_pulseToken != address(0), "PulseSwap: Invalid PULSE address");
        require(_usdcToken != address(0), "PulseSwap: Invalid USDC address");
        require(_initialUsdcRate > 0, "PulseSwap: USDC rate must be > 0");
        require(_initialPolRate > 0, "PulseSwap: POL rate must be > 0");

        pulseToken = IERC20(_pulseToken);
        usdcToken = IERC20(_usdcToken);
        usdcRate = _initialUsdcRate;
        polRate = _initialPolRate;
    }

    // ============ User Swap Functions ============

    /**
     * @dev Swap PULSE tokens for USDC
     * @param pulseAmount Amount of PULSE to swap
     */
    function swapPulseForUsdc(uint256 pulseAmount) external whenNotPaused nonReentrant {
        require(pulseAmount > 0, "PulseSwap: Amount must be > 0");

        uint256 usdcAmount = calculateUsdcOutput(pulseAmount);
        require(usdcAmount > 0, "PulseSwap: Output amount too small");
        require(usdcToken.balanceOf(address(this)) >= usdcAmount, "PulseSwap: Insufficient USDC liquidity");

        // Transfer PULSE from user to contract
        pulseToken.safeTransferFrom(msg.sender, address(this), pulseAmount);

        // Transfer USDC to user
        usdcToken.safeTransfer(msg.sender, usdcAmount);

        emit SwapPulseForUsdc(msg.sender, pulseAmount, usdcAmount);
    }

    /**
     * @dev Swap USDC for PULSE tokens
     * @param usdcAmount Amount of USDC to swap
     */
    function swapUsdcForPulse(uint256 usdcAmount) external whenNotPaused nonReentrant {
        require(usdcAmount > 0, "PulseSwap: Amount must be > 0");

        uint256 pulseAmount = calculatePulseOutputFromUsdc(usdcAmount);
        require(pulseAmount > 0, "PulseSwap: Output amount too small");
        require(pulseToken.balanceOf(address(this)) >= pulseAmount, "PulseSwap: Insufficient PULSE liquidity");

        // Transfer USDC from user to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Transfer PULSE to user
        pulseToken.safeTransfer(msg.sender, pulseAmount);

        emit SwapUsdcForPulse(msg.sender, usdcAmount, pulseAmount);
    }

    /**
     * @dev Swap PULSE tokens for POL (native token)
     * @param pulseAmount Amount of PULSE to swap
     */
    function swapPulseForPol(uint256 pulseAmount) external whenNotPaused nonReentrant {
        require(pulseAmount > 0, "PulseSwap: Amount must be > 0");

        uint256 polAmount = calculatePolOutput(pulseAmount);
        require(polAmount > 0, "PulseSwap: Output amount too small");
        require(address(this).balance >= polAmount, "PulseSwap: Insufficient POL liquidity");

        // Transfer PULSE from user to contract
        pulseToken.safeTransferFrom(msg.sender, address(this), pulseAmount);

        // Transfer POL to user
        (bool success, ) = payable(msg.sender).call{value: polAmount}("");
        require(success, "PulseSwap: POL transfer failed");

        emit SwapPulseForPol(msg.sender, pulseAmount, polAmount);
    }

    /**
     * @dev Swap POL (native token) for PULSE tokens
     * POL amount is sent as msg.value
     */
    function swapPolForPulse() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "PulseSwap: Amount must be > 0");

        uint256 pulseAmount = calculatePulseOutputFromPol(msg.value);
        require(pulseAmount > 0, "PulseSwap: Output amount too small");
        require(pulseToken.balanceOf(address(this)) >= pulseAmount, "PulseSwap: Insufficient PULSE liquidity");

        // POL already received as msg.value
        // Transfer PULSE to user
        pulseToken.safeTransfer(msg.sender, pulseAmount);

        emit SwapPolForPulse(msg.sender, msg.value, pulseAmount);
    }

    // ============ View Functions ============

    /**
     * @dev Calculate USDC output for a given PULSE amount
     * @param pulseAmount Amount of PULSE to swap
     * @return USDC amount user will receive
     */
    function calculateUsdcOutput(uint256 pulseAmount) public view returns (uint256) {
        // PULSE has 18 decimals, USDC has 6 decimals
        // usdcRate is USDC per PULSE (scaled by 1e6)
        // Formula: (pulseAmount * usdcRate) / 1e18
        return (pulseAmount * usdcRate) / 1e18;
    }

    /**
     * @dev Calculate PULSE output for a given USDC amount
     * @param usdcAmount Amount of USDC to swap
     * @return PULSE amount user will receive
     */
    function calculatePulseOutputFromUsdc(uint256 usdcAmount) public view returns (uint256) {
        // Inverse of calculateUsdcOutput
        // Formula: (usdcAmount * 1e18) / usdcRate
        require(usdcRate > 0, "PulseSwap: USDC rate not set");
        return (usdcAmount * 1e18) / usdcRate;
    }

    /**
     * @dev Calculate POL output for a given PULSE amount
     * @param pulseAmount Amount of PULSE to swap
     * @return POL amount (in wei) user will receive
     */
    function calculatePolOutput(uint256 pulseAmount) public view returns (uint256) {
        // Both PULSE and POL have 18 decimals
        // polRate is POL wei per PULSE
        // Formula: (pulseAmount * polRate) / 1e18
        return (pulseAmount * polRate) / 1e18;
    }

    /**
     * @dev Calculate PULSE output for a given POL amount
     * @param polAmount Amount of POL (in wei) to swap
     * @return PULSE amount user will receive
     */
    function calculatePulseOutputFromPol(uint256 polAmount) public view returns (uint256) {
        // Inverse of calculatePolOutput
        // Formula: (polAmount * 1e18) / polRate
        require(polRate > 0, "PulseSwap: POL rate not set");
        return (polAmount * 1e18) / polRate;
    }

    /**
     * @dev Get contract's PULSE balance
     */
    function getPulseBalance() external view returns (uint256) {
        return pulseToken.balanceOf(address(this));
    }

    /**
     * @dev Get contract's USDC balance
     */
    function getUsdcBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @dev Get contract's POL balance
     */
    function getPolBalance() external view returns (uint256) {
        return address(this).balance;
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
     * @dev Set POL exchange rate
     * @param _rate New POL rate (POL wei per PULSE)
     */
    function setPolRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "PulseSwap: Rate must be > 0");
        uint256 oldRate = polRate;
        polRate = _rate;
        emit PolRateUpdated(oldRate, _rate);
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
     * @dev Deposit POL into the contract
     */
    function depositPol() external payable onlyOwner {
        require(msg.value > 0, "PulseSwap: Amount must be > 0");
        emit PolDeposited(msg.value);
    }

    /**
     * @dev Withdraw PULSE tokens from the contract
     * @param amount Amount of PULSE to withdraw
     */
    function withdrawPulse(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        require(pulseToken.balanceOf(address(this)) >= amount, "PulseSwap: Insufficient balance");
        pulseToken.safeTransfer(msg.sender, amount);
        emit PulseWithdrawn(amount);
    }

    /**
     * @dev Withdraw USDC tokens from the contract
     * @param amount Amount of USDC to withdraw
     */
    function withdrawUsdc(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        require(usdcToken.balanceOf(address(this)) >= amount, "PulseSwap: Insufficient balance");
        usdcToken.safeTransfer(msg.sender, amount);
        emit UsdcWithdrawn(amount);
    }

    /**
     * @dev Withdraw POL from the contract
     * @param amount Amount of POL to withdraw
     */
    function withdrawPol(uint256 amount) external onlyOwner {
        require(amount > 0, "PulseSwap: Amount must be > 0");
        require(address(this).balance >= amount, "PulseSwap: Insufficient balance");
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "PulseSwap: POL transfer failed");
        emit PolWithdrawn(amount);
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
        uint256 polBalance = address(this).balance;

        if (pulseBalance > 0) {
            pulseToken.safeTransfer(msg.sender, pulseBalance);
        }
        if (usdcBalance > 0) {
            usdcToken.safeTransfer(msg.sender, usdcBalance);
        }
        if (polBalance > 0) {
            (bool success, ) = payable(msg.sender).call{value: polBalance}("");
            require(success, "PulseSwap: POL transfer failed");
        }
    }

    // Allow contract to receive POL
    receive() external payable {}
}
