import { ethers, network } from "hardhat";
import fs from "fs";
import { verifyContract } from "../utils/verify";
import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const WAIT_BLOCK_CONFIRMATION = 10;

const MINIMAL_DEPOSIT = "1000000000";

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const deployerAddress = await deployer.getAddress();
  console.log(
    "deployerAddress:",
    deployerAddress,
  );



  const testStEThFactory = await ethers.getContractFactory("TestStETH");
  const testStETH  = await testStEThFactory.deploy();

  console.log(
    "testStETH deployed to:",
    await testStETH.getAddress(),
  );

  await testStETH
  .connect(deployer)
  .mint(deployerAddress, ethers.parseEther("10000"));
  console.log("Minted 10000e18 test STETH to :", deployerAddress);


  
  const ImpactVaultFactory = await ethers.getContractFactory("ImpactVault");
  const impactVault = await ImpactVaultFactory.deploy(
    await testStETH.getAddress(),
    "MSF Staked Ether",
    "msfETH",
    MINIMAL_DEPOSIT,
  );
  console.log("impactVault deployed to:", await impactVault.getAddress());
  //await impactVault.deployed();

  const LidoImpactVaultDepositorFactory = await ethers.getContractFactory(
    "LidoImpactVaultDepositor",
  );
  const lidoImpactVaultDepositor = await LidoImpactVaultDepositorFactory.deploy(
    "0x462F351EE8b10Cc21B161ad698eF3CEba957FE65",
    await impactVault.getAddress(),
  );
  // await lidoImpactVaultDepositor.deployed();
  console.log(
    "lidoImpactVaultDepositor deployed to:",
    await lidoImpactVaultDepositor.getAddress(),
  );

  const MSFPointFactory = await ethers.getContractFactory("MSFPoint");

  const MSFPoint = await MSFPointFactory.deploy("MSFPoint","MSFP");
  console.log(
    "MSFPoint deployed to:",
    await MSFPoint.getAddress(),
  );


  const CharityEscrowFactory  = await ethers.getContractFactory("CharityEscrow");

  const CharityEscrow = await CharityEscrowFactory.deploy(
    await impactVault.getAddress(), 
    await MSFPoint.getAddress(), 
    ethers.parseEther("1"), 
    ethers.parseEther("1"), 
    ethers.parseEther("0.05"),
    "Charity-Ecrow MSF Staked Ether",
    "ce-msfETH"
  );
  console.log(
    "CharityEscrow deployed to:",
    await CharityEscrow.getAddress(),
  );
  await MSFPoint.waitForDeployment()

  await MSFPoint.grantRole(await MSFPoint.MINTER_ROLE(), await CharityEscrow.getAddress());



}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
