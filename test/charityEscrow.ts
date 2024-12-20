const { time } = require('@nomicfoundation/hardhat-network-helpers');
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  deployMSFPointFixture,
  deployTestStEth,
  deployImpactVaultFixture,
  deployCharityEscrowFixture,
  fullDeploymentFixture,
} from "./charityEscrow.fixture";


describe("MSFPoint and CharityEscrow", function () {
  describe("MSFPoint", function () {
    it("MSFP deployment should set the right name and symbol", async function () {
      const msfp = await deployMSFPointFixture();
      expect(await msfp.name()).to.equal("MSFPoint");
      expect(await msfp.symbol()).to.equal("MSFP");
    });

    it("Only MINTER_ROLE could mint", async function () {
      const msfp = await deployMSFPointFixture();
      let [owner, investorA] = await ethers.getSigners();
      await msfp.grantRole(await msfp.MINTER_ROLE(), investorA);
      await expect(msfp.mint(await owner.getAddress(), 100n)).to.be.reverted;
      await msfp.connect(investorA).mint(await investorA.getAddress(), 100n);
      expect(await msfp.balanceOf(await investorA.getAddress())).to.equal(100n);
    });

    it("Only DEFAULT_ADMIN_ROLE could recoverERC20", async function () {
      const msfp = await deployMSFPointFixture();
      const stEth = await deployTestStEth();
      let [owner, investorA] = await ethers.getSigners();
      await stEth.mint(await msfp.getAddress(), ethers.parseEther("100"));
      await expect(
        msfp.connect(investorA).recoverERC20(await stEth.getAddress(), 100n)
      ).to.be.reverted;
      await msfp.recoverERC20(await stEth.getAddress(), 100n);
      expect(await stEth.balanceOf(owner.getAddress())).to.equal(100n);
    });
  });

  describe("CharityEscrow deployment", function () {
    it("CharityEscrow deployment should be possible only if baseEarnRate_ and yearlyBonus_ below their max value", async function () {
      const msfp = await deployMSFPointFixture();
      const stEth = await deployTestStEth();
      const stEthAddress = await stEth.getAddress();
      const impactVault = await deployImpactVaultFixture(stEthAddress);
      const impactVaultAddress = await impactVault.getAddress();
      const charityEscrow = await deployCharityEscrowFixture(
        impactVaultAddress,
        msfp,
        100n,
        300n,
        1n
      );

      await expect(
        deployCharityEscrowFixture(
          impactVaultAddress,
          msfp,
          10n ** 18n + 1n,
          300n,
          1n
        )
      ).to.be.revertedWithCustomError(charityEscrow, "EarnRateTooHigh");

      await expect(
        deployCharityEscrowFixture(
          impactVaultAddress,
          msfp,
          10n ** 18n,
          3n * 10n ** 18n + 1n,
          1n
        )
      ).to.be.revertedWithCustomError(charityEscrow, "YearlyBonusTooHigh");
    });
  });

  describe("Charity escrow usage", function () {
    let charityEscrow;
    let msfp;
    let stEth;
    let impactVault;
    let owner;
    let investorA;
    let investorB;
    beforeEach(async function () {
      let {
        charityEscrow: charityEscrow_,
        msfp: msfp_,
        stEth: stEth_,
        impactVault: impactVault_,
        owner: owner_,
        investorA: investorA_,
        investorB: investorB_,
      } = await loadFixture(fullDeploymentFixture);
      this.charityEscrow = charityEscrow_;
      this.msfp = msfp_;
      this.stEth = stEth_;
      this.impactVault = impactVault_;
      this.owner = owner_;
      this.investorA = investorA_;
      this.investorB = investorB_;
    });

    it("Only owner could recoverERC20, but only if token is different from MSF-STETH", async function () {
      // Only owner could recoverERC20
      await this.stEth.mint(
        await this.charityEscrow.getAddress(),
        ethers.parseEther("100")
      );
      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .recoverERC20(await this.stEth.getAddress(), 100n)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      await this.charityEscrow.recoverERC20(
        await this.stEth.getAddress(),
        ethers.parseEther("5")
      );
      expect(
        await this.stEth.balanceOf(await this.owner.getAddress())
      ).to.equal(ethers.parseEther("5"));

      // but only if token is different from ImpactVault (MSF-STETH)
      await this.stEth.approve(
        await this.impactVault.getAddress(),
        ethers.parseEther("3")
      );
      await this.impactVault.deposit(
        ethers.parseEther("3"),
        await this.owner.getAddress()
      );
      await this.impactVault.transfer(
        await this.charityEscrow.getAddress(),
        ethers.parseEther("3")
      );

      await expect(
        this.charityEscrow.recoverERC20(
          await this.impactVault.getAddress(),
          ethers.parseEther("2")
        )
      ).to.be.revertedWithCustomError(this.charityEscrow, "BadTokenWithdrawal");
    });

    it("Only owner could setPointPrice, but only if new price is not too low nor too high, unless if zero", async function () {
      await this.charityEscrow.setPointPrice(ethers.parseEther("0.7"));
      expect(await this.charityEscrow.pointPrice()).to.equal(
        ethers.parseEther("0.7")
      );
      await expect(
        this.charityEscrow.setPointPrice(ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(this.charityEscrow, "PriceTooLow");
      await expect(
        this.charityEscrow.setPointPrice(ethers.parseEther("1.5"))
      ).to.be.revertedWithCustomError(this.charityEscrow, "PriceTooHigh");
      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .setPointPrice(ethers.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await this.charityEscrow.setPointPrice(ethers.parseEther("0.0"));
      expect(await this.charityEscrow.pointPrice()).to.equal(
        ethers.parseEther("0.0")
      );

      await this.charityEscrow.setPointPrice(ethers.parseEther("10"));
      expect(await this.charityEscrow.pointPrice()).to.equal(
        ethers.parseEther("10")
      );
    });

    it("Only owner could setEarnStructure, but only within allowed bounds", async function () {
      await this.charityEscrow.setEarnStructure(
        ethers.parseEther("0.7"),
        ethers.parseEther("2.5")
      );
      const [newBaseEarnRate, newYearlyBonus] =
        await this.charityEscrow.earnStructure();
      expect(newBaseEarnRate).to.equal(ethers.parseEther("0.7"));
      expect(newYearlyBonus).to.equal(ethers.parseEther("2.5"));

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .setEarnStructure(ethers.parseEther("0.8"), ethers.parseEther("2.1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        this.charityEscrow.setEarnStructure(
          ethers.parseEther("1.1"),
          ethers.parseEther("2.5")
        )
      ).to.be.revertedWithCustomError(this.charityEscrow, "EarnRateTooHigh");

      await expect(
        this.charityEscrow.setEarnStructure(
          ethers.parseEther("0.9"),
          ethers.parseEther("3.1")
        )
      ).to.be.revertedWithCustomError(this.charityEscrow, "YearlyBonusTooHigh");
    });

    it("InvestorA locks his MSF-STETH into CharityEscrow for 3 years", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );
      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("100"), 3n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100") * 1n * 3n * (1n + 3n * 3n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)
    });

    it("View functions lockReward and baseRewardDelta return expected values", async function () {
      const lockedBalance = ethers.parseEther("5");
      const lockDuration = 2n * 365n * 86400n;
      expect(
        await this.charityEscrow.baseRewardDelta(lockedBalance, lockDuration)
      ).to.equal(ethers.parseEther("5") * 1n * 2n); // linear part of the reward formula

      const [baseReward, timeReward] = await this.charityEscrow.lockReward(
        lockedBalance,
        lockDuration
      );
      expect(baseReward).to.equal(ethers.parseEther("5") * 1n * 2n); // linear part of the reward formula
      expect(timeReward).to.equal(ethers.parseEther("5") * 1n * 2n * 3n * 2n); // quadratic part of the reward formula
    });

    
    it("totalSupply returns ImpactVault Balance", async function () {
      expect(
        await this.charityEscrow.totalSupply()
      ).to.equal(ethers.parseEther("0"));
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .transfer(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );
        expect(
          await this.charityEscrow.totalSupply()
        ).to.equal(ethers.parseEther("100"));
      });


    it("The transfer, transferFrom and approve functions exist for CharityEscrow but are not implemented", async function () {
      await expect(
        this.charityEscrow.transfer(this.owner.getAddress(), 0n)
      ).to.be.revertedWithCustomError(
        this.charityEscrow,
        "NotImplementedError"
      );
      await expect(
        this.charityEscrow.transferFrom(
          this.owner.getAddress(),
          this.investorA.getAddress(),
          0n
        )
      ).to.be.revertedWithCustomError(
        this.charityEscrow,
        "NotImplementedError"
      );
      await expect(
        this.charityEscrow.approve(this.owner.getAddress(), 0n)
      ).to.be.revertedWithCustomError(
        this.charityEscrow,
        "NotImplementedError"
      );
    });

    it("user can buyPoints at pointPrice", async function () {
      await this.charityEscrow
        .connect(this.investorA)
        .buyPoints(ethers.parseEther("0.3"), {
          value: ethers.parseEther("0.3"),
        });
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("0.3"));

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .buyPoints(ethers.parseEther("0.3"), {
            value: ethers.parseEther("0.1"),
          })
      ).to.be.revertedWithCustomError(this.charityEscrow, "WrongMsgValue");

      // Edge case: if owner is a smart contract without a fallback or failing fallback, payment will fail
      const contractFactory = await ethers.getContractFactory("SmartAccount");
      const smartAccount = await contractFactory.deploy();
      await this.charityEscrow.transferOwnership(
        await smartAccount.getAddress()
      );
      await this.charityEscrow.transferOwnership(
        await smartAccount.getAddress()
      );
      const acceptTx = [
        {
          target: await this.charityEscrow.getAddress(),
          data: this.charityEscrow.interface.encodeFunctionData(
            "acceptOwnership"
          ),
          value: 0,
        },
      ];

      await smartAccount.executeBatch(acceptTx);
      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .buyPoints(ethers.parseEther("0.3"), {
            value: ethers.parseEther("0.3"),
          })
      ).to.be.revertedWithCustomError(this.charityEscrow, "PaymentFailed");
    });

    it("user cannot buyPoints when pointPrice is 0", async function () {
      await this.charityEscrow.setPointPrice(ethers.parseEther("0.0"));

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .buyPoints(ethers.parseEther("0.0"), {
            value: ethers.parseEther("0.0"),
          })
      ).to.be.revertedWithCustomError(this.charityEscrow, "BuyPointDeactivated");

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .buyPoints(ethers.parseEther("0.3"), {
            value: ethers.parseEther("0.0"),
          })
      ).to.be.revertedWithCustomError(this.charityEscrow, "BuyPointDeactivated");

    });



    it("InvestorA can unlock his MSF-STETH after the end of the lock period", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );
      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("100"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await expect(
        this.charityEscrow.connect(this.investorA).unLock()
      ).to.be.revertedWithCustomError(this.charityEscrow, "LockNotExpired");

      await network.provider.send("evm_increaseTime", [2 * 365 * 86400 - 12]); // less than 2 years (lockPeriod chosen by the user) is not enough to unlock
      await expect(
        this.charityEscrow.connect(this.investorA).unLock()
      ).to.be.revertedWithCustomError(this.charityEscrow, "LockNotExpired");
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("0"));

      await network.provider.send("evm_increaseTime", [12]); // now 2 years have passed since the lock
      await this.charityEscrow.connect(this.investorA).unLock();
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));

      const [lockedBalance, lockTimestamp, lockDuration] =
        await this.charityEscrow.investorLockInfo(this.investorA.getAddress());
      expect(lockedBalance).to.equal(0);
      expect(lockTimestamp).to.equal(0);
      expect(lockDuration).to.equal(0);
    });

    it("InvestorA can increaseLock with additional funds and duration", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 1n * 365n * 86400n);

      const actualValue = await this.msfp.balanceOf(
        await this.investorA.getAddress()
      );
      const expectedValue = ethers.parseEther("100") * 1n * 3n * (1n + 3n * 3n); // increasing directly the time and amount should be almost equivalent to do an initial lock with sum of locked balances and sum of lock durations

      const tolerance = (expectedValue * BigInt(1)) / BigInt(10000); // small difference of less than 0.01% due to the fact that hardhat node increases time by 1s on each tx

      // Check it's below but within tolerance
      expect(actualValue).to.be.lt(expectedValue);
      expect(actualValue).to.be.gte(expectedValue - tolerance);
    });

    it("InvestorA can increaseLock with just additional funds", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await expect(
          this.charityEscrow
            .connect(this.investorA)
            .increaseLock(0n, 2n * 365n * 86400n)
        ).to.be.revertedWithCustomError(this.charityEscrow, "LockAmountTooSmall");

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .increaseLock(800_000_000n, 0n)
      ).to.be.revertedWithCustomError(this.charityEscrow, "LockAmountTooSmall");

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 0n);

      const actualValue = await this.msfp.balanceOf(
        await this.investorA.getAddress()
      );
      const expectedValue = ethers.parseEther("100") * 1n * 2n * (1n + 3n * 2n); // increasing directly the time and amount should be almost equivalent to do an initial lock with sum of locked balances and sum of lock durations

      const tolerance = (expectedValue * BigInt(1)) / BigInt(10000); // small difference of less than 0.01% due to the fact that hardhat node increases time by 1s on each tx

      // Check it's below but within tolerance
      expect(actualValue).to.be.lt(expectedValue);
      expect(actualValue).to.be.gte(expectedValue - tolerance);
    });

    it("InvestorA can increaseLock with just additional duration", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("0"), 1n * 365n * 86400n);

      const actualValue = await this.msfp.balanceOf(
        await this.investorA.getAddress()
      );
      const expectedValue = ethers.parseEther("50") * 1n * 3n * (1n + 3n * 3n); // increasing directly the time and amount should be almost equivalent to do an initial lock with sum of locked balances and sum of lock durations

      const tolerance = (expectedValue * BigInt(1)) / BigInt(10000); // small difference of less than 0.01% due to the fact that hardhat node increases time by 1s on each tx

      // Check it's below but within tolerance
      expect(actualValue).to.be.lt(expectedValue);
      expect(actualValue).to.be.gte(expectedValue - tolerance);
    });

    it("InvestorA cannot increaseLock if newEffectiveLockDuration is maximumLockDuration or below minimumLockDuration", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n)
      ).to.be.revertedWithCustomError(
        this.charityEscrow,
        "LockDurationTooLong"
      );

      await network.provider.send("evm_increaseTime", [2 * 365 * 86400 - 12]);

      await expect(
        this.charityEscrow
          .connect(this.investorA)
          .increaseLock(ethers.parseEther("50"), 86000n)
      ).to.be.revertedWithCustomError(
        this.charityEscrow,
        "LockDurationTooShort"
      );
    });

    it("InvestorA can decreaseLock by just decreasing duration", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await this.msfp
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)
        );

      await this.charityEscrow
        .connect(this.investorA)
        .decreaseLock(ethers.parseEther("0"), 1n * 365n * 86400n);
      
        expect(
          await this.impactVault.balanceOf(this.investorA.getAddress())
        ).to.equal(ethers.parseEther("50")); //Nothing returned
      const penalty =
        ((ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n) -
          ethers.parseEther("50") * 1n * 1n * (1n + 3n * 1n)) *
          BigInt(1)) /
        BigInt(10);

      const expectedValue =
        ethers.parseEther("50") * 1n * 1n * (1n + 3n * 1n) - penalty;
      const tolerance = (expectedValue * BigInt(1)) / BigInt(10000); // small difference of less than 0.01% due to the fact that hardhat node increases time by 1s on each tx
      const actualValue = await this.msfp.balanceOf(
        await this.investorA.getAddress()
      );

      // Check it's below but within tolerance
      expect(actualValue).to.be.lt(expectedValue);
      expect(actualValue).to.be.gte(expectedValue - tolerance);
    });

    it("InvestorA can decreaseLock by just decreasing amount", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await this.msfp
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)
        );

      await this.charityEscrow
        .connect(this.investorA)
        .decreaseLock(ethers.parseEther("10"), 0n);

      const penalty =
        ((ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n) -
          ethers.parseEther("40") * 1n * 2n * (1n + 3n * 2n)) *
          BigInt(1)) /
        BigInt(10);
      expect(
          await this.impactVault.balanceOf(this.investorA.getAddress())
        ).to.equal(ethers.parseEther("60")); //returned the decrease Amount
      const expectedValue =
        ethers.parseEther("40") * 1n * 2n * (1n + 3n * 2n) - penalty;
      const tolerance = (expectedValue * BigInt(1)) / BigInt(10000); // small difference of less than 0.01% due to the fact that hardhat node increases time by 1s on each tx
      const actualValue = await this.msfp.balanceOf(
        await this.investorA.getAddress()
      );

      // Check it's below but within tolerance
      expect(actualValue).to.be.lt(expectedValue);
      expect(actualValue).to.be.gte(expectedValue - tolerance);
    });


    it("When increasing Lock, due Time Reward stays similar", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      
      await network.provider.send("evm_increaseTime", [1 * 365 * 86400]); // One year


      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("0"), 1n * 365n * 86400n);

      const actualValue = await this.msfp.balanceOf(
        await this.investorA.getAddress()
      );
      const expectedValue = ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n) + ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n) - ethers.parseEther("50") * 1n * 1n * (1n + 3n * 1n); 

      expect(actualValue).to.equal(expectedValue);

      const expectedEquivalentLockDuration = 83436414n; //sqrt(2*(2 years)^2- year^2) + 1
      const shift = expectedEquivalentLockDuration - 2n * 365n * 86400n;
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = BigInt(blockBefore.timestamp);
      const [lockedBalance, lockTimestamp, lockDuration] =
        await this.charityEscrow.investorLockInfo(this.investorA.getAddress());
      expect(lockedBalance).to.equal(ethers.parseEther("50"));
      expect(lockDuration).to.be.equal(expectedEquivalentLockDuration);
      expect(lockTimestamp).to.be.equal(timestampBefore-shift);

      const totalPaidTimeReward = ethers.parseEther("50") * 1n * 2n * (3n * 2n) + ethers.parseEther("50") * 1n * 2n * (3n * 2n) - ethers.parseEther("50") * 1n * 1n * (3n * 1n)
      const [currentBaseReward,currentTimeReward] = await this.charityEscrow.lockReward(
        ethers.parseEther("50"),expectedEquivalentLockDuration
      );
      const tolerance = 2n*currentTimeReward/expectedEquivalentLockDuration;// rounding causes an epproximation (Taylor Expansion)
      expect(currentTimeReward).to.gte(totalPaidTimeReward);          // all is good - totalPaidTimeReward is bounded to what can be obtained from investorLockInfo
      expect(currentTimeReward).to.lt(totalPaidTimeReward+tolerance); // 
    

    await this.charityEscrow
      .connect(this.investorA)
      .increaseLock(ethers.parseEther("50"), 1n * 365n * 86400n);

    const newPointBalance = await this.msfp.balanceOf(
      await this.investorA.getAddress()
    );

    const year = 365n *86400n;
    const newDuration = 3n*365n*86400n-1n;
    const pastDuration = 2n*365n*86400n-1n;

    const expectedPointBalance = expectedValue + ethers.parseEther("100") * 1n * newDuration * 1n / year + ethers.parseEther("100") * 1n * newDuration* 1n * 3n * newDuration / year / year  - ethers.parseEther("50") * 1n * pastDuration / year  * 1n - ethers.parseEther("50") * 1n * pastDuration * 3n * pastDuration / year / year -1n; 

    expect(newPointBalance).to.equal(expectedPointBalance);

    const newExpectedEquivalentLockDuration = 102188319n; //sqrt(1/2*pastDuration*pastDuration+9*year*year-2*year*2*year/2) with pastEffDuration = 2 year + shift
    const newShift = newExpectedEquivalentLockDuration - 3n * 365n * 86400n;
    const newBlockNumBefore = await ethers.provider.getBlockNumber();
    const newBlockBefore = await ethers.provider.getBlock(newBlockNumBefore);
    const newTimestampBefore = BigInt(newBlockBefore.timestamp)-1n;
    const [newLockedBalance, newLockTimestamp, newLockDuration] =
      await this.charityEscrow.investorLockInfo(this.investorA.getAddress());
    expect(newLockedBalance).to.equal(ethers.parseEther("100"));
    expect(newLockDuration).to.be.equal(newExpectedEquivalentLockDuration);
    expect(newLockTimestamp).to.be.equal(newTimestampBefore-newShift);

    const newTotalPaidTimeReward = totalPaidTimeReward + ethers.parseEther("100") * 1n * newDuration * 3n * newDuration / year / year - ethers.parseEther("50") * 1n * pastDuration * 3n * pastDuration / year / year;
    const [newCurrentBaseReward,newCurrentTimeReward] = await this.charityEscrow.lockReward(
      ethers.parseEther("100"),newExpectedEquivalentLockDuration
    );
    const newTolerance = 2n*newCurrentTimeReward/newExpectedEquivalentLockDuration;// rounding causes an epproximation (Taylor Expansion)
    expect(newCurrentTimeReward).to.gte(newTotalPaidTimeReward);          // all is good - totalPaidTimeReward is bounded to what can be obtained from investorLockInfo
    expect(newCurrentTimeReward).to.lt(newTotalPaidTimeReward+newTolerance); // 

    });

    it("decreaseLock is equivalent to an unlock, after lock duration ends", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await network.provider.send("evm_increaseTime", [2 * 365 * 86400 + 1]);
      await this.charityEscrow
        .connect(this.investorA)
        .decreaseLock(ethers.parseEther("10"), 1n * 365n * 86400n);
      // check that user recovered all his MSF-STETH
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      // and that he also kept all his MSFpoints
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n));
      const [lockedBalance, lockTimestamp, lockDuration] =
        await this.charityEscrow.investorLockInfo(this.investorA.getAddress());
      expect(lockedBalance).to.equal(0);
      expect(lockTimestamp).to.equal(0);
      expect(lockDuration).to.equal(0);
    });

    it("decreaseLock does an unlock, if newEffectiveLockDuration is null", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await network.provider.send("evm_increaseTime", [548 * 86400]); // more than 1 year and a half passes
      await this.msfp
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)
        );
      await this.charityEscrow
        .connect(this.investorA)
        .decreaseLock(0n, 1n * 365n * 86400n); // 1 years second parameter, but could have used anything bigger than half a year (remaining lock)
      const [lockedBalance, lockTimestamp, lockDuration] =
        await this.charityEscrow.investorLockInfo(this.investorA.getAddress());
      expect(lockedBalance).to.equal(0);
      expect(lockTimestamp).to.equal(0);
      expect(lockDuration).to.equal(0);
    });

    it("decreaseLock reduces all lockedBalance if newLockBalance is null", async function () {
      await this.stEth.mint(
        await this.investorA.getAddress(),
        ethers.parseEther("100")
      );
      await this.stEth
        .connect(this.investorA)
        .approve(await this.impactVault.getAddress(), ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .deposit(ethers.parseEther("100"), await this.investorA.getAddress());
      expect(
        await this.impactVault.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("100"));
      await this.impactVault
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("100")
        );

      await this.charityEscrow
        .connect(this.investorA)
        .increaseLock(ethers.parseEther("50"), 2n * 365n * 86400n);
      expect(
        await this.charityEscrow.balanceOf(this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50"));
      expect(
        await this.msfp.balanceOf(await this.investorA.getAddress())
      ).to.equal(ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)); // applying formula from whitepaper: M = K*c*T*(1+gamma*T)

      await network.provider.send("evm_increaseTime", [548 * 86400]); // more than 1 year and a half passes
      await this.msfp
        .connect(this.investorA)
        .approve(
          await this.charityEscrow.getAddress(),
          ethers.parseEther("50") * 1n * 2n * (1n + 3n * 2n)
        );
      await this.charityEscrow
        .connect(this.investorA)
        .decreaseLock(ethers.parseEther("100"), 0n); // using a greater or equal balance to decrease will put locked balance of the investorLock to 0
      const [lockedBalance, lockTimestamp, lockDuration] =
        await this.charityEscrow.investorLockInfo(this.investorA.getAddress());
      expect(lockedBalance).to.equal(0);
      expect(lockTimestamp).to.equal(0);
      expect(lockDuration).to.equal(0);
    });
  });
});
