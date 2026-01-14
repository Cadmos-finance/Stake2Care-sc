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
// ===================================  ERC4626ImpactVault  ======================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

//Openzeppelin Contracts v4.9.6

import "./intf/IERC4626ImpactVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ERC4626 Impact Vault Smart Contract
/// @author N.B.
/// @notice Used to donate gains stemming from an ERC4626 Vault
/// @dev Rounding model:
/// - This wrapper intentionally applies conservative rounding (at most +1 unit on some conversions)
///   to favour the Vault when evaluating the value of its underlying position and handling deposits/ withdrawals.
/// - /!\ Assumes the underlying vault's convertToAssets/convertToShares are standard, relying on a single mulDiv
///   Non-standard ERC4626 implementations may not satisfy this invariant,
///   which could lead to small over/under-approximations in preview functions.
contract ERC4626ImpactVault is ERC4626, Ownable2Step, IERC4626ImpactVault {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /* ========== CONSTANTS ========== */

    uint256 internal immutable MIN_DEPOSIT;
    IERC4626 public immutable underlyingVault;
    

    /* ========== STATE VARIABLES ========== */

    /* 
    struct TimelockedSurplus {
        uint128 surplus; // TimeLocked surplus - distributable at timelock expiry (3 day)
        uint64 timestamp; // Timestamp when surplus was timelocked
        uint64 minimalCollectAmount; // Minimal Amount to auto-Collect at each deposit/ withdrawal - can be set by _owner. uint64 -> ~ 18 wad
    }
    */
    TimelockedSurplus public timeLockedSurplus;

    struct VaultGlobals {
        uint256 ourTotalPosition;          // underlyingVault.balanceOf(address(this))
        uint256 ourTotalSupply;          //  totalSupply()
    }

    /* ========== CONSTRUCTOR ========== */

    /**
     * @dev Assumptions: underlyingVault is an ALREADY SEEDED ERC4626 vault. 
     * We enforce that ERC4626ImpactVault and underlyingVault have same asset. ERC4626ImpactVault maintains 1 asset = 1 share while investing assets in underlyingVault.
     * Donation only possible when ERC4626ImpactVault has a surplus.
     * To alleviate risk if ERC4626ImpactVault NAV swings Up then Down (e.g. 1 - > 1.30 -> 1.0) due for instance to an operational blunder of asset issuer, we have put in place a 3 day timelock before surplus distribution takes place.
     * minDeposit param sets minimal deposit size in asset units to avoid rounding issues.
     * @dev On deployment it is recommended to make a donation of MIN_DEPOSIT to the vault to prevent potential rounding issues in the future
     */
    constructor(
        IERC4626 underlyingVault_,
        string memory name,
        string memory symbol,
        uint256 minDeposit
    ) ERC20(name, symbol) ERC4626(IERC20(underlyingVault_.asset())) {
        underlyingVault = underlyingVault_;
        MIN_DEPOSIT = minDeposit;
        IERC20(asset()).approve(address(underlyingVault), type(uint256).max);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @dev We override totalAssets to include underlying vault NAV (gross of deposit/ redemption fees)
     */
    function totalAssets() public view virtual override(ERC4626) returns (uint256) {
        // Contract should not hold any asset directly
        return underlyingVault.convertToAssets(underlyingVault.balanceOf(address(this)));
    }


    
    function previewDeposit(
        uint256 assets
    ) public view override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotView();
        return _previewDepositGivenGlobals(assets, g);
    }

    function previewMint(
        uint256 shares
    ) public view override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotView();
        return _previewMintGivenGlobals(shares, g);
    }

    function previewWithdraw(
        uint256 assets
    ) public view override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotView();
        return _previewWithdrawGivenGlobals(assets, g);
    }

    function previewRedeem(
        uint256 shares
    ) public view override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotView();
        return _previewRedeemGivenGlobals(shares, g);
    }


    function maxDeposit(
    address) public view override(ERC4626) returns (uint256) {
        return underlyingVault.maxDeposit(address(this));
    }

    function maxMint(address) public view override(ERC4626) returns (uint256) {
        uint256 maxAssets = underlyingVault.maxDeposit(address(this));
        if (maxAssets == type(uint256).max) {
            return type(uint256).max;
        }
        return previewDeposit(maxAssets);
    }

    function maxWithdraw(address owner) public view override(ERC4626) returns (uint256) {
        uint256 ownerShares = balanceOf(owner);
        if (ownerShares == 0) return 0;
        VaultGlobals memory g = _snapshotView();
        // Assets attributable to owner's shares at current NAV
        uint256 ownerAssets = _previewRedeemGivenGlobals(ownerShares, g);
        // What the underlying is willing to give us
        uint256 underlyingLimit = underlyingVault.maxWithdraw(address(this));
        // Can't give the owner more than lowest of his entitlement and our liquidity
        uint256 maxwithd = ownerAssets < underlyingLimit ? ownerAssets : underlyingLimit;
        if (maxwithd == 0) return 0;

        uint256 sharesNeeded = _previewWithdrawGivenGlobals(maxwithd, g);
        if (sharesNeeded <= ownerShares) {
            return maxwithd;
        }

        // heuristic search
        unchecked {
            for (uint256 i = 0; i < 10 && maxwithd > 0; ++i) {
                maxwithd -= 1;
                sharesNeeded = _previewWithdrawGivenGlobals(maxwithd, g);
                if (sharesNeeded <= ownerShares) {
                    return maxwithd;
                }
            }
        }

        // Still overshooting -> we now know:
        //   - maxwithd is an unsafe upper bound (f(maxwithd) > ownerShares)
        //   - 0 is a safe lower bound (f(0) <= ownerShares)

        // ============================================================
        // 2) BINARY SEARCH: largest a ∈ [0, maxwithd]
        //    s.t. _previewWithdrawGivenGlobals(a, g) <= ownerShares
        // ============================================================

        uint256 lo = 0;
        uint256 hi = maxwithd;

        // Compute minimal number of iterations needed (bit-length of hi).
        // This gives an exact bound ≤ 256.
        uint256 steps = 0;
        {
            uint256 r = hi;
            while (r > 0) {
                r >>= 1;
                unchecked { ++steps; }
            }
            // if hi == 0 we wouldn't be here (we early-returned above)
        }
        for (uint256 i = 0; i < steps && lo < hi; ++i) {
            // upper mid to bias toward the largest safe value
            uint256 mid = lo + (hi - lo + 1) / 2;
            uint256 midShares = _previewWithdrawGivenGlobals(mid, g);
            if (midShares <= ownerShares) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        return lo;
    }

    function maxRedeem(address owner) public view override(ERC4626) returns (uint256) {
        uint256 maxAssets = maxWithdraw(owner);
        uint256 neededShares = previewWithdraw(maxAssets);
        uint256 ownerShares = balanceOf(owner);
        return neededShares < ownerShares ? neededShares : ownerShares;
    }



    /* ========== INTERNAL FUNCTIONS ========== */

    function _snapshotView() internal view returns (VaultGlobals memory g) {
        g.ourTotalPosition = underlyingVault.balanceOf(address(this));
        g.ourTotalSupply = totalSupply();
    }

    function _snapshotAfterDonations() internal returns (VaultGlobals memory g) {
        // collectDonations returns updated wrapper ourTotalPosition / totalSupply
        (, g.ourTotalPosition, g.ourTotalSupply) = collectDonations(0);
        return g;
    }


    function _previewDepositGivenGlobals(
        uint256 assets,
        VaultGlobals memory g
    ) internal view returns (uint256) {
        // Gross assets of our position (ceil) — conservative for depositors
        uint256 totalAssets_ = underlyingVault.convertToAssets(g.ourTotalPosition) + 1; //ceil, up to one unit over-estimation in favour of contract

        // underlying shares minted (net of possible fees)
        uint256 createdShares = underlyingVault.previewDeposit(assets);

        // Assets value of those shares at current NAV, fee-less conversion 
        uint256 underlyingAssetsPostFee = underlyingVault.convertToAssets(createdShares); //floor 

        return _convertToSharesCompute(
            underlyingAssetsPostFee,
            Math.Rounding.Down,
            totalAssets_,
            g.ourTotalSupply
        );
    }

    function _previewMintGivenGlobals(
        uint256 shares,
        VaultGlobals memory g
    ) internal view returns (uint256) {
        uint256 totalAssets_ = underlyingVault.convertToAssets(g.ourTotalPosition) + 1; //ceil, up to one unit over-estimation in favour of contract

        uint256 netAssetsToAdd = _convertToAssetsCompute(
            shares,
            Math.Rounding.Up,
            totalAssets_,
            g.ourTotalSupply
        );

        // Underlying shares needed for netAssetsToAdd, rounded UP
        uint256 uShares = underlyingVault.convertToShares(netAssetsToAdd) + 1; //ceil

        // Assets user must send incl underlying fees
        return underlyingVault.previewMint(uShares);
    }


    function _previewWithdrawGivenGlobals(
        uint256 assets,
        VaultGlobals memory g
    ) internal view returns (uint256) {
        // Gross assets of our position (floor) — conservative for withdrawers
        uint256 totalAssets_ = underlyingVault.convertToAssets(g.ourTotalPosition);

        uint256 underlyingSharesToBurn = underlyingVault.previewWithdraw(assets);

        // Gross assets removed by burning those underlying shares (ceil)
        uint256 grossAssetsToRemove = underlyingVault.convertToAssets(underlyingSharesToBurn) + 1; //ceil, up to one unit over-estimation

        return _convertToSharesCompute(
            grossAssetsToRemove,
            Math.Rounding.Up,
            totalAssets_,
            g.ourTotalSupply
        );
    }


    function _previewRedeemGivenGlobals(
        uint256 shares,
        VaultGlobals memory g
    ) internal view returns (uint256) {
        uint256 totalAssets_ = underlyingVault.convertToAssets(g.ourTotalPosition); //floor

        uint256 grossAssetsPortion = _convertToAssetsCompute(
            shares,
            Math.Rounding.Down,
            totalAssets_,
            g.ourTotalSupply
        );

        // Underlying shares corresponding to that gross portion, rounded DOWN
        uint256 underlyingSharesToBurn = underlyingVault.convertToShares(grossAssetsPortion);

        // Net assets returned by underlying incl fees
        return underlyingVault.previewRedeem(underlyingSharesToBurn);
    }



    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal virtual override(ERC4626) {
        super._deposit(caller, receiver, assets, shares);
        underlyingVault.deposit(assets, address(this));
    }

    function _withdraw(address caller, address receiver, address owner, uint256 assets,uint256 shares) internal override(ERC4626) {
        underlyingVault.withdraw(
                assets,
                address(this),
                address(this)
            );

        super._withdraw(caller, receiver, owner, assets, shares);
    }


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
        if (assets <= MIN_DEPOSIT){
            revert DepositTooLow();
        }
        VaultGlobals memory g = _snapshotAfterDonations();

        uint256 shares = _previewDepositGivenGlobals(assets, g);

        _deposit(_msgSender(), receiver, assets, shares);

        return shares;
    }

    /** @dev See {IERC4626-mint}. */
    /// @notice  Mint shares to receiver against assets from msg.sender
    /// @dev normally underlying is positively rebasing and we obtain 1 vault share per deposited asset, we however adjust the price if there was an adverse rebasing
    /// @param shares Amount of Shares to obtain
    /// @param receiver Address receiving freshly minted vault tokens
    function mint(
        uint256 shares,
        address receiver
    ) public override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotAfterDonations();

        uint256 assets = _previewMintGivenGlobals(shares, g);
        if (assets <= MIN_DEPOSIT){
            revert DepositTooLow();
        }
        _deposit(_msgSender(), receiver, assets, shares);
        return assets;
    }

    /** @dev See {IERC4626-withdraw}. */
    /// @notice Withdraws assets to receiver address against owner vault shares
    /// @dev normally underlying is positively rebasing and we obtain 1 asset per canceled vault share, we however adjust the price if there was an adverse rebasing
    /// @param assets Amount of Assets to obtain
    /// @param receiver Address receiving the withdrawn assets
    /// @param owner Address owning the vault shares to burn
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotAfterDonations();

        uint256 shares = _previewWithdrawGivenGlobals(assets, g);
        _withdraw(_msgSender(), receiver, owner, assets, shares);
        return shares;
    }

    /** @dev See {IERC4626-redeem}. */
    /// @notice Cancels amount shares of msg.sender and withdraws asset
    /// @dev normally underlying is positively rebasing and we obtain 1 asset per canceled vault share, we however adjust the price if there was an adverse rebasing
    /// @param shares Amount of Vault Shares to Cancel
    /// @param receiver Address receiving the withdrawn assets
    /// @param owner Address owning the vault shares to burn
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override(ERC4626) returns (uint256) {
        VaultGlobals memory g = _snapshotAfterDonations();

        uint256 assets = _previewRedeemGivenGlobals(shares, g);
        _withdraw(_msgSender(), receiver, owner, assets, shares);
        return assets;
    }

    /// @notice Collects Asset Surplus as a donation for Owner
    /// @dev Does not collect if 3-day timeLocked surplus is less than minimalTransfer
    /// @dev At most collects Once every 3 days (timelock)
    /// @dev caller indicates minimalTransferAmount for computation to take place - if 0 is indicated we revert to default minimum (as registered in storage)
    /// @dev can be reentered by underlyingvault; we assume underlying vault is trusted
    /// @param minimalTransfer Minimal Transfer Amount to trigger collection
    function collectDonations(
        uint64 minimalTransfer
    )
        public
        override(IImpactVault)
        returns (
            uint128 collectedAmount,
            uint256 totalPosition,
            uint256 totalSupply_
        )
    {
        totalSupply_ = totalSupply();
        totalPosition = underlyingVault.balanceOf(address(this));
        
        uint256 redeemableAssets = underlyingVault.previewRedeem(totalPosition);
        TimelockedSurplus memory timeLockedSurplus_ = timeLockedSurplus;
        minimalTransfer = minimalTransfer == 0
            ? timeLockedSurplus_.minimalCollectAmount
            : minimalTransfer;
        if (redeemableAssets > totalSupply_ + minimalTransfer) {
            //Check if current surplus is high enough
            bool sufficientTransfer;
            unchecked{sufficientTransfer=timeLockedSurplus_.timestamp < uint64(block.timestamp);}
            if (sufficientTransfer) {
                // 3 day TimeLock on surplus distribution - to avoid donor loss in case of potential NAV up-down bounce
                uint128 newSurplus;
                unchecked{newSurplus = uint128(redeemableAssets - totalSupply_);}
                collectedAmount = newSurplus > timeLockedSurplus_.surplus
                    ? timeLockedSurplus_.surplus
                    : newSurplus;
                if (collectedAmount > minimalTransfer) {
                    //Best-effort withdraw: do not brick if liquidity/receiver/etc causes revert (e.g. owner blacklisted)
                    try underlyingVault.withdraw(
                        collectedAmount,
                        owner(),        // donate to owner
                        address(this)   // burn our underlying shares
                    ) returns (uint256 shareBurnt) {
                        totalPosition -= shareBurnt;
                        //Do not update timeLock if donation failed
                        unchecked {
                            timeLockedSurplus = TimelockedSurplus(
                                newSurplus - collectedAmount,
                                uint64(block.timestamp + 3 days),
                                timeLockedSurplus_.minimalCollectAmount
                            );
                        }
                    } catch {
                        // Do nothing if withdraw fails
                        collectedAmount = 0;
                    }
                } else {
                    collectedAmount = 0;
                    unchecked{
                        timeLockedSurplus = TimelockedSurplus(
                            newSurplus - collectedAmount,
                            uint64(block.timestamp + 3 days),
                            timeLockedSurplus_.minimalCollectAmount
                        );
                    }
                }
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

    /// @notice Allows Owner to recover any ERC20 token mistakenly sent to the contract, except the underlying vault shares. Owner CAN sweep the underlying asset token.
    /// @notice In practice used to collect airdrops or other rewards linked to the underlying vault.
    function recoverERC20(address token, uint256 amount) external override(IERC4626ImpactVault) onlyOwner {
        if(token==address(underlyingVault)){
            revert BadTokenWithdrawal();
        }
        IERC20(token).safeTransfer(
            owner(),
            amount
            );
        emit RecoveredERC20(token, amount);
    }
}
