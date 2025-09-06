require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      viaIR: true, // Re-enabled to avoid stack too deep error
      optimizer: {
        enabled: true,
        runs: 1
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 10000  // Mine a block every 10 seconds (10000 ms)
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 146, // Sonic chain ID when using Anvil fork
      timeout: 20000,
      gas: "auto",
      gasPrice: "auto"
    },
    sonic: {
      url: "https://rpc.soniclabs.com",
      chainId: 146,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 20000,
      gas: "auto",
      gasPrice: "auto"
    },
    sonicTestnet: {
      url: "https://api.testnet.sonic.game",
      chainId: 64165,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 20000,
      gas: "auto",
      gasPrice: "auto"
    },
    // Legacy networks (keep for backward compatibility)
    testnet: {
      url: "https://api.testnet.sonic.game",
      chainId: 64165,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 20000
    },
    mainnet: {
      url: "https://rpc.soniclabs.com",
      chainId: 146,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 20000
    }
  },
  etherscan: {
    // Sonic block explorer (SonicScan)
    apiKey: {
      sonic: "YOUR_SONICSCAN_API_KEY",
      sonicTestnet: "YOUR_SONICSCAN_API_KEY"
    },
    customChains: [
      {
        network: "sonic",
        chainId: 146,
        urls: {
          apiURL: "https://api.sonicscan.org/api",
          browserURL: "https://sonicscan.org"
        }
      },
      {
        network: "sonicTestnet", 
        chainId: 64165,
        urls: {
          apiURL: "https://api.testnet.sonicscan.org/api",
          browserURL: "https://testnet.sonicscan.org"
        }
      }
    ]
  }
}; 