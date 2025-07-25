require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      //viaIR: true, // Re-enabled to avoid stack too deep error
      optimizer: {
        enabled: true,
        runs: 200
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
      mining: {
        auto: true,
        interval: 10000  // Mine a block every 10 seconds (10000 ms)
      }
    },
    // Add your network configurations here
    // For example:
    // goerli: {
    //   url: "YOUR_ALCHEMY_URL",
    //   accounts: ["YOUR_PRIVATE_KEY"]
    // }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "YOUR_ETHERSCAN_API_KEY"
  }
}; 