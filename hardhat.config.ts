import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "dotenv/config";

const RPC_URL =
  process.env.SEPOLIA_URL || "rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "privatKey";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
        details: { yul: true },
      },
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
      gasPrice:0,
    },
    sepolia: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    mainnet: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
