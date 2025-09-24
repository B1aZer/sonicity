const { ethers, upgrades } = require("hardhat");
// Import the reusable deployment functions
const { deployGridBuildings } = require("./deploy-grid");
const { deployAltar } = require("./deploy-altar");
const { deployNFTs } = require("./deploy-nfts");
const { deployHeroTactics } = require("./deploy-hero-tactics");

async function main() {
  console.log("Starting deployment...");

  // Deploy NFT contracts using the reusable function
  const nftAddresses = await deployNFTs({});

  // Deploy GameState implementation
  console.log("Deploying GameState implementation...");
  const GameState = await ethers.getContractFactory("GameState");
  const gameStateImpl = await GameState.deploy();
  console.log("Waiting for GameState implementation deployment...");
  await gameStateImpl.waitForDeployment();
  const gameStateImplAddress = await gameStateImpl.getAddress();
  console.log("GameState implementation deployed to:", gameStateImplAddress);

  // Deploy DistrictBuildings implementation
  console.log("Deploying DistrictBuildings implementation...");
  const DistrictBuildings = await ethers.getContractFactory("DistrictBuildings");
  const districtBuildingsImpl = await DistrictBuildings.deploy();
  console.log("Waiting for DistrictBuildings implementation deployment...");
  await districtBuildingsImpl.waitForDeployment();
  const districtBuildingsImplAddress = await districtBuildingsImpl.getAddress();
  console.log("DistrictBuildings implementation deployed to:", districtBuildingsImplAddress);

  // GridBuildings will be deployed later using the reusable function

  // Altar will be deployed later using the reusable function

  // Deploy BattleSystem implementation
  console.log("Deploying BattleSystem implementation...");
  const BattleSystem = await ethers.getContractFactory("BattleSystem");
  const battleSystemImpl = await BattleSystem.deploy();
  console.log("Waiting for BattleSystem implementation deployment...");
  await battleSystemImpl.waitForDeployment();
  const battleSystemImplAddress = await battleSystemImpl.getAddress();
  console.log("BattleSystem implementation deployed to:", battleSystemImplAddress);

  // Deploy MatchmakingSystem implementation
  console.log("Deploying MatchmakingSystem implementation...");
  const MatchmakingSystem = await ethers.getContractFactory("MatchmakingSystem");
  const matchmakingSystemImpl = await MatchmakingSystem.deploy();
  console.log("Waiting for MatchmakingSystem implementation deployment...");
  await matchmakingSystemImpl.waitForDeployment();
  const matchmakingSystemImplAddress = await matchmakingSystemImpl.getAddress();
  console.log("MatchmakingSystem implementation deployed to:", matchmakingSystemImplAddress);


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

  // Deploy DistrictBuildings proxy
  console.log("Deploying DistrictBuildings proxy...");
  const districtBuildingsProxy = await upgrades.deployProxy(DistrictBuildings, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for DistrictBuildings proxy deployment...");
  await districtBuildingsProxy.waitForDeployment();
  const districtBuildingsProxyAddress = await districtBuildingsProxy.getAddress();
  console.log("DistrictBuildings proxy deployed to:", districtBuildingsProxyAddress);

  // Deploy BattleSystem proxy
  console.log("Deploying BattleSystem proxy...");
  const battleSystemProxy = await upgrades.deployProxy(BattleSystem, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for BattleSystem proxy deployment...");
  await battleSystemProxy.waitForDeployment();
  const battleSystemProxyAddress = await battleSystemProxy.getAddress();
  console.log("BattleSystem proxy deployed to:", battleSystemProxyAddress);

  // Deploy MatchmakingSystem proxy
  console.log("Deploying MatchmakingSystem proxy...");
  const matchmakingSystemProxy = await upgrades.deployProxy(MatchmakingSystem, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for MatchmakingSystem proxy deployment...");
  await matchmakingSystemProxy.waitForDeployment();
  const matchmakingSystemProxyAddress = await matchmakingSystemProxy.getAddress();
  console.log("MatchmakingSystem proxy deployed to:", matchmakingSystemProxyAddress);

  // Deploy GridBuildings using the reusable function (without altar address initially)
  const gridAddresses = await deployGridBuildings({
    gameStateProxy: gameStateProxyAddress,
    battleSystemProxy: battleSystemProxyAddress,
    districtBuildingsProxy: districtBuildingsProxyAddress
  });
  const gridBuildingsImplAddress = gridAddresses.gridBuildingsImpl;
  const gridBuildingsProxyAddress = gridAddresses.gridBuildingsProxy;

  // Deploy Altar using the reusable function
  const altarAddresses = await deployAltar({
    gameStateProxy: gameStateProxyAddress,
    gridBuildingsProxy: gridBuildingsProxyAddress,
    battleSystemProxy: battleSystemProxyAddress,
    ...nftAddresses
  });
  const altarImplAddress = altarAddresses.altarImpl;
  const altarProxyAddress = altarAddresses.altarProxy;

  // Now set the altar address in GridBuildings (after altar is deployed)
  console.log("Setting Altar address in GridBuildings...");
  const gridBuildingsProxy = await ethers.getContractAt("GridBuildings", gridBuildingsProxyAddress);
  await gridBuildingsProxy.setAltarAddress(altarProxyAddress);

  // Deploy Hero/Tactics/Cosmetic contracts using the reusable function
  const heroTacticsAddresses = await deployHeroTactics({
    gameStateProxy: gameStateProxyAddress,
    battleSystemProxy: battleSystemProxyAddress
  });

  // Set up contract interactions
  console.log("Setting up contract interactions...");
  
  // Altar setup is handled by the deployAltar function
  // GridBuildings setup is handled by the deployGridBuildings function
  
  // Set GameState address in DistrictBuildings
  console.log("Setting GameState address in DistrictBuildings...");
  await districtBuildingsProxy.setGameStateAddress(gameStateProxyAddress);
  
  // Set DistrictBuildings address in GameState
  console.log("Setting DistrictBuildings address in GameState...");
  await gameStateProxy.setDistrictBuildingsAddress(districtBuildingsProxyAddress);

  // Set GameState address in BattleSystem
  console.log("Setting GameState address in BattleSystem...");
  await battleSystemProxy.setGameStateAddress(gameStateProxyAddress);

  // Set DistrictBuildings address in BattleSystem
  console.log("Setting DistrictBuildings address in BattleSystem...");
  await battleSystemProxy.setDistrictBuildingsAddress(districtBuildingsProxyAddress);

  // Set BattleSystem address in DistrictBuildings
  console.log("Setting BattleSystem address in DistrictBuildings...");
  await districtBuildingsProxy.setBattleSystemAddress(battleSystemProxyAddress);

  // Set GridBuildings address in BattleSystem (must happen after GridBuildings deployment)
  console.log("Setting GridBuildings address in BattleSystem...");
  await battleSystemProxy.setGridBuildingsAddress(gridBuildingsProxyAddress);

  // Set up MatchmakingSystem contract interactions
  console.log("Setting up MatchmakingSystem contract interactions...");
  
  // Set GameState address in MatchmakingSystem
  console.log("Setting GameState address in MatchmakingSystem...");
  await matchmakingSystemProxy.setGameStateAddress(gameStateProxyAddress);
  
  // Set BattleSystem address in MatchmakingSystem
  console.log("Setting BattleSystem address in MatchmakingSystem...");
  await matchmakingSystemProxy.setBattleSystemAddress(battleSystemProxyAddress);
  
  // Set DistrictBuildings address in MatchmakingSystem
  console.log("Setting DistrictBuildings address in MatchmakingSystem...");
  await matchmakingSystemProxy.setDistrictBuildingsAddress(districtBuildingsProxyAddress);
  
  // Set GridBuildings address in MatchmakingSystem
  console.log("Setting GridBuildings address in MatchmakingSystem...");
  await matchmakingSystemProxy.setGridBuildingsAddress(gridBuildingsProxyAddress);
  
  // Set MatchmakingSystem address in GameState
  console.log("Setting MatchmakingSystem address in GameState...");
  await gameStateProxy.setMatchmakingSystemAddress(matchmakingSystemProxyAddress);
  
  // Set MatchmakingSystem address in BattleSystem
  console.log("Setting MatchmakingSystem address in BattleSystem...");
  await battleSystemProxy.setMatchmakingSystemAddress(matchmakingSystemProxyAddress);

  // Hero/Tactics/Cosmetic contract interactions are handled by the deployHeroTactics function

  // Verify contracts on Etherscan (if needed)
  console.log("\nDeployment completed!");
  console.log("Contract addresses:");
  console.log("SonicityNFT:", nftAddresses.sonicityNFT);
  console.log("SonicityFarm:", nftAddresses.sonicityFarm);
  console.log("SonicityDiamond:", nftAddresses.sonicityDiamond);
  console.log("SonicityRep:", nftAddresses.sonicityRep);
  console.log("SonicityYieldNFT:", nftAddresses.sonicityYieldNFT);
  console.log("SonicityArtProxy:", nftAddresses.sonicityArtProxy);
  console.log("GameState implementation:", gameStateImplAddress);
  console.log("GameState proxy:", gameStateProxyAddress);
  console.log("DistrictBuildings implementation:", districtBuildingsImplAddress);
  console.log("DistrictBuildings proxy:", districtBuildingsProxyAddress);
  console.log("GridBuildings implementation:", gridBuildingsImplAddress);
  console.log("GridBuildings proxy:", gridBuildingsProxyAddress);
  console.log("Altar implementation:", altarImplAddress);
  console.log("Altar proxy:", altarProxyAddress);
  console.log("BattleSystem implementation:", battleSystemImplAddress);
  console.log("BattleSystem proxy:", battleSystemProxyAddress);
  console.log("MatchmakingSystem implementation:", matchmakingSystemImplAddress);
  console.log("MatchmakingSystem proxy:", matchmakingSystemProxyAddress);
  console.log("HeroNFT implementation:", heroTacticsAddresses.heroNFTImpl);
  console.log("HeroNFT proxy:", heroTacticsAddresses.heroNFTProxy);
  console.log("TacticsNFT implementation:", heroTacticsAddresses.tacticsNFTImpl);
  console.log("TacticsNFT proxy:", heroTacticsAddresses.tacticsNFTProxy);
  console.log("CosmeticItems implementation:", heroTacticsAddresses.cosmeticItemsImpl);
  console.log("CosmeticItems proxy:", heroTacticsAddresses.cosmeticItemsProxy);

  // Save addresses to a file for frontend use
  const addresses = {
    ...nftAddresses,
    ...heroTacticsAddresses,
    gameStateImpl: gameStateImplAddress,
    gameStateProxy: gameStateProxyAddress,
    districtBuildingsImpl: districtBuildingsImplAddress,
    districtBuildingsProxy: districtBuildingsProxyAddress,
    gridBuildingsImpl: gridBuildingsImplAddress,
    gridBuildingsProxy: gridBuildingsProxyAddress,
    altarImpl: altarImplAddress,
    altarProxy: altarProxyAddress,
    battleSystemImpl: battleSystemImplAddress,
    battleSystemProxy: battleSystemProxyAddress,
    matchmakingSystemImpl: matchmakingSystemImplAddress,
    matchmakingSystemProxy: matchmakingSystemProxyAddress,
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