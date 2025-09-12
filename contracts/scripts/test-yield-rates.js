const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Testing Yield Station Rates per 100 REP Points");
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

    // Test different REP amounts
    const testRepAmounts = [100, 200, 500, 1000, 2000, 5000];
    
    console.log("🧪 Testing Yield Rates for Different REP Amounts:");
    console.log("-".repeat(60));
    console.log("REP Amount | Rate (SONIC/sec) | Rate (SONIC/hour) | Rate (SONIC/day)");
    console.log("-".repeat(60));

    for (const repAmount of testRepAmounts) {
        try {
            // Calculate the rate for this REP amount
            // This simulates what would happen if a station had this much REP staked
            
            // Get total active yield weight (we'll simulate this)
            const totalActiveWeight = await calculateTotalActiveYieldWeight(gridBuildings, altar);
            
            // Calculate station weight (base weight + tier modifier + historical modifier)
            const stationWeight = repAmount; // Base weight is just the REP amount
            
            // Calculate rate: (availablePool / yieldStationDuration) * (stationWeight / totalWeight)
            const poolPerSecond = availablePool / yieldStationDuration;
            const totalWeight = totalActiveWeight + BigInt(stationWeight); // Add this station's weight
            const ratePerSecond = (poolPerSecond * BigInt(stationWeight)) / totalWeight;
            
            // Convert to more readable formats
            const ratePerHour = ratePerSecond * BigInt(3600);
            const ratePerDay = ratePerHour * BigInt(24);
            
            console.log(
                `${repAmount.toString().padStart(10)} | ` +
                `${(Number(ratePerSecond) / 1e18).toFixed(8).padStart(16)} | ` +
                `${(Number(ratePerHour) / 1e18).toFixed(6).padStart(16)} | ` +
                `${(Number(ratePerDay) / 1e18).toFixed(4).padStart(15)}`
            );
            
        } catch (error) {
            console.log(`${repAmount.toString().padStart(10)} | Error: ${error.message}`);
        }
    }

    console.log();
    console.log("📈 Analysis:");
    console.log(`   Pool Distribution Rate: ${(Number(availablePool) / Number(yieldStationDuration) / 1e18).toFixed(8)} SONIC/second`);
    console.log(`   Pool Distribution Rate: ${(Number(availablePool) / Number(yieldStationDuration) * 3600 / 1e18).toFixed(6)} SONIC/hour`);
    console.log(`   Pool Distribution Rate: ${(Number(availablePool) / Number(yieldStationDuration) * 3600 * 24 / 1e18).toFixed(4)} SONIC/day`);
    console.log();
    
    // Show what 100 REP would earn per day
    const poolPerSecond = availablePool / yieldStationDuration;
    const totalActiveWeight = await calculateTotalActiveYieldWeight(gridBuildings, altar);
    const stationWeight = BigInt(100);
    const totalWeight = totalActiveWeight + stationWeight;
    const ratePerSecond = (poolPerSecond * stationWeight) / totalWeight;
    const dailyEarnings = ratePerSecond * BigInt(3600) * BigInt(24);
    
    console.log("💰 100 REP Points Analysis:");
    console.log(`   Daily Earnings: ${(Number(dailyEarnings) / 1e18).toFixed(6)} SONIC`);
    console.log(`   Weekly Earnings: ${(Number(dailyEarnings) / 1e18 * 7).toFixed(6)} SONIC`);
    console.log(`   Monthly Earnings: ${(Number(dailyEarnings) / 1e18 * 30).toFixed(6)} SONIC`);
    console.log();
    
    // Show efficiency metrics
    const efficiency = (Number(dailyEarnings) / 1e18) / 100; // SONIC per REP per day
    console.log("⚡ Efficiency Metrics:");
    console.log(`   SONIC per REP per day: ${efficiency.toFixed(8)}`);
    console.log(`   SONIC per 100 REP per day: ${(efficiency * 100).toFixed(6)}`);
    console.log(`   ROI per day (if 1 REP = 1 SONIC): ${(efficiency * 100).toFixed(4)}%`);
}

async function calculateTotalActiveYieldWeight(gridBuildings, altar) {
    try {
        // Get all yield stations from the contract
        const allYieldStations = await gridBuildings.allYieldStations(0);
        let totalWeight = 0;
        
        // This is a simplified calculation - in reality, we'd need to iterate through all stations
        // For now, we'll estimate based on typical values
        console.log("   Note: Using estimated total weight for calculation");
        return BigInt("10000"); // Estimated total weight
        
    } catch (error) {
        console.log("   Note: Could not get total weight, using estimate");
        return BigInt("10000"); // Fallback estimate
    }
}

// Helper function to get yield station data
async function getYieldStationData(altar, player, buildingId) {
    try {
        const data = await altar.getYieldStationData(player, buildingId);
        return data;
    } catch (error) {
        return { repAmount: 0, nftTier: 1 };
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
