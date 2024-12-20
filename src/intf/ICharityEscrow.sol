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
// =====================================  IImpactVault  ==========================================
// ===============================================================================================
// ARAB BANK SWITZZERLAND: https://github.com/ArabBankSwitzerland
// CADMOS: https://github.com/Cadmos-finance

// Primary Author(s)
// N.B.: https://github.com/nboueri
// J.A.T: https://github.com/jat9292 

/// @title Interface of the Charity Escrow Smart Contract
/// @author N.B.
/// @notice Used lock impactVault ERC4626 for a time in exchange of points
/// @notice Points can also be bough from the contract againts ETH
/// @notice Admmin must ensure that the contract has a sufficient balance in Point Tokens to function (reward stakers and outright sell tokens)
interface ICharityEscrow {

    error NotImplementedError();
    
    error LockDurationTooShort();

    error LockDurationTooLong();

    error LockAmountTooSmall();

    error LockNotExpired();

    error EarnRateTooHigh();

    error YearlyBonusTooHigh();

    error BadTokenWithdrawal();

    error WrongMsgValue();

    error PriceTooLow();

    error PriceTooHigh();

    error PaymentFailed();

    error BuyPointDeactivated();

    struct LockInfo {
        uint192 lockedBalance; // Locked Balance of the investor
        uint32 lockTimestamp; // Ok until 2106  - timestamp when balance is locked
        uint32 lockDuration; // ok for another ~136 years
    }

    struct EarnStructure {
        uint128 baseEarnRate; // in wad per year - base point earn rate per year
        uint128 yearlyBonus; // in wad per year - yearly multiplier bonus of base Earn Rate per year 
    }

    /* ========== VIEW FUNCTIONS ========== */

    function impactVault() external view returns (address);
    function pointToken() external view returns (address);
    function minimumLockDuration() external view returns (uint32);
    function maximumLockDuration() external view returns (uint32);
    function minimumLockAmount() external view returns (uint192); 
    function earnStructure() external view returns (uint128 baseEarnRate, uint128 yearlyBonus); // in wad per year - base point earn rate per year
    function pointPrice() external view returns (uint256); // in wad - point price in ETH (if bough from contract)
    function investorLockInfo(address) external view returns (uint192 lockedBalance, uint32 lockTimestamp, uint32 lockDuration);

    function totalSupply() external view returns (uint256 ts);
    function balanceOf(address account) external view returns (uint256 balance);

    ///@notice Returns the base and time reward (points) obtained for locking lockedBalance for lockDuration (sec)
    function lockReward(uint256 lockedBalance, uint256 lockDuration) external view returns (uint256 baseReward, uint256 timeReward);

    ///@notice Returns the accrued Base Reward for locking lockedBalance for lockDurationDelta
    function baseRewardDelta(uint256 lockedBalance, uint256 lockDurationDelta) external view returns (uint256 baseRewardDelta);

    ///@notice Returns the obtained Points when increasing the lock, either in Balande of Duration
    function computePointIncrease(uint192 oldLockBalance, uint256 oldLockDuration, uint192 newLockBalance, uint256 newLockDuration) external view returns(uint256 pointObtained);

    ///@notice Returns the Point penalty when decreasing the lock, either in Balande of Duration
    ///@notice Investor accrued TimeReward is lost - a global penalty factor (10%) is further applied on the due balance
    ///@notice Computations are done using latest baseEarnRate and yearlyBonus - investor may have a net negative point PnL if the earn rates have increased since he locked
    function computePointDecrease(uint192 oldLockBalance, uint256 oldLockTimestamp, uint256 oldLockDuration, uint192 newLockBalance, uint256 newLockDuration) external view returns(uint256 pointPenalty);

    /* ========== MUTATIVE FUNCTIONS ========== */

    ///@notice Contract sells Points against ETH
    function buyPoints(uint256 amount) payable external;

    ///@dev Increases the Investor Lock - either in points or in duration
    ///@notice User obtains a bonus in points (pointObtained), which are paid upfront
    function increaseLock(uint192 lockAmountIncrease, uint32 lockDurationIncrease) external returns (uint256 pointObtained, uint192 newLockBalance, uint32 newEffectiveLockDuration);

    ///@notice Settles an expired Lock - ImpactVault tokens are returned to user
    function unLock() external returns(uint256 balanceReturned);

    ///@notice Reduces a lock - either in duration or in amount
    ///@notice pointPaid Points must be paid by the user to reduce the lock. - while baseReward is accrued - Time reward is completely lost and a global 10% penalty is applied
    ///@dev Unlocks Amount if lockDurationDecrease places us below the minimumLockDuration
    function decreaseLock(uint192 lockAmountDecrease, uint32 lockDurationDecrease) external returns(uint256 pointPaid);

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice Allows Owner to set point price
    function setPointPrice(uint256 newPointPrice) external;

    /// @notice Allows Owner to set earnStructure
    function setEarnStructure(uint128 newBaseEarnRate, uint128 newYearlyBonus) external;

    function recoverERC20(address token, uint256 amount) external;

    /* ========== EVENTS ========== */

    event PointBought(address indexed user, uint256 pointAmount, uint256 ethAmount); 
    event LockIncrease(address indexed user, uint192 lockAmountIncrease, uint32 lockDurationIncrease);
    event LockDecrease(address indexed user, uint192 lockAmounDecrease, uint32 lockDurationDecrease);
    event UnLock(address indexed user, uint192 balanceReturned);
    event SetPointPrice(uint256 newPointPrice);
    event SetEarnStructure(uint128 newBaseEarnRate, uint128 newYearlyBonus);
    event RecoveredERC20(address indexed token, uint256 amount);

}