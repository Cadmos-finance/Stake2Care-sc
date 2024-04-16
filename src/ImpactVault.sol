// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

//    █████████   ███████████     █████████   ███████████     ███████████    █████████   ██████   █████ █████   ████
//   ███░░░░░███ ░░███░░░░░███   ███░░░░░███ ░░███░░░░░███   ░░███░░░░░███  ███░░░░░███ ░░██████ ░░███ ░░███   ███░
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███░███ ░███  ░███  ███
//  ░███████████  ░██████████   ░███████████  ░██████████     ░██████████  ░███████████  ░███░░███░███  ░███████
//  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███    ░███░░░░░███ ░███░░░░░███  ░███ ░░██████  ░███░░███
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███  ░░█████  ░███ ░░███
//  █████   █████ █████   █████ █████   █████ ███████████     ███████████  █████   █████ █████  ░░█████ █████ ░░████
// ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░     ░░░░░░░░░░░  ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░   ░░░░
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
// ======================================  ImpactVault  =========================================
// ===============================================================================================
// ARAB BANK: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri

import "./intf/IImpactVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Impact Vault Smart Contract
/// @author N.B.
/// @notice Used to donate gains stemming from a positively rebasing token
contract ImpactVault is ERC4626, Ownable2Step, IImpactVault {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /* ========== CONSTANTS ========== */

    /* ========== STATE VARIABLES ========== */

    /* 
    struct TimelockedSurplus {
        uint128 surplus; // TimeLocked surplus - distributable at timelock expiry (1 day)
        uint64 timestamp; // Ok until 2554  - timestamp when surplus was timelocked
        uint64 minimalCollectAmount; // Minimal Amount to auto-Collect at each deposit/ withdrawal - can be set by _owner. uint64 -> ~ 18 wad
    }
    */
    TimelockedSurplus public timeLockedSurplus;

    /* ========== CONSTRUCTOR ========== */

    /**
     * @dev Assumptions: Asset is a positively increasing rebasing token (e.g: STETH), all gains are distributed to _owner.
     * In case of slashing, we wait for the asset to rebase > 1 before resuming distributions.
     * To alleviate risk if Asset rebases Up then Down (e.g. StETH: 1 - > 1.30 -> 1.0) due for instance to an operational blunder of asset issuer, we have put in place a 24-hour timelock before surplus distribution takes place.
     */
    constructor(
        IERC20 asset_,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) ERC4626(asset_) {}

    /* ========== INTERNAL FUNCTIONS ========== */

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     */
    function _convertToSharesCompute(
        uint256 assets,
        Math.Rounding rounding,
        uint256 totalAssets_,
        uint256 totalSupply_
    ) internal pure returns (uint256) {
        if (totalAssets_ < totalSupply_) {
            // if 1 Vault Share is worth less than 1 asset, obtain more shares pro-rata the vault NAV. Necessary to ensure no loss on withdrawal
            return assets.mulDiv(totalSupply_ + 1, totalAssets_ + 1, rounding);
        }
        return assets; //Else 1 deposited asset = 1 share
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     */
    function _convertToAssetsCompute(
        uint256 shares,
        Math.Rounding rounding,
        uint256 totalAssets_,
        uint256 totalSupply_
    ) internal pure returns (uint256) {
        if (totalAssets_ < totalSupply_) {
            // if 1 Vault Share is worth less than 1 asset, obtain more shares pro-rata the vault NAV. Necessary to ensure no loss on withdrawal
            return shares.mulDiv(totalAssets_ + 1, totalSupply_ + 1, rounding);
        }
        return shares; //Else 1 deposited asset = 1 share
    }

    /**
     * @dev Internal conversion function (from assets to shares) with support for rounding direction.
     */
    function _convertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal view override(ERC4626) returns (uint256) {
        uint256 totalAssets_ = totalAssets();
        uint256 totalSupply_ = totalSupply();
        return
            _convertToSharesCompute(
                assets,
                rounding,
                totalAssets_,
                totalSupply_
            );
    }

    /**
     * @dev Internal conversion function (from shares to assets) with support for rounding direction.
     */
    function _convertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal view override(ERC4626) returns (uint256) {
        uint256 totalAssets_ = totalAssets();
        uint256 totalSupply_ = totalSupply();
        return
            _convertToAssetsCompute(
                shares,
                rounding,
                totalAssets_,
                totalSupply_
            );
    }

    /// @dev Calls CollectDonations and returns result of _convertToShares
    function _collectDonationsAndConvertToShares(
        uint256 assets,
        Math.Rounding rounding
    ) internal returns (uint256) {
        (, uint256 totalAssets_, uint256 totalSupply_) = collectDonations(0);
        return
            _convertToSharesCompute(
                assets,
                rounding,
                totalAssets_,
                totalSupply_
            );
    }

    /// @dev Calls CollectDonations and returns result of _convertToAssets
    function _collectDonationsAndConvertToAssets(
        uint256 shares,
        Math.Rounding rounding
    ) internal returns (uint256) {
        (, uint256 totalAssets_, uint256 totalSupply_) = collectDonations(0);
        return
            _convertToAssetsCompute(
                shares,
                rounding,
                totalAssets_,
                totalSupply_
            );
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /** @dev See {IERC4626-deposit}. */
    /// @notice  Deposit amount from msg.sender of asset into the vault and sends obtained tokens to receiver
    /// @dev normally asset is positively rebasing and we obtain 1 vault share per deposited asset, we however adjust the price if there was an adverse rebasing
    /// @param assets Amount of Asset to Deposit
    /// @param receiver Address receiving freshly minted vault tokens
    function deposit(
        uint256 assets,
        address receiver
    ) public override(ERC4626) returns (uint256) {
        uint256 shares = _collectDonationsAndConvertToShares(
            assets,
            Math.Rounding.Down
        );
        _deposit(_msgSender(), receiver, assets, shares);
        return shares;
    }

    /** @dev See {IERC4626-mint}. */
    /// @notice  Mint shares to receiver against assets from msg.sender
    /// @dev normally asset is positively rebasing and we obtain 1 vault share per deposited asset, we however adjust the price if there was an adverse rebasing
    /// @param shares Amount of Shares to obtain
    /// @param receiver Address receiving freshly minted vault tokens
    function mint(
        uint256 shares,
        address receiver
    ) public override(ERC4626) returns (uint256) {
        uint256 assets = _collectDonationsAndConvertToAssets(
            shares,
            Math.Rounding.Up
        );
        _deposit(_msgSender(), receiver, assets, shares);
        return assets;
    }

    /** @dev See {IERC4626-withdraw}. */
    /// @notice Withdraws assets to receiver address against owner vault shares
    /// @dev normally asset is positively rebasing and we obtain 1 asset per canceled vault share, we however adjust the price if there was an adverse rebasing
    /// @param assets Amount of Assets to obtain
    /// @param receiver Address receiving the withdrawn assets
    /// @param owner Address owning the vault shares to burn
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override(ERC4626) returns (uint256) {
        uint256 shares = _collectDonationsAndConvertToShares(
            assets,
            Math.Rounding.Up
        );
        _withdraw(_msgSender(), receiver, owner, assets, shares);
        return shares;
    }

    /** @dev See {IERC4626-redeem}. */
    /// @notice Cancels amount shares of msg.sender and withdraws asset
    /// @dev normally asset is positively rebasing and we obtain 1 asset per canceled vault share, we however adjust the price if there was an adverse rebasing
    /// @param shares Amount of Vault Shares to Cancel
    /// @param receiver Address receiving the withdrawn assets
    /// @param owner Address owning the vault shares to burn
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override(ERC4626) returns (uint256) {
        uint256 assets = _collectDonationsAndConvertToAssets(
            shares,
            Math.Rounding.Down
        );
        _withdraw(_msgSender(), receiver, owner, assets, shares);
        return assets;
    }

    /// @notice Collects Asset Surplus as a donation for Owner
    /// @dev Does not collect if 24-hour timeLocked surplus is less than minimalTransfer
    /// @dev At most collects Once a day
    /// @dev caller indicates minimalTransferAmount for computation to take place - if 0 is indicated we revert to default minimum (as registered in storage)
    function collectDonations(
        uint64 minimalTransfer
    )
        public
        override(IImpactVault)
        returns (
            uint128 collectedAmount,
            uint256 totalAssets_,
            uint256 totalSupply_
        )
    {
        totalSupply_ = totalSupply();
        totalAssets_ = totalAssets();
        TimelockedSurplus memory timeLockedSurplus_ = timeLockedSurplus;
        minimalTransfer = minimalTransfer == 0
            ? timeLockedSurplus_.minimalCollectAmount
            : minimalTransfer;
        if (totalAssets_ > totalSupply_ + minimalTransfer) {
            //Check if current surplus is high enough
            if (
                timeLockedSurplus_.timestamp < uint64(block.timestamp - 1 days)
            ) {
                // 1 day TimeLock on surplus distribution - to avoid donor loss in case of potential NAV up-down bounce
                uint128 newSurplus = uint128(totalAssets_ - totalSupply_);
                collectedAmount = newSurplus > timeLockedSurplus_.surplus
                    ? timeLockedSurplus_.surplus
                    : newSurplus;
                if (collectedAmount > minimalTransfer) {
                    IERC20(asset()).safeTransfer(owner(), collectedAmount);
                } else {
                    collectedAmount = 0;
                }
                timeLockedSurplus = TimelockedSurplus(
                    newSurplus - collectedAmount,
                    uint64(block.timestamp),
                    timeLockedSurplus_.minimalCollectAmount
                );
            } //Do nothing if timeLock not elapsed
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice Allows Owner to set minimalCollectAmount
    function setAutoCollectThreshold(
        uint64 newMinimalCollectAmount
    ) external override(IImpactVault) onlyOwner {
        TimelockedSurplus memory timeLockedSurplus_ = timeLockedSurplus;
        timeLockedSurplus = TimelockedSurplus(
            timeLockedSurplus_.surplus,
            timeLockedSurplus_.timestamp,
            newMinimalCollectAmount
        );
        emit SetAutoCollectThreshold(
            newMinimalCollectAmount,
            timeLockedSurplus_.minimalCollectAmount
        );
    }
}
