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
// =====================================  IImpactVault  ==========================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

/// @title Interface of the ImpactVault Contract
/// @author N.B.
/// @notice Used to donate gains stemming from a positively rebasing token
interface IImpactVault is IERC20Metadata {

    error DepositTooLow();

    struct TimelockedSurplus {
        uint128 surplus; // TimeLocked surplus - distributable at timelock expiry (1 day)
        uint64 timestamp; // Ok until 2554  - timestamp when surplus was timelocked
        uint64 minimalCollectAmount; // Minimal Amount to auto-Collect at each deposit/ withdrawal - can be set by _owner
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /// @notice Collects Asset Surplus as a donation for Owner - Does not collect if surplus is less than minimalTransfer
    function collectDonations(
        uint64 minimalTransfer
    )
        external
        returns (
            uint128 collectedAmount,
            uint256 netWealth,
            uint256 totalSupply
        );

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice Allows Owner to set minimalCollectAmount
    function setAutoCollectThreshold(uint64 newMinimalCollectAmount) external;

    /* ========== EVENTS ========== */

    event SetAutoCollectThreshold(
        uint64 newMinimalCollectAmount,
        uint64 oldMinimalCollectAmount
    );
}
