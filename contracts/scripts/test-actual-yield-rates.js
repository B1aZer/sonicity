const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Testing Actual Yield Station Rates");
    console.log("=" .repeat(60));

    // Get the deployed contracts
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    const gridBuildings = await GridBuildings.attach("0xB9d9e972100a1dD01cd441774b45b5821e136043");

    const Altar = await ethers.getContractFactory("Altar");
    const altar = await Altar.attach("0x20d7B364E8Ed1F4260b5B90C41c2deC3C1F6D367");

    // Get current contract state
    const yieldStationDuration = await gridBuildings.yieldStationDuration();
    const revenuePool = await gridBuildings.getRevenuePool();
    const availablePool = await gridBuildings.getAvailableRevenuePool();
    const reservedRevenue = await gridBuildings.getReservedRevenue();

    console.log("📊 Contract State:");
    console.log(`   Yield Station Duration: ${Number(yieldStationDuration) / (24 * 60 * 60)} days`);
    console.log(`   Revenue Pool: ${ethers.formatEther(revenuePool)} SONIC`);
    console.log(`   Available Pool: ${ethers.formatEther(availablePool)} SONIC`);
    console.log(`   Reserved Revenue: ${ethers.formatEther(reservedRevenue)} SONIC`);
    console.log();

    // Get all yield stations
    try {
        // Get the length of the allYieldStations array
        let allYieldStationsLength = 0;
        try {
            // Try to get the length by calling the array length function
            allYieldStationsLength = await gridBuildings.allYieldStations.length();
        } catch (error) {
            // If that doesn't work, try to iterate until we hit an error
            try {
                for (let i = 0; i < 1000; i++) { // Reasonable upper limit
                    await gridBuildings.allYieldStations(i);
                    allYieldStationsLength = i + 1;
                }
            } catch (e) {
                // We've reached the end of the array
            }
        }
        console.log(`📋 Total Yield Stations: ${allYieldStationsLength}`);
        console.log();

        if (allYieldStationsLength > 0) {
            console.log("🏭 Active Yield Stations:");
            console.log("-".repeat(80));
            console.log("Station ID | Player | REP Amount | Tier | Rate (SONIC/sec) | Rate (SONIC/hour) | Status");
            console.log("-".repeat(80));

            for (let i = 0; i < Math.min(allYieldStationsLength, 10); i++) { // Limit to first 10 for readability
                try {
                    const stationInfo = await gridBuildings.allYieldStations(i);
                    const player = stationInfo.player;
                    const buildingId = stationInfo.buildingId;

                    // Get building details
                    const building = await gridBuildings.getBuilding(player, buildingId);
                    
                    // Get yield station data from altar
                    const yieldData = await altar.getYieldStationData(player, buildingId);
                    const repAmount = yieldData.repAmount;
                    const nftTier = yieldData.nftTier;

                    // Get yield station info
                    const stationInfo2 = await gridBuildings.getYieldStationInfo(player, buildingId);
                    const isActive = stationInfo2.isActive;
                    const revenueRate = stationInfo2.revenueRate;
                    const claimableRevenue = stationInfo2.claimableRevenue;

                    // Calculate rate per hour
                    const ratePerHour = Number(revenueRate) * 3600 / 1e18;

                    // Format player address
                    const shortAddress = `${player.slice(0, 6)}...${player.slice(-4)}`;

                    console.log(
                        `${buildingId.toString().padStart(10)} | ` +
                        `${shortAddress.padStart(8)} | ` +
                        `${Number(repAmount).toString().padStart(10)} | ` +
                        `${nftTier.toString().padStart(4)} | ` +
                        `${(Number(revenueRate) / 1e18).toFixed(8).padStart(16)} | ` +
                        `${ratePerHour.toFixed(6).padStart(16)} | ` +
                        `${isActive ? '🟢 Active' : '🔴 Inactive'}`
                    );

                } catch (error) {
                    console.log(`Error getting station ${i}: ${error.message}`);
                }
            }
        }

        // Calculate theoretical rates for different REP amounts
        console.log();
        console.log("🧪 Theoretical Rates (if no other stations existed):");
        console.log("-".repeat(60));
        console.log("REP Amount | Rate (SONIC/sec) | Rate (SONIC/hour) | Rate (SONIC/day)");
        console.log("-".repeat(60));

        const testRepAmounts = [100, 200, 500, 1000, 2000, 5000];
        
        for (const repAmount of testRepAmounts) {
            // If this was the only station, it would get the full pool rate
            const poolPerSecond = availablePool / yieldStationDuration;
            const ratePerSecond = poolPerSecond; // Full pool if only station
            const ratePerHour = ratePerSecond * BigInt(3600);
            const ratePerDay = ratePerHour * BigInt(24);
            
            console.log(
                `${repAmount.toString().padStart(10)} | ` +
                `${(Number(ratePerSecond) / 1e18).toFixed(8).padStart(16)} | ` +
                `${(Number(ratePerHour) / 1e18).toFixed(6).padStart(16)} | ` +
                `${(Number(ratePerDay) / 1e18).toFixed(4).padStart(15)}`
            );
        }

        // Show efficiency analysis
        console.log();
        console.log("💰 Efficiency Analysis (100 REP Points):");
        console.log("-".repeat(50));
        
        const poolPerSecond = availablePool / yieldStationDuration;
        const dailyPoolDistribution = Number(poolPerSecond) * 3600 * 24 / 1e18;
        
        console.log(`   Total daily pool distribution: ${dailyPoolDistribution.toFixed(6)} SONIC`);
        console.log(`   If 100 REP was 1% of total weight: ${(dailyPoolDistribution * 0.01).toFixed(6)} SONIC/day`);
        console.log(`   If 100 REP was 5% of total weight: ${(dailyPoolDistribution * 0.05).toFixed(6)} SONIC/day`);
        console.log(`   If 100 REP was 10% of total weight: ${(dailyPoolDistribution * 0.10).toFixed(6)} SONIC/day`);
        
        // Calculate actual total weight if we can get it
        try {
            let totalWeight = 0;
            let activeStations = 0;
            let totalRepAmount = 0;
            
            for (let i = 0; i < allYieldStationsLength; i++) {
                try {
                    const stationInfo = await gridBuildings.allYieldStations(i);
                    const building = await gridBuildings.getBuilding(stationInfo.player, stationInfo.buildingId);
                    const yieldData = await altar.getYieldStationData(stationInfo.player, stationInfo.buildingId);
                    
                    totalRepAmount += Number(yieldData.repAmount);
                    
                    // Check if station is active (recharged and not damaged)
                    if (!building.damaged && building.lastRechargeTime > 0) {
                        const timeSinceRecharge = Math.floor(Date.now() / 1000) - Number(building.lastRechargeTime);
                        const productionDuration = 24 * 60 * 60; // 24 hours in seconds
                        
                        if (timeSinceRecharge < productionDuration) {
                            activeStations++;
                            totalWeight += Number(yieldData.repAmount);
                        }
                    }
                } catch (error) {
                    console.log(`   Error getting station ${i}: ${error.message}`);
                }
            }
            
            if (totalRepAmount > 0) {
                const weightPercentage = (100 / totalRepAmount) * 100;
                const dailyEarnings = dailyPoolDistribution * (100 / totalRepAmount);
                
                console.log();
                console.log(`   Total REP amount across all stations: ${totalRepAmount}`);
                console.log(`   Active stations: ${activeStations}/${allYieldStationsLength}`);
                console.log(`   Active REP weight: ${totalWeight}`);
                console.log(`   100 REP weight percentage: ${weightPercentage.toFixed(4)}%`);
                console.log(`   Estimated daily earnings for 100 REP: ${dailyEarnings.toFixed(6)} SONIC`);
                console.log(`   Estimated weekly earnings for 100 REP: ${(dailyEarnings * 7).toFixed(6)} SONIC`);
            }
        } catch (error) {
            console.log("   Could not calculate total weight");
        }

    } catch (error) {
        console.error("❌ Error getting yield stations:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
