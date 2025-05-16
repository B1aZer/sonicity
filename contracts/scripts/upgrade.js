const { ethers, upgrades } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Starting upgrades...");

  // Upgrade GameState
  console.log("Upgrading GameState...");
  const GameState = await ethers.getContractFactory("GameState");
  const gameStateProxy = await upgrades.upgradeProxy(addresses.gameStateProxy, GameState);
  await gameStateProxy.waitForDeployment();
  console.log("GameState upgraded to:", await gameStateProxy.getAddress());

  // Upgrade DistrictBuildings
  console.log("Upgrading DistrictBuildings...");
  const DistrictBuildings = await ethers.getContractFactory("DistrictBuildings");
  const districtBuildingsProxy = await upgrades.upgradeProxy(addresses.districtBuildingsProxy, DistrictBuildings);
  await districtBuildingsProxy.waitForDeployment();
  console.log("DistrictBuildings upgraded to:", await districtBuildingsProxy.getAddress());

  // Upgrade Altar
  console.log("Upgrading Altar...");
  const Altar = await ethers.getContractFactory("Altar");
  const altarProxy = await upgrades.upgradeProxy(addresses.altarProxy, Altar);
  await altarProxy.waitForDeployment();
  console.log("Altar upgraded to:", await altarProxy.getAddress());

  // Set up contract interactions
  console.log("Setting up contract interactions...");
  
  // Set Altar address in GameState
  console.log("Setting Altar address in GameState...");
  await gameStateProxy.setAltarAddress(await altarProxy.getAddress());
  
  // Set GameState address in DistrictBuildings
  console.log("Setting GameState address in DistrictBuildings...");
  await districtBuildingsProxy.setGameStateAddress(await gameStateProxy.getAddress());
  
  // Set DistrictBuildings address in GameState
  console.log("Setting DistrictBuildings address in GameState...");
  await gameStateProxy.setDistrictBuildingsAddress(await districtBuildingsProxy.getAddress());

  // Update addresses file
  const newAddresses = {
    ...addresses,
    gameStateProxy: await gameStateProxy.getAddress(),
    districtBuildingsProxy: await districtBuildingsProxy.getAddress(),
    altarProxy: await altarProxy.getAddress(),
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(newAddresses, null, 2)
  );
  console.log("\nAddresses updated in deployed-addresses.json");

  console.log("\nUpgrades completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 