const { ethers, upgrades } = require("hardhat");

async function deployGridBuildings(existingAddresses = {}) {
  console.log("Starting GridBuildings deployment...");

  // Deploy GridBuildings implementation
  console.log("Deploying GridBuildings implementation...");
  const GridBuildings = await ethers.getContractFactory("GridBuildings");
  const gridBuildingsImpl = await GridBuildings.deploy();
  console.log("Waiting for GridBuildings implementation deployment...");
  await gridBuildingsImpl.waitForDeployment();
  const gridBuildingsImplAddress = await gridBuildingsImpl.getAddress();
  console.log("GridBuildings implementation deployed to:", gridBuildingsImplAddress);

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

  // Set up contract interactions if other contracts exist
  console.log("Setting up contract interactions...");

  if (existingAddresses.gameStateProxy) {
    console.log("Setting GridBuildings address in GameState...");
    const gameState = await ethers.getContractAt("GameState", existingAddresses.gameStateProxy);
    await gameState.setGridBuildingsAddress(gridBuildingsProxyAddress);

    console.log("Setting GameState address in GridBuildings...");
    await gridBuildingsProxy.setGameStateAddress(existingAddresses.gameStateProxy);
  }

  if (existingAddresses.altarProxy) {
    console.log("Setting Altar address in GridBuildings...");
    await gridBuildingsProxy.setAltarAddress(existingAddresses.altarProxy);
  }

  if (existingAddresses.battleSystemProxy) {
    console.log("Setting BattleSystem address in GridBuildings...");
    await gridBuildingsProxy.setBattleSystemAddress(existingAddresses.battleSystemProxy);
  }

  if (existingAddresses.districtBuildingsProxy) {
    console.log("Setting DistrictBuildings address in GridBuildings...");
    await gridBuildingsProxy.setDistrictBuildingsAddress(existingAddresses.districtBuildingsProxy);
  }

  console.log("\nGridBuildings deployment completed!");
  console.log("GridBuildings implementation:", gridBuildingsImplAddress);
  console.log("GridBuildings proxy:", gridBuildingsProxyAddress);

  return {
    gridBuildingsImpl: gridBuildingsImplAddress,
    gridBuildingsProxy: gridBuildingsProxyAddress
  };
}

// If this script is run directly (not imported)
async function main() {
  // Read existing deployed addresses if they exist
  const fs = require('fs');
  let existingAddresses = {};
  try {
    existingAddresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    console.log("Loaded existing deployed addresses");
  } catch (error) {
    console.log("No existing deployed-addresses.json found");
  }

  // Deploy GridBuildings
  const newAddresses = await deployGridBuildings(existingAddresses);

  // Update addresses file
  const updatedAddresses = {
    ...existingAddresses,
    ...newAddresses,
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(updatedAddresses, null, 2)
  );
  console.log("\nAddresses updated in deployed-addresses.json");
}

// Export the function for use in other scripts
module.exports = { deployGridBuildings };

// Only run main if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
