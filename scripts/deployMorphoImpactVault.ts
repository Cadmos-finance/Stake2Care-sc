import { ethers } from "hardhat";
import fs from "fs";

const WAIT_BLOCKS = 3;

// Merkl distributor (mainnet)
const MERKL = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae";

// Assets (mainnet)
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

// MetaMorpho vaults (mainnet)
const STEAKHOUSE_USDC = "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB";
const STEAKHOUSE_USDT = "0xbEef047a543E45807105E51A8BBEFCc5950fcfBa";

const DEAD = "0x000000000000000000000000000000000000dEaD";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  const MIN_DEPOSIT = BigInt(process.env.MIN_DEPOSIT ?? "1000000"); // 1e6 = 1 token for USDC/USDT (6 decimals)
  const SEED_AMOUNT = MIN_DEPOSIT + 1n;

  const Factory = await ethers.getContractFactory("MetaMorphoImpactVault");

  const configs = [
    {
      label: "USDC",
      asset: USDC,
      underlying: STEAKHOUSE_USDC,
      name: "MetaMorpho Impact Vault USDC",
      symbol: "mmIV-USDC",
    },
    {
      label: "USDT",
      asset: USDT,
      underlying: STEAKHOUSE_USDT,
      name: "MetaMorpho Impact Vault USDT",
      symbol: "mmIV-USDT",
    },
  ];

  const out: Record<string, string> = {};

  for (const c of configs) {
    console.log(`\n=== Deploying ${c.label} MetaMorphoImpactVault ===`);

    const vault = await Factory.deploy(
      c.underlying,
      c.name,
      c.symbol,
      MIN_DEPOSIT,
      MERKL
    );

    const deployTx = vault.deploymentTransaction();
    if (deployTx) await deployTx.wait(WAIT_BLOCKS);

    const vaultAddr = await vault.getAddress();
    out[`MetaMorphoImpactVault_${c.label}`] = vaultAddr;
    console.log(`${c.label} vault:`, vaultAddr);


    // Seed deposit (avoid initial rounding edge cases)
    const token = new ethers.Contract(c.asset, ERC20_ABI, deployer);
    const bal: bigint = await token.balanceOf(deployerAddr);

    if (bal < SEED_AMOUNT) {
      console.log(
        `${c.label} seeding skipped (insufficient balance). Need >= ${SEED_AMOUNT.toString()}, have ${bal.toString()}`
      );
      continue;
    }
    const sharesToBurn = await vault.previewDeposit(SEED_AMOUNT);
    await (await token.approve(vaultAddr, SEED_AMOUNT)).wait();
    await (await vault.deposit(SEED_AMOUNT, deployerAddr)).wait();
    await (await vault.transfer(DEAD, sharesToBurn)).wait();
    console.log(`${c.label} seeded with deposit:`, SEED_AMOUNT.toString());
  }

  fs.writeFileSync(
    "deployMetamorphoImpactVault.addresses.json",
    JSON.stringify(out, null, 2)
  );
  console.log("\nSaved: deployMetamorphoImpactVault.addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
