import { ethers } from "hardhat";
import { MockERC20, UnderlyingVaultMock, ERC4626ImpactVault } from "../typechain-types";

// USDC-like: 6 decimals
const DECIMALS = 6;
const ONE_UNIT = 10n ** BigInt(DECIMALS); // 1e6 = 1 USDC

// Helper to parse amounts with 6 decimals
export function parseUnits(amount: string | number): bigint {
  if (typeof amount === "number") {
    return BigInt(Math.floor(amount * Number(ONE_UNIT)));
  }
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(DECIMALS, "0").slice(0, DECIMALS);
  return BigInt(whole + paddedDecimal);
}

export async function deployMockERC20(
  name: string = "Mock USDC",
  symbol: string = "MUSDC",
  decimals: number = DECIMALS
) {
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20Factory.deploy(name, symbol, decimals);
  return mockToken;
}

export async function deployUnderlyingVaultMock(assetAddress: string) {
  const UnderlyingVaultFactory = await ethers.getContractFactory("UnderlyingVaultMock");
  const underlyingVault = await UnderlyingVaultFactory.deploy(assetAddress);
  return underlyingVault;
}

export async function deployERC4626ImpactVault(
  underlyingVaultAddress: string,
  name: string = "Impact Vault Share",
  symbol: string = "IV-SHARE",
  minDeposit: bigint = 1000n // 0.001 USDC (1000 units with 6 decimals)
) {
  const ERC4626ImpactVaultFactory = await ethers.getContractFactory("ERC4626ImpactVault");
  const impactVault = await ERC4626ImpactVaultFactory.deploy(
    underlyingVaultAddress,
    name,
    symbol,
    minDeposit
  );
  return impactVault;
}

export async function fullERC4626DeploymentFixture() {
  const [owner, depositorA, depositorB, depositorC] = await ethers.getSigners();
  
  // Deploy mock underlying asset (USDC-like, 6 decimals)
  const mockAsset = await deployMockERC20("Mock USDC", "MUSDC", DECIMALS);
  const mockAssetAddress = await mockAsset.getAddress();
  
  // Deploy underlying vault (ERC4626) - simulates Morpho vault
  const underlyingVault = await deployUnderlyingVaultMock(mockAssetAddress);
  const underlyingVaultAddress = await underlyingVault.getAddress();
  
  // Seed the underlying vault to prevent rounding issues (1000 USDC)
  await mockAsset.mint(owner.address, parseUnits("1000"));
  await mockAsset.approve(underlyingVaultAddress, parseUnits("1000"));
  await underlyingVault.deposit(parseUnits("1000"), owner.address);
  
  // Deploy ERC4626ImpactVault
  const impactVault = await deployERC4626ImpactVault(
    underlyingVaultAddress,
    "Impact Vault Share",
    "IV-SHARE",
    1000n // 0.001 USDC min deposit
  );
  const impactVaultAddress = await impactVault.getAddress();
  
  // Seed the impact vault (100 USDC)
  await mockAsset.mint(owner.address, parseUnits("100"));
  await mockAsset.approve(impactVaultAddress, parseUnits("100"));
  await impactVault.deposit(parseUnits("100"), owner.address);

  return {
    mockAsset,
    underlyingVault,
    impactVault,
    owner,
    depositorA,
    depositorB,
    depositorC,
    parseUnits, // Export helper for use in tests
  };
}

export async function deployedWithDepositsFixture() {
  const fixture = await fullERC4626DeploymentFixture();
  const { mockAsset, impactVault, depositorA, depositorB } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Give depositors some assets (10000 USDC each)
  await mockAsset.mint(depositorA.address, parseUnits("10000"));
  await mockAsset.mint(depositorB.address, parseUnits("10000"));

  // Approve and deposit
  await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("10000"));
  await mockAsset.connect(depositorB).approve(impactVaultAddress, parseUnits("10000"));

  // Each deposits 5000 USDC
  await impactVault.connect(depositorA).deposit(parseUnits("5000"), depositorA.address);
  await impactVault.connect(depositorB).deposit(parseUnits("5000"), depositorB.address);

  return fixture;
}

const BPS = 10000n;

export async function deployedWithUnderlyingDepositFeeFixture() {
  const fixture = await fullERC4626DeploymentFixture();
  const { underlyingVault, mockAsset, depositorA, depositorB, impactVault } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Set 0.5% deposit fee (50 bps)
  const depositFeeBps = 50n;
  await underlyingVault.setDepositFee(depositFeeBps);

  // Give depositors assets
  await mockAsset.mint(depositorA.address, parseUnits("10000"));
  await mockAsset.mint(depositorB.address, parseUnits("10000"));
  await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("10000"));
  await mockAsset.connect(depositorB).approve(impactVaultAddress, parseUnits("10000"));

  return { ...fixture, depositFeeBps, BPS };
}

export async function deployedWithUnderlyingWithdrawFeeFixture() {
  const fixture = await fullERC4626DeploymentFixture();
  const { underlyingVault, mockAsset, depositorA, depositorB, impactVault } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Set 0.3% withdraw fee (30 bps)
  const withdrawFeeBps = 30n;
  await underlyingVault.setWithdrawFee(withdrawFeeBps);

  // Give depositors assets
  await mockAsset.mint(depositorA.address, parseUnits("10000"));
  await mockAsset.mint(depositorB.address, parseUnits("10000"));
  await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("10000"));
  await mockAsset.connect(depositorB).approve(impactVaultAddress, parseUnits("10000"));

  return { ...fixture, withdrawFeeBps, BPS };
}

export async function deployedWithUnderlyingBothFeesFixture() {
  const fixture = await fullERC4626DeploymentFixture();
  const { underlyingVault, mockAsset, depositorA, depositorB, impactVault } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Set both fees
  const depositFeeBps = 50n;  // 0.5%
  const withdrawFeeBps = 30n; // 0.3%
  await underlyingVault.setDepositFee(depositFeeBps);
  await underlyingVault.setWithdrawFee(withdrawFeeBps);

  // Give depositors assets
  await mockAsset.mint(depositorA.address, parseUnits("10000"));
  await mockAsset.mint(depositorB.address, parseUnits("10000"));
  await mockAsset.connect(depositorA).approve(impactVaultAddress, parseUnits("10000"));
  await mockAsset.connect(depositorB).approve(impactVaultAddress, parseUnits("10000"));

  return { ...fixture, depositFeeBps, withdrawFeeBps, BPS };
}

export async function deployedWithDepositsAndDepositFeeFixture() {
  const fixture = await deployedWithUnderlyingDepositFeeFixture();
  const { mockAsset, impactVault, depositorA, depositorB, depositFeeBps } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Each deposits 5000 USDC (will receive fewer shares due to fee)
  await impactVault.connect(depositorA).deposit(parseUnits("5000"), depositorA.address);
  await impactVault.connect(depositorB).deposit(parseUnits("5000"), depositorB.address);

  return fixture;
}

export async function deployedWithDepositsAndWithdrawFeeFixture() {
  const fixture = await deployedWithUnderlyingWithdrawFeeFixture();
  const { mockAsset, impactVault, depositorA, depositorB } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Each deposits 5000 USDC
  await impactVault.connect(depositorA).deposit(parseUnits("5000"), depositorA.address);
  await impactVault.connect(depositorB).deposit(parseUnits("5000"), depositorB.address);

  return fixture;
}

export async function deployedWithDepositsAndBothFeesFixture() {
  const fixture = await deployedWithUnderlyingBothFeesFixture();
  const { mockAsset, impactVault, depositorA, depositorB } = fixture;
  const impactVaultAddress = await impactVault.getAddress();

  // Each deposits 5000 USDC
  await impactVault.connect(depositorA).deposit(parseUnits("5000"), depositorA.address);
  await impactVault.connect(depositorB).deposit(parseUnits("5000"), depositorB.address);

  return fixture;
}