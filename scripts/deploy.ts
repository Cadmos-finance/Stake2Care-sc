import { ethers, network } from "hardhat";
import fs from "fs";
import { verifyContract } from "../utils/verify";
import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const WAIT_BLOCK_CONFIRMATION = 10;

async function main() {
  let jsonAddresses: { [key: string]: string } = {};
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const deployerAddress = await deployer.getAddress();

  const TestStETHFactory = await ethers.getContractFactory("TestStETH");
  const testStETH = await TestStETHFactory.deploy();
  console.log("testStETH deployed to:", await testStETH.getAddress());
  //await testStETH.deployed();

  const ImpactVaultFactory = await ethers.getContractFactory("ImpactVault");
  const impactVault = await ImpactVaultFactory.deploy(
    await testStETH.getAddress(),
    "MSF Staked Ether",
    "msfETH",
  );
  console.log("impactVault deployed to:", await impactVault.getAddress());
  //await impactVault.deployed();

  const LidoImpactVaultDepositorFactory = await ethers.getContractFactory(
    "LidoImpactVaultDepositor",
  );
  const lidoImpactVaultDepositor = await LidoImpactVaultDepositorFactory.deploy(
    await deployer.getAddress(),
    await impactVault.getAddress(),
  );
  // await lidoImpactVaultDepositor.deployed();
  console.log(
    "lidoImpactVaultDepositor deployed to:",
    await lidoImpactVaultDepositor.getAddress(),
  );

  await testStETH
    .connect(deployer)
    .mint(deployerAddress, ethers.parseEther("10000"));
  console.log("Minted 10000e18 test STETH to :", deployerAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
