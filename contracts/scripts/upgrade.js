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

  // Upgrade GridBuildings
  console.log("Upgrading GridBuildings...");
  const GridBuildings = await ethers.getContractFactory("GridBuildings");
  const gridBuildingsProxy = await upgrades.upgradeProxy(addresses.gridBuildingsProxy, GridBuildings);
  await gridBuildingsProxy.waitForDeployment();
  console.log("GridBuildings upgraded to:", await gridBuildingsProxy.getAddress());

  // Upgrade Altar
  console.log("Upgrading Altar...");
  const Altar = await ethers.getContractFactory("Altar");
  const altarProxy = await upgrades.upgradeProxy(addresses.altarProxy, Altar);
  await altarProxy.waitForDeployment();
  console.log("Altar upgraded to:", await altarProxy.getAddress());

  // Upgrade BattleSystem
  console.log("Upgrading BattleSystem...");
  const BattleSystem = await ethers.getContractFactory("BattleSystem");
  const battleSystemProxy = await upgrades.upgradeProxy(addresses.battleSystemProxy, BattleSystem);
  await battleSystemProxy.waitForDeployment();
  console.log("BattleSystem upgraded to:", await battleSystemProxy.getAddress());

  // Upgrade SonicityYieldNFT (if it exists)
  if (addresses.sonicityYieldNFT) {
    console.log("Upgrading SonicityYieldNFT...");
    const SonicityYieldNFT = await ethers.getContractFactory("SonicityYieldNFT");
    const sonicityYieldNFT = await upgrades.upgradeProxy(addresses.sonicityYieldNFT, SonicityYieldNFT);
    await sonicityYieldNFT.waitForDeployment();
    console.log("SonicityYieldNFT upgraded to:", await sonicityYieldNFT.getAddress());
  }

  // Upgrade SonicityArtProxy (if it exists)
  if (addresses.sonicityArtProxy) {
    console.log("Upgrading SonicityArtProxy...");
    const SonicityArtProxy = await ethers.getContractFactory("SonicityArtProxy");
    const sonicityArtProxy = await upgrades.upgradeProxy(addresses.sonicityArtProxy, SonicityArtProxy);
    await sonicityArtProxy.waitForDeployment();
    console.log("SonicityArtProxy upgraded to:", await sonicityArtProxy.getAddress());
  }

  // Set up contract interactions
  console.log("Setting up contract interactions...");
  
  // Set Altar address in GameState
  console.log("Setting Altar address in GameState...");
  await gameStateProxy.setAltarAddress(await altarProxy.getAddress());
  
  // Set BattleSystem address in GameState
  console.log("Setting BattleSystem address in GameState...");
  await gameStateProxy.setBattleSystemAddress(await battleSystemProxy.getAddress());
  
  // Set GameState address in DistrictBuildings
  console.log("Setting GameState address in DistrictBuildings...");
  await districtBuildingsProxy.setGameStateAddress(await gameStateProxy.getAddress());
  
  // Set DistrictBuildings address in GameState
  console.log("Setting DistrictBuildings address in GameState...");
  await gameStateProxy.setDistrictBuildingsAddress(await districtBuildingsProxy.getAddress());

  // Set GridBuildings address in GameState
  console.log("Setting GridBuildings address in GameState...");
  await gameStateProxy.setGridBuildingsAddress(await gridBuildingsProxy.getAddress());

  // Set GameState address in GridBuildings
  console.log("Setting GameState address in GridBuildings...");
  await gridBuildingsProxy.setGameStateAddress(await gameStateProxy.getAddress());

  // Set BattleSystem address in GridBuildings
  console.log("Setting BattleSystem address in GridBuildings...");
  await gridBuildingsProxy.setBattleSystemAddress(await battleSystemProxy.getAddress());

  // Set DistrictBuildings address in GridBuildings
  console.log("Setting DistrictBuildings address in GridBuildings...");
  await gridBuildingsProxy.setDistrictBuildingsAddress(await districtBuildingsProxy.getAddress());

  // Set GameState address in BattleSystem
  console.log("Setting GameState address in BattleSystem...");
  await battleSystemProxy.setGameStateAddress(await gameStateProxy.getAddress());

  // Set DistrictBuildings address in BattleSystem
  console.log("Setting DistrictBuildings address in BattleSystem...");
  await battleSystemProxy.setDistrictBuildingsAddress(await districtBuildingsProxy.getAddress());

  // Set GridBuildings address in BattleSystem
  console.log("Setting GridBuildings address in BattleSystem...");
  await battleSystemProxy.setGridBuildingsAddress(await gridBuildingsProxy.getAddress());

  // Set Altar contract address on all NFT contracts (in case they were redeployed)
  console.log("Setting Altar contract address on NFT contracts...");
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
  const SonicityRep = await ethers.getContractFactory("SonicityRep");
  const SonicityYieldNFT = await ethers.getContractFactory("SonicityYieldNFT");
  
  if (addresses.sonicityNFT) {
    const sonicityNFT = SonicityNFT.attach(addresses.sonicityNFT);
    await sonicityNFT.setAltarContract(await altarProxy.getAddress());
  }
  
  if (addresses.sonicityFarm) {
    const sonicityFarm = SonicityFarm.attach(addresses.sonicityFarm);
    await sonicityFarm.setAltarContract(await altarProxy.getAddress());
  }
  
  if (addresses.sonicityDiamond) {
    const sonicityDiamond = SonicityDiamond.attach(addresses.sonicityDiamond);
    await sonicityDiamond.setAltarContract(await altarProxy.getAddress());
  }

  if (addresses.sonicityRep) {
    const sonicityRep = SonicityRep.attach(addresses.sonicityRep);
    await sonicityRep.setAltarContract(await altarProxy.getAddress());
  }

  if (addresses.sonicityYieldNFT) {
    const sonicityYieldNFT = SonicityYieldNFT.attach(addresses.sonicityYieldNFT);
    await sonicityYieldNFT.setAltarContract(await altarProxy.getAddress());
    
    // Set Art Proxy address if it exists
    if (addresses.sonicityArtProxy) {
      await sonicityYieldNFT.setArtProxy(addresses.sonicityArtProxy);
    }
    
    // Set Yield NFT address in Altar
    console.log("Setting Yield NFT address in Altar...");
    await altarProxy.setYieldNFT(addresses.sonicityYieldNFT);
  }

  // Update addresses file
  const newAddresses = {
    ...addresses,
    gameStateProxy: await gameStateProxy.getAddress(),
    districtBuildingsProxy: await districtBuildingsProxy.getAddress(),
    gridBuildingsProxy: await gridBuildingsProxy.getAddress(),
    altarProxy: await altarProxy.getAddress(),
    battleSystemProxy: await battleSystemProxy.getAddress(),
    ...(addresses.sonicityYieldNFT && { sonicityYieldNFT: await sonicityYieldNFT.getAddress() }),
    ...(addresses.sonicityArtProxy && { sonicityArtProxy: await sonicityArtProxy.getAddress() }),
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