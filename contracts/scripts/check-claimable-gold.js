// Script to check claimable gold for a specific address
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Read deployed addresses from JSON file
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  // Address to check claimable gold for
  const addressToCheck = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
  
  // Connect to GameState contract
  const gameStateAddress = deployedAddresses.gameStateProxy;
  console.log(`GameState contract address: ${gameStateAddress}`);
  const GameState = await ethers.getContractFactory("GameState");
  const gameState = GameState.attach(gameStateAddress);
  
  // Get current blockchain time
  const currentBlock = await ethers.provider.getBlock("latest");
  const blockchainTime = currentBlock.timestamp;
  
  console.log(`Checking claimable gold for address: ${addressToCheck}`);
  console.log(`Current blockchain time: ${blockchainTime}`);
  console.log(`Current JS time: ${Math.floor(Date.now() / 1000)}`);
  console.log(`Time difference: ${Math.floor(Date.now() / 1000) - blockchainTime} seconds`);
  
  try {
    // Get building types with production rates
    const buildingTypes = ["house", "water-supply", "workshop"];
    console.log("\nBuilding production rates:");
    
    for (const type of buildingTypes) {
      try {
        const productionRate = await gameState.getBuildingProductionRate(type);
        console.log(`${type}: ${productionRate} gold per hour`);
      } catch (error) {
        console.log(`Could not get production rate for ${type}: ${error.message}`);
      }
    }
    
    // Get building IDs by type for each building type
    console.log("\nPlayer buildings by type:");
    let totalClaimableGold = 0;
    
    for (const type of buildingTypes) {
      try {
        const buildingIds = await gameState.getBuildingIdsOfType(addressToCheck, type);
        console.log(`${type}: ${buildingIds.length} buildings`);
        
        for (let i = 0; i < buildingIds.length; i++) {
          const buildingId = buildingIds[i];
          try {
            const building = await gameState.getBuilding(addressToCheck, buildingId);
            console.log(`  Building #${buildingId}: Level: ${building.level}`);
            console.log(`    Last collection time: ${building.lastCollectionTime}`);
            console.log(`    Last upgrade time: ${building.lastUpgradeTime}`);
            
            // Calculate time passed and potential gold generation
            const timePassed = Number(blockchainTime) - Number(building.lastCollectionTime);
            const maxProductionTime = 24 * 3600; // 24 hours in seconds
            const cappedTimePassed = Math.min(timePassed, maxProductionTime);
            const productionRate = Number(await gameState.getBuildingProductionRate(type));
            const buildingLevel = Number(building.level);
            const potentialGold = (productionRate * cappedTimePassed * buildingLevel) / 3600; // Match contract's collection method
            
            console.log(`    Time since last collection: ${timePassed} seconds (${Math.floor(timePassed/3600)} hours)`);
            console.log(`    Production rate: ${productionRate} gold/hour`);
            console.log(`    Building level: ${buildingLevel}`);
            console.log(`    Raw calculation: (${productionRate} * ${cappedTimePassed} * ${buildingLevel}) / 3600`);
            console.log(`    Potential uncollected gold: ${potentialGold.toFixed(2)}`);
            
            totalClaimableGold += potentialGold;
          } catch (error) {
            console.log(`  Building #${buildingId} is inactive or doesn't exist: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`Could not get ${type} buildings: ${error.message}`);
      }
    }
    
    // Check player's gold balance
    const goldBalance = await gameState.getPlayerGold(addressToCheck);
    console.log(`\nCurrent gold balance: ${goldBalance.toString()} (${Number(goldBalance).toFixed(2)})`);
    console.log(`Total claimable gold: ${totalClaimableGold.toFixed(2)}`);
    
  } catch (error) {
    console.error(`Error checking claimable gold: ${error.message}`);
  }
}

// For running directly with node
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 