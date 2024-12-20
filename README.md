# ImpactVault smart contract - [Arab Bank Switzerland](https://www.arabbank.ch/) Stake2Care Project

## Intro

The ImpactVault smart contract is an ERC 4626 Vault, which is used to donate the revenues of a value-accruing token to a NGO. In the present case, users will deposit Lido ST-ETH and the staking yield will be distributed to Doctors Without Borders (MSF).

On Deposit of stETH, the user receives MSF-ETH. Withdrawals are instantaneous and handled in stETH only.

Deposits into the ImpactVault are further mediated by the LidoImpactVaultDepositor to convert-and-deposit ETH as well. When converting ETH, the user can choose which proportion of the obtained stETH is to be deposited into the Impact Vault while the remainder is sent back to them.


<img width="1168" alt="How It Works" src="assets/HowItWorks.png">

## Getting started

- install `npm i`
- build contract using solidity : `npm run build`
- run tests `npm run test`
- deploy `npx hardhat run scripts/deploy.ts --network mainnet`

## Audits
You can find all audit reports under the audits folder:

- [BlackPaper](./audits/25-06-2024_BlackPaper.pdf)
- [HHK](./audits/17-06-2024_HHK.pdf)


## Deployment Addresses

Contracts have been deployed to Ethereum Mainnet:

- msfETH (ImpactVault): [0x34f4e4b964a3e648723aE71AF5550FbC85E2e534](https://etherscan.io/address/0x34f4e4b964a3e648723aE71AF5550FbC85E2e534)
- ImpactVaultDepositor: [0x24fA1BaE144Bd97aF2875AE782299B6549726437](https://etherscan.io/address/0x24fA1BaE144Bd97aF2875AE782299B6549726437)

## Official Website

Stake2Care official [website](https://stake2care.msf.ch/).

## Tests

- ✔ Deployer has correct stETH balance at test start and can set stETH accrual
- ✔ Only deployer can set stETH accrual and call the mint function
- ✔ Anyone can submit by sending ETH directly to the stETH contract
- ✔ Deployer has correct msfETH balance at test start
- ✔ Depositor can Mint Asset by sending ETH to `receive()` of `lidoImpactVaultDepositor` and then Withdraw
- ✔ Depositor can Mint Asset by sending stETH via `depositAsset()` function of `lidoImpactVaultDepositor`
- ✔ Depositor can Mint Asset by sending ETH to `depositETH()` of `lidoImpactVaultDepositor` with a depositProportion of 80%
- ✔ `depositToken()` should revert with `NotImplementedError`
- ✔ Only owner can set AutoCollectThreshold
- ✔ Depositor can mint shares by sending ETH via `mint()` of `impactVault` and then withdraw
- ✔ `collectDonations` is timelocked for 3 days after second deposit
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
|  TeststETH                 ·  approve                  ·      46271  ·      46283  ·       46282  ·           17  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  TeststETH                 ·  changeAccrual            ·          -  ·          -  ·       28696  ·           16  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  TeststETH                 ·  mint                     ·          -  ·          -  ·       70492  ·           13  ·          -  │
·····························|···························|·············|·············|··············|···············|··············
|  Deployments                                           ·                                          ·  % of limit   ·             │
·························································|·············|·············|··············|···············|··············
|  ImpactVault                                           ·    1833626  ·    1833638  ·     1833637  ·        6.1 %  ·          -  │
·························································|·············|·············|··············|···············|··············
|  LidoImpactVaultDepositor                              ·     625478  ·     625490  ·      625489  ·        2.1 %  ·          -  │
·························································|·············|·············|··············|···············|··············
|  TeststETH                                             ·          -  ·          -  ·      946243  ·        3.2 %  ·          -  │
·--------------------------------------------------------|-------------|-------------|--------------|---------------|-------------·

  13 passing (2s)
```
### Coverage
```
-------------------------------|----------|----------|----------|----------|----------------|
File                           |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------------------|----------|----------|----------|----------|----------------|
 src/                          |       96 |      100 |      100 |    94.52 |                |
  ImpactVault.sol              |      100 |      100 |      100 |      100 |                |
  ImpactVaultDepositor.sol     |    77.78 |      100 |      100 |    77.78 |107,108,109,110 |
  LidoImpactVaultDepositor.sol |      100 |      100 |      100 |      100 |                |
  testStEth.sol                |      100 |      100 |      100 |      100 |                |
 src/intf/                     |      100 |      100 |      100 |      100 |                |
  IImpactVault.sol             |      100 |      100 |      100 |      100 |                |
  IImpactVaultDepositor.sol    |      100 |      100 |      100 |      100 |                |
-------------------------------|----------|----------|----------|----------|----------------|
All files                      |       96 |      100 |      100 |    94.52 |                |
-------------------------------|----------|----------|----------|----------|----------------|
```

