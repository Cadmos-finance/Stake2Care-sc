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
// =================================  IImpactVaultDepositor  =====================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

/// @title Interface of the ImpactVaultDepositor Contract
/// @author N.B.
/// @notice Abstract Intermediate contract to deposit non native asset in an Impact Vault
interface IImpactVaultDepositor {
    /* ========== VIEWS ========== */

    /// @notice address of the ImpactVault  associated to the ImpactVaultDepositor
    function ImpactVault() external view returns (address);

    /// @notice address of the positively rebasing asset associated to the ImpactVault
    function asset() external view returns (address);

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// @notice  Deposit amount of asset into the ImpactVault
    /// @dev redundant with ImpactVault deposit method - used to offer a single entry point
    /// @param depositAmount Amount of Asset to Deposit
    function depositAsset(
        uint256 depositAmount
    ) external returns (uint256 sharesCreated);

    /// @notice  Convert amount of token into asset and deposits depositProportion (in wad) of it into the ImpactVault. Remainder is sent back to msg.sender
    /// @param amount Amount of token considered
    /// @param token address of the token to convert-and-deposit
    /// @param depositProportion Proportion of obtained asset to deposit into the impact vault (in wad). Remainder is sent back to msg.sender
    function depositToken(
        uint256 amount,
        address token,
        uint256 depositProportion
    ) external returns (uint256 sharesCreated, uint256 assetReturned);

    /// @notice  Convert amount of ETH into asset and deposits depositProportion (in wad) of it into the ImpactVault. Remainder is sent back to msg.sender
    /// @param depositProportion Proportion of obatined asset to deposit into the impact vault (in wad). Remainder is sent back to msg.sender
    function depositETH(
        uint256 depositProportion
    ) external payable returns (uint256 sharesCreated, uint256 assetReturned);

    /// @notice On standard receive() converts and deposits all received ETH
    receive() external payable;
}
