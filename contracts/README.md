# Sonicity NFT Contract Deployment Guide

This guide provides instructions for deploying the Sonicity NFT smart contract to the Ethereum blockchain.

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Hardhat (`npm install --save-dev hardhat`)
- OpenZeppelin Contracts (`npm install @openzeppelin/contracts`)
- Ethereum wallet with private key (e.g., MetaMask)
- Alchemy, Infura, or other Ethereum API key

## Setup

1. Create a new Hardhat project:

```bash
mkdir sonicity-nft
cd sonicity-nft
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat init
```

2. Copy the `SonicityNFT.sol` contract into the `contracts/` folder of your Hardhat project.

3. Create a `.env` file with your deployment credentials:

```
PRIVATE_KEY=your_private_key_here
ALCHEMY_API_KEY=your_alchemy_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

4. Create a deployment script in `scripts/deploy.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  // Deploy the contract
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = await SonicityNFT.deploy();
  await sonicityNFT.deployed();

  console.log("SonicityNFT deployed to:", sonicityNFT.address);

  // Optional: Activate minting
  // await sonicityNFT.setMintActive(true);
  // console.log("Minting activated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

5. Configure Hardhat in `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.17",
  networks: {
    // For testnet deployment (e.g., Goerli)
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    },
    // For mainnet deployment
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
```

## Deployment

To deploy to the Goerli testnet:

```bash
npx hardhat run scripts/deploy.js --network goerli
```

To deploy to the Ethereum mainnet:

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## Contract Verification

After deployment, verify your contract on Etherscan:

```bash
npx hardhat verify --network goerli DEPLOYED_CONTRACT_ADDRESS
```

## Post-Deployment Setup

After deployment, you'll need to:

1. Set the base URI for your NFT metadata:
   ```
   await sonicityNFT.setBaseURI("https://api.your-domain.com/metadata/");
   ```

2. Activate minting:
   ```
   await sonicityNFT.setMintActive(true);
   ```

## Creating Metadata

Your metadata server needs to serve JSON files at URLs like:
`https://api.your-domain.com/metadata/1` for token ID 1.

See the `metadata-example.json` file for the proper format to follow.

## Integrating with the Mint Page

1. Update the frontend code with your deployed contract address.
2. Connect the mint function to the smart contract's `mint` function.
3. Set up a metadata server for serving token information.

## Mainnet Checklist

Before deploying to mainnet:

- [ ] Test thoroughly on testnet
- [ ] Get smart contract audited
- [ ] Prepare metadata server
- [ ] Finalize token pricing
- [ ] Prepare marketing materials
- [ ] Consider gas price optimization 