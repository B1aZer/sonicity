const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy SonicityNFT if not already deployed
  console.log("Deploying SonicityNFT...");
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = await SonicityNFT.deploy();
  console.log("Waiting for SonicityNFT deployment...");
  await sonicityNFT.waitForDeployment();
  const sonicityNFTAddress = await sonicityNFT.getAddress();
  console.log("SonicityNFT deployed to:", sonicityNFTAddress);

  // Deploy GameState implementation
  console.log("Deploying GameState implementation...");
  const GameState = await ethers.getContractFactory("GameState");
  const gameStateImpl = await GameState.deploy();
  console.log("Waiting for GameState implementation deployment...");
  await gameStateImpl.waitForDeployment();
  const gameStateImplAddress = await gameStateImpl.getAddress();
  console.log("GameState implementation deployed to:", gameStateImplAddress);

  // Deploy Altar implementation
  console.log("Deploying Altar implementation...");
  const Altar = await ethers.getContractFactory("Altar");
  const altarImpl = await Altar.deploy();
  console.log("Waiting for Altar implementation deployment...");
  await altarImpl.waitForDeployment();
  const altarImplAddress = await altarImpl.getAddress();
  console.log("Altar implementation deployed to:", altarImplAddress);

  // Deploy GameState proxy
  console.log("Deploying GameState proxy...");
  const gameStateProxy = await upgrades.deployProxy(GameState, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for GameState proxy deployment...");
  await gameStateProxy.waitForDeployment();
  const gameStateProxyAddress = await gameStateProxy.getAddress();
  console.log("GameState proxy deployed to:", gameStateProxyAddress);

  // Deploy Altar proxy with initialization parameters
  console.log("Deploying Altar proxy...");
  const altarProxy = await upgrades.deployProxy(Altar, [sonicityNFTAddress, gameStateProxyAddress], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for Altar proxy deployment...");
  await altarProxy.waitForDeployment();
  const altarProxyAddress = await altarProxy.getAddress();
  console.log("Altar proxy deployed to:", altarProxyAddress);

  // Update GameState proxy with Altar address
  console.log("Setting Altar address in GameState...");
  await gameStateProxy.setAltarAddress(altarProxyAddress);
  console.log("GameState proxy updated with Altar address");

  // Verify contracts on Etherscan (if needed)
  console.log("\nDeployment completed!");
  console.log("Contract addresses:");
  console.log("SonicityNFT:", sonicityNFTAddress);
  console.log("GameState implementation:", gameStateImplAddress);
  console.log("GameState proxy:", gameStateProxyAddress);
  console.log("Altar implementation:", altarImplAddress);
  console.log("Altar proxy:", altarProxyAddress);

  // Save addresses to a file for frontend use
  const addresses = {
    sonicityNFT: sonicityNFTAddress,
    gameStateImpl: gameStateImplAddress,
    gameStateProxy: gameStateProxyAddress,
    altarImpl: altarImplAddress,
    altarProxy: altarProxyAddress,
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