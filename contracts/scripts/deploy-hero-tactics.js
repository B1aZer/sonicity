const { ethers, upgrades } = require("hardhat");

async function deployHeroTactics(existingAddresses = {}) {
  console.log("Starting Hero/Tactics/Cosmetic contracts deployment...");

  // Deploy HeroNFT implementation
  console.log("Deploying HeroNFT implementation...");
  const HeroNFT = await ethers.getContractFactory("HeroNFT");
  const heroNFTImpl = await HeroNFT.deploy();
  console.log("Waiting for HeroNFT implementation deployment...");
  await heroNFTImpl.waitForDeployment();
  const heroNFTImplAddress = await heroNFTImpl.getAddress();
  console.log("HeroNFT implementation deployed to:", heroNFTImplAddress);

  // Deploy TacticsNFT implementation
  console.log("Deploying TacticsNFT implementation...");
  const TacticsNFT = await ethers.getContractFactory("TacticsNFT");
  const tacticsNFTImpl = await TacticsNFT.deploy();
  console.log("Waiting for TacticsNFT implementation deployment...");
  await tacticsNFTImpl.waitForDeployment();
  const tacticsNFTImplAddress = await tacticsNFTImpl.getAddress();
  console.log("TacticsNFT implementation deployed to:", tacticsNFTImplAddress);

  // Deploy CosmeticItems implementation
  console.log("Deploying CosmeticItems implementation...");
  const CosmeticItemsImpl = await ethers.getContractFactory("CosmeticItems");
  const cosmeticItemsImpl = await CosmeticItemsImpl.deploy();
  console.log("Waiting for CosmeticItems implementation deployment...");
  await cosmeticItemsImpl.waitForDeployment();
  const cosmeticItemsImplAddress = await cosmeticItemsImpl.getAddress();
  console.log("CosmeticItems implementation deployed to:", cosmeticItemsImplAddress);

  // Deploy HeroNFT proxy
  console.log("Deploying HeroNFT proxy...");
  const heroNFTProxy = await upgrades.deployProxy(HeroNFT, [], {
    initializer: "initialize",
    kind: "uups"
  });
  console.log("Waiting for HeroNFT proxy deployment...");
  await heroNFTProxy.waitForDeployment();
  const heroNFTProxyAddress = await heroNFTProxy.getAddress();
  console.log("HeroNFT proxy deployed to:", heroNFTProxyAddress);

  // Deploy TacticsNFT proxy
  console.log("Deploying TacticsNFT proxy...");
  const tacticsNFTProxy = await upgrades.deployProxy(TacticsNFT, [], {
    initializer: "initialize",
    kind: "uups"
  });
  console.log("Waiting for TacticsNFT proxy deployment...");
  await tacticsNFTProxy.waitForDeployment();
  const tacticsNFTProxyAddress = await tacticsNFTProxy.getAddress();
  console.log("TacticsNFT proxy deployed to:", tacticsNFTProxyAddress);

  // Deploy CosmeticItems proxy
  console.log("Deploying CosmeticItems proxy...");
  const cosmeticItemsProxy = await upgrades.deployProxy(CosmeticItemsImpl, [], {
    initializer: "initialize",
    kind: "uups"
  });
  console.log("Waiting for CosmeticItems proxy deployment...");
  await cosmeticItemsProxy.waitForDeployment();
  const cosmeticItemsProxyAddress = await cosmeticItemsProxy.getAddress();
  console.log("CosmeticItems proxy deployed to:", cosmeticItemsProxyAddress);

  // Set up contract interactions
  console.log("Setting up Hero/Tactics/Cosmetic contract interactions...");
  
  // Set GameState address in Hero/Tactics/Cosmetic contracts
  if (existingAddresses.gameStateProxy) {
    console.log("Setting GameState address in HeroNFT...");
    await heroNFTProxy.setGameStateAddress(existingAddresses.gameStateProxy);
    console.log("Setting GameState address in TacticsNFT...");
    await tacticsNFTProxy.setGameStateAddress(existingAddresses.gameStateProxy);
    console.log("Setting GameState address in CosmeticItems...");
    await cosmeticItemsProxy.setGameStateAddress(existingAddresses.gameStateProxy);
  }

  // Set Hero/Tactics/Cosmetic addresses in GameState
  if (existingAddresses.gameStateProxy) {
    console.log("Setting Hero/Tactics/Cosmetic addresses in GameState...");
    const gameState = await ethers.getContractAt("GameState", existingAddresses.gameStateProxy);
    await gameState.setHeroNFTAddress(heroNFTProxyAddress);
    await gameState.setTacticsNFTAddress(tacticsNFTProxyAddress);
    await gameState.setCosmeticItemsAddress(cosmeticItemsProxyAddress);
  }

  // Set Hero/Tactics addresses in BattleSystem
  if (existingAddresses.battleSystemProxy) {
    console.log("Setting Hero/Tactics addresses in BattleSystem...");
    const battleSystem = await ethers.getContractAt("BattleSystem", existingAddresses.battleSystemProxy);
    await battleSystem.setHeroNFTAddress(heroNFTProxyAddress);
    await battleSystem.setTacticsNFTAddress(tacticsNFTProxyAddress);
  }

  console.log("\nHero/Tactics/Cosmetic contracts deployment completed!");
  console.log("HeroNFT implementation:", heroNFTImplAddress);
  console.log("HeroNFT proxy:", heroNFTProxyAddress);
  console.log("TacticsNFT implementation:", tacticsNFTImplAddress);
  console.log("TacticsNFT proxy:", tacticsNFTProxyAddress);
  console.log("CosmeticItems implementation:", cosmeticItemsImplAddress);
  console.log("CosmeticItems proxy:", cosmeticItemsProxyAddress);

  return {
    heroNFTImpl: heroNFTImplAddress,
    heroNFTProxy: heroNFTProxyAddress,
    tacticsNFTImpl: tacticsNFTImplAddress,
    tacticsNFTProxy: tacticsNFTProxyAddress,
    cosmeticItemsImpl: cosmeticItemsImplAddress,
    cosmeticItemsProxy: cosmeticItemsProxyAddress
  };
}

async function main() {
  const fs = require('fs');
  const path = require('path');
  
  // Load existing deployed addresses
  const addressesPath = path.join(__dirname, '..', 'deployed-addresses.json');
  let existingAddresses = {};
  
  if (fs.existsSync(addressesPath)) {
    console.log("Loaded existing deployed addresses");
    existingAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  }

  const newAddresses = await deployHeroTactics(existingAddresses);
  
  // Update deployed-addresses.json
  const updatedAddresses = { ...existingAddresses, ...newAddresses };
  fs.writeFileSync(addressesPath, JSON.stringify(updatedAddresses, null, 2));
  console.log("Addresses updated in deployed-addresses.json");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployHeroTactics };
