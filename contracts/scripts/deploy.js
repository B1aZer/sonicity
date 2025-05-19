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

  // Deploy SonicityFarm
  console.log("Deploying SonicityFarm...");
  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const sonicityFarm = await SonicityFarm.deploy();
  console.log("Waiting for SonicityFarm deployment...");
  await sonicityFarm.waitForDeployment();
  const sonicityFarmAddress = await sonicityFarm.getAddress();
  console.log("SonicityFarm deployed to:", sonicityFarmAddress);

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

  // Deploy GridBuildings implementation
  console.log("Deploying GridBuildings implementation...");
  const GridBuildings = await ethers.getContractFactory("GridBuildings");
  const gridBuildingsImpl = await GridBuildings.deploy();
  console.log("Waiting for GridBuildings implementation deployment...");
  await gridBuildingsImpl.waitForDeployment();
  const gridBuildingsImplAddress = await gridBuildingsImpl.getAddress();
  console.log("GridBuildings implementation deployed to:", gridBuildingsImplAddress);

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

  // Deploy GridBuildings proxy
  console.log("Deploying GridBuildings proxy...");
  const gridBuildingsProxy = await upgrades.deployProxy(GridBuildings, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for GridBuildings proxy deployment...");
  await gridBuildingsProxy.waitForDeployment();
  const gridBuildingsProxyAddress = await gridBuildingsProxy.getAddress();
  console.log("GridBuildings proxy deployed to:", gridBuildingsProxyAddress);

  // Deploy Altar proxy with initialization parameters
  console.log("Deploying Altar proxy...");
  const altarProxy = await upgrades.deployProxy(Altar, [sonicityNFTAddress, gameStateProxyAddress, gridBuildingsProxyAddress], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for Altar proxy deployment...");
  await altarProxy.waitForDeployment();
  const altarProxyAddress = await altarProxy.getAddress();
  console.log("Altar proxy deployed to:", altarProxyAddress);

  // Set up contract interactions
  console.log("Setting up contract interactions...");
  
  // Set Altar address in GameState
  console.log("Setting Altar address in GameState...");
  await gameStateProxy.setAltarAddress(altarProxyAddress);
  
  // Set GameState address in DistrictBuildings
  console.log("Setting GameState address in DistrictBuildings...");
  await districtBuildingsProxy.setGameStateAddress(gameStateProxyAddress);
  
  // Set DistrictBuildings address in GameState
  console.log("Setting DistrictBuildings address in GameState...");
  await gameStateProxy.setDistrictBuildingsAddress(districtBuildingsProxyAddress);

  // Set GridBuildings address in GameState
  console.log("Setting GridBuildings address in GameState...");
  await gameStateProxy.setGridBuildingsAddress(gridBuildingsProxyAddress);

  // Set GameState address in GridBuildings
  console.log("Setting GameState address in GridBuildings...");
  await gridBuildingsProxy.setGameStateAddress(gameStateProxyAddress);

  // Verify contracts on Etherscan (if needed)
  console.log("\nDeployment completed!");
  console.log("Contract addresses:");
  console.log("SonicityNFT:", sonicityNFTAddress);
  console.log("SonicityFarm:", sonicityFarmAddress);
  console.log("GameState implementation:", gameStateImplAddress);
  console.log("GameState proxy:", gameStateProxyAddress);
  console.log("DistrictBuildings implementation:", districtBuildingsImplAddress);
  console.log("DistrictBuildings proxy:", districtBuildingsProxyAddress);
  console.log("GridBuildings implementation:", gridBuildingsImplAddress);
  console.log("GridBuildings proxy:", gridBuildingsProxyAddress);
  console.log("Altar implementation:", altarImplAddress);
  console.log("Altar proxy:", altarProxyAddress);

  // Save addresses to a file for frontend use
  const addresses = {
    sonicityNFT: sonicityNFTAddress,
    sonicityFarm: sonicityFarmAddress,
    gameStateImpl: gameStateImplAddress,
    gameStateProxy: gameStateProxyAddress,
    districtBuildingsImpl: districtBuildingsImplAddress,
    districtBuildingsProxy: districtBuildingsProxyAddress,
    gridBuildingsImpl: gridBuildingsImplAddress,
    gridBuildingsProxy: gridBuildingsProxyAddress,
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