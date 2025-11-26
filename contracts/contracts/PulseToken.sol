// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PulseToken
 * @dev Configurable ERC20 token with fixed supply
 * @notice This token is used for the PULSE IDO platform
 */
contract PulseToken is ERC20, ERC20Burnable, Ownable {
    uint8 private _decimals;

    /**
     * @dev Constructor that mints the total supply to the specified recipient
     * @param name_ Token name (e.g., "Pulse Token")
     * @param symbol_ Token symbol (e.g., "PULSE")
     * @param totalSupply_ Total supply to mint (in whole tokens, will be multiplied by 10^decimals)
     * @param decimals_ Number of decimals (typically 18)
     * @param recipient_ Address to receive the minted tokens
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint8 decimals_,
        address recipient_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(recipient_ != address(0), "PulseToken: recipient is zero address");
        require(totalSupply_ > 0, "PulseToken: total supply must be greater than 0");

        _decimals = decimals_;
        _mint(recipient_, totalSupply_ * (10 ** decimals_));
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
