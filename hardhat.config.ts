import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "dotenv/config";
const RPC_URL = process.env.ETH_URL || "rpc";
const SEPOLIA_URL = process.env.SEPOLIA_URL || "rpc";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "privatKey";
const PRIVATE_KEY_TESTNET = process.env.PRIVATE_KEY_TESTNET || "privatKey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "etherscanAPIKey";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "u"
          }
        }
      },
    },
  },
    networks: {
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY_TESTNET],
    },
    mainnet: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
    }
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

export default config;
