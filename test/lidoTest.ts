import {
  TestStETH,
  ImpactVault,
  LidoImpactVaultDepositor,
} from "../typechain-types";
import { Signer, toBigInt } from "ethers";
import { ethers } from "hardhat";
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
      "1000000000"
    );

    let LidoImpactVaultDepositorFactory = await ethers.getContractFactory(
      "LidoImpactVaultDepositor"
    );
    lidoImpactVaultDepositor = await LidoImpactVaultDepositorFactory.deploy(
      await lidoReferral.getAddress(),
      await impactVault.getAddress()
    );

    await testStETH.mint(
      await deployer.getAddress(),
      ethers.parseEther("10000.1")
    );

    await testStETH.approve(
      await impactVault.getAddress(),
      ethers.parseEther("0.1")
    );
    await impactVault.deposit(
      ethers.parseEther("0.1"),
      await deployer.getAddress()
    );
  });

  it("Deployer has correct STETH balance at test start and can set STETH accrual", async () => {
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("10000")
    );

    await testStETH.changeAccrual(ethers.parseEther("1.2"));
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("12000")
    );
    await testStETH.changeAccrual(ethers.parseEther("0.8"));
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("8000")
    );
  });

  it("Only deployer can set STETH accrual and call the mint function", async () => {
    await expect(
      testStETH.connect(depositor).changeAccrual(ethers.parseEther("42"))
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      testStETH
        .connect(depositor)
        .mint(await deployer.getAddress(), ethers.parseEther("42"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Anyone can submit by sending ETH directly to the StETH contract", async () => {
    const tx = await depositor.sendTransaction({
      to: await testStETH.getAddress(),
      value: ethers.parseEther("10"), // 10 ETH
    });
    await tx.wait();
    expect(await testStETH.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("10")
    );
  });

  it("Deployer has correct MSF-STETH balance at test start", async () => {
    expect(await impactVault.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("0.1")
    );
  });

  it("ImpactVault has minimum deposit limit of 1GWei", async () => {
    const tx = await depositor.sendTransaction({
      to: await testStETH.getAddress(),
      value: ethers.parseEther("10"), // 10 ETH
    });
    await tx.wait();

    const tx2 = await testStETH
      .connect(depositor)
      .approve(await impactVault.getAddress(), ethers.parseEther("10"));
    await tx2.wait();

    const gwei = "1000000000";
    await expect(impactVault.deposit(gwei, await depositor.getAddress())).to.be
      .reverted;

    await expect(impactVault.mint(gwei, await depositor.getAddress())).to.be
      .reverted;

    const tx3 = await impactVault
      .connect(depositor)
      .deposit("1000000001", await depositor.getAddress()); // deposits gwei + 1 wei
    await tx3.wait();

    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      "1000000001"
    ); // received gwei + 1 wei MSF-STETH in exchange

    const tx4 = await impactVault
      .connect(depositor)
      .mint("1000000001", await depositor.getAddress()); // deposits 10 StETH
    await tx4.wait();

    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      "2000000002"
    ); // received gwei + 1 wei MSF-STETH in exchange
  });

  it("Depositor can Mint Asset by sending ETH to receive() of lidoImpactVaultDepositor and then Withdraw", async () => {
    const startDepositorBalanceETH = await ethers.provider.getBalance(
      depositor.getAddress()
    );
    const startContractBalanceSTETH = await testStETH.balanceOf(
      impactVault.getAddress()
    ); // 0.1
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(0);
    const tx = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });

    let rcpt = await tx.wait();
    let gasSpent = rcpt!.gasUsed * rcpt!.gasPrice;

    expect(await ethers.provider.getBalance(depositor.getAddress())).to.equal(
      startDepositorBalanceETH - ethers.parseEther("1.0") - gasSpent
    ); // Depositor Spent 1 eth
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0")
    ); // and received 1 MSF-STETH in exchange

    await testStETH.connect(deployer).changeAccrual(ethers.parseEther("0.8")); // we reduce Value
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0")
    ); // Depositor still has one Share
    expect(
      await impactVault.convertToAssets(ethers.parseEther("1.0"))
    ).to.equal(ethers.parseEther("0.8")); // but it is worth 0.8 STETH now

    await testStETH.connect(deployer).changeAccrual(ethers.parseEther("1.2")); // we increase value above 1
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0")
    ); // Depositor still has one Share
    expect(
      await impactVault.convertToAssets(ethers.parseEther("1.0"))
    ).to.equal(ethers.parseEther("1.0")); // and it is worth 1.0 STETH now

    const tx2 = await impactVault
      .connect(depositor)
      .redeem(
        ethers.parseEther("1.0"),
        depositor.getAddress(),
        depositor.getAddress()
      ); // Depositor Redeems all his holdings
    rcpt = await tx2.wait(1);
    gasSpent += rcpt!.gasUsed * rcpt!.gasPrice;
    expect(await ethers.provider.getBalance(depositor.getAddress())).to.equal(
      startDepositorBalanceETH - ethers.parseEther("1.0") - gasSpent
    ); // no change on ETH balance
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(0); // Depositor redeemed all MSF-STETH
    expect(await testStETH.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1.0") - ethers.parseUnits("1", 0)
    ); // Depositor received 1 STETH
    expect(await testStETH.balanceOf(deployer.getAddress())).to.equal(
      ethers.parseEther("12000")
    ); // Deployer did not receive accrual
    expect(await testStETH.balanceOf(impactVault.getAddress())).to.equal(
      startContractBalanceSTETH + ethers.parseEther("0.22")
    ); // as it is left in Vault
  });

  it("Depositor can Mint Asset by sending StETH via depositAsset() function of lidoImpactVaultDepositor", async () => {
    const tx = await depositor.sendTransaction({
      to: await testStETH.getAddress(),
      value: ethers.parseEther("10"), // 10 ETH
    });
    await tx.wait();

    const tx2 = await testStETH
      .connect(depositor)
      .approve(
        await lidoImpactVaultDepositor.getAddress(),
        ethers.parseEther("10")
      );
    await tx2.wait();

    const tx3 = await lidoImpactVaultDepositor
      .connect(depositor)
      .depositAsset(ethers.parseEther("10")); // deposits 10 StETH
    await tx3.wait();

    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("10")
    ); // received 10 MSF-STETH in exchange
  });

  it("Depositor can Mint Asset by sending ETH to depositETH() of lidoImpactVaultDepositor with a depositProportion of 80%", async () => {
    const startDepositorBalanceETH = await ethers.provider.getBalance(
      depositor.getAddress()
    );

    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(0);

    const depositProportion = ethers.parseEther("0.8");
    const tx = await lidoImpactVaultDepositor
      .connect(depositor)
      .depositETH(depositProportion, { value: ethers.parseEther("1") }); // deposits 1 ETH with a generosity factor of 80%
    await tx.wait();

    let rcpt = await tx.wait();
    let gasSpent = rcpt!.gasUsed * rcpt!.gasPrice;

    expect(await ethers.provider.getBalance(depositor.getAddress())).to.equal(
      startDepositorBalanceETH - ethers.parseEther("1.0") - gasSpent
    ); // Depositor Spent 1 eth
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("0.8")
    ); // and received 0.8 MSF-STETH in exchange
    expect(await testStETH.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("0.2")
    ); // and received 0.2 STETH in exchange
  });

  it("depositToken() should revert with NotImplementedError", async () => {
    const wad = ethers.parseEther("1.0");
    await expect(
      lidoImpactVaultDepositor.depositToken(
        wad,
        await testStETH.getAddress(),
        wad
      )
    ).to.be.revertedWithCustomError(
      lidoImpactVaultDepositor,
      "NotImplementedError"
    );
  });

  it("Only owner can set AutoCollectThreshold", async () => {
    const tx = await impactVault.setAutoCollectThreshold(100000n);
    await tx.wait();
    expect(
      (await impactVault.timeLockedSurplus()).minimalCollectAmount
    ).to.be.equal(100000n);

    await expect(
      impactVault.connect(depositor).setAutoCollectThreshold(42n)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Depositor can mint shares by sending ETH via mint() of impactVault and then withdraw", async () => {
    const startDepositorBalanceETH = await ethers.provider.getBalance(
      depositor.getAddress()
    );

    const tx = await depositor.sendTransaction({
      to: await testStETH.getAddress(),
      value: ethers.parseEther("1"), // 1 ETH
    });
    let rcpt = await tx.wait();
    let gasSpent = rcpt!.gasUsed * rcpt!.gasPrice;

    const tx2 = await testStETH
      .connect(depositor)
      .approve(await impactVault.getAddress(), ethers.parseEther("1"));
    rcpt = await tx2.wait();
    gasSpent += rcpt!.gasUsed * rcpt!.gasPrice;
    expect(await ethers.provider.getBalance(depositor.getAddress())).to.equal(
      startDepositorBalanceETH - ethers.parseEther("1") - gasSpent
    );

    const tx3 = await impactVault
      .connect(depositor)
      .mint(ethers.parseEther("1"), depositor.getAddress());
    await tx3.wait();

    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1")
    );

    expect(await impactVault.convertToShares(ethers.parseEther("1"))).to.equal(
      ethers.parseEther("1")
    );

    const tx4 = await testStETH
      .connect(deployer)
      .changeAccrual(ethers.parseEther("0.8")); // we decrease value below 1
    await tx4.wait();
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1")
    ); // Depositor still has one Share

    expect(
      await impactVault.convertToShares(ethers.parseEther("0.8"))
    ).to.equal(ethers.parseEther("1") - 1n); // -1 wei because of rounding down error

    const tx5 = await testStETH
      .connect(deployer)
      .changeAccrual(ethers.parseEther("1.2")); // we increase value above 1
    await tx5.wait();
    expect(await impactVault.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1")
    ); // Depositor still has one Share

    expect(await impactVault.convertToShares(ethers.parseEther("1"))).to.equal(
      ethers.parseEther("1")
    );

    const tx6 = await impactVault
      .connect(depositor)
      .withdraw(
        ethers.parseEther("1"),
        depositor.getAddress(),
        depositor.getAddress()
      ); // Depositor withdraws all his holdings
    await tx6.wait();
    expect(await testStETH.balanceOf(depositor.getAddress())).to.equal(
      ethers.parseEther("1") - 1n
    ); // -1 wei because of rounding down error
  });

  it("collectDonations is timelocked for 3 days after second deposit", async () => {
    const tx = await testStETH
      .connect(deployer)
      .changeAccrual(ethers.parseEther("1.2")); // we increase value above 1
    await tx.wait();

    const tx2 = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await tx2.wait(); // this is the second deposit, the first one happened in beforeEach block by deployer

    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(
      ethers.parseEther("0.02")
    ); // 20% accrual on the first 0.1 ETH deposit
    expect(await testStETH.balanceOf(deployer.getAddress())).to.be.equal(
      ethers.parseEther("12000")
    ); // surplus not yet distributed (1.2*1000)

    const tx3 = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await tx3.wait();
    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(
      ethers.parseEther("0.02")
    ); // 20% accrual on the first 0.1 ETH deposit
    expect(await testStETH.balanceOf(deployer.getAddress())).to.be.equal(
      ethers.parseEther("12000")
    ); // surplus not yet distributed (timelock)

    await ethers.provider.send("evm_increaseTime", [3600 * 72]); // 72 hours pass

    const tx4 = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await tx4.wait();
    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(0); // surplus was distributed after timelock
    expect(
      (await testStETH.balanceOf(deployer.getAddress())) -
        ethers.parseEther("12000")
    ).to.be.equal(ethers.parseEther("0.02") - 2n); // surplus distributed to owner, -2 wei for rounding
  });

  it("collectDonations does not update pending surplus if it is below autoCollectThreshold", async () => {
    const tx = await testStETH
      .connect(deployer)
      .changeAccrual(ethers.parseEther("1.2")); // we increase value above 1
    await tx.wait();

    const tx2 = await impactVault.setAutoCollectThreshold(
      ethers.parseEther("0.03")
    );
    await tx2.wait();

    const tx3 = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await tx3.wait(); // this is the second deposit, the first one happened in beforeEach block by deployer

    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(0); //still 0 because pending surplus of 0.02 is still below the autocollect threshold of 0.03
    expect(await testStETH.balanceOf(deployer.getAddress())).to.be.equal(
      ethers.parseEther("12000")
    ); // surplus not yet distributed (1.2*1000)

    const tx4 = await testStETH
      .connect(deployer)
      .changeAccrual(ethers.parseEther("1.3")); // we increase again value above 1
    await tx4.wait();

    const tx5 = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await tx5.wait();
    // Now surplus should be updated:
    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(
      83333333333333333n + ethers.parseEther("0.03") - 1n
    ); // 30% accrual on the first 0.1 ETH deposit + 0.3/1.2 accrual on second 1 ETH deposit, -1 wei for rounding
    expect(await testStETH.balanceOf(deployer.getAddress())).to.be.equal(
      ethers.parseEther("13000")
    ); // surplus not yet distributed (timelock)
  });

  it("collectDonations can be called with custom minimalTransfer to bypass minimalCollectAmount", async () => {
    const tx = await testStETH
      .connect(deployer)
      .changeAccrual(ethers.parseEther("1.2")); // we increase value above 1
    await tx.wait();

    const tx2 = await impactVault.setAutoCollectThreshold(
      ethers.parseEther("0.03")
    );
    await tx2.wait();

    const tx3 = await depositor.sendTransaction({
      to: await lidoImpactVaultDepositor.getAddress(),
      value: ethers.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await tx3.wait(); // this is the second deposit, the first one happened in beforeEach block by deployer

    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(0); //still 0 because pending surplus of 0.02 is still below the autocollect threshold of 0.03
    expect(await testStETH.balanceOf(deployer.getAddress())).to.be.equal(
      ethers.parseEther("12000")
    ); // surplus not yet distributed (1.2*1000)

    const tx4 = await impactVault.collectDonations(1n); // this should update the pending surplus
    expect((await impactVault.timeLockedSurplus())[0]).to.be.equal(
      ethers.parseEther("0.02") - 1n
    ); //surplus updated
    expect(await testStETH.balanceOf(deployer.getAddress())).to.be.equal(
      ethers.parseEther("12000")
    ); // surplus not yet distributed (1.2*1000)
  });
});
