const { ethers, upgrades } = require("hardhat");
// Import the reusable deployment functions
const { deployGridBuildings } = require("./deploy-grid");
const { deployAltar } = require("./deploy-altar");

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

  // Deploy SonicityFarm
  console.log("Deploying SonicityFarm...");
  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const sonicityFarm = await SonicityFarm.deploy();
  console.log("Waiting for SonicityFarm deployment...");
  await sonicityFarm.waitForDeployment();
  const sonicityFarmAddress = await sonicityFarm.getAddress();
  console.log("SonicityFarm deployed to:", sonicityFarmAddress);

  // Deploy SonicityDiamond NFT contract
  console.log("Deploying SonicityDiamond NFT contract...");
  const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
  const sonicityDiamond = await SonicityDiamond.deploy();
  await sonicityDiamond.waitForDeployment();
  const sonicityDiamondAddress = await sonicityDiamond.getAddress();
  console.log("SonicityDiamond deployed to:", sonicityDiamondAddress);

  // Deploy SonicityRep NFT contract
  console.log("Deploying SonicityRep NFT contract...");
  const SonicityRep = await ethers.getContractFactory("SonicityRep");
  const sonicityRep = await SonicityRep.deploy();
  await sonicityRep.waitForDeployment();
  const sonicityRepAddress = await sonicityRep.getAddress();
  console.log("SonicityRep deployed to:", sonicityRepAddress);

  // Deploy SonicityYieldNFT contract
  console.log("Deploying SonicityYieldNFT contract...");
  const SonicityYieldNFT = await ethers.getContractFactory("SonicityYieldNFT");
  const sonicityYieldNFT = await SonicityYieldNFT.deploy();
  await sonicityYieldNFT.waitForDeployment();
  const sonicityYieldNFTAddress = await sonicityYieldNFT.getAddress();
  console.log("SonicityYieldNFT deployed to:", sonicityYieldNFTAddress);

  // Deploy SonicityArtProxy contract
  console.log("Deploying SonicityArtProxy contract...");
  const SonicityArtProxy = await ethers.getContractFactory("SonicityArtProxy");
  const sonicityArtProxy = await SonicityArtProxy.deploy();
  await sonicityArtProxy.waitForDeployment();
  const sonicityArtProxyAddress = await sonicityArtProxy.getAddress();
  console.log("SonicityArtProxy deployed to:", sonicityArtProxyAddress);

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

  // Deploy GridBuildings using the reusable function
  const gridAddresses = await deployGridBuildings({
    gameStateProxy: gameStateProxyAddress,
    altarProxy: altarProxyAddress,
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
    sonicityNFT: sonicityNFTAddress,
    sonicityFarm: sonicityFarmAddress,
    sonicityDiamond: sonicityDiamondAddress,
    sonicityRep: sonicityRepAddress,
    sonicityYieldNFT: sonicityYieldNFTAddress,
    sonicityArtProxy: sonicityArtProxyAddress
  });
  const altarImplAddress = altarAddresses.altarImpl;
  const altarProxyAddress = altarAddresses.altarProxy;

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

  // Deploy HeroNFT proxy
  console.log("Deploying HeroNFT proxy...");
  const heroNFTProxy = await upgrades.deployProxy(HeroNFT, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for HeroNFT proxy deployment...");
  await heroNFTProxy.waitForDeployment();
  const heroNFTProxyAddress = await heroNFTProxy.getAddress();
  console.log("HeroNFT proxy deployed to:", heroNFTProxyAddress);

  // Deploy TacticsNFT proxy
  console.log("Deploying TacticsNFT proxy...");
  const tacticsNFTProxy = await upgrades.deployProxy(TacticsNFT, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for TacticsNFT proxy deployment...");
  await tacticsNFTProxy.waitForDeployment();
  const tacticsNFTProxyAddress = await tacticsNFTProxy.getAddress();
  console.log("TacticsNFT proxy deployed to:", tacticsNFTProxyAddress);

  // Deploy CosmeticItems proxy
  console.log("Deploying CosmeticItems proxy...");
  const cosmeticItemsProxy = await upgrades.deployProxy(CosmeticItemsImpl, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for CosmeticItems proxy deployment...");
  await cosmeticItemsProxy.waitForDeployment();
  const cosmeticItemsProxyAddress = await cosmeticItemsProxy.getAddress();
  console.log("CosmeticItems proxy deployed to:", cosmeticItemsProxyAddress);

  // Set up contract interactions
  console.log("Setting up contract interactions...");
  
  // Altar setup is handled by the deployAltar function
  
  // Set BattleSystem address in GameState (if not already set by deployAltar)
  console.log("Setting BattleSystem address in GameState...");
  await gameStateProxy.setBattleSystemAddress(battleSystemProxyAddress);
  
  // Set GameState address in DistrictBuildings
  console.log("Setting GameState address in DistrictBuildings...");
  await districtBuildingsProxy.setGameStateAddress(gameStateProxyAddress);
  
  // Set DistrictBuildings address in GameState
  console.log("Setting DistrictBuildings address in GameState...");
  await gameStateProxy.setDistrictBuildingsAddress(districtBuildingsProxyAddress);

  // GridBuildings setup is handled by the deployGridBuildings function

  // Set GameState address in BattleSystem
  console.log("Setting GameState address in BattleSystem...");
  await battleSystemProxy.setGameStateAddress(gameStateProxyAddress);

  // Set DistrictBuildings address in BattleSystem
  console.log("Setting DistrictBuildings address in BattleSystem...");
  await battleSystemProxy.setDistrictBuildingsAddress(districtBuildingsProxyAddress);

  // Set GridBuildings address in BattleSystem (must happen after GridBuildings deployment)
  console.log("Setting GridBuildings address in BattleSystem...");
  await battleSystemProxy.setGridBuildingsAddress(gridBuildingsProxyAddress);

  // Set up Hero & Tactics contract interactions
  console.log("Setting up Hero & Tactics contract interactions...");
  
  // Set GameState address in HeroNFT
  console.log("Setting GameState address in HeroNFT...");
  await heroNFTProxy.setGameStateAddress(gameStateProxyAddress);
  
  // Set GameState address in TacticsNFT
  console.log("Setting GameState address in TacticsNFT...");
  await tacticsNFTProxy.setGameStateAddress(gameStateProxyAddress);
  
  // Set HeroNFT address in GameState
  console.log("Setting HeroNFT address in GameState...");
  await gameStateProxy.setHeroNFTAddress(heroNFTProxyAddress);
  
  // Set TacticsNFT address in GameState
  console.log("Setting TacticsNFT address in GameState...");
  await gameStateProxy.setTacticsNFTAddress(tacticsNFTProxyAddress);
  
  // Set CosmeticItems address in GameState
  console.log("Setting CosmeticItems address in GameState...");
  await gameStateProxy.setCosmeticItemsAddress(cosmeticItemsProxyAddress);
  
  // Set GameState address in CosmeticItems
  console.log("Setting GameState address in CosmeticItems...");
  await cosmeticItemsProxy.setGameStateAddress(gameStateProxyAddress);

  // Set HeroNFT address in BattleSystem
  console.log("Setting HeroNFT address in BattleSystem...");
  await battleSystemProxy.setHeroNFTAddress(heroNFTProxyAddress);

  // Set TacticsNFT address in BattleSystem
  console.log("Setting TacticsNFT address in BattleSystem...");
  await battleSystemProxy.setTacticsNFTAddress(tacticsNFTProxyAddress);

  // Verify contracts on Etherscan (if needed)
  console.log("\nDeployment completed!");
  console.log("Contract addresses:");
  console.log("SonicityNFT:", sonicityNFTAddress);
  console.log("SonicityFarm:", sonicityFarmAddress);
  console.log("SonicityDiamond:", sonicityDiamondAddress);
  console.log("SonicityRep:", sonicityRepAddress);
  console.log("SonicityYieldNFT:", sonicityYieldNFTAddress);
  console.log("SonicityArtProxy:", sonicityArtProxyAddress);
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
  console.log("HeroNFT implementation:", heroNFTImplAddress);
  console.log("HeroNFT proxy:", heroNFTProxyAddress);
  console.log("TacticsNFT implementation:", tacticsNFTImplAddress);
  console.log("TacticsNFT proxy:", tacticsNFTProxyAddress);
  console.log("CosmeticItems implementation:", cosmeticItemsImplAddress);
  console.log("CosmeticItems proxy:", cosmeticItemsProxyAddress);

  // Save addresses to a file for frontend use
  const addresses = {
    sonicityNFT: sonicityNFTAddress,
    sonicityFarm: sonicityFarmAddress,
    sonicityDiamond: sonicityDiamondAddress,
    sonicityRep: sonicityRepAddress,
    sonicityYieldNFT: sonicityYieldNFTAddress,
    sonicityArtProxy: sonicityArtProxyAddress,
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
    heroNFTImpl: heroNFTImplAddress,
    heroNFTProxy: heroNFTProxyAddress,
    tacticsNFTImpl: tacticsNFTImplAddress,
    tacticsNFTProxy: tacticsNFTProxyAddress,
    cosmeticItemsImpl: cosmeticItemsImplAddress,
    cosmeticItemsProxy: cosmeticItemsProxyAddress,
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