// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;



//    █████████   ███████████     █████████   ███████████     ███████████    █████████   ██████   █████ █████   ████     █████████  █████   ███   █████ █████ ███████████ ███████████ ██████████ ███████████   █████         █████████   ██████   █████ ██████████  
//   ███░░░░░███ ░░███░░░░░███   ███░░░░░███ ░░███░░░░░███   ░░███░░░░░███  ███░░░░░███ ░░██████ ░░███ ░░███   ███░     ███░░░░░███░░███   ░███  ░░███ ░░███ ░█░░░███░░░█░█░░░░░░███ ░░███░░░░░█░░███░░░░░███ ░░███         ███░░░░░███ ░░██████ ░░███ ░░███░░░░███ 
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███░███ ░███  ░███  ███      ░███    ░░░  ░███   ░███   ░███  ░███ ░   ░███  ░ ░     ███░   ░███  █ ░  ░███    ░███  ░███        ░███    ░███  ░███░███ ░███  ░███   ░░███
//  ░███████████  ░██████████   ░███████████  ░██████████     ░██████████  ░███████████  ░███░░███░███  ░███████       ░░█████████  ░███   ░███   ░███  ░███     ░███         ███     ░██████    ░██████████   ░███        ░███████████  ░███░░███░███  ░███    ░███
//  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███  ░███░░░░░███    ░███░░░░░███ ░███░░░░░███  ░███ ░░██████  ░███░░███       ░░░░░░░░███ ░░███  █████  ███   ░███     ░███        ███      ░███░░█    ░███░░░░░███  ░███        ░███░░░░░███  ░███ ░░██████  ░███    ░███
//  ░███    ░███  ░███    ░███  ░███    ░███  ░███    ░███    ░███    ░███ ░███    ░███  ░███  ░░█████  ░███ ░░███      ███    ░███  ░░░█████░█████░    ░███     ░███      ████     █ ░███ ░   █ ░███    ░███  ░███      █ ░███    ░███  ░███  ░░█████  ░███    ███ 
//  █████   █████ █████   █████ █████   █████ ███████████     ███████████  █████   █████ █████  ░░█████ █████ ░░████   ░░█████████     ░░███ ░░███      █████    █████    ███████████ ██████████ █████   █████ ███████████ █████   █████ █████  ░░█████ ██████████  
// ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░     ░░░░░░░░░░░  ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░   ░░░░     ░░░░░░░░░       ░░░   ░░░      ░░░░░    ░░░░░    ░░░░░░░░░░░ ░░░░░░░░░░ ░░░░░   ░░░░░ ░░░░░░░░░░░ ░░░░░   ░░░░░ ░░░░░    ░░░░░ ░░░░░░░░░░   
//
//
//    ,ad8888ba,         db         88888888ba,    88b           d88    ,ad8888ba,     ad88888ba
//   d8"'    `"8b       d88b        88      `"8b   888b         d888   d8"'    `"8b   d8"     "8b
//  d8'                d8'`8b       88        `8b  88`8b       d8'88  d8'        `8b  Y8,
//  88                d8'  `8b      88         88  88 `8b     d8' 88  88          88  `Y8aaaaa,
//  88               d8YaaaaY8b     88         88  88  `8b   d8'  88  88          88    `"""""8b,
//  Y8,             d8""""""""8b    88         8P  88   `8b d8'   88  Y8,        ,8P          `8b
//   Y8a.    .a8P  d8'        `8b   88      .a8P   88    `888'    88   Y8a.    .a8P   Y8a     a8P
//    `"Y8888Y"'  d8'          `8b  88888888Y"'    88     `8'     88    `"Y8888Y"'     "Y88888P"
//
// ===============================================================================================
// ======================================  ImpactVault  =========================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

import "./intf/ICharityEscrow.sol";
import "./intf/IMSFPoint.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";


/// @title Charity Escrow Smart Contract
/// @author N.B.
/// @notice User locks impactVault ERC4626 for a time in exchange of points
/// @notice Points can also be bought from the contract against ETH
contract CharityEscrow is ERC20, Ownable2Step, ICharityEscrow{
    using SafeERC20 for IERC20;

    /* ========== CONSTANTS ========== */

    address public immutable override(ICharityEscrow) impactVault;
    address public immutable override(ICharityEscrow) pointToken;
    uint32 public constant override(ICharityEscrow) minimumLockDuration = uint32(1 days);
    uint32 public constant override(ICharityEscrow) maximumLockDuration = uint32(3*365 days);
    uint192 public constant override(ICharityEscrow) minimumLockAmount = uint192(1e9);

    uint256 private constant wad = 1e18;
    uint128 internal constant maxBaseEarnRate = uint128(wad);
    uint128 internal constant maxYearlyBonus = uint128(3*wad);

    /* ========== STATE VARIABLES ========== */
    /*
    struct EarnStructure {
        uint128 baseEarnRate; // in wad per year - base point earn rate per year
        uint128 yearlyBonus; // in wad per year - yearly multiplier bonus of base Earn Rate per year 
    }
    */
    EarnStructure public override(ICharityEscrow) earnStructure;

    uint256 public override(ICharityEscrow) pointPrice; // in wad - point price in ETH (if bought from contract)

    /* 
    struct LockInfo {
        uint192 lockedBalance; // Locked Balance of the investor
        uint32 lockTimestamp; // Ok until 2106  - timestamp when balance is locked
        uint32 lockDuration; // ok for another ~136 years
    } */
    mapping (address investor => LockInfo info) public override(ICharityEscrow) investorLockInfo; 

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address impactVault_, 
        address pointToken_, 
        uint128 baseEarnRate_, 
        uint128 yearlyBonus_, 
        uint256 pointPrice_,
        string memory name,
        string memory symbol) ERC20(name, symbol)  {
            impactVault = impactVault_; 
            pointToken = pointToken_;
            if(baseEarnRate_>maxBaseEarnRate){
                revert EarnRateTooHigh();
            }
            if(yearlyBonus_>maxYearlyBonus){
                revert YearlyBonusTooHigh();
            }
            EarnStructure memory earnStructure_ = EarnStructure(baseEarnRate_,yearlyBonus_);
            earnStructure = earnStructure_;
            pointPrice = pointPrice_;
        }

    /* ========== VIEW FUNCTIONS ========== */

    function totalSupply() public view override(ERC20, ICharityEscrow) returns (uint256 ts){
        ts = IERC20(impactVault).balanceOf(address(this));
    }

    function balanceOf(address account) public view override(ERC20, ICharityEscrow) returns (uint256 balance){
        LockInfo memory accountInfo = investorLockInfo[account];
        balance = uint256(accountInfo.lockedBalance); 
    }

    ///@notice Returns the base and time reward (points) obtained for locking lockedBalance for lockDuration (sec)
    function lockReward(uint256 lockedBalance, uint256 lockDuration) external view override(ICharityEscrow) returns (uint256 baseReward, uint256 timeReward){
        EarnStructure memory earnStructure_ = earnStructure;
        (baseReward, timeReward) = _lockReward(lockedBalance, lockDuration, earnStructure_.baseEarnRate, earnStructure_.yearlyBonus);
    }

    ///@notice Returns the accrued Base Reward for locking lockedBalance for lockDurationDelta
    function baseRewardDelta(uint256 lockedBalance, uint256 lockDurationDelta) external view override(ICharityEscrow) returns (uint256 baseRewardDeltaValue){
        baseRewardDeltaValue = _baseRewardDelta(lockedBalance, lockDurationDelta, earnStructure.baseEarnRate);
    }

    ///@notice Returns the obtained Points when increasing the lock, either in Balance or Duration
    ///@dev in practice newLockBalance >= oldLockBalance && newLockDuration >= oldLockDuration
    function computePointIncrease(uint192 oldLockBalance, uint256 oldLockDuration, uint192 newLockBalance, uint256 newLockDuration) public view override(ICharityEscrow) returns(uint256 pointObtained){
        EarnStructure memory earnStructure_ = earnStructure;
        (uint256 newBaseReward, uint256 newTimeReward) = _lockReward(newLockBalance, newLockDuration, earnStructure_.baseEarnRate, earnStructure_.yearlyBonus);
        pointObtained = newBaseReward + newTimeReward;
        if(oldLockBalance * oldLockDuration > 0){
            (uint256 oldBaseReward, uint256 oldTimeReward) =  _lockReward(oldLockBalance, oldLockDuration, earnStructure_.baseEarnRate, earnStructure_.yearlyBonus);
            pointObtained -= (oldBaseReward + oldTimeReward);
        }
    }

    ///@notice Returns the Point penalty when decreasing the lock, either in Balance or Duration
    ///@notice Investor accrued TimeReward is lost - a global penalty factor (10%) is further applied on the due balance
    ///@notice Computations are done using latest baseEarnRate and yearlyBonus - investor may have a net negative point PnL if the earn rates have increased since he locked
    ///@dev in practice newLockBalance <= oldLockBalance &&  newLockDuration - <= oldLockTimestamp + oldLockDuration - block.timestamp
    function computePointDecrease(uint192 oldLockBalance, uint256 oldLockTimestamp, uint256 oldLockDuration, uint192 newLockBalance, uint256 newLockDuration) public view override(ICharityEscrow) returns(uint256 pointPenalty){
        EarnStructure memory earnStructure_ = earnStructure;
        (uint256 oldBaseReward, uint256 oldTimeReward) = _lockReward(oldLockBalance, oldLockDuration, earnStructure_.baseEarnRate, earnStructure_.yearlyBonus);
        pointPenalty = oldBaseReward + oldTimeReward;
        pointPenalty -= _baseRewardDelta(oldLockBalance, earnStructure_.baseEarnRate,uint128(block.timestamp-oldLockTimestamp)); // user gets back accrued Time reward
        if(newLockBalance * newLockDuration > 0){
            (uint256 newBaseReward, uint256 newTimeReward) = _lockReward(newLockBalance, newLockDuration, earnStructure_.baseEarnRate, earnStructure_.yearlyBonus);
            pointPenalty -= (newBaseReward + newTimeReward);
        }
        pointPenalty += pointPenalty/10;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function _lockReward(uint256 lockedBalance, uint256 lockDuration, uint128 baseEarnRate_, uint128 yearlyBonus_) internal pure returns (uint256 baseReward, uint256 timeReward){
        baseReward = _baseRewardDelta(lockedBalance, lockDuration, baseEarnRate_);
        timeReward = baseReward * lockDuration * yearlyBonus_ /  365 days / wad;
    }

    function _baseRewardDelta(uint256 lockedBalance, uint256 lockDurationDelta, uint128 baseEarnRate_) internal pure returns (uint256 baseRewardDeltaValue){
        baseRewardDeltaValue = lockedBalance * lockDurationDelta * baseEarnRate_ / 365 days / wad;
    }

    function _unlock(uint256 balanceReturned) internal {
        delete investorLockInfo[msg.sender];
        IERC20(impactVault).transfer(
            msg.sender,
            balanceReturned
        );
        emit Transfer(msg.sender, address(0), balanceReturned);
        emit UnLock(msg.sender,uint192(balanceReturned));
    }



    /* ========== MUTATIVE FUNCTIONS ========== */

    ///@notice Not transferrable
    function approve(address, uint256) public pure override(ERC20) returns (bool){
        revert NotImplementedError();
    }

    ///@notice Not transferrable
    function transfer(address, uint256) public pure override(ERC20) returns (bool){
        revert NotImplementedError();
    }

    ///@notice Not transferrable
    function transferFrom(address, address, uint256) public pure override(ERC20) returns(bool){
        revert NotImplementedError();
    }

    ///@notice Not transferrable
    function increaseAllowance(address, uint256) public pure override(ERC20) returns (bool) {
        revert NotImplementedError();
    }

    ///@notice Not transferrable
    function decreaseAllowance(address, uint256) public pure override(ERC20) returns (bool) {
        revert NotImplementedError();
    }

    ///@notice Contract sells Points against ETH
    function buyPoints(uint256 amount) payable external override(ICharityEscrow){
        uint256 pointPrice_ = pointPrice;
        if(pointPrice_==0){
            revert BuyPointDeactivated();
        }
        if(msg.value != amount*pointPrice_/wad){
            revert WrongMsgValue();
        }
        (bool success, ) = payable(owner()).call{value: msg.value}("");
        if (!success) {
            revert PaymentFailed();
        }
        IMSFPoint(pointToken).mint(
            msg.sender,
            amount
            );
        emit PointBought(msg.sender, amount, msg.value);  
    }

    ///@notice Increases the Investor Lock - either in points or in duration
    ///@notice User obtains a bonus in points (pointObtained), which are paid upfront
    function increaseLock(uint192 lockAmountIncrease, uint32 lockDurationIncrease) external override(ICharityEscrow) returns (uint256 pointObtained, uint192 newLockBalance, uint32 newEffectiveLockDuration){
        LockInfo memory accountInfo = investorLockInfo[msg.sender];
        uint32 oldEffectiveLockDuration = accountInfo.lockTimestamp + accountInfo.lockDuration < block.timestamp ? 0 : accountInfo.lockTimestamp + accountInfo.lockDuration - uint32(block.timestamp);
        newEffectiveLockDuration = oldEffectiveLockDuration + lockDurationIncrease;
        if(newEffectiveLockDuration>maximumLockDuration){
            revert LockDurationTooLong();
        }
        if (newEffectiveLockDuration<minimumLockDuration){
            revert LockDurationTooShort();
        }
        uint192 oldLockBalance = accountInfo.lockedBalance;
        newLockBalance = oldLockBalance + lockAmountIncrease;
        if(newLockBalance<minimumLockAmount){
                revert LockAmountTooSmall();
        }
        if(lockAmountIncrease>0){
            if(lockAmountIncrease<minimumLockAmount){
                revert LockAmountTooSmall();
            }
            IERC20(impactVault).transferFrom(
            msg.sender,
            address(this),
            lockAmountIncrease
            );
            emit Transfer(address(0), msg.sender, lockAmountIncrease);
        }
        uint32 timeShift = 0; // We need to adjust the lock timestamp so that its computed timeReward is equal to all the time Rewards earned by the user
        /*
        With K,b,\gamma,\delta_t respectively the Capital invested, base Reward, time reward factor and lock time

        Time reward for locking K during \delta_t writes:
            Kb\gamma\delta^2_t

        We define:
            - t_0 the initial lock timestamp
            - t_1 the initial unlock timestamp
            - t_2 the current unlock timestamp
            - K_0 the initial lock capital
            - K_1 the current lock capital
            - t the current timestamp
            - t* the adjusted lock timestamp

        So we are looking for t* such that

        K_1b\gamma(t_2-t*)^2 = K_1b\gamma(t_2-t)^2  + K_0b\gamma(t_1-t_0)^2 - K_0b\gamma(t_1-t)^2

        so
        t* = t_2 - \sqrt((t_2-t)^2 + K_0/K_1(t_1-t_0)^2 - K_0/K_1(t_1-t)^2)
        */
        if(oldEffectiveLockDuration>0){
            uint256 syntheticDuration = uint256(newEffectiveLockDuration)*uint256(newEffectiveLockDuration)
            + uint256(oldLockBalance)*(uint256(accountInfo.lockDuration)*uint256(accountInfo.lockDuration)-uint256(oldEffectiveLockDuration)*uint256(oldEffectiveLockDuration))/uint256(newLockBalance);
            syntheticDuration = Math.sqrt(syntheticDuration);
            timeShift = uint32(syntheticDuration - uint256(newEffectiveLockDuration) + 1); // 1 for rounding
        }

        investorLockInfo[msg.sender] = LockInfo(newLockBalance,uint32(block.timestamp-timeShift),newEffectiveLockDuration+timeShift);
        pointObtained = computePointIncrease(oldLockBalance,oldEffectiveLockDuration,newLockBalance,newEffectiveLockDuration);
        IMSFPoint(pointToken).mint(
            msg.sender,
            pointObtained
            );
        emit LockIncrease(msg.sender, lockAmountIncrease, lockDurationIncrease);
    }

    ///@notice Settles an expired Lock - ImpactVault tokens are returned to user
    function unLock() public override(ICharityEscrow) returns(uint256 balanceReturned){
        LockInfo memory accountInfo = investorLockInfo[msg.sender];
        if(accountInfo.lockTimestamp + accountInfo.lockDuration > block.timestamp){
            revert LockNotExpired();
        }
        balanceReturned = uint256(accountInfo.lockedBalance);
        _unlock(balanceReturned);
    }

    ///@notice Reduces a lock - either in duration or in amount
    ///@notice pointPaid Points must be paid by the user to reduce the lock. - while baseReward is accrued - Time reward is completely lost and a global 10% penalty is applied
    ///@dev Reverts if lockDurationDecrease places us below the minimumLockDuration or lockAmountDecrease below minimumLockAmount
    ///@dev unlocks amount if lockDurationDecrease or lockAmountDecrease are greater than current values
    function decreaseLock(uint192 lockAmountDecrease, uint32 lockDurationDecrease) external override(ICharityEscrow) returns(uint256 pointPaid){
        LockInfo memory accountInfo = investorLockInfo[msg.sender];
        if(accountInfo.lockTimestamp + accountInfo.lockDuration <= block.timestamp){
            uint256 balanceReturned = uint256(accountInfo.lockedBalance);
            _unlock(balanceReturned);
            return 0;
        }

        uint32 oldEffectiveLockDuration = accountInfo.lockTimestamp + accountInfo.lockDuration - uint32(block.timestamp);
        lockDurationDecrease = lockDurationDecrease > oldEffectiveLockDuration  ? oldEffectiveLockDuration : lockDurationDecrease;
        uint32 newEffectiveLockDuration = oldEffectiveLockDuration - lockDurationDecrease;  
        uint192 oldLockBalance = accountInfo.lockedBalance;
        lockAmountDecrease = lockAmountDecrease > oldLockBalance ? oldLockBalance : lockAmountDecrease;
        uint192 newLockBalance = oldLockBalance - lockAmountDecrease;
        if(newEffectiveLockDuration > 0 && newLockBalance > 0){
            if(minimumLockDuration > newEffectiveLockDuration){
                revert  LockDurationTooShort();
            }
            if(minimumLockAmount > newLockBalance){
                revert  LockAmountTooSmall();
            }
         }

        pointPaid = computePointDecrease(oldLockBalance, accountInfo.lockTimestamp, accountInfo.lockDuration,  newLockBalance,  newEffectiveLockDuration);
        IMSFPoint(pointToken).burnFrom(
            msg.sender,
            pointPaid
            );
        emit LockDecrease(msg.sender, lockAmountDecrease, lockDurationDecrease);
        if (newEffectiveLockDuration == 0 || newLockBalance == 0) {
            uint256 balanceReturned = uint256(accountInfo.lockedBalance);
            _unlock(balanceReturned);
        }
        else{
            investorLockInfo[msg.sender] = LockInfo(newLockBalance,uint32(block.timestamp),newEffectiveLockDuration);
            if(lockAmountDecrease>0){
                IERC20(impactVault).transfer(
                    msg.sender,
                    lockAmountDecrease
                    );
                emit Transfer(msg.sender, address(0), lockAmountDecrease);
            }
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice Allows Owner to set point price 
    /// @dev FrontRunnable: use a private RPC
    /// @dev set price to 0 to deactivate function
    function setPointPrice(
        uint256 newPointPrice
    ) external override(ICharityEscrow) onlyOwner {
        uint256 currentPrice = pointPrice;
        if (0 < newPointPrice && newPointPrice <currentPrice/2){
            revert PriceTooLow();
        }
        if (currentPrice > 0 && newPointPrice> (currentPrice*2) ){
            revert PriceTooHigh();
        }
        pointPrice = newPointPrice;
        emit SetPointPrice(
            newPointPrice
        );
    }

    /// @notice Allows Owner to set earnStructure
    /// @dev FrontRunnable: use a private RPC
    function setEarnStructure(
        uint128 newBaseEarnRate,
        uint128 newYearlyBonus
    ) external override(ICharityEscrow) onlyOwner {
        if(newBaseEarnRate>maxBaseEarnRate){
            revert EarnRateTooHigh();
        }
        if(newYearlyBonus>maxYearlyBonus){
            revert YearlyBonusTooHigh();
        }
        earnStructure = EarnStructure(newBaseEarnRate,newYearlyBonus);
        emit SetEarnStructure(
            newBaseEarnRate,
            newYearlyBonus
        );
    }

    function recoverERC20(address token, uint256 amount) external override(ICharityEscrow) onlyOwner {
        if(token==impactVault){
            revert BadTokenWithdrawal();
        }
        IERC20(token).safeTransfer(
            owner(),
            amount
            );
        emit RecoveredERC20(token, amount);
    }
}