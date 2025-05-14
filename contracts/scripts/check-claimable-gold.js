// Script to check claimable gold for a specific address
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Read deployed addresses from JSON file
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  // Address to check claimable gold for
  const addressToCheck = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  // Connect to GameState contract
  const gameStateAddress = deployedAddresses.gameStateProxy;
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
    // Check if the address is in a city
    const cityId = await gameState.playerCity(addressToCheck);
    console.log(`Player city ID: ${cityId}`);
    
    if (cityId.toString() === "0") {
      console.log("Address is not in a city yet, so they don't have any claimable gold.");
      return;
    }
    
    // Check claimable gold
    const claimableGold = await gameState.calculateTotalClaimableGold(addressToCheck);
    console.log(`Total claimable gold: ${claimableGold.toString()} (${Number(claimableGold).toFixed(2)})`);
    
    // Check player's gold balance in their city
    const goldBalance = await gameState.getPlayerGold(addressToCheck);
    console.log(`Current gold balance: ${goldBalance.toString()} (${Number(goldBalance).toFixed(2)})`);
    
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
    
    // Try to get building IDs by type for each building type
    console.log("\nPlayer buildings by type:");
    
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
            const timePassed = blockchainTime - Number(building.lastCollectionTime);
            const maxProductionTime = 24 * 3600; // 24 hours in seconds
            const cappedTimePassed = Math.min(timePassed, maxProductionTime);
            const productionRate = await gameState.getBuildingProductionRate(type);
            const potentialGold = (Number(productionRate) * cappedTimePassed * Number(building.level)) / 3600;
            
            console.log(`    Time since last collection: ${timePassed} seconds (${Math.floor(timePassed/3600)} hours)`);
            console.log(`    Potential uncollected gold: ${potentialGold.toFixed(2)}`);
          } catch (error) {
            console.log(`  Building #${buildingId} is inactive or doesn't exist: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`Could not get ${type} buildings: ${error.message}`);
      }
    }
    
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