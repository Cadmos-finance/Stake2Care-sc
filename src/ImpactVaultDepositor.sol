// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

//    █████████   ███████████     █████████   ███████████     ███████████    █████████   ██████   █████ █████   ████     █████████  █████   ███   █████ █████ ███████████ ███████████ ██████████ ███████████   █████         █████████   ██████   █████ ██████████  
//   ███░░░░░███ ░░███░░░░░███   ███░░░░░███ ░░███░░░░░███   ░░███░░░░░███  ███░░░░░███ ░░██████ ░░███ ░░███   ███░     ███░░░░░███░░███   ░███  ░░███ ░░███ ░█░░░███░░░█░█░░░░░░███ ░░███░░░░░█░░███░░░░░███ ░░███         ███░░░░░███ ░░██████ ░░███ ░░███░░░░███ 
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███░███ ░███  ░███  ███      ░███    ░░░  ░███   ░███   ░███  ░███ ░   ░███  ░ ░     ███░   ░███  █ ░  ░███    ░███  ░███        ░███    ░███  ░███░███ ░███  ░███   ░░███
//  ░███████████  ░██████████   ░███████████  ░██████████     ░██████████  ░███████████  ░███░░███░███  ░███████       ░░█████████  ░███   ░███   ░███  ░███     ░███         ███     ░██████    ░██████████   ░███        ░███████████  ░███░░███░███  ░███    ░███
//  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███    ░███░░░░░███ ░███░░░░░███  ░███ ░░██████  ░███░░███       ░░░░░░░░███ ░░███  █████  ███   ░███     ░███        ███      ░███░░█    ░███░░░░░███  ░███        ░███░░░░░███  ░███ ░░██████  ░███    ░███
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███  ░░█████  ░███ ░░███      ███    ░███  ░░░█████░█████░    ░███     ░███      ████     █ ░███ ░   █ ░███    ░███  ░███      █ ░███    ░███  ░███  ░░█████  ░███    ███ 
//  █████   █████ █████   █████ █████   █████ ███████████     ███████████  █████   █████ █████  ░░█████ █████ ░░████   ░░█████████     ░░███ ░░███      █████    █████    ███████████ ██████████ █████   █████ ███████████ █████   █████ █████  ░░█████ ██████████  
// ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░     ░░░░░░░░░░░  ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░   ░░░░     ░░░░░░░░░       ░░░   ░░░      ░░░░░    ░░░░░    ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░ ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░░░░░░   
//
//
//    ,ad8888ba,         db         88888888ba,    88b           d88    ,ad8888ba,     ad88888ba
//   d8"'    `"8b       d88b        88      `"8b   888b         d888   d8"'    `"8b   d8"     "8b
//  d8'                d8'`8b       88        `8b  88`8b       d8'88  d8'        `8b  Y8,
//  88                d8'  `8b      88         88  88 `8b     d8' 88  88          88  `Y8aaaaa,
//  88               d8YaaaaY8b     88         88  88  `8b   d8'  88  88          88    `"""""8b,
//  Y8,             d8""""""""8b    88         8P  88   `8b d8'   88  Y8,        ,8P          `8b
//   Y8a.    .a8P  d8'        `8b   88      .a8P   88    `888'    88   Y8a.    .a8P   Y8a     a8P
//    `"Y8888Y"'  d8'          `8b  88888888Y"'    88     `8'     88    `"Y8888Y"'     "Y88888P"
//
// ===============================================================================================
// ==================================  ImpactVaultDepositor  =====================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

import "./intf/IImpactVault.sol";
import "./intf/IImpactVaultDepositor.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ImpactVaultDepositor
/// @author N.B.
/// @notice Abstract Intermediate contract to deposit non native asset in an Impact Vault
abstract contract ImpactVaultDepositor is IImpactVaultDepositor {
    using SafeERC20 for IERC20;

    address public immutable override(IImpactVaultDepositor) ImpactVault;
    address public immutable override(IImpactVaultDepositor) asset;
    uint256 private constant wad = 1e18;
    uint256 private constant maxUint = type(uint256).max;

    /* ========== CONSTRUCTOR ========== */

    constructor(address ImpactVault_) {
        ImpactVault = ImpactVault_;
        address asset_ = IERC4626(ImpactVault_).asset();
        asset = asset_;
        IERC20(asset_).approve(ImpactVault_, maxUint);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function _deposit(
        uint256 depositAmount
    ) internal returns (uint256 sharesCreated) {
        sharesCreated = IERC4626(ImpactVault).deposit(
            depositAmount,
            msg.sender
        );
    }

    function _convertToken(
        uint256 amount,
        address token
    ) internal virtual returns (uint256 assetAmount);

    function _convertETH() internal virtual returns (uint256 assetAmount);

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// @notice  Deposit amount of asset into the ImpactVault
    /// @dev redundant with ImpactVault deposit method - used to offer a single entry point
    /// @param depositAmount Amount of Asset to Deposit
    function depositAsset(
        uint256 depositAmount
    ) external override(IImpactVaultDepositor) returns (uint256 sharesCreated) {
        IERC20(asset).safeTransferFrom(
            msg.sender,
            address(this),
            depositAmount
        );
        sharesCreated = _deposit(depositAmount);
    }

    /// @notice  Convert amount of token into asset and deposits depositProportion (in wad) of it into the ImpactVault. Remainder is sent back to msg.sender
    /// @param amount Amount of token considered
    /// @param token address of the token to convert-and-deposit
    /// @param depositProportion Proportion of obtained asset to deposit into the impact vault (in wad). Remainder is sent back to msg.sender

    function depositToken(
        uint256 amount,
        address token,
        uint256 depositProportion
    )
        external
        override(IImpactVaultDepositor)
        returns (uint256 sharesCreated, uint256 assetReturned)
    {
        uint256 assetAmount = _convertToken(amount, token);
        uint256 toDeposit = (depositProportion * assetAmount) / wad;
        sharesCreated = _deposit(toDeposit);
        assetReturned = assetAmount - toDeposit;
        IERC20(asset).safeTransfer(msg.sender, assetReturned);
    }

    /// @notice  Convert amount of ETH into asset and deposits depositProportion (in wad) of it into the ImpactVault. Remainder is sent back to msg.sender
    /// @param depositProportion Proportion of obtained asset to deposit into the impact vault (in wad). Remainder is sent back to msg.sender
    function depositETH(
        uint256 depositProportion
    )
        public
        payable
        override(IImpactVaultDepositor)
        returns (uint256 sharesCreated, uint256 assetReturned)
    {
        uint256 assetAmount = _convertETH();
        uint256 toDeposit = (depositProportion * assetAmount) / wad;
        sharesCreated = _deposit(toDeposit);
        assetReturned = assetAmount - toDeposit;
        IERC20(asset).safeTransfer(msg.sender, assetReturned);
    }

    /// @notice On standard receive() converts and deposits all received ETH
    receive() external payable override(IImpactVaultDepositor) {
        depositETH(wad);
    }
}
