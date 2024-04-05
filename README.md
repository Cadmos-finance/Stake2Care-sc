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
|                  Solc version: 0.8.19                  ·  Optimizer enabled: true  ·  Runs: 1000  ·  Block limit: 30000000 gas  │
·························································|···························|··············|······························
|  Methods                                                                                                                        │
·····························|···························|·············|·············|··············|···············|··············
|  Contract                  ·  Method                   ·  Min        ·  Max        ·  Avg         ·  # calls      ·  usd (avg)  │
·····························|···························|·············|·············|··············|···············|··············
|  ImpactVault               ·  collectDonations         ·          -  ·          -  ·       37764  ·            1  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  ImpactVault               ·  deposit                  ·          -  ·          -  ·      113391  ·           13  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  ImpactVault               ·  mint                     ·          -  ·          -  ·       74436  ·            2  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  ImpactVault               ·  redeem                   ·          -  ·          -  ·       93448  ·            2  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  ImpactVault               ·  setAutoCollectThreshold  ·      47490  ·      47514  ·       47506  ·            6  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  ImpactVault               ·  withdraw                 ·          -  ·          -  ·       93514  ·            2  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  LidoImpactVaultDepositor  ·  depositAsset             ·          -  ·          -  ·       92932  ·            2  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  LidoImpactVaultDepositor  ·  depositETH               ·          -  ·          -  ·      120852  ·            3  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  TestStETH                 ·  approve                  ·      46271  ·      46283  ·       46282  ·           17  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  TestStETH                 ·  changeAccrual            ·          -  ·          -  ·       28696  ·           16  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  TestStETH                 ·  mint                     ·          -  ·          -  ·       70492  ·           13  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  Deployments                                           ·                                          ·  % of limit   ·             │
·························································|·············|·············|··············|···············|··············
|  ImpactVault                                           ·    1833626  ·    1833638  ·     1833637  ·        6.1 %  ·          -  │
·························································|·············|·············|··············|···············|··············
|  LidoImpactVaultDepositor                              ·     625478  ·     625490  ·      625489  ·        2.1 %  ·          -  │
·························································|·············|·············|··············|···············|··············
|  TestStETH                                             ·          -  ·          -  ·      946243  ·        3.2 %  ·          -  │
·--------------------------------------------------------|-------------|-------------|--------------|---------------|-------------·

  13 passing (2s)

-------------------------------|----------|----------|----------|----------|----------------|
File                           |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------------------|----------|----------|----------|----------|----------------|
 src/                          |       80 |    52.63 |    81.82 |    79.31 |                |
  ImpactVault.sol              |      100 |      100 |      100 |      100 |                |
  ImpactVaultDepositor.sol     |    77.78 |      100 |      100 |    77.78 |107,108,109,110 |
  LidoImpactVaultDepositor.sol |      100 |      100 |      100 |      100 |                |
  TokenBatchTransfer.sol       |        0 |        0 |        0 |        0 |... 50,59,61,62 |
  testStEth.sol                |      100 |      100 |      100 |      100 |                |
  vanillaERC20.sol             |        0 |      100 |        0 |        0 |             13 |
 src/intf/                     |      100 |      100 |      100 |      100 |                |
  IImpactVault.sol             |      100 |      100 |      100 |      100 |                |
  IImpactVaultDepositor.sol    |      100 |      100 |      100 |      100 |                |
-------------------------------|----------|----------|----------|----------|----------------|
All files                      |       80 |    52.63 |    81.82 |    79.31 |                |
-------------------------------|----------|----------|----------|----------|----------------|


```

