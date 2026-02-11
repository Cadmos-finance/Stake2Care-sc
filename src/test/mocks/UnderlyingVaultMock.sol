// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "./MockERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @dev Simple ERC4626 underlying vault used only in tests.
///      NAV increases/decreases via simulateYield/simulateLoss.
contract UnderlyingVaultMock is ERC4626 {

    uint256 public depositFeeBps; // basis points (100 = 1%)
    uint256 public withdrawFeeBps;
    uint256 constant BPS_DENOMINATOR = 10000;

    constructor(MockERC20 asset_)
        ERC20("Underlying Vault Share", "uVAULT")
        ERC4626(asset_)
    {}

    function setDepositFee(uint256 _feeBps) external {
        depositFeeBps = _feeBps;
    }

    function setWithdrawFee(uint256 _feeBps) external {
        withdrawFeeBps = _feeBps;
    }

    /// @notice Simulate positive yield: mint underlying into the vault
    ///         without minting any additional shares.
    function simulateYield(uint256 assets) external {
        MockERC20(address(asset())).mint(address(this), assets);
        // totalAssets() increases, totalSupply stays constant -> share price up
    }

    /// @notice Simulate a loss: move underlying out of the vault
    ///         without burning any shares.
    function simulateLoss(uint256 assets) external {
        MockERC20 token = MockERC20(address(asset()));
        require(token.balanceOf(address(this)) >= assets, "not enough assets");
        token.transfer(address(0xdead), assets);
        // totalAssets() decreases, totalSupply stays constant -> share price down
    }

    function previewDeposit(uint256 assets) public view override returns (uint256) {
        uint256 assetsAfterFee = assets - (assets * depositFeeBps) / BPS_DENOMINATOR;
        return _convertToShares(assetsAfterFee, Math.Rounding.Down);
    }

    function deposit(uint256 assets, address receiver) public override returns (uint256 shares) {
        shares = previewDeposit(assets);
        uint256 toMint =  _convertToShares(assets, Math.Rounding.Down) - shares;
        IERC20(asset()).transferFrom(msg.sender, address(this), assets); 
        if (toMint > 0) {
            _mint(address(0xdead), toMint);
        }
        _mint(receiver, shares); 
    }

    function previewMint(uint256 shares) public view override returns (uint256) {
        uint256 assetsNeeded = _convertToAssets(shares, Math.Rounding.Up);
        return (assetsNeeded * BPS_DENOMINATOR + BPS_DENOMINATOR - depositFeeBps - 1) / (BPS_DENOMINATOR - depositFeeBps); 
    }

    function mint(uint256 shares, address receiver) public override returns (uint256 assets) {
        assets = previewMint(shares);
        uint256 toBurn =  assets - _convertToAssets(shares, Math.Rounding.Up);
        IERC20(asset()).transferFrom(msg.sender, address(this), assets);
        if (toBurn > 0) {
            IERC20(asset()).transfer(address(0xdead), toBurn);
        }
        _mint(receiver, shares);
    }

    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        uint256 grossAssets = (assets * BPS_DENOMINATOR + BPS_DENOMINATOR - withdrawFeeBps - 1) / (BPS_DENOMINATOR - withdrawFeeBps); 
        return _convertToShares(grossAssets, Math.Rounding.Up);
    }

    function maxWithdraw(address user) public view override returns (uint256) {
        return previewRedeem(balanceOf(user));
    }

    function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256 shares) {
        shares = previewWithdraw(assets);
        if (shares > balanceOf(owner)) {
            if (assets <= maxWithdraw(owner)) {
                shares = balanceOf(owner);
            } else {
                require(false, "Insufficient shares");
            }
        }
        uint256 toMint = shares -_convertToShares(assets, Math.Rounding.Up);
        _burn(owner, shares);
        if (toMint > 0) {
            _mint(address(0xdead), toMint);
        }
        IERC20(asset()).transfer(receiver, assets); 
    }

    function previewRedeem(uint256 shares) public view override returns (uint256) {
        uint256 grossAssets = _convertToAssets(shares, Math.Rounding.Down);
        return grossAssets - (grossAssets * withdrawFeeBps) / BPS_DENOMINATOR; 
    }

    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256 assets) {
        assets = previewRedeem(shares);
        uint256 toBurn = _convertToAssets(shares, Math.Rounding.Down) - assets;
        if (toBurn > 0) {
            IERC20(asset()).transfer(address(0xdead), toBurn);
        }
        _burn(owner, shares);
        IERC20(asset()).transfer(receiver, assets);
    }
}
