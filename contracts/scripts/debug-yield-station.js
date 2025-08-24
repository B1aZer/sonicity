const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // Read deployed addresses from JSON file
    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    // Connect to contracts
    const gridBuildingsAddress = deployedAddresses.gridBuildingsProxy;
    const altarAddress = deployedAddresses.altarProxy;
    
    console.log(`GridBuildings address: ${gridBuildingsAddress}`);
    console.log(`Altar address: ${altarAddress}`);
    
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    const gridBuildings = GridBuildings.attach(gridBuildingsAddress);
    
    const Altar = await ethers.getContractFactory("Altar");
    const altar = Altar.attach(altarAddress);

    // Get signer
    const [signer] = await ethers.getSigners();
    const playerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    console.log(`Player address: ${playerAddress}`);

    // Check revenue pool
    const revenuePool = await gridBuildings.getRevenuePool();
    console.log(`\n💰 Revenue Pool: ${ethers.formatEther(revenuePool)} SONIC`);

    // Get yield station duration
    const yieldStationDuration = await gridBuildings.yieldStationDuration();
    console.log(`⏱️  Yield Station Duration: ${yieldStationDuration} seconds (${Number(yieldStationDuration)/3600} hours)`);

    // Get all buildings for the player
    const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
    console.log(`\n🏗️  Active Buildings: ${activeBuildings.length}`);

    // Show ALL buildings first
    console.log(`\n📋 All Buildings:`);
    for (let i = 0; i < activeBuildings.length; i++) {
        const buildingId = activeBuildings[i];
        const building = await gridBuildings.getBuilding(playerAddress, buildingId);
        const buildingTypes = ['HOUSE', 'FARM', 'DIAMOND_STATION', 'REP_FORGE', 'YIELD_STATION'];
        const typeName = buildingTypes[building.buildingType] || `Unknown(${building.buildingType})`;
        console.log(`  Building #${buildingId}: ${typeName} (Type: ${building.buildingType}, Level: ${building.level})`);
    }

    // Find yield stations
    const yieldStations = [];
    for (let i = 0; i < activeBuildings.length; i++) {
        const buildingId = activeBuildings[i];
        const building = await gridBuildings.getBuilding(playerAddress, buildingId);
        
        if (Number(building.buildingType) === 4) { // YIELD_STATION
            yieldStations.push({
                buildingId,
                building
            });
            
            console.log(`\n⚡ Yield Station #${buildingId}:`);
            console.log(`  - Building Type: ${building.buildingType}`);
            console.log(`  - Level: ${building.level}`);
            console.log(`  - Last Recharge: ${building.lastRechargeTime} (${new Date(Number(building.lastRechargeTime) * 1000).toLocaleString()})`);
            console.log(`  - Damaged: ${building.damaged}`);

            // Check if station is active
            const currentTime = Math.floor(Date.now() / 1000);
            const isActive = Number(building.lastRechargeTime) > 0 && 
                            currentTime < Number(building.lastRechargeTime) + Number(yieldStationDuration) &&
                            !building.damaged;
            console.log(`  - Is Active: ${isActive}`);

            // Get yield station data from Altar
            try {
                const yieldData = await altar.getYieldStationData(playerAddress, buildingId);
                console.log(`  - REP Amount: ${yieldData.repAmount}`);
                console.log(`  - NFT Tier: ${yieldData.nftTier}`);
            } catch (error) {
                console.log(`  - ❌ Error getting yield data: ${error.message}`);
            }

            // Get yield station info
            try {
                const yieldInfo = await gridBuildings.getYieldStationInfo(playerAddress, buildingId);
                console.log(`  - Claimable Revenue: ${ethers.formatEther(yieldInfo.claimableRevenue)} SONIC`);
                console.log(`  - Revenue Rate: ${yieldInfo.revenueRate} wei/second (${ethers.formatEther(BigInt(yieldInfo.revenueRate) * 3600n)} SONIC/hour)`);
                console.log(`  - Time Remaining: ${yieldInfo.timeRemaining} seconds`);
                console.log(`  - Is Active (from contract): ${yieldInfo.isActive}`);
            } catch (error) {
                console.log(`  - ❌ Error getting yield info: ${error.message}`);
            }
        }
    }

    if (yieldStations.length === 0) {
        console.log("\n❌ No yield stations found!");
        console.log("Make sure to:");
        console.log("1. Create a Yield NFT in Revenue Hub");
        console.log("2. Stake it in Stake Hub to create a yield station");
        console.log("3. Recharge the yield station");
    }

    // Check total active yield weight
    console.log(`\n🔍 Debugging weight calculation...`);
    
    // Manual weight calculation for debugging
    for (const station of yieldStations) {
        try {
            console.log(`\n⚖️  Station #${station.buildingId} Weight Calculation:`);
            
            // Get yield data manually
            const yieldData = await altar.getYieldStationData(playerAddress, station.buildingId);
            const repAmount = Number(yieldData.repAmount);
            const nftTier = Number(yieldData.nftTier);
            
            console.log(`  - Base Weight (REP): ${repAmount}`);
            console.log(`  - NFT Tier: ${nftTier}`);
            
            const tierModifier = (nftTier - 1) * 5;
            console.log(`  - Tier Modifier: ${tierModifier}`);
            
            // Historical modifier (simplified)
            console.log(`  - Historical Modifier: (calculated in contract)`);
            
            const expectedWeight = repAmount + tierModifier;
            console.log(`  - Expected Minimum Weight: ${expectedWeight}`);
            
            if (repAmount === 0) {
                console.log(`  - ❌ REP Amount is 0! This will cause 0 production rate.`);
                console.log(`  - 🔧 Fix: Make sure the NFT was properly staked with REP data.`);
            }
        } catch (error) {
            console.log(`  - ❌ Error calculating weight: ${error.message}`);
        }
    }
}

main()
    .then(() => {
        console.log("\n✅ Debug complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Debug failed:", error);
        process.exit(1);
    });
