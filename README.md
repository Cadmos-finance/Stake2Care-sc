# ImpactVault smart contract - ARAB BANK Stake2Care Project


## Intro

The ImpactVault smart contract is an ERC 4626  Vault, which is used to donate the revenues of a value-accruing token to a NGO. In the present case, users will deposit Lido ST-ETH and the staking yield will be distributed to Doctors Without Borders (DWB).

On Deposit of STETH, the user receives MSF-STETH. Withdrawals are instantaneous and handled in STETH only.

Deposits into the ImpactVault are further mediated by the LidoImpactVaultDepositor to convert-and-deposit ETH as well. When converting ETH, the user can choose which proportion of the obtained STETH is to be deposited into the Impact Vault while the remainder is sent back to them.


## getting started

- install `npm i`
- build contract using solidity : `npm run build`
- run tests `npm run test`


