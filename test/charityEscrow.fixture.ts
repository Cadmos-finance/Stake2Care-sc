import { MSFPoint } from "../typechain-types";
import { ethers } from "hardhat";

export async function deployTestStEth() {
  const testStETHFactory = await ethers.getContractFactory("TestStETH");
  const testStETH = await testStETHFactory.deploy();
  return testStETH;
}

export async function deployImpactVaultFixture(stEthAddress: string) {
  const impactVaultFactory = await ethers.getContractFactory("ImpactVault");
  const impactVault = await impactVaultFactory.deploy(
    stEthAddress,
    "MSF-Staked Ether",
    "MSF-STETH",
    "1000000000"
  );
  return impactVault;
}

export async function deployMSFPointFixture() {
  const name = "MSFPoint";
  const symbol = "MSFP";
  const MSFPointFactory = await ethers.getContractFactory("MSFPoint");
  const msfp = await MSFPointFactory.deploy(name, symbol);
  return msfp;
}

export async function deployCharityEscrowFixture(
  impactVaultAdd: string,
  msfp: MSFPoint,
  baseEarnRate: bigint,
  yearlyBonus: bigint,
  pointPrice: bigint
) {
  const charityEscrowFactory = await ethers.getContractFactory("CharityEscrow");
  const charityEscrow = await charityEscrowFactory.deploy(
    impactVaultAdd,
    await msfp.getAddress(),
    baseEarnRate,
    yearlyBonus,
    pointPrice,
    "CharityEscow",
    "CE"
  );

  await msfp.grantRole(await msfp.MINTER_ROLE(), charityEscrow);

  return charityEscrow;
}

export async function fullDeploymentFixture() {
  const [owner, investorA, investorB] = await ethers.getSigners();
  const msfp = await deployMSFPointFixture();
  const stEth = await deployTestStEth();
  const stEthAddress = await stEth.getAddress();
  const impactVault = await deployImpactVaultFixture(stEthAddress);
  const impactVaultAddress = await impactVault.getAddress();
  const charityEscrow = await deployCharityEscrowFixture(
    impactVaultAddress,
    msfp,
    10n ** 18n,
    3n * 10n ** 18n,
    10n ** 18n
  );

  return {
    charityEscrow,
    msfp,
    stEth,
    impactVault,
    owner,
    investorA,
    investorB,
  };
}
