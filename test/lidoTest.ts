import {
  TestStETH,
  ImpactVault,
  LidoImpactVaultDepositor,
} from "../typechain-types";
import { Signer } from "ethers";
import { ethers, network } from "hardhat";
import { expect } from "chai";

describe("Impact Vault", async () => {
  let testStETH: TestStETH;
  let impactVault: ImpactVault;
  let lidoImpactVaultDepositor: LidoImpactVaultDepositor;
  let accounts: Signer[];
  let deployer: Signer;
  let depositor: Signer;
  let lidoReferral: Signer;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    depositor = accounts[1];
    lidoReferral = accounts[2];

    let TestStETHFactory = await ethers.getContractFactory("TestStETH");
    testStETH = await TestStETHFactory.deploy();

    let ImpactVaultFactory = await ethers.getContractFactory("ImpactVault");
    impactVault = await ImpactVaultFactory.deploy(
      await testStETH.getAddress(),
      "MSF-Staked Ether",
      "MSF-STETH",
    );

    let LidoImpactVaultDepositorFactory = await ethers.getContractFactory(
      "LidoImpactVaultDepositor",
    );
    lidoImpactVaultDepositor = await LidoImpactVaultDepositorFactory.deploy(
      await lidoReferral.getAddress(),
      await impactVault.getAddress(),
    );

    await testStETH
      .connect(deployer)
      .mint(await deployer.getAddress(), ethers.parseEther("10000.1"));

    await testStETH
      .connect(deployer)
      .approve(await impactVault.getAddress(), ethers.parseEther("0.1"));
    await impactVault
      .connect(deployer)
      .deposit(ethers.parseEther("0.1"), await deployer.getAddress());
  });
  it("Deployer has correct STETH balance at test start and can set STETH accrual", async () => {
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("10000"),
    );

    await testStETH.connect(deployer).changeAccrual(ethers.parseEther("1.2"));
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("12000"),
    );
    await testStETH.connect(deployer).changeAccrual(ethers.parseEther("0.8"));
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("8000"),
    );
  });

  it("Deployer has correct MSF-STETH balance at test start", async () => {
    expect(await impactVault.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("0.1"),
    );
  });

  it("Depositor can Mint Asset by sending ETH to receive() of lidoImpactVaultDepositor and then Withdraw", async () => {
    let startDepositorBalanceETH = await ethers.provider.getBalance(
      depositor.getAddress(),
    );
    let startContractBalanceSTETH = await testStETH.balanceOf(
      impactVault.getAddress(),
    ); // 0.1
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(0);
    await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });

    expect(await ethers.provider.getBalance(depositor.getAddress())).to.equal(
      startDepositorBalanceETH - ethers.parseEther("1.0"),
    ); // Depsoitor Spent 1 eth
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0"),
    ); // and received 1 MSF-STETH in exchange

    await testStETH.connect(deployer).changeAccrual(ethers.parseEther("0.8")); // we reduce Value
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0"),
    ); // Depositor still has one Share
    expect(
      await impactVault.convertToAssets(ethers.parseEther("1.0")),
    ).to.equal(ethers.parseEther("0.8")); // but it is worth 0.8 STETH now

    await testStETH.connect(deployer).changeAccrual(ethers.parseEther("1.2")); // we increase value above 1
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0"),
    ); // Depositor still has one Share
    expect(
      await impactVault.convertToAssets(ethers.parseEther("1.0")),
    ).to.equal(ethers.parseEther("1.0")); // and it is worth 1.0 STETH now

    await impactVault
      .connect(depositor)
      .redeem(
        ethers.parseEther("1.0"),
        depositor.getAddress(),
        depositor.getAddress(),
      ); // Depositor Redeems all his holdings

    expect(await ethers.provider.getBalance(depositor.getAddress())).to.equal(
      startDepositorBalanceETH - ethers.parseEther("1.0"),
    ); // no change on ETH balance
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(0); // Depositor redeemed all MSF-STETH
    expect(await testStETH.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0") - ethers.parseUnits("1", 0),
    ); // Depositor received 1 STETH
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("12000"),
    ); // Deployer did not receive accrual
    expect(await testStETH.balanceOf(impactVault.getAddress())).to.equal(
      startContractBalanceSTETH + ethers.parseEther("0.22"),
    ); // as it is left in Vault
  });
});
