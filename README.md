# ImpactVault smart contract - ARAB BANK Stake2Care Project

## Intro

The ImpactVault smart contract is an ERC 4626 Vault, which is used to donate the revenues of a value-accruing token to a NGO. In the present case, users will deposit Lido ST-ETH and the staking yield will be distributed to Doctors Without Borders (DWB).

On Deposit of STETH, the user receives MSF-STETH. Withdrawals are instantaneous and handled in STETH only.

Deposits into the ImpactVault are further mediated by the LidoImpactVaultDepositor to convert-and-deposit ETH as well. When converting ETH, the user can choose which proportion of the obtained STETH is to be deposited into the Impact Vault while the remainder is sent back to them.

## getting started

- install `npm i`
- build contract using solidity : `npm run build`
- run tests `npm run test`

# TEST Results


## Impact Vault

- ✔ Deployer has correct STETH balance at test start and can set STETH accrual
- ✔ Only deployer can set STETH accrual and call the mint function
- ✔ Anyone can submit by sending ETH directly to the StETH contract
- ✔ Deployer has correct MSF-STETH balance at test start
- ✔ Depositor can Mint Asset by sending ETH to `receive()` of `lidoImpactVaultDepositor` and then Withdraw
- ✔ Depositor can Mint Asset by sending StETH via `depositAsset()` function of `lidoImpactVaultDepositor`
- ✔ Depositor can Mint Asset by sending ETH to `depositETH()` of `lidoImpactVaultDepositor` with a depositProportion of 80%
- ✔ `depositToken()` should revert with `NotImplementedError`
- ✔ Only owner can set AutoCollectThreshold
- ✔ Depositor can mint shares by sending ETH via `mint()` of `impactVault` and then withdraw
- ✔ `collectDonations` is timelocked for 1 day after second deposit
- ✔ `collectDonations` does not update pending surplus if it is below autoCollectThreshold
- ✔ `collectDonations` can be called with custom minimalTransfer to bypass minimalCollectAmount

```

·--------------------------------------------------------|---------------------------|--------------|-----------------------------·
|                  [90mSolc version: 0.8.19[39m                  ·  [90mOptimizer enabled: true[39m  ·  [90mRuns: 1000[39m  ·  [90mBlock limit: 30000000 gas[39m  │
·························································|···························|··············|······························
|  [32m[1mMethods[22m[39m                                                                                                                        │
·····························|···························|·············|·············|··············|···············|··············
|  [1mContract[22m                  ·  [1mMethod[22m                   ·  [32mMin[39m        ·  [32mMax[39m        ·  [32mAvg[39m         ·  [1m# calls[22m      ·  [1musd (avg)[22m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mImpactVault[39m               ·  collectDonations         ·          -  ·          -  ·       37764  ·            [90m1[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mImpactVault[39m               ·  deposit                  ·          -  ·          -  ·      113391  ·           [90m13[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mImpactVault[39m               ·  mint                     ·          -  ·          -  ·       74436  ·            [90m2[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mImpactVault[39m               ·  redeem                   ·          -  ·          -  ·       93448  ·            [90m2[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mImpactVault[39m               ·  setAutoCollectThreshold  ·      [36m47490[39m  ·      [31m47514[39m  ·       47506  ·            [90m6[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mImpactVault[39m               ·  withdraw                 ·          -  ·          -  ·       93514  ·            [90m2[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mLidoImpactVaultDepositor[39m  ·  depositAsset             ·          -  ·          -  ·       92932  ·            [90m2[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mLidoImpactVaultDepositor[39m  ·  depositETH               ·          -  ·          -  ·      120852  ·            [90m3[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mTestStETH[39m                 ·  approve                  ·      [36m46271[39m  ·      [31m46283[39m  ·       46282  ·           [90m17[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mTestStETH[39m                 ·  changeAccrual            ·          -  ·          -  ·       28696  ·           [90m16[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [90mTestStETH[39m                 ·  mint                     ·          -  ·          -  ·       70492  ·           [90m13[39m  ·          [32m[90m-[32m[39m  │
·····························|···························|·············|·············|··············|···············|··············
|  [32m[1mDeployments[22m[39m                                           ·                                          ·  [1m% of limit[22m   ·             │
·························································|·············|·············|··············|···············|··············
|  ImpactVault                                           ·    [36m1833626[39m  ·    [31m1833638[39m  ·     1833637  ·        [90m6.1 %[39m  ·          [32m[90m-[32m[39m  │
·························································|·············|·············|··············|···············|··············
|  LidoImpactVaultDepositor                              ·     [36m625478[39m  ·     [31m625490[39m  ·      625489  ·        [90m2.1 %[39m  ·          [32m[90m-[32m[39m  │
·························································|·············|·············|··············|···············|··············
|  TestStETH                                             ·          -  ·          -  ·      946243  ·        [90m3.2 %[39m  ·          [32m[90m-[32m[39m  │
·--------------------------------------------------------|-------------|-------------|--------------|---------------|-------------·

  13 passing (2s)
```

