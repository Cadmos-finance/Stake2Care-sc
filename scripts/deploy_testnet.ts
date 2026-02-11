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


  /*
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
  const lidoAddress = network.name === "sepolia" || network.name === "localhost" 
    ? await testStETH.getAddress()  // Use your test token
    : "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af"; // Real Lido on Sepolia (if needed)

  const lidoImpactVaultDepositor = await LidoImpactVaultDepositorFactory.deploy(
    lidoAddress,
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

  */
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const testUSDT  = await MockERC20Factory.deploy("Test USDT","tUSDT",6);
  await testUSDT.waitForDeployment();

  console.log(
    "testUSDT deployed to:",
    await testUSDT.getAddress(),
  );
    await testUSDT
  .connect(deployer)
  .mint(deployerAddress, ethers.parseEther("10000"));
  console.log("Minted 10000e6 test USDT to :", deployerAddress);



  const testUSDC  = await MockERC20Factory.deploy("Test USDC","tUSDC",6);

  console.log(
    "testUSDC deployed to:",
    await testUSDC.getAddress(),
  );
  await testUSDC
  .connect(deployer)
  .mint(deployerAddress, ethers.parseEther("10000"));
  console.log("Minted 10000e6 test USDC to :", deployerAddress);

  const MockVaultFactory = await ethers.getContractFactory("UnderlyingVaultMock");

  const USDTVault = await MockVaultFactory.deploy(await testUSDT.getAddress());
  await USDTVault.waitForDeployment();
    console.log(
    "USDTVault deployed to:",
    await USDTVault.getAddress(),
  );
  
  const USDCVault = await MockVaultFactory.deploy(await testUSDC.getAddress());
  await USDCVault.waitForDeployment();
  console.log(
    "USDCVault deployed to:",
    await USDCVault.getAddress(),
  );

  
  const ERC4626ImpactVault = await ethers.getContractFactory("ERC4626ImpactVault");
  const USDTImpactVault = await ERC4626ImpactVault.deploy(await USDTVault.getAddress(),"USDT Impact Vault","ivUSDT",1000000);
  console.log(
    "USDTImpactVault deployed to:",
    await USDTImpactVault.getAddress(),
  );
  const USDCImpactVault = await ERC4626ImpactVault.deploy(await USDCVault.getAddress(),"USDC Impact Vault","ivUSDC",1000000);
    console.log(
    "USDCImpactVault deployed to:",
    await USDCImpactVault.getAddress(),
  );





}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
