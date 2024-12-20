// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {CharityEscrow} from "../src/CharityEscrow.sol";
import {MSFPoint} from "../src/MSFPoint.sol";
import {StETH} from "../src/StEth.sol";
import {ImpactVault} from "../src/ImpactVault.sol";

contract CharityEscrowInvMSP is Test {
    MSFPoint msfp;
    StETH stEth;
    ImpactVault impactVault;
    CharityEscrow charityEscrow;
    address[] investors;
    uint256[] investorsKmax; // historical max locked balance for each investor
    uint256 immutable initialTimestamp = block.timestamp;
    uint256 currentTimestamp = block.timestamp; // see explanation at https://github.com/foundry-rs/forge-std/issues/376
    uint256 private constant wad = 1e18;

    function setUp() public {
        msfp = new MSFPoint("MSFPoint", "MSFP");
        stEth = new StETH();
        impactVault = new ImpactVault(stEth, "MSF-Staked Ether", "MSF-STETH", 1e9);
        charityEscrow = new CharityEscrow(address(impactVault), address(msfp), 1e18, 3e18, 1e18, "CharityEscow", "CE");
        msfp.grantRole(msfp.MINTER_ROLE(), address(charityEscrow));
        investors.push(address(0x1111));
        investors.push(address(0x2222));
        investors.push(address(0x3333));
        investorsKmax.push(0);
        investorsKmax.push(0);
        investorsKmax.push(0);
        deal(address(impactVault), investors[0], 100 ether);
        deal(address(impactVault), investors[1], 100 ether);
        deal(address(impactVault), investors[2], 100 ether);

        vm.startPrank(investors[0]);
        msfp.approve(address(charityEscrow), type(uint256).max); // to allow the burnFrom when decreaseLock is called
        vm.stopPrank();
        vm.startPrank(investors[1]);
        msfp.approve(address(charityEscrow), type(uint256).max);
        vm.stopPrank();
        vm.startPrank(investors[2]);
        msfp.approve(address(charityEscrow), type(uint256).max);
        vm.stopPrank();

        targetContract(address(this));

        // functions to target during invariant tests
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = this.unLockWrapper.selector;
        selectors[1] = this.increaseLockWrapper.selector;
        selectors[2] = this.decreaseLockWrapper.selector;

        targetSelector(FuzzSelector({addr: address(this), selectors: selectors}));
    }

    modifier useActor(uint8 actorIndexSeed) {
        address currentActor = investors[bound(actorIndexSeed, 0, investors.length - 1)];
        vm.startPrank(currentActor);
        _;
        vm.stopPrank();
        for (uint256 i = 0; i < investors.length; i++) {
            // update historically max locked amount for all investors
            uint256 currentlyLocked = charityEscrow.balanceOf(investors[i]);
            uint256 previousKmax = investorsKmax[i];
            if (currentlyLocked > previousKmax) {
                investorsKmax[i] = currentlyLocked;
            }
        }
    }

    modifier warp(uint256 timeWarp, bool toWarp) {
        uint256 lowerBound = 0;
        uint256 upperBound = 365 days;
        uint256 currentTime = block.timestamp;
        timeWarp = bound(timeWarp, lowerBound, upperBound);
        uint256 newTime = toWarp ? currentTime + timeWarp : currentTime;
        vm.warp(newTime);
        currentTimestamp = newTime;
        _;
    }

    function invariant_MSFPointsFormula() public view {
        (uint128 baseEarnRate, uint128 yearlyBonus) = charityEscrow.earnStructure();

        for (uint256 i = 0; i < investors.length; i++) {
            (,, uint32 currentLockDuration) = charityEscrow.investorLockInfo(investors[i]);
            uint256 T = currentLockDuration + currentTimestamp - initialTimestamp;
            (uint256 baseRewardMax, uint256 timeRewardMax) = _lockReward(investorsKmax[i], T, baseEarnRate, yearlyBonus);
            assertLe(msfp.balanceOf(investors[i]), baseRewardMax + timeRewardMax);
        }
    }

    function invariant_MSFPointsFormula_DUP1() public view {
        invariant_MSFPointsFormula();
    }

    function invariant_MSFPointsFormula_DUP2() public view {
        invariant_MSFPointsFormula();
    }

    function invariant_MSFPointsFormula_DUP3() public view {
        invariant_MSFPointsFormula();
    }

    function invariant_MSFPointsFormula_DUP4() public view {
        invariant_MSFPointsFormula();
    }

    function _lockReward(uint256 lockedBalance, uint256 lockDuration, uint128 baseEarnRate_, uint128 yearlyBonus_)
        internal
        pure
        returns (uint256 baseReward, uint256 timeReward)
    {
        baseReward = _baseRewardDelta(lockedBalance, lockDuration, baseEarnRate_);
        timeReward = baseReward * lockDuration * yearlyBonus_ / 365 days / wad;
    }

    function _baseRewardDelta(uint256 lockedBalance, uint256 lockDurationDelta, uint128 baseEarnRate_)
        internal
        pure
        returns (uint256 baseRewardDeltaValue)
    {
        baseRewardDeltaValue = lockedBalance * lockDurationDelta * baseEarnRate_ / 365 days / wad;
    }

    function unLockWrapper(uint8 actorIndexSeed, uint256 timeWarp, bool toWarp)
        public
        useActor(actorIndexSeed)
        warp(timeWarp, toWarp)
    {
        charityEscrow.unLock();
    }

    function increaseLockWrapper(
        uint192 lockAmountIncrease,
        uint32 lockDurationIncrease,
        uint8 actorIndexSeed,
        uint256 timeWarp,
        bool toWarp
    ) public useActor(actorIndexSeed) warp(timeWarp, toWarp) {
        impactVault.approve(address(charityEscrow), lockAmountIncrease);
        charityEscrow.increaseLock(lockAmountIncrease, lockDurationIncrease);
    }

    function decreaseLockWrapper(
        uint192 lockAmountDecrease,
        uint32 lockDurationDecrease,
        uint8 actorIndexSeed,
        uint256 timeWarp,
        bool toWarp
    ) public useActor(actorIndexSeed) warp(timeWarp, toWarp) {
        charityEscrow.decreaseLock(lockAmountDecrease, lockDurationDecrease);
    }
}
