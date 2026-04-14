import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const PRIVATE_KEY = process.env.PLATFORM_PRIVATE_KEY || "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // X Layer Mainnet
    xlayer: {
      url:      process.env.X_LAYER_RPC_URL || "https://rpc.xlayer.tech",
      chainId:  196,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    // X Layer Testnet
    xlayerTestnet: {
      url:      "https://testrpc.xlayer.tech",
      chainId:  195,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
    // Local hardhat
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      xlayer: process.env.OKLINK_API_KEY || "",
    },
    customChains: [
      {
        network:  "xlayer",
        chainId:  196,
        urls: {
          apiURL:     "https://www.oklink.com/api/explorer/v1/contract/verify/async/api/evm/xlayer",
          browserURL: "https://www.oklink.com/xlayer",
        },
      },
    ],
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
