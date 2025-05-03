const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy SonicityNFT if not already deployed
  console.log("Deploying SonicityNFT...");
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = await SonicityNFT.deploy();
  await sonicityNFT.deployed();
  console.log("SonicityNFT deployed to:", sonicityNFT.address);

  // Deploy GameState implementation
  console.log("Deploying GameState implementation...");
  const GameState = await ethers.getContractFactory("GameState");
  const gameStateImpl = await GameState.deploy();
  await gameStateImpl.deployed();
  console.log("GameState implementation deployed to:", gameStateImpl.address);

  // Deploy GameState proxy
  console.log("Deploying GameState proxy...");
  const gameStateProxy = await upgrades.deployProxy(GameState, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  await gameStateProxy.deployed();
  console.log("GameState proxy deployed to:", gameStateProxy.address);

  // Initialize GameState
  console.log("Initializing GameState...");
  await gameStateProxy.initialize(ethers.constants.AddressZero); // We'll update this after Altar deployment
  console.log("GameState initialized");

  // Deploy Altar implementation
  console.log("Deploying Altar implementation...");
  const Altar = await ethers.getContractFactory("Altar");
  const altarImpl = await Altar.deploy();
  await altarImpl.deployed();
  console.log("Altar implementation deployed to:", altarImpl.address);

  // Deploy Altar proxy
  console.log("Deploying Altar proxy...");
  const altarProxy = await upgrades.deployProxy(Altar, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  await altarProxy.deployed();
  console.log("Altar proxy deployed to:", altarProxy.address);

  // Initialize Altar
  console.log("Initializing Altar...");
  await altarProxy.initialize(sonicityNFT.address, gameStateProxy.address);
  console.log("Altar initialized");

  // Update GameState with Altar address
  console.log("Updating GameState with Altar address...");
  await gameStateProxy.initialize(altarProxy.address);
  console.log("GameState updated with Altar address");

  // Verify contracts on Etherscan (if needed)
  console.log("\nDeployment completed!");
  console.log("Contract addresses:");
  console.log("SonicityNFT:", sonicityNFT.address);
  console.log("GameState implementation:", gameStateImpl.address);
  console.log("GameState proxy:", gameStateProxy.address);
  console.log("Altar implementation:", altarImpl.address);
  console.log("Altar proxy:", altarProxy.address);

  // Save addresses to a file for frontend use
  const addresses = {
    sonicityNFT: sonicityNFT.address,
    gameStateImpl: gameStateImpl.address,
    gameStateProxy: gameStateProxy.address,
    altarImpl: altarImpl.address,
    altarProxy: altarProxy.address,
  };

  const fs = require('fs');
  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(addresses, null, 2)
  );
  console.log("\nAddresses saved to deployed-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 