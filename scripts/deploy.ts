import { ethers, network } from "hardhat";
import fs from "fs";
import { verifyContract } from "../utils/verify";
import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const WAIT_BLOCK_CONFIRMATION = 10;

const MINIMAL_DEPOSIT = "1000000000";

async function main() {
  let jsonAddresses: { [key: string]: string } = {};
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const deployerAddress = await deployer.getAddress();

  // const TestStETHFactory = await ethers.getContractFactory("TestStETH");
  // const testStETH = await TestStETHFactory.deploy();
  // console.log("testStETH deployed to:", await testStETH.getAddress());
  //await testStETH.deployed();

  const ImpactVaultFactory = await ethers.getContractFactory("ImpactVault");
/*const impactVault = await ImpactVaultFactory.deploy(
    "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    "MSF Staked Ether",
    "msfETH",
    MINIMAL_DEPOSIT,
  );*/
  
  const impactVault = ImpactVaultFactory.attach("0x34f4e4b964a3e648723aE71AF5550FbC85E2e534");
  //console.log("impactVault deployed to:", await impactVault.getAddress());
  //await impactVault.deployed();

  /*
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
  */
  const MSFPointFactory = await ethers.getContractFactory("MSFPoint");

  const MSFPoint = await MSFPointFactory.deploy("MSF-KARMA","KARMA");
  console.log(
    "KARMA deployed to:",
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

   // await testStETH
    //  .connect(deployer)
    //  .mint(deployerAddress, ethers.parseEther("10000"));
   // console.log("Minted 10000e18 test STETH to :", deployerAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
