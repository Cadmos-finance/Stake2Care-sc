// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {CharityEscrow} from "../src/CharityEscrow.sol";
import {MSFPoint} from "../src/MSFPoint.sol";
import {StETH} from "../src/StEth.sol";
import {ImpactVault} from "../src/ImpactVault.sol";

contract CharityEscrowInvBalances is Test {
    MSFPoint msfp;
    StETH stEth;
    ImpactVault impactVault;
    CharityEscrow charityEscrow;
    address[] investors;
    uint256 currentTimestamp = block.timestamp; // see explanation at https://github.com/foundry-rs/forge-std/issues/376
    uint256 private constant wad = 1e18;
    uint256 pointPrice = 1e18;

    function setUp() public {
        msfp = new MSFPoint("MSFPoint", "MSFP");
        stEth = new StETH();
        impactVault = new ImpactVault(stEth, "MSF-Staked Ether", "MSF-STETH", 1e9);
        charityEscrow =
            new CharityEscrow(address(impactVault), address(msfp), 1e18, 3e18, pointPrice, "CharityEscow", "CE");
        msfp.grantRole(msfp.MINTER_ROLE(), address(charityEscrow));
        investors.push(address(0x1111));
        investors.push(address(0x2222));
        investors.push(address(0x3333));
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
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = this.unLockWrapper.selector;
        selectors[1] = this.buyPointsWrapper.selector;
        selectors[2] = this.increaseLockWrapper.selector;
        selectors[3] = this.decreaseLockWrapper.selector;

        targetSelector(FuzzSelector({addr: address(this), selectors: selectors}));
    }

    modifier useActor(uint8 actorIndexSeed) {
        address currentActor = investors[bound(actorIndexSeed, 0, investors.length - 1)];
        vm.startPrank(currentActor);
        _;
        vm.stopPrank();
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

    function invariant_IndividualBalancesBothTokens() public view {
        for (uint256 i = 0; i < investors.length; i++) {
            assertEq(impactVault.balanceOf(investors[i]) + charityEscrow.balanceOf(investors[i]), 100 ether);
        }
    }

    function invariant_TotalSupplyCharityEscrow() public view {
        uint256 sumBalances;
        for (uint256 i = 0; i < investors.length; i++) {
            sumBalances += charityEscrow.balanceOf(investors[i]);
        }
        assertEq(sumBalances, charityEscrow.totalSupply());
    }

    function unLockWrapper(uint8 actorIndexSeed, uint256 timeWarp, bool toWarp)
        public
        useActor(actorIndexSeed)
        warp(timeWarp, toWarp)
    {
        charityEscrow.unLock();
    }

    function buyPointsWrapper(uint96 amount, uint8 actorIndexSeed, uint256 timeWarp, bool toWarp)
        public payable
        useActor(actorIndexSeed)
        warp(timeWarp, toWarp)
    {
        uint256 price =  uint256(amount) * pointPrice / wad;
        deal(investors[bound(actorIndexSeed, 0, investors.length - 1)], price);
        charityEscrow.buyPoints{value: price}(amount);
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

    receive() external payable {}
}
