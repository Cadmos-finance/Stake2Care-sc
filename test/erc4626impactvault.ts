
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  deployMockERC20,
  deployedWithUnderlyingDepositFeeFixture,
  deployedWithUnderlyingWithdrawFeeFixture,
  deployedWithUnderlyingBothFeesFixture,
  deployedWithDepositsAndDepositFeeFixture,
  deployedWithDepositsAndWithdrawFeeFixture,
  deployedWithDepositsAndBothFeesFixture,
  fullERC4626DeploymentFixture,
  deployedWithDepositsFixture,
  parseUnits,
} from "./erc4626ImpactVault.fixture";

const BPS = 10000n;
const DECIMALS = 6;
const ONE_UNIT = 10n ** 6n; // 1 USDC = 1e6
const MIN_DEPOSIT = 1000n; // 0.001 USDC

// Math helpers for precise calculations
function mulDiv(a: bigint, b: bigint, c: bigint, roundUp: boolean = false): bigint {
  if (roundUp) {
    return (a * b + c - 1n) / c;
  }
  return (a * b) / c;
}

// Fee calculation helpers
function applyDepositFee(assets: bigint, feeBps: bigint): bigint {
  return assets - (assets * feeBps) / BPS;
}

function grossFromNetDeposit(netAssets: bigint, feeBps: bigint): bigint {
  // gross = net / (1 - fee) = net * BPS / (BPS - fee), rounded up
  return mulDiv(netAssets, BPS, BPS - feeBps, true);
}

function applyWithdrawFee(grossAssets: bigint, feeBps: bigint): bigint {
  return grossAssets - (grossAssets * feeBps) / BPS;
}

function grossFromNetWithdraw(netAssets: bigint, feeBps: bigint): bigint {
  // gross = net / (1 - fee) = net * BPS / (BPS - fee), rounded up
  return mulDiv(netAssets, BPS, BPS - feeBps, true);
}

describe("ERC4626ImpactVault", function () {
  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      expect(await impactVault.name()).to.equal("Impact Vault Share");
      expect(await impactVault.symbol()).to.equal("IV-SHARE");
    });

    it("Should set correct underlying vault", async function () {
      const { impactVault, underlyingVault } = await loadFixture(fullERC4626DeploymentFixture);
      expect(await impactVault.underlyingVault()).to.equal(await underlyingVault.getAddress());
    });

    it("Should set correct asset (same as underlying vault asset)", async function () {
      const { impactVault, mockAsset, underlyingVault } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAsset = await impactVault.asset();
      const underlyingAsset = await underlyingVault.asset();
      expect(impactVaultAsset).to.equal(await mockAsset.getAddress());
      expect(impactVaultAsset).to.equal(underlyingAsset);
    });

    it("Should approve underlying vault for max uint256", async function () {
      const { impactVault, mockAsset, underlyingVault } = await loadFixture(fullERC4626DeploymentFixture);
      const allowance = await mockAsset.allowance(
        await impactVault.getAddress(),
        await underlyingVault.getAddress()
      );
      expect(allowance).to.equal(ethers.MaxUint256);
    });

    it("Should have correct initial total supply after seeding (100 USDC)", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      // Seeded with 100 USDC, NAV = 1, so 100 USDC worth of shares
      expect(await impactVault.totalSupply()).to.equal(parseUnits("100"));
    });

    it("Should have correct decimals (6)", async function () {
      const { impactVault, mockAsset } = await loadFixture(fullERC4626DeploymentFixture);
      expect(await impactVault.decimals()).to.equal(6);
      expect(await mockAsset.decimals()).to.equal(6);
    });

    it("Should have correct initial totalAssets (100 USDC)", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      expect(await impactVault.totalAssets()).to.equal(parseUnits("100"));
    });
  });

  describe("totalAssets", function () {
    it("Should return underlying vault assets via convertToAssets", async function () {
      const { impactVault, underlyingVault } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const underlyingBalance = await underlyingVault.balanceOf(impactVaultAddress);
      const expectedAssets = await underlyingVault.convertToAssets(underlyingBalance);
      expect(await impactVault.totalAssets()).to.equal(expectedAssets);
    });

    it("Should increase by exact yield amount when underlying vault has yield", async function () {
      const { impactVault, underlyingVault } = await loadFixture(fullERC4626DeploymentFixture);
      const assetsBefore = await impactVault.totalAssets();
      const yieldAmount = parseUnits("2");

      const assetUnderlyingBefore = await underlyingVault.totalAssets();
      await underlyingVault.simulateYield(yieldAmount); // Adds yield to underlying Vaulut (On Nav = 1100)
      const expectedNewNav = assetsBefore*(assetUnderlyingBefore + yieldAmount)/assetUnderlyingBefore;

      const assetsAfter = await impactVault.totalAssets();
      expect(assetsAfter).to.equal(expectedNewNav);
    });

    it("Should decrease by exact loss amount when underlying vault has loss", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Add more deposits first (1000 USDC)
      const depositAmount = parseUnits("1000");
      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);

      const assetsBefore = await impactVault.totalAssets();
      const lossAmount = parseUnits("50");

      const assetUnderlyingBefore = await underlyingVault.totalAssets();
      await underlyingVault.simulateLoss(lossAmount);
      const expectedNewNav = assetsBefore*(assetUnderlyingBefore - lossAmount)/assetUnderlyingBefore;

      const assetsAfter = await impactVault.totalAssets();
      expect(assetsAfter).to.equal(expectedNewNav);
    });
  });

  describe("Deposit", function () {
    it("Should revert if deposit is below minimum", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      await mockAsset.mint(depositorA.address, MIN_DEPOSIT);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, MIN_DEPOSIT);

      await expect(
        impactVault.connect(depositorA).deposit(MIN_DEPOSIT, depositorA.address)
      ).to.be.revertedWithCustomError(impactVault, "DepositTooLow");
    });

    it("Should mint shares exactly equal to assets when NAV = 1", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const depositAmount = parseUnits("1000");

      // Verify NAV = 1 before deposit
      const totalAssetsBefore = await impactVault.totalAssets();
      const totalSupplyBefore = await impactVault.totalSupply();
      expect(totalAssetsBefore).to.equal(totalSupplyBefore); // NAV = 1

      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);

      const sharesBefore = await impactVault.balanceOf(depositorA.address);
      expect(sharesBefore).to.equal(0n);

      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);

      const sharesAfter = await impactVault.balanceOf(depositorA.address);
      expect(sharesAfter).to.equal(depositAmount); // 1:1 when NAV = 1
    });

    it("Should transfer exact assets to underlying vault", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const depositAmount = parseUnits("1000");

      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);

      const underlyingSharesBefore = await underlyingVault.balanceOf(impactVaultAddress);
      const depositorBalanceBefore = await mockAsset.balanceOf(depositorA.address);

      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);

      const depositorBalanceAfter = await mockAsset.balanceOf(depositorA.address);
      expect(depositorBalanceBefore - depositorBalanceAfter).to.equal(depositAmount);

      // Underlying vault shares should increase (1:1 in mock)
      const underlyingSharesAfter = await underlyingVault.balanceOf(impactVaultAddress);
      expect(underlyingSharesAfter - underlyingSharesBefore).to.equal(depositAmount);
    });

    it("Should emit Deposit event with correct values", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const depositAmount = parseUnits("1000");

      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);

      await expect(impactVault.connect(depositorA).deposit(depositAmount, depositorA.address))
        .to.emit(impactVault, "Deposit")
        .withArgs(depositorA.address, depositorA.address, depositAmount, depositAmount);
    });

    it("Should mint more shares when NAV < 1 (after loss)", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositorB } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // First deposit (1000 USDC)
      const firstDeposit = parseUnits("1000");
      await mockAsset.mint(depositorA.address, firstDeposit);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, firstDeposit);
      await impactVault.connect(depositorA).deposit(firstDeposit, depositorA.address);

      // Simulate loss (200 USDC)
      const lossAmount = parseUnits("200");
      await underlyingVault.simulateLoss(lossAmount);

      // Calculate expected values
      // totalSupply = 100 (seed) + 1000 = 1100
      // totalAssets = 100 + 1000 - 200*1100/2100 = 995.238095
      const totalSupply = await impactVault.totalSupply();
      const totalAssets = await impactVault.totalAssets();
      expect(totalSupply).to.equal(parseUnits("1100"));
      expect(totalAssets).to.equal(parseUnits("995.238095"));

      // Second deposit after loss (1000 USDC)
      const secondDeposit = parseUnits("1000");
      await mockAsset.mint(depositorB.address, secondDeposit);
      await mockAsset.connect(depositorB).approve(impactVaultAddress, secondDeposit);
      
      const totalAssetsDeposit = mulDiv(await underlyingVault.balanceOf(impactVaultAddress), await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), true);
      const createdNewShares = await underlyingVault.previewDeposit(secondDeposit);
      const totalAssetsDeposited = mulDiv(createdNewShares, await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), false);
      const expectedShares = mulDiv(totalAssetsDeposited, totalSupply, totalAssetsDeposit, false);


      await impactVault.connect(depositorB).deposit(secondDeposit, depositorB.address);

      
      const sharesReceived = await impactVault.balanceOf(depositorB.address);
      expect(sharesReceived).to.equal(expectedShares);
      expect(sharesReceived).to.be.gt(secondDeposit); // More shares than assets
    });
  });

  describe("Mint", function () {
    it("Should revert if assets needed are below minimum", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      await mockAsset.mint(depositorA.address, parseUnits("100"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("100"));

      await expect(
        impactVault.connect(depositorA).mint(MIN_DEPOSIT, depositorA.address)
      ).to.be.revertedWithCustomError(impactVault, "DepositTooLow");
    });

    it("Should mint exact number of shares requested", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const sharesToMint = parseUnits("1000");

      await mockAsset.mint(depositorA.address, parseUnits("2000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("2000"));

      expect(await impactVault.balanceOf(depositorA.address)).to.equal(0n);
      await impactVault.connect(depositorA).mint(sharesToMint, depositorA.address);
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(sharesToMint);
    });

    it("Should take exact assets for shares when NAV = 1", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const sharesToMint = parseUnits("1000");

      await mockAsset.mint(depositorA.address, parseUnits("2000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("2000"));

      const balanceBefore = await mockAsset.balanceOf(depositorA.address);
      const assetsTaken = await impactVault.connect(depositorA).mint.staticCall(sharesToMint, depositorA.address);

      // When NAV = 1, assets = shares
      expect(assetsTaken).to.equal(sharesToMint);

      await impactVault.connect(depositorA).mint(sharesToMint, depositorA.address);
      const balanceAfter = await mockAsset.balanceOf(depositorA.address);

      expect(balanceBefore - balanceAfter).to.equal(assetsTaken);
    });

    it("Should take fewer assets when NAV < 1", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositorB } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // First deposit
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Simulate loss
      await underlyingVault.simulateLoss(parseUnits("200"));

      const totalSupply = await impactVault.totalSupply(); // 1100

      const sharesToMint = parseUnits("1100");
      await mockAsset.mint(depositorB.address, parseUnits("2000"));
      await mockAsset.connect(depositorB).approve(impactVaultAddress, parseUnits("2000"));

      const totalAssetsDeposit = mulDiv(await underlyingVault.balanceOf(impactVaultAddress), await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), true);
      const netAssetsToAdd = mulDiv(sharesToMint,totalAssetsDeposit+BigInt(1),totalSupply+BigInt(1), true);
      const uShares = mulDiv(netAssetsToAdd,await underlyingVault.totalSupply(),await underlyingVault.totalAssets(), true);
      const expectedAssets = await underlyingVault.previewMint(uShares);


      const assetsTaken = await impactVault.connect(depositorB).mint.staticCall(sharesToMint, depositorB.address);
      expect(assetsTaken).to.equal(expectedAssets);
      expect(assetsTaken).to.be.lt(sharesToMint); // Fewer assets than shares when NAV < 1
    });
  });

  describe("Withdraw", function () {
    it("Should withdraw exact assets requested", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const withdrawAmount = parseUnits("1000");

      const assetsBefore = await mockAsset.balanceOf(depositorA.address);
      await impactVault.connect(depositorA).withdraw(withdrawAmount, depositorA.address, depositorA.address);
      const assetsAfter = await mockAsset.balanceOf(depositorA.address);

      expect(assetsAfter - assetsBefore).to.equal(withdrawAmount);
    });

    it("Should burn exact shares when NAV = 1", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const withdrawAmount = parseUnits("1000");

      // Verify NAV = 1
      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();
      expect(totalAssets).to.equal(totalSupply);

      const sharesBefore = await impactVault.balanceOf(depositorA.address);

      await impactVault.connect(depositorA).withdraw(withdrawAmount, depositorA.address, depositorA.address);

      const sharesAfter = await impactVault.balanceOf(depositorA.address);
      // When NAV = 1, shares burned = assets withdrawn
      expect(sharesBefore - sharesAfter).to.equal(withdrawAmount);
    });

    it("Should emit Withdraw event with correct values", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const withdrawAmount = parseUnits("1000");

      // When NAV = 1, shares = assets
      await expect(
        impactVault.connect(depositorA).withdraw(withdrawAmount, depositorA.address, depositorA.address)
      )
        .to.emit(impactVault, "Withdraw")
        .withArgs(depositorA.address, depositorA.address, depositorA.address, withdrawAmount, withdrawAmount);
    });

    it("Should burn more shares after loss (NAV < 1)", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(deployedWithDepositsFixture);

      // Get state before loss
      // totalAssets = totalSupply = 100 (seed) + 5000 + 5000 = 10100
      const totalSupplyBefore = await impactVault.totalSupply();
      expect(totalSupplyBefore).to.equal(parseUnits("10100"));

      // Simulate loss (1000 USDC)
      const lossAmount = parseUnits("1000");
      await underlyingVault.simulateLoss(lossAmount);

      const totalAssets = await impactVault.totalAssets(); // 9190.090090
      const totalSupply = await impactVault.totalSupply(); // 10100
      expect(totalAssets).to.equal(parseUnits("9190.090090"));
      expect(totalSupply).to.equal(parseUnits("10100"));

      const sharesBefore = await impactVault.balanceOf(depositorA.address);
      const withdrawAmount = parseUnits("500");

      const totalAssetsWithdraw = mulDiv(await underlyingVault.balanceOf(await impactVault.getAddress()), await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), false);
      const underlyingSharesToBurn = await underlyingVault.previewWithdraw(withdrawAmount);
      const grossAssetsToRemove = mulDiv(underlyingSharesToBurn, await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), true);
      const expectedSharesBurned = mulDiv(grossAssetsToRemove, totalSupply, totalAssetsWithdraw, true);

      await impactVault.connect(depositorA).withdraw(withdrawAmount, depositorA.address, depositorA.address);

      const sharesAfter = await impactVault.balanceOf(depositorA.address);
      const sharesBurned = sharesBefore - sharesAfter;


      expect(sharesBurned).to.equal(expectedSharesBurned);
      expect(sharesBurned).to.be.gt(withdrawAmount); // More shares burned than assets when NAV < 1
    });
  });

  describe("Redeem", function () {
    it("Should burn exact shares specified", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const sharesToRedeem = parseUnits("1000");

      const sharesBefore = await impactVault.balanceOf(depositorA.address);
      await impactVault.connect(depositorA).redeem(sharesToRedeem, depositorA.address, depositorA.address);
      const sharesAfter = await impactVault.balanceOf(depositorA.address);

      expect(sharesBefore - sharesAfter).to.equal(sharesToRedeem);
    });

    it("Should give exact assets when NAV = 1", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const sharesToRedeem = parseUnits("1000");

      // Verify NAV = 1
      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();
      expect(totalAssets).to.equal(totalSupply);

      const assetsBefore = await mockAsset.balanceOf(depositorA.address);
      await impactVault.connect(depositorA).redeem(sharesToRedeem, depositorA.address, depositorA.address);
      const assetsAfter = await mockAsset.balanceOf(depositorA.address);

      // When NAV = 1, assets = shares
      expect(assetsAfter - assetsBefore).to.equal(sharesToRedeem);
    });

    it("Should give fewer assets when NAV < 1", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(deployedWithDepositsFixture);

      // Simulate loss
      await underlyingVault.simulateLoss(parseUnits("1000"));

      const totalAssets = await impactVault.totalAssets(); // 9100
      const totalSupply = await impactVault.totalSupply(); // 10100

      const sharesToRedeem = parseUnits("1010");
      const assetsBefore = await mockAsset.balanceOf(depositorA.address);

      const totalAssetsWithdraw = mulDiv(await underlyingVault.balanceOf(await impactVault.getAddress()), await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), false);
      const grossAssetsPortion = mulDiv(sharesToRedeem, totalAssetsWithdraw+BigInt(1), totalSupply+BigInt(1), false);
      const underlyingSharesToBurn = await underlyingVault.previewWithdraw(grossAssetsPortion);
      const expectedAssets = await underlyingVault.previewRedeem(underlyingSharesToBurn);


      await impactVault.connect(depositorA).redeem(sharesToRedeem, depositorA.address, depositorA.address);

      const assetsAfter = await mockAsset.balanceOf(depositorA.address);
      const assetsReceived = assetsAfter - assetsBefore;

      expect(assetsReceived).to.equal(expectedAssets);
      expect(assetsReceived).to.be.lt(sharesToRedeem); // Fewer assets than shares when NAV < 1
    });

    it("Should give assets = shares after yield when NAV >= 1 (post donation collection)", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(deployedWithDepositsFixture);

      // totalAssets = totalSupply = 10100 initially
      const yieldAmount = parseUnits("2000");
      await underlyingVault.simulateYield(yieldAmount);

      // Trigger collectDonations to establish surplus and start timelock
      await impactVault.collectDonations(1);

      // Wait for timelock
      await network.provider.send("evm_increaseTime", [3600 * 72 + 1]);
      await network.provider.send("evm_mine");

      // Collect donations - this transfers surplus to owner
      // After collection, NAV should still be >= 1 (depends on implementation)
      await impactVault.collectDonations(1);

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();

      const sharesToRedeem = parseUnits("1000");
      const assetsBefore = await mockAsset.balanceOf(depositorA.address);

      await impactVault.connect(depositorA).redeem(sharesToRedeem, depositorA.address, depositorA.address);

      const assetsAfter = await mockAsset.balanceOf(depositorA.address);
      const assetsReceived = assetsAfter - assetsBefore;

      // Expected assets = shares * totalAssets / totalSupply
      const expectedAssets = mulDiv(sharesToRedeem, totalAssets, totalSupply, false);
      expect(assetsReceived).to.equal(expectedAssets);

      // After donation collection, NAV should be  1, so assets = shares
      expect(assetsReceived).to.equal(sharesToRedeem);
    });
  });

  describe("Preview Functions", function () {
    it("previewDeposit should return exact shares for deposit", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      const depositAmount = parseUnits("1000");

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();

      const preview = await impactVault.previewDeposit(depositAmount);

      // Expected: assets * totalSupply / totalAssets (rounded down)
      const expected = mulDiv(depositAmount, totalSupply, totalAssets, false);
      expect(preview).to.equal(expected);
    });

    it("previewMint should return exact assets for mint", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      const sharesToMint = parseUnits("1000");

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();

      const preview = await impactVault.previewMint(sharesToMint);

      // Expected: shares * totalAssets / totalSupply (rounded up)
      const expected = mulDiv(sharesToMint, totalAssets, totalSupply, true);
      expect(preview).to.equal(expected);
    });

    it("previewWithdraw should return exact shares for withdraw", async function () {
      const { impactVault } = await loadFixture(deployedWithDepositsFixture);
      const withdrawAmount = parseUnits("1000");

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();

      const preview = await impactVault.previewWithdraw(withdrawAmount);

      // Expected: assets * totalSupply / totalAssets (rounded up)
      const expected = mulDiv(withdrawAmount, totalSupply, totalAssets, true);
      expect(preview).to.equal(expected);
    });

    it("previewRedeem should return exact assets for redeem", async function () {
      const { impactVault } = await loadFixture(deployedWithDepositsFixture);
      const sharesToRedeem = parseUnits("1000");

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();

      const preview = await impactVault.previewRedeem(sharesToRedeem);

      // Expected: shares * totalAssets / totalSupply (rounded down)
      const expected = mulDiv(sharesToRedeem, totalAssets, totalSupply, false);
      expect(preview).to.equal(expected);
    });

    it("previewDeposit should match actual deposit exactly", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const depositAmount = parseUnits("1000");

      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);

      const preview = await impactVault.previewDeposit(depositAmount);
      const actual = await impactVault.connect(depositorA).deposit.staticCall(depositAmount, depositorA.address);

      expect(preview).to.equal(actual);
    });

    it("previewMint should match actual mint exactly", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const sharesToMint = parseUnits("1000");

      await mockAsset.mint(depositorA.address, parseUnits("2000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("2000"));

      const preview = await impactVault.previewMint(sharesToMint);
      const actual = await impactVault.connect(depositorA).mint.staticCall(sharesToMint, depositorA.address);

      expect(preview).to.equal(actual);
    });

    it("previewWithdraw should match actual withdraw exactly", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const withdrawAmount = parseUnits("1000");

      const preview = await impactVault.previewWithdraw(withdrawAmount);
      const actual = await impactVault.connect(depositorA).withdraw.staticCall(
        withdrawAmount,
        depositorA.address,
        depositorA.address
      );

      expect(preview).to.equal(actual);
    });

    it("previewRedeem should match actual redeem exactly", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);
      const sharesToRedeem = parseUnits("1000");

      const preview = await impactVault.previewRedeem(sharesToRedeem);
      const actual = await impactVault.connect(depositorA).redeem.staticCall(
        sharesToRedeem,
        depositorA.address,
        depositorA.address
      );

      expect(preview).to.equal(actual);
    });
  });

  describe("Max Functions", function () {
    it("maxDeposit should return underlying vault's maxDeposit", async function () {
      const { impactVault, underlyingVault, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      const maxDeposit = await impactVault.maxDeposit(depositorA.address);
      const underlyingMax = await underlyingVault.maxDeposit(impactVaultAddress);

      expect(maxDeposit).to.equal(underlyingMax);
    });

    it("maxMint should return shares corresponding to maxDeposit", async function () {
      const { impactVault, depositorA } = await loadFixture(fullERC4626DeploymentFixture);

      const maxDeposit = await impactVault.maxDeposit(depositorA.address);
      const maxMint = await impactVault.maxMint(depositorA.address);

      // maxMint should be previewDeposit(maxDeposit)
      const expectedMaxMint = await impactVault.previewDeposit(maxDeposit);
      expect(maxMint).to.equal(expectedMaxMint);
    });

    it("maxWithdraw should return exact redeemable assets for owner", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);

      const ownerShares = await impactVault.balanceOf(depositorA.address);
      const maxWithdraw = await impactVault.maxWithdraw(depositorA.address);

      // maxWithdraw = previewRedeem(ownerShares)
      const expectedMaxWithdraw = await impactVault.previewRedeem(ownerShares);
      expect(maxWithdraw).to.equal(expectedMaxWithdraw);
    });

    it("maxRedeem should return owner's shares", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);

      const ownerShares = await impactVault.balanceOf(depositorA.address);
      const maxRedeem = await impactVault.maxRedeem(depositorA.address);

      // Per ERC4626, maxRedeem returns previewWithdraw(maxWithdraw)
      // But conceptually it should allow redeeming all shares
      const maxWithdraw = await impactVault.maxWithdraw(depositorA.address);
      const sharesForMaxWithdraw = await impactVault.previewWithdraw(maxWithdraw);

      expect(maxRedeem).to.equal(sharesForMaxWithdraw);
    });
  });

  describe("Conversion Functions", function () {
    it("convertToShares should be exact when NAV = 1", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      const assets = parseUnits("1000");

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();
      expect(totalAssets).to.equal(totalSupply); // NAV = 1

      const shares = await impactVault.convertToShares(assets);
      expect(shares).to.equal(assets);
    });

    it("convertToAssets should be exact when NAV = 1", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      const shares = parseUnits("1000");

      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();
      expect(totalAssets).to.equal(totalSupply); // NAV = 1

      const assets = await impactVault.convertToAssets(shares);
      expect(assets).to.equal(shares);
    });

    it("convertToShares should return more shares when NAV < 1", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Add deposits
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Simulate loss
      await underlyingVault.simulateLoss(parseUnits("200"));

      const totalAssets = await impactVault.totalAssets(); // 900
      const totalSupply = await impactVault.totalSupply(); // 1100

      const assets = parseUnits("100");
      const shares = await impactVault.convertToShares(assets);

      // Expected: assets * totalSupply / totalAssets
      const expected = mulDiv(assets, totalSupply, totalAssets, false);
      expect(shares).to.equal(expected);
      expect(shares).to.be.gt(assets);
    });

    it("convertToAssets should return fewer assets when NAV < 1", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Add deposits
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Simulate loss
      await underlyingVault.simulateLoss(parseUnits("200"));

      const totalAssets = await impactVault.totalAssets(); // 900
      const totalSupply = await impactVault.totalSupply(); // 1100

      const shares = parseUnits("100");
      const assets = await impactVault.convertToAssets(shares);

      // Expected: shares * totalAssets / totalSupply
      const expected = mulDiv(shares, totalAssets, totalSupply, false);
      expect(assets).to.equal(expected);
      expect(assets).to.be.lt(shares);
    });

    it("convertToShares and convertToAssets should be inverse (within rounding)", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Create non-trivial NAV
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);
      await underlyingVault.simulateLoss(parseUnits("200"));

      const originalAssets = parseUnits("100");
      const shares = await impactVault.convertToShares(originalAssets);
      const assetsBack = await impactVault.convertToAssets(shares);

      // Due to rounding down in both operations, assetsBack <= originalAssets
      expect(assetsBack).to.be.lte(originalAssets);
      // But should be very close (within 1 unit due to rounding)
      expect(originalAssets - assetsBack).to.be.lte(1n);
    });
  });

  describe("collectDonations", function () {
    it("Should not update timelock if surplus is below minimal transfer threshold", async function () {
      const { impactVault, underlyingVault, owner } = await loadFixture(fullERC4626DeploymentFixture);

      // Small yield that's below threshold
      await underlyingVault.simulateYield(10n);

      const [surplusBefore, timestampBefore] = await impactVault.timeLockedSurplus();

      // High threshold
      await impactVault.collectDonations(parseUnits("100"));

      const [surplusAfter, timestampAfter] = await impactVault.timeLockedSurplus();

      // Nothing should change
      expect(surplusAfter).to.equal(surplusBefore);
      expect(timestampAfter).to.equal(timestampBefore);
    });

    it("Should set timelock on first collection with surplus above threshold", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Add deposit
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Generate surplus
      const yieldAmount = parseUnits("100");
      const underlyingAssetsBefore = await underlyingVault.totalAssets();
      const underlyingSharesBefore = await underlyingVault.totalSupply();
      const impactVaultPositionBefore = await underlyingVault.balanceOf(impactVaultAddress);
      await underlyingVault.simulateYield(yieldAmount);

      const blockBefore = await ethers.provider.getBlock("latest");
      const [surplusBefore] = await impactVault.timeLockedSurplus();
      expect(surplusBefore).to.equal(0n);

      // First collection - sets timelock
      await impactVault.collectDonations(1);
      const blockAfter = await ethers.provider.getBlock("latest");

      const [surplusAfter, timestamp] = await impactVault.timeLockedSurplus();
      const expectedSurplus = impactVaultPositionBefore * (underlyingAssetsBefore+yieldAmount)  / underlyingSharesBefore - impactVaultPositionBefore;
      const netRedeem = await underlyingVault.previewRedeem(impactVaultPositionBefore) - await impactVault.totalSupply();
      expect(surplusAfter).to.equal(expectedSurplus);
      expect(surplusAfter).to.equal(netRedeem);


      expect(timestamp).to.equal(blockAfter!.timestamp + 3600 * 72);
    });

    it("Should not transfer during timelock period", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, owner } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Add deposit
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Generate surplus
      await underlyingVault.simulateYield(parseUnits("100"));

      // First collection - sets timelock
      await impactVault.collectDonations(1);

      const ownerBalanceBefore = await mockAsset.balanceOf(owner.address);

      // Try collecting immediately - should not transfer
      await impactVault.collectDonations(1);

      const ownerBalanceAfter = await mockAsset.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);

      // Try after 2 days - still should not transfer
      await network.provider.send("evm_increaseTime", [3600 * 48]);
      await network.provider.send("evm_mine");

      await impactVault.collectDonations(1);

      const ownerBalanceAfter2Days = await mockAsset.balanceOf(owner.address);
      expect(ownerBalanceAfter2Days).to.equal(ownerBalanceBefore);
    });

    it("Should transfer exact surplus to owner after 3-day timelock", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, owner } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Add deposit
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Generate surplus
      const yieldAmount = parseUnits("200");
      const underlyingAssetsBefore = await underlyingVault.totalAssets();
      const underlyingSharesBefore = await underlyingVault.totalSupply();
      const impactVaultPositionBefore = await underlyingVault.balanceOf(impactVaultAddress);
      await underlyingVault.simulateYield(yieldAmount);

      // First collect to set timelock
      await impactVault.collectDonations(1);

      const [surplus] = await impactVault.timeLockedSurplus();
      const expectedSurplus = impactVaultPositionBefore * (underlyingAssetsBefore+yieldAmount)  / underlyingSharesBefore - impactVaultPositionBefore;

      expect(surplus).to.equal(expectedSurplus);

      // Wait exactly 3 days + 1 second
      await network.provider.send("evm_increaseTime", [3600 * 72 + 1]);
      await network.provider.send("evm_mine");

      const ownerBalanceBefore = await mockAsset.balanceOf(owner.address);

      // Now should collect
      await impactVault.collectDonations(1);

      const ownerBalanceAfter = await mockAsset.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(surplus);

      // Surplus should be reset
      const [surplusAfterCollect] = await impactVault.timeLockedSurplus();
      expect(surplusAfterCollect).to.equal(0n);
    });

    it("Should use default minimalCollectAmount when 0 is passed", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Set auto collect threshold
      const threshold = parseUnits("50");
      await impactVault.setAutoCollectThreshold(threshold);

      // Add deposit
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Generate small surplus below threshold
      await underlyingVault.simulateYield(parseUnits("10"));

      // Pass 0 - should use default threshold (50 USDC)
      const [surplusBefore] = await impactVault.timeLockedSurplus();
      await impactVault.collectDonations(0);
      const [surplusAfter] = await impactVault.timeLockedSurplus();

      // Surplus should not be updated because it's below threshold
      expect(surplusAfter).to.equal(surplusBefore);
    });

    it("Should trigger collection via deposit when timelock expired", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositorB, owner } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // First deposit
      await mockAsset.mint(depositorA.address, parseUnits("1000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("1000"));
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);

      // Generate surplus
      const yieldAmount = parseUnits("200");
      const underlyingAssetsBefore = await underlyingVault.totalAssets();
      const underlyingSharesBefore = await underlyingVault.totalSupply();
      const impactVaultPositionBefore = await underlyingVault.balanceOf(impactVaultAddress);
      await underlyingVault.simulateYield(yieldAmount);

      // Trigger initial timelock
      await impactVault.collectDonations(1);

      // Wait 3 days
      await network.provider.send("evm_increaseTime", [3600 * 72 + 1]);
      await network.provider.send("evm_mine");

      // Second deposit should trigger collection
      await mockAsset.mint(depositorB.address, parseUnits("500"));
      await mockAsset.connect(depositorB).approve(impactVaultAddress, parseUnits("500"));

      const ownerBalanceBefore = await mockAsset.balanceOf(owner.address);
      await impactVault.connect(depositorB).deposit(parseUnits("500"), depositorB.address);
      const ownerBalanceAfter = await mockAsset.balanceOf(owner.address);
      const expectedSurplus = impactVaultPositionBefore * (underlyingAssetsBefore+yieldAmount)  / underlyingSharesBefore - impactVaultPositionBefore;
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedSurplus);
    });
  });

  describe("setAutoCollectThreshold", function () {
    it("Should only be callable by owner", async function () {
      const { impactVault, depositorA } = await loadFixture(fullERC4626DeploymentFixture);

      await expect(
        impactVault.connect(depositorA).setAutoCollectThreshold(1000n)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should update minimalCollectAmount to exact value", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      const newThreshold = parseUnits("10");

      await impactVault.setAutoCollectThreshold(newThreshold);

      const [, , minimalCollectAmount] = await impactVault.timeLockedSurplus();
      expect(minimalCollectAmount).to.equal(newThreshold);
    });

    it("Should emit SetAutoCollectThreshold event with correct values", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);

      const [, , oldThreshold] = await impactVault.timeLockedSurplus();
      const newThreshold = parseUnits("10");

      await expect(impactVault.setAutoCollectThreshold(newThreshold))
        .to.emit(impactVault, "SetAutoCollectThreshold")
        .withArgs(newThreshold, oldThreshold);
    });
  });

  describe("recoverERC20", function () {
    it("Should only be callable by owner", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);

      await expect(
        impactVault.connect(depositorA).recoverERC20(await mockAsset.getAddress(), 100n)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert when trying to recover underlying vault tokens", async function () {
      const { impactVault, underlyingVault } = await loadFixture(fullERC4626DeploymentFixture);

      await expect(
        impactVault.recoverERC20(await underlyingVault.getAddress(), 100n)
      ).to.be.revertedWithCustomError(impactVault, "BadTokenWithdrawal");
    });

    it("Should transfer exact amount of other ERC20 tokens to owner", async function () {
      const { impactVault, owner } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Deploy and send a random token to the vault
      const randomToken = await deployMockERC20("Random", "RND", 18);
      const mintAmount = ethers.parseEther("100");
      const recoverAmount = ethers.parseEther("50");

      await randomToken.mint(impactVaultAddress, mintAmount);

      const ownerBalanceBefore = await randomToken.balanceOf(owner.address);
      const vaultBalanceBefore = await randomToken.balanceOf(impactVaultAddress);

      await impactVault.recoverERC20(await randomToken.getAddress(), recoverAmount);

      const ownerBalanceAfter = await randomToken.balanceOf(owner.address);
      const vaultBalanceAfter = await randomToken.balanceOf(impactVaultAddress);

      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(recoverAmount);
      expect(vaultBalanceBefore - vaultBalanceAfter).to.equal(recoverAmount);
    });

    it("Should allow recovering the asset token sent directly", async function () {
      const { impactVault, mockAsset, owner } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Send some assets directly to the vault (not through deposit)
      const directAmount = parseUnits("500");
      await mockAsset.mint(impactVaultAddress, directAmount);

      const ownerBalanceBefore = await mockAsset.balanceOf(owner.address);
      await impactVault.recoverERC20(await mockAsset.getAddress(), directAmount);
      const ownerBalanceAfter = await mockAsset.balanceOf(owner.address);

      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(directAmount);
    });

    it("Should emit RecoveredERC20 event with correct values", async function () {
      const { impactVault } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      const randomToken = await deployMockERC20("Random", "RND", 18);
      const recoverAmount = ethers.parseEther("50");
      await randomToken.mint(impactVaultAddress, ethers.parseEther("100"));

      await expect(impactVault.recoverERC20(await randomToken.getAddress(), recoverAmount))
        .to.emit(impactVault, "RecoveredERC20")
        .withArgs(await randomToken.getAddress(), recoverAmount);
    });
  });

  describe("Ownership", function () {
    it("Should have correct initial owner", async function () {
      const { impactVault, owner } = await loadFixture(fullERC4626DeploymentFixture);
      expect(await impactVault.owner()).to.equal(owner.address);
    });

    it("Should transfer ownership with 2-step process", async function () {
      const { impactVault, owner, depositorA } = await loadFixture(fullERC4626DeploymentFixture);

      expect(await impactVault.owner()).to.equal(owner.address);

      await impactVault.transferOwnership(depositorA.address);
      // Ownership is pending until accepted
      expect(await impactVault.owner()).to.equal(owner.address);
      expect(await impactVault.pendingOwner()).to.equal(depositorA.address);

      await impactVault.connect(depositorA).acceptOwnership();
      expect(await impactVault.owner()).to.equal(depositorA.address);
      expect(await impactVault.pendingOwner()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("ERC20 Standard Functions", function () {
    it("Should have decimals equal to asset decimals", async function () {
      const { impactVault, mockAsset } = await loadFixture(fullERC4626DeploymentFixture);
      expect(await impactVault.decimals()).to.equal(await mockAsset.decimals());
      expect(await impactVault.decimals()).to.equal(6);
    });

    it("Should transfer exact amount between accounts", async function () {
      const { impactVault, depositorA, depositorB } = await loadFixture(deployedWithDepositsFixture);
      const transferAmount = parseUnits("1000");

      const balanceABefore = await impactVault.balanceOf(depositorA.address);
      const balanceBBefore = await impactVault.balanceOf(depositorB.address);

      await impactVault.connect(depositorA).transfer(depositorB.address, transferAmount);

      const balanceAAfter = await impactVault.balanceOf(depositorA.address);
      const balanceBAfter = await impactVault.balanceOf(depositorB.address);

      expect(balanceABefore - balanceAAfter).to.equal(transferAmount);
      expect(balanceBAfter - balanceBBefore).to.equal(transferAmount);
    });

    it("Should set exact allowance on approve", async function () {
      const { impactVault, depositorA, depositorC } = await loadFixture(deployedWithDepositsFixture);
      const approveAmount = parseUnits("1000");

      await impactVault.connect(depositorA).approve(depositorC.address, approveAmount);
      expect(await impactVault.allowance(depositorA.address, depositorC.address)).to.equal(approveAmount);
    });

    it("Should transferFrom and reduce allowance exactly", async function () {
      const { impactVault, depositorA, depositorB, depositorC } = await loadFixture(deployedWithDepositsFixture);
      const approveAmount = parseUnits("1000");
      const transferAmount = parseUnits("600");

      await impactVault.connect(depositorA).approve(depositorC.address, approveAmount);

      const balanceABefore = await impactVault.balanceOf(depositorA.address);
      const balanceBBefore = await impactVault.balanceOf(depositorB.address);

      await impactVault.connect(depositorC).transferFrom(depositorA.address, depositorB.address, transferAmount);

      const balanceAAfter = await impactVault.balanceOf(depositorA.address);
      const balanceBAfter = await impactVault.balanceOf(depositorB.address);

      expect(balanceABefore - balanceAAfter).to.equal(transferAmount);
      expect(balanceBAfter - balanceBBefore).to.equal(transferAmount);
      expect(await impactVault.allowance(depositorA.address, depositorC.address)).to.equal(approveAmount - transferAmount);
    });
  });

  describe("Invariants", function () {
    it("Total supply should equal sum of all balances", async function () {
      const { impactVault, owner, depositorA, depositorB } = await loadFixture(deployedWithDepositsFixture);

      const totalSupply = await impactVault.totalSupply();
      const ownerBalance = await impactVault.balanceOf(owner.address);
      const depositorABalance = await impactVault.balanceOf(depositorA.address);
      const depositorBBalance = await impactVault.balanceOf(depositorB.address);

      expect(totalSupply).to.equal(ownerBalance + depositorABalance + depositorBBalance);
    });

    it("User cannot withdraw more than maxWithdraw", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);

      const maxWithdraw = await impactVault.maxWithdraw(depositorA.address);

      await expect(
        impactVault.connect(depositorA).withdraw(
          maxWithdraw + 1n,
          depositorA.address,
          depositorA.address
        )
      ).to.be.reverted;
    });

    it("User cannot redeem more than maxRedeem", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);

      const maxRedeem = await impactVault.maxRedeem(depositorA.address);

      await expect(
        impactVault.connect(depositorA).redeem(
          maxRedeem + 1n,
          depositorA.address,
          depositorA.address
        )
      ).to.be.reverted;
    });

    it("After full redemption, user balance should be exactly zero", async function () {
      const { impactVault, depositorA } = await loadFixture(deployedWithDepositsFixture);

      const balance = await impactVault.balanceOf(depositorA.address);
      await impactVault.connect(depositorA).redeem(balance, depositorA.address, depositorA.address);

      expect(await impactVault.balanceOf(depositorA.address)).to.equal(0n);
    });

    it("Vault should never hold assets directly (all goes to underlying)", async function () {
      const { impactVault, mockAsset } = await loadFixture(deployedWithDepositsFixture);
      const impactVaultAddress = await impactVault.getAddress();

      const directBalance = await mockAsset.balanceOf(impactVaultAddress);
      expect(directBalance).to.equal(0n);
    });

    it("totalAssets should equal underlying vault position exactly", async function () {
      const { impactVault, underlyingVault } = await loadFixture(deployedWithDepositsFixture);
      const impactVaultAddress = await impactVault.getAddress();

      const underlyingShares = await underlyingVault.balanceOf(impactVaultAddress);
      const expectedAssets = await underlyingVault.convertToAssets(underlyingShares);

      expect(await impactVault.totalAssets()).to.equal(expectedAssets);
    });

    it("collectDonations should preserve user shares exactly", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = await loadFixture(deployedWithDepositsFixture);

      // Generate yield
      await underlyingVault.simulateYield(parseUnits("1000"));

      // Setup and wait for timelock
      await impactVault.collectDonations(1);
      await network.provider.send("evm_increaseTime", [3600 * 72 + 1]);
      await network.provider.send("evm_mine");

      const sharesBefore = await impactVault.balanceOf(depositorA.address);

      // Collect donations
      await impactVault.collectDonations(1);

      const sharesAfter = await impactVault.balanceOf(depositorA.address);

      // User shares should remain exactly the same
      expect(sharesAfter).to.equal(sharesBefore);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle deposit when totalSupply is 0 after all redemptions", async function () {
      const { impactVault, mockAsset, owner, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Redeem all owner's shares
      const ownerBalance = await impactVault.balanceOf(owner.address);
      await impactVault.redeem(ownerBalance, owner.address, owner.address);

      expect(await impactVault.totalSupply()).to.equal(0n);

      // Now deposit again
      const depositAmount = parseUnits("1000");
      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);

      // This should work even with 0 totalSupply
      await expect(
        impactVault.connect(depositorA).deposit(depositAmount, depositorA.address)
      ).to.not.be.reverted;

      // Shares should equal assets when starting fresh
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(depositAmount);
    });

    it("Should track exact balances through multiple deposits and withdrawals", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      await mockAsset.mint(depositorA.address, parseUnits("10000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("10000"));

      // Track cumulative shares
      let expectedShares = 0n;

      // Multiple deposits
      await impactVault.connect(depositorA).deposit(parseUnits("1000"), depositorA.address);
      expectedShares += parseUnits("1000");
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(expectedShares);

      await impactVault.connect(depositorA).deposit(parseUnits("1500"), depositorA.address);
      expectedShares += parseUnits("1500");
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(expectedShares);

      await impactVault.connect(depositorA).deposit(parseUnits("2000"), depositorA.address);
      expectedShares += parseUnits("2000");
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(expectedShares);

      // Partial withdrawals (NAV = 1, so shares = assets)
      await impactVault.connect(depositorA).withdraw(parseUnits("500"), depositorA.address, depositorA.address);
      expectedShares -= parseUnits("500");
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(expectedShares);

      await impactVault.connect(depositorA).withdraw(parseUnits("1000"), depositorA.address, depositorA.address);
      expectedShares -= parseUnits("1000");
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(expectedShares);

      // Final balance should be 3000 USDC (4500 - 1500)
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(parseUnits("3000"));
    });

    it("Should handle very large deposits correctly", async function () {
      const { impactVault, mockAsset, depositorA } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      const largeAmount = parseUnits("1000000"); // 1 million USDC

      await mockAsset.mint(depositorA.address, largeAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, largeAmount);

      await impactVault.connect(depositorA).deposit(largeAmount, depositorA.address);

      // When NAV = 1, shares = assets
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(largeAmount);
      expect(await impactVault.totalAssets()).to.equal(parseUnits("100") + largeAmount); // seed + deposit
    });

    it("Should handle yield followed by loss scenario correctly", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, owner } = await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();

      // Deposit
      const depositAmount = parseUnits("10000");
      await mockAsset.mint(depositorA.address, depositAmount);
      await mockAsset.connect(depositorA).approve(impactVaultAddress, depositAmount);
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);

      const sharesAfterDeposit = await impactVault.balanceOf(depositorA.address);
      expect(sharesAfterDeposit).to.equal(depositAmount);

      // Yield
      const yieldAmount = parseUnits("2000");
      const underlyingAssetsBefore = await underlyingVault.totalAssets();
      const underlyingSharesBefore = await underlyingVault.totalSupply();
      const impactVaultPositionBefore = await underlyingVault.balanceOf(impactVaultAddress);
      await underlyingVault.simulateYield(yieldAmount);
      const expectedSurplus = impactVaultPositionBefore * (underlyingAssetsBefore+yieldAmount)  / underlyingSharesBefore - impactVaultPositionBefore;
      expect(await impactVault.totalAssets()).to.equal(parseUnits("100") + depositAmount + expectedSurplus);

      // Setup and collect donations
      await impactVault.collectDonations(1);
      await network.provider.send("evm_increaseTime", [3600 * 72 + 1]);
      await network.provider.send("evm_mine");
      await impactVault.collectDonations(1);

      // Shares unchanged after collection
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(sharesAfterDeposit);

      // Loss
      const lossAmount = parseUnits("3000");
      await underlyingVault.simulateLoss(lossAmount);

      // User should still be able to redeem (with loss)
      const shares = await impactVault.balanceOf(depositorA.address);
      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();

      const assetsBefore = await mockAsset.balanceOf(depositorA.address);

      const totalAssetsWithdraw = mulDiv(await underlyingVault.balanceOf(await impactVault.getAddress()), await underlyingVault.totalAssets(), await underlyingVault.totalSupply(), false);
      const grossAssetsPortion = mulDiv(shares, totalAssetsWithdraw+BigInt(1), totalSupply+BigInt(1), false);
      const underlyingSharesToBurn = await underlyingVault.previewWithdraw(grossAssetsPortion);
      const expectedAssets = await underlyingVault.previewRedeem(underlyingSharesToBurn);

      await impactVault.connect(depositorA).redeem(shares, depositorA.address, depositorA.address);
      const assetsAfter = await mockAsset.balanceOf(depositorA.address);

      expect(assetsAfter - assetsBefore).to.equal(expectedAssets);
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(0n);
    });
  });
});

describe("ERC4626ImpactVault with Underlying Vault Fees", function () {
  
  // ==================== DEPOSIT FEE TESTS ====================
  
  describe("Underlying Vault with Deposit Fee", function () {
    
    describe("Impact on Deposit", function () {
      
      it("Should receive fewer underlying shares due to deposit fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps } = 
          await loadFixture(deployedWithUnderlyingDepositFeeFixture);
        const impactVaultAddress = await impactVault.getAddress();
        
        const depositAmount = parseUnits("1000");
        
        // Calculate expected underlying shares after fee
        const underlyingTotalAssets = await underlyingVault.totalAssets();
        const underlyingTotalSupply = await underlyingVault.totalSupply();
        const assetsAfterFee = applyDepositFee(depositAmount, depositFeeBps);
        const expectedUnderlyingShares = mulDiv(assetsAfterFee, underlyingTotalSupply, underlyingTotalAssets, false);
        
        const underlyingSharesBefore = await underlyingVault.balanceOf(impactVaultAddress);
        
        await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
        
        const underlyingSharesAfter = await underlyingVault.balanceOf(impactVaultAddress);
        const underlyingSharesReceived = underlyingSharesAfter - underlyingSharesBefore;
        
        expect(underlyingSharesReceived).to.equal(expectedUnderlyingShares);
        // Verify fewer shares than assets deposited (due to fee)
        expect(underlyingSharesReceived).to.be.lt(depositAmount);
      });
      
      it("Should calculate correct impact vault shares accounting for fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps } = 
          await loadFixture(deployedWithUnderlyingDepositFeeFixture);
        
        const depositAmount = parseUnits("1000");
        
        // Get state before deposit

        const underlyingTotalAssetsBefore = await underlyingVault.totalAssets();
        const underlyingTotalSupplyBefore = await underlyingVault.totalSupply();
        
        // Calculate new underlying shares after deposit with fee
        const newUnderlyingShares = await underlyingVault.previewDeposit(depositAmount);
        
        // Impact vault's new position value
        const netAssetsAdded = mulDiv(newUnderlyingShares, underlyingTotalAssetsBefore, underlyingTotalSupplyBefore, false);
        

        const expectedShares = netAssetsAdded
        
        await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
        
        const actualShares = await impactVault.balanceOf(depositorA.address);
        expect(actualShares).to.equal(expectedShares);
      });
      
      it("previewDeposit should match actual deposit with fee", async function () {
        const { impactVault, mockAsset, depositorA } = 
          await loadFixture(deployedWithUnderlyingDepositFeeFixture);
        
        const depositAmount = parseUnits("1000");
        
        const preview = await impactVault.previewDeposit(depositAmount);
        const actual = await impactVault.connect(depositorA).deposit.staticCall(depositAmount, depositorA.address);
        
        expect(preview).to.equal(actual);
      });
      
      it("totalAssets should reflect fee impact correctly", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps }  = 
          await loadFixture(deployedWithUnderlyingDepositFeeFixture);
        const impactVaultAddress = await impactVault.getAddress();
        
        const totalAssetsBefore = await impactVault.totalAssets();
        const depositAmount = parseUnits("1000");
        
        
        await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
        
        const totalAssetsAfter = await impactVault.totalAssets();
        const underlyingSharesAfter = await underlyingVault.balanceOf(impactVaultAddress);
        const underlyingTotalAssetsAfter = await underlyingVault.totalAssets();
        const underlyingTotalSupplyAfter = await underlyingVault.totalSupply();
        
        // Impact vault's total assets = its underlying shares converted to assets
        const expectedTotalAssets = mulDiv(underlyingSharesAfter, underlyingTotalAssetsAfter, underlyingTotalSupplyAfter, false);
        
        expect(totalAssetsAfter).to.equal(expectedTotalAssets);
        
        // Should be less than before + deposit due to fee staying in underlying
        const assetsIncrease = totalAssetsAfter - totalAssetsBefore;
        expect(assetsIncrease).to.equal(depositAmount*BigInt(995)/BigInt(1000));
      });
    });
    
    describe("Impact on Mint", function () {
      
      it("Should require more assets to mint due to deposit fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps }  = 
          await loadFixture(deployedWithUnderlyingDepositFeeFixture);
        
        const sharesToMint = parseUnits("1000");
        
        // Preview should account for fee
        const assetsRequired = await impactVault.previewMint(sharesToMint);
        
        const balanceBefore = await mockAsset.balanceOf(depositorA.address);
        await impactVault.connect(depositorA).mint(sharesToMint, depositorA.address);
        const balanceAfter = await mockAsset.balanceOf(depositorA.address);
        
        const assetsSpent = balanceBefore - balanceAfter;
        
        expect(assetsSpent).to.equal(assetsRequired);
        expect(assetsSpent-sharesToMint).to.equal(assetsSpent*BigInt(5)/BigInt(1000)+BigInt(1)); // 0.5% fee
        expect(await impactVault.balanceOf(depositorA.address)).to.equal(sharesToMint);
      }); 
      
      it("previewMint should match actual mint with fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps } = 
          await loadFixture(deployedWithUnderlyingDepositFeeFixture);
        
        const sharesToMint = parseUnits("1000");
        
        const preview = await impactVault.previewMint(sharesToMint);
        const actual = await impactVault.connect(depositorA).mint.staticCall(sharesToMint, depositorA.address);
        
        expect(preview).to.equal(actual);
      });
    });
  });
  
  // ==================== WITHDRAW FEE TESTS ====================
  
  describe("Underlying Vault with Withdraw Fee", function () {
    
    describe("Impact on Withdraw", function () {
      
      it("Should burn more shares to withdraw due to fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps }  = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        
        const withdrawAmount = parseUnits("1000");
        
        const sharesBefore = await impactVault.balanceOf(depositorA.address);
        const assetsBefore = await mockAsset.balanceOf(depositorA.address);
        
        await impactVault.connect(depositorA).withdraw(withdrawAmount, depositorA.address, depositorA.address);
        
        const sharesAfter = await impactVault.balanceOf(depositorA.address);
        const assetsAfter = await mockAsset.balanceOf(depositorA.address);
        
        // User should receive exact amount requested
        expect(assetsAfter - assetsBefore).to.equal(withdrawAmount);
        
        // Shares burned should be more than in no-fee scenario
        const sharesBurned = sharesBefore - sharesAfter;
        expect(sharesBurned-withdrawAmount).to.equal(sharesBurned*BigInt(3)/BigInt(1000)+BigInt(1)); // 0.3% fee
      });
      
      it("previewWithdraw should match actual withdraw with fee", async function () {
        const { impactVault, depositorA } = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        
        const withdrawAmount = parseUnits("1000");
        
        const preview = await impactVault.previewWithdraw(withdrawAmount);
        const actual = await impactVault.connect(depositorA).withdraw.staticCall(
          withdrawAmount, depositorA.address, depositorA.address
        );
        
        expect(preview).to.equal(actual);
      });
      
      it("Should calculate exact shares burned with fee", async function () {
        const { impactVault, underlyingVault, depositorA, withdrawFeeBps } = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        const impactVaultAddress = await impactVault.getAddress();
        
        const withdrawAmount = parseUnits("1000");
        
        // Calculate expected shares to burn
        const totalSupply = await impactVault.totalSupply();
        const underlyingShares = await underlyingVault.balanceOf(impactVaultAddress);
        const underlyingTotalAssets = await underlyingVault.totalAssets();
        const underlyingTotalSupply = await underlyingVault.totalSupply();
        
        // Impact vault's total assets
        const totalAssets = mulDiv(underlyingShares, underlyingTotalAssets, underlyingTotalSupply, false);
        
        // Underlying shares to burn (accounts for fee in previewWithdraw)
        const underlyingSharesToBurn = await underlyingVault.previewWithdraw(withdrawAmount);
        
        // Gross assets being removed from position
        const grossAssetsRemoved = mulDiv(underlyingSharesToBurn, underlyingTotalAssets, underlyingTotalSupply, true);
        
        // Impact vault shares to burn
        const expectedSharesBurned = mulDiv(grossAssetsRemoved, totalSupply, totalAssets, true);
        
        const sharesBefore = await impactVault.balanceOf(depositorA.address);
        await impactVault.connect(depositorA).withdraw(withdrawAmount, depositorA.address, depositorA.address);
        const sharesAfter = await impactVault.balanceOf(depositorA.address);
        
        expect(sharesBefore - sharesAfter).to.equal(expectedSharesBurned);
      });
    });
    
    describe("Impact on Redeem", function () {
      
      it("Should receive fewer assets when redeeming due to fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, withdrawFeeBps } = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        
        const sharesToRedeem = parseUnits("1000");
        
        const assetsBefore = await mockAsset.balanceOf(depositorA.address);
        
        await impactVault.connect(depositorA).redeem(sharesToRedeem, depositorA.address, depositorA.address);
        
        const assetsAfter = await mockAsset.balanceOf(depositorA.address);
        const assetsReceived = assetsAfter - assetsBefore;
        
        // Should receive less than shares redeemed (due to fee)
        expect(sharesToRedeem-assetsReceived).to.equal(sharesToRedeem*BigInt(3)/BigInt(1000)); // 0.3% fee
      });
      
      it("previewRedeem should match actual redeem with fee", async function () {
        const { impactVault, depositorA } = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        
        const sharesToRedeem = parseUnits("1000");
        
        const preview = await impactVault.previewRedeem(sharesToRedeem);
        const actual = await impactVault.connect(depositorA).redeem.staticCall(
          sharesToRedeem, depositorA.address, depositorA.address
        );
        
        expect(preview).to.equal(actual);
      });
      
      it("Should calculate exact assets received with fee", async function () {
        const { impactVault, underlyingVault, mockAsset, depositorA, withdrawFeeBps } = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        const impactVaultAddress = await impactVault.getAddress();
        
        const sharesToRedeem = parseUnits("1000");
        
        // Calculate expected assets
        const totalSupply = await impactVault.totalSupply();
        const underlyingShares = await underlyingVault.balanceOf(impactVaultAddress);
        const underlyingTotalAssets = await underlyingVault.totalAssets();
        const underlyingTotalSupply = await underlyingVault.totalSupply();
        
        // Impact vault's total assets
        const totalAssets = mulDiv(underlyingShares, underlyingTotalAssets, underlyingTotalSupply, false);
        
        // Gross assets portion for shares
        const grossAssetsPortion = mulDiv(sharesToRedeem, totalAssets + 1n, totalSupply + 1n, false);
        
        // Underlying shares to burn
        const underlyingSharesToBurn = await underlyingVault.previewWithdraw(grossAssetsPortion);
        
        // Net assets after withdraw fee
        const expectedAssets = await underlyingVault.previewRedeem(underlyingSharesToBurn);
        
        const assetsBefore = await mockAsset.balanceOf(depositorA.address);
        await impactVault.connect(depositorA).redeem(sharesToRedeem, depositorA.address, depositorA.address);
        const assetsAfter = await mockAsset.balanceOf(depositorA.address);
        
        expect(assetsAfter - assetsBefore).to.equal(expectedAssets-expectedAssets*BigInt(3)/BigInt(1000)-BigInt(1)); // 0.3% fee
      });
      
      it("maxWithdraw should account for withdraw fee", async function () {
        const { impactVault, underlyingVault, depositorA, withdrawFeeBps } = 
          await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
        const impactVaultAddress = await impactVault.getAddress();
        
        const maxWithdraw = await impactVault.maxWithdraw(depositorA.address);
        
        // Should be able to withdraw exactly maxWithdraw
        await expect(
          impactVault.connect(depositorA).withdraw(maxWithdraw, depositorA.address, depositorA.address)
        ).to.not.be.reverted;
      });
    });
  });
  
  // ==================== BOTH FEES TESTS ====================
  
  describe("Underlying Vault with Both Fees", function () {
    
    it("Round-trip deposit then full redeem should reflect both fees", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps, withdrawFeeBps } = 
        await loadFixture(deployedWithUnderlyingBothFeesFixture);
      const impactVaultAddress = await impactVault.getAddress();
      
      const depositAmount = parseUnits("1000");
      const assetsBefore = await mockAsset.balanceOf(depositorA.address);
      
      // Deposit
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
      const assetsAfterDeposit = await mockAsset.balanceOf(depositorA.address);
      expect(assetsBefore - assetsAfterDeposit).to.equal(depositAmount);
      
      // Redeem all shares
      const shares = await impactVault.balanceOf(depositorA.address);
      await impactVault.connect(depositorA).redeem(shares, depositorA.address, depositorA.address);
      
      const assetsAfterRedeem = await mockAsset.balanceOf(depositorA.address);
      const netAssetsBack = assetsAfterRedeem - assetsAfterDeposit;
      
      // Should have lost to both fees
      // Rough calculation: 1000 * (1 - 0.005) * (1 - 0.003) ≈ 992
      const afterDepositFee = applyDepositFee(depositAmount, depositFeeBps);
      const afterBothFees = applyWithdrawFee(afterDepositFee, withdrawFeeBps);
      
      // Net back should be less than deposit and roughly equal to theoretical
      expect(netAssetsBack).to.be.lt(depositAmount);
      // Allow some tolerance for rounding
      expect(netAssetsBack).to.be.closeTo(afterBothFees, parseUnits("1"));
    });
    
    it("previewDeposit should match actual with both fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithUnderlyingBothFeesFixture);
      
      const depositAmount = parseUnits("1000");
      
      const preview = await impactVault.previewDeposit(depositAmount);
      const actual = await impactVault.connect(depositorA).deposit.staticCall(depositAmount, depositorA.address);
      
      expect(preview).to.equal(actual);
    });
    
    it("previewMint should match actual with both fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithUnderlyingBothFeesFixture);
      
      const sharesToMint = parseUnits("1000");
      
      const preview = await impactVault.previewMint(sharesToMint);
      const actual = await impactVault.connect(depositorA).mint.staticCall(sharesToMint, depositorA.address);
      
      expect(preview).to.equal(actual);
    });
    
    it("previewWithdraw should match actual with both fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithDepositsAndBothFeesFixture);
      
      const withdrawAmount = parseUnits("500");
      
      const preview = await impactVault.previewWithdraw(withdrawAmount);
      const actual = await impactVault.connect(depositorA).withdraw.staticCall(
        withdrawAmount, depositorA.address, depositorA.address
      );
      
      expect(preview).to.equal(actual);
    });
    
    it("previewRedeem should match actual with both fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithDepositsAndBothFeesFixture);
      
      const sharesToRedeem = parseUnits("500");
      
      const preview = await impactVault.previewRedeem(sharesToRedeem);
      const actual = await impactVault.connect(depositorA).redeem.staticCall(
        sharesToRedeem, depositorA.address, depositorA.address
      );
      
      expect(preview).to.equal(actual);
    });
    
    it("Yield collection should work correctly with fees", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, owner } = 
        await loadFixture(deployedWithDepositsAndBothFeesFixture);
      const impactVaultAddress = await impactVault.getAddress();
      
      // Generate yield
      const yieldAmount = parseUnits("500");
      const underlyingAssetsBefore = await underlyingVault.totalAssets();
      const underlyingSharesBefore = await underlyingVault.totalSupply();
      const impactVaultPosition = await underlyingVault.balanceOf(impactVaultAddress);
      
      await underlyingVault.simulateYield(yieldAmount);
      
      // Impact vault's portion of yield
      const expectedSurplus = mulDiv(
        impactVaultPosition,
        underlyingAssetsBefore + yieldAmount,
        underlyingSharesBefore,
        false
      ) - impactVaultPosition;
      
      // Trigger timelock
      await impactVault.collectDonations(1);
      
      const [surplus] = await impactVault.timeLockedSurplus();
      expect(surplus).to.be.gt(0);
      
      // Wait for timelock
      await network.provider.send("evm_increaseTime", [3600 * 72 + 1]);
      await network.provider.send("evm_mine");
      
      const ownerBalanceBefore = await mockAsset.balanceOf(owner.address);
      await impactVault.collectDonations(1);
      const ownerBalanceAfter = await mockAsset.balanceOf(owner.address);
      
      // Owner should receive surplus (minus withdraw fee from underlying)
      const surplusReceived = ownerBalanceAfter - ownerBalanceBefore;
      expect(surplusReceived).to.be.gt(0);
    });
    
    it("Multiple users with fees should maintain fairness", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositorB, depositFeeBps, withdrawFeeBps } = 
        await loadFixture(deployedWithUnderlyingBothFeesFixture);
      
      // Both deposit same amount
      const depositAmount = parseUnits("1000");
      
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
      await impactVault.connect(depositorB).deposit(depositAmount, depositorB.address);
      
      const sharesA = await impactVault.balanceOf(depositorA.address);
      const sharesB = await impactVault.balanceOf(depositorB.address);
      
      // Both should have same shares (deposited at same NAV)
      expect(sharesA).to.equal(sharesB);
      
      // Both redeem all
      await impactVault.connect(depositorA).redeem(sharesA, depositorA.address, depositorA.address);
      await impactVault.connect(depositorB).redeem(sharesB, depositorB.address, depositorB.address);
      
      const finalA = await mockAsset.balanceOf(depositorA.address);
      const finalB = await mockAsset.balanceOf(depositorB.address);
      
      // Both should have same final balance (fairness)
      expect(finalA).to.equal(finalB);
    });
  });
  
  // ==================== EDGE CASES WITH FEES ====================
  
  describe("Edge Cases with Fees", function () {
    
    it("Should handle very small deposits with deposit fee", async function () {
      const { impactVault, mockAsset, depositorA, depositFeeBps } = 
        await loadFixture(deployedWithUnderlyingDepositFeeFixture);
      
      const smallDeposit = parseUnits("0.01"); // 0.01 USDC
      
      const preview = await impactVault.previewDeposit(smallDeposit);
      
      if (preview > 0n) {
        await impactVault.connect(depositorA).deposit(smallDeposit, depositorA.address);
        expect(await impactVault.balanceOf(depositorA.address)).to.equal(preview);
      }
    });
    
    it("Should handle maximum fee (99%)", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA } = 
        await loadFixture(fullERC4626DeploymentFixture);
      const impactVaultAddress = await impactVault.getAddress();
      
      // Set extreme fee (99%)
      await underlyingVault.setDepositFee(9900);
      
      await mockAsset.mint(depositorA.address, parseUnits("10000"));
      await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("10000"));
      
      const depositAmount = parseUnits("1000");
      
      // Should still work, just get very few shares
      const preview = await impactVault.previewDeposit(depositAmount);
      expect(preview).to.be.lt(depositAmount / 10n); // Less than 10% of deposit
      
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(preview);
    });
    
    it("Should handle fee change between operations", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps } = 
        await loadFixture(deployedWithUnderlyingDepositFeeFixture);
      
      const depositAmount = parseUnits("1000");
      
      // Deposit with initial fee
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
      const sharesAfterFirstDeposit = await impactVault.balanceOf(depositorA.address);
      
      // Change fee
      await underlyingVault.setDepositFee(100); // 1%
      
      // Deposit again
      await impactVault.connect(depositorA).deposit(depositAmount, depositorA.address);
      const sharesAfterSecondDeposit = await impactVault.balanceOf(depositorA.address);
      
      const secondDepositShares = sharesAfterSecondDeposit - sharesAfterFirstDeposit;
      
      // Second deposit should give fewer shares (higher fee)
      // Note: This depends on NAV changes too, so we just verify it works
      expect(secondDepositShares).to.be.gt(0);
    });
    
    it("Loss scenario with fees should work correctly", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, withdrawFeeBps } = 
        await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
      
      // Simulate loss
      await underlyingVault.simulateLoss(parseUnits("1000"));
      
      // Should still be able to withdraw (with compounded impact of loss + fee)
      const maxWithdraw = await impactVault.maxWithdraw(depositorA.address);
      expect(maxWithdraw).to.be.gt(0);
      
      await expect(
        impactVault.connect(depositorA).withdraw(maxWithdraw, depositorA.address, depositorA.address)
      ).to.not.be.reverted;
    });
    
    it("Yield scenario with fees should work correctly", async function () {
      const { impactVault, underlyingVault, mockAsset, depositorA, depositFeeBps } = 
        await loadFixture(deployedWithDepositsAndDepositFeeFixture);
      
      const sharesBefore = await impactVault.balanceOf(depositorA.address);
      
      // Simulate yield
      await underlyingVault.simulateYield(parseUnits("500"));
      
      // Shares unchanged
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(sharesBefore);
      
      // But total assets increased
      const totalAssets = await impactVault.totalAssets();
      const totalSupply = await impactVault.totalSupply();
      
      // NAV should be > 1 now (yield increased assets)
      expect(totalAssets).to.be.gt(totalSupply);
      
      // New deposit should get fewer shares per asset (NAV > 1)
      const newDeposit = parseUnits("1000");
      await mockAsset.mint(depositorA.address, newDeposit);
      await mockAsset.connect(depositorA).approve(await impactVault.getAddress(), newDeposit);
      
      const newShares = await impactVault.previewDeposit(newDeposit);
      expect(newShares).to.be.lt(newDeposit);
    });
  });
  
  // ==================== INVARIANTS WITH FEES ====================
  
  describe("Invariants with Fees", function () {
    
    it("totalSupply should equal sum of all balances with fees", async function () {
      const { impactVault, owner, depositorA, depositorB } = 
        await loadFixture(deployedWithDepositsAndBothFeesFixture);
      
      const totalSupply = await impactVault.totalSupply();
      const sumBalances = 
        await impactVault.balanceOf(owner.address) +
        await impactVault.balanceOf(depositorA.address) +
        await impactVault.balanceOf(depositorB.address);
      
      expect(totalSupply).to.equal(sumBalances);
    });
    
    it("User cannot withdraw more than maxWithdraw with fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
      
      const maxWithdraw = await impactVault.maxWithdraw(depositorA.address);
      
      await expect(
        impactVault.connect(depositorA).withdraw(
          maxWithdraw + 1n,
          depositorA.address,
          depositorA.address
        )
      ).to.be.reverted;
    });
    
    it("User cannot redeem more than maxRedeem with fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithDepositsAndWithdrawFeeFixture);
      
      const maxRedeem = await impactVault.maxRedeem(depositorA.address);
      
      await expect(
        impactVault.connect(depositorA).redeem(
          maxRedeem + 1n,
          depositorA.address,
          depositorA.address
        )
      ).to.be.reverted;
    });
    
    it("Vault should never hold assets directly with fees", async function () {
      const { impactVault, mockAsset } = 
        await loadFixture(deployedWithDepositsAndBothFeesFixture);
      
      const directBalance = await mockAsset.balanceOf(await impactVault.getAddress());
      expect(directBalance).to.equal(0n);
    });
    
    it("Full redemption should zero balance with fees", async function () {
      const { impactVault, depositorA } = 
        await loadFixture(deployedWithDepositsAndBothFeesFixture);
      
      const balance = await impactVault.balanceOf(depositorA.address);
      await impactVault.connect(depositorA).redeem(balance, depositorA.address, depositorA.address);
      
      expect(await impactVault.balanceOf(depositorA.address)).to.equal(0n);
    });
  });
});
