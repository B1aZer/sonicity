const { ethers } = require("hardhat");
const fs = require('fs');

/**
 * Contract Reference Fix Script
 * 
 * This script fixes contract cross-references by calling the appropriate setter functions
 * 
 * Usage: npx hardhat run scripts/fix-contract-references.js --network <network>
 */

async function loadDeployedAddresses() {
    try {
        const addressesFile = fs.readFileSync('deployed-addresses.json', 'utf8');
        return JSON.parse(addressesFile);
    } catch (error) {
        console.error('❌ Failed to load deployed-addresses.json:', error.message);
        process.exit(1);
    }
}

async function main() {
    console.log('🔧 Starting Contract Reference Fix...\n');
    
    // Load deployed addresses
    const addresses = await loadDeployedAddresses();
    console.log('📄 Loaded deployed addresses from deployed-addresses.json\n');
    
    const [deployer] = await ethers.getSigners();
    console.log('🔑 Using account:', deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');
    
    try {
        // Fix GameState references
        console.log('🔧 Fixing GameState references...');
        const gameState = await ethers.getContractAt('GameState', addresses.gameStateProxy);
        
        // Set Altar address in GameState
        console.log('  Setting Altar address in GameState...');
        await gameState.setAltarAddress(addresses.altarProxy);
        console.log('  ✅ Altar address set');
        
        // Set GridBuildings address in GameState
        console.log('  Setting GridBuildings address in GameState...');
        await gameState.setGridBuildingsAddress(addresses.gridBuildingsProxy);
        console.log('  ✅ GridBuildings address set');
        
        // Fix DistrictBuildings references
        console.log('\n🔧 Fixing DistrictBuildings references...');
        const districtBuildings = await ethers.getContractAt('DistrictBuildings', addresses.districtBuildingsProxy);
        
        // Set BattleSystem address in DistrictBuildings
        console.log('  Setting BattleSystem address in DistrictBuildings...');
        await districtBuildings.setBattleSystemAddress(addresses.battleSystemProxy);
        console.log('  ✅ BattleSystem address set');
        
        // Fix GridBuildings references
        console.log('\n🔧 Fixing GridBuildings references...');
        const gridBuildings = await ethers.getContractAt('GridBuildings', addresses.gridBuildingsProxy);
        
        // Set Altar address in GridBuildings
        console.log('  Setting Altar address in GridBuildings...');
        await gridBuildings.setAltarAddress(addresses.altarProxy);
        console.log('  ✅ Altar address set');
        
        console.log('\n🎉 All contract references have been fixed!');
        console.log('\n📋 Fixed References:');
        console.log('  ✅ GameState.altarAddress →', addresses.altarProxy);
        console.log('  ✅ GameState.gridBuildingsAddress →', addresses.gridBuildingsProxy);
        console.log('  ✅ DistrictBuildings.battleSystemAddress →', addresses.battleSystemProxy);
        console.log('  ✅ GridBuildings.altarAddress →', addresses.altarProxy);
        
        console.log('\n🔍 You can now run the verification script to confirm all references are correct:');
        console.log('  npx hardhat run scripts/verify-contract-references.js --network', process.env.HARDHAT_NETWORK || 'localhost');
        
    } catch (error) {
        console.error('💥 Failed to fix contract references:', error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
