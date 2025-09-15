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
        
        // Set DistrictBuildings address in GameState
        console.log('  Setting DistrictBuildings address in GameState...');
        await gameState.setDistrictBuildingsAddress(addresses.districtBuildingsProxy);
        console.log('  ✅ DistrictBuildings address set');
        
        // Set BattleSystem address in GameState
        console.log('  Setting BattleSystem address in GameState...');
        await gameState.setBattleSystemAddress(addresses.battleSystemProxy);
        console.log('  ✅ BattleSystem address set');
        
        // Set Hero/Tactics/Cosmetic addresses in GameState
        if (addresses.heroNFTProxy) {
            console.log('  Setting HeroNFT address in GameState...');
            await gameState.setHeroNFTAddress(addresses.heroNFTProxy);
            console.log('  ✅ HeroNFT address set');
        }
        if (addresses.tacticsNFTProxy) {
            console.log('  Setting TacticsNFT address in GameState...');
            await gameState.setTacticsNFTAddress(addresses.tacticsNFTProxy);
            console.log('  ✅ TacticsNFT address set');
        }
        if (addresses.cosmeticItemsProxy) {
            console.log('  Setting CosmeticItems address in GameState...');
            await gameState.setCosmeticItemsAddress(addresses.cosmeticItemsProxy);
            console.log('  ✅ CosmeticItems address set');
        }
        
        // Fix DistrictBuildings references
        console.log('\n🔧 Fixing DistrictBuildings references...');
        const districtBuildings = await ethers.getContractAt('DistrictBuildings', addresses.districtBuildingsProxy);
        
        // Set GameState address in DistrictBuildings
        console.log('  Setting GameState address in DistrictBuildings...');
        await districtBuildings.setGameStateAddress(addresses.gameStateProxy);
        console.log('  ✅ GameState address set');
        
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
        
        // Fix NFT contract references
        console.log('\n🔧 Fixing NFT contract references...');
        
        // Fix SonicityNFT
        console.log('  Setting Altar address in SonicityNFT...');
        const sonicityNFT = await ethers.getContractAt('SonicityNFT', addresses.sonicityNFT);
        await sonicityNFT.setAltarContract(addresses.altarProxy);
        console.log('  ✅ SonicityNFT altarContract set');
        
        // Fix SonicityFarm
        console.log('  Setting Altar address in SonicityFarm...');
        const sonicityFarm = await ethers.getContractAt('SonicityFarm', addresses.sonicityFarm);
        await sonicityFarm.setAltarContract(addresses.altarProxy);
        console.log('  ✅ SonicityFarm altarContract set');
        
        // Fix SonicityDiamond
        console.log('  Setting Altar address in SonicityDiamond...');
        const sonicityDiamond = await ethers.getContractAt('SonicityDiamond', addresses.sonicityDiamond);
        await sonicityDiamond.setAltarContract(addresses.altarProxy);
        console.log('  ✅ SonicityDiamond altarContract set');
        
        // Fix SonicityRep
        console.log('  Setting Altar address in SonicityRep...');
        const sonicityRep = await ethers.getContractAt('SonicityRep', addresses.sonicityRep);
        await sonicityRep.setAltarContract(addresses.altarProxy);
        console.log('  ✅ SonicityRep altarContract set');
        
        // Fix SonicityYieldNFT
        console.log('  Setting Altar address in SonicityYieldNFT...');
        const sonicityYieldNFT = await ethers.getContractAt('SonicityYieldNFT', addresses.sonicityYieldNFT);
        await sonicityYieldNFT.setAltarContract(addresses.altarProxy);
        console.log('  ✅ SonicityYieldNFT altarContract set');
        
        // Set Art Proxy address in SonicityYieldNFT
        if (addresses.sonicityArtProxy) {
            console.log('  Setting Art Proxy address in SonicityYieldNFT...');
            await sonicityYieldNFT.setArtProxy(addresses.sonicityArtProxy);
            console.log('  ✅ Art Proxy address set in SonicityYieldNFT');
        }
        
        // Fix Altar references
        console.log('\n🔧 Fixing Altar references...');
        const altar = await ethers.getContractAt('Altar', addresses.altarProxy);
        
        // Set GridBuildings address in Altar
        console.log('  Setting GridBuildings address in Altar...');
        await altar.setGridBuildingsAddress(addresses.gridBuildingsProxy);
        console.log('  ✅ GridBuildings address set in Altar');
        
        // Set Yield NFT address in Altar
        if (addresses.sonicityYieldNFT) {
            console.log('  Setting Yield NFT address in Altar...');
            await altar.setYieldNFT(addresses.sonicityYieldNFT);
            console.log('  ✅ Yield NFT address set in Altar');
        }
        
        // Fix BattleSystem references
        console.log('\n🔧 Fixing BattleSystem references...');
        const battleSystem = await ethers.getContractAt('BattleSystem', addresses.battleSystemProxy);
        
        // Set GameState address in BattleSystem
        console.log('  Setting GameState address in BattleSystem...');
        await battleSystem.setGameStateAddress(addresses.gameStateProxy);
        console.log('  ✅ GameState address set in BattleSystem');
        
        // Set DistrictBuildings address in BattleSystem
        console.log('  Setting DistrictBuildings address in BattleSystem...');
        await battleSystem.setDistrictBuildingsAddress(addresses.districtBuildingsProxy);
        console.log('  ✅ DistrictBuildings address set in BattleSystem');
        
        // Set GridBuildings address in BattleSystem
        console.log('  Setting GridBuildings address in BattleSystem...');
        await battleSystem.setGridBuildingsAddress(addresses.gridBuildingsProxy);
        console.log('  ✅ GridBuildings address set in BattleSystem');
        
        // Set Hero/Tactics addresses in BattleSystem
        if (addresses.heroNFTProxy) {
            console.log('  Setting HeroNFT address in BattleSystem...');
            await battleSystem.setHeroNFTAddress(addresses.heroNFTProxy);
            console.log('  ✅ HeroNFT address set in BattleSystem');
        }
        if (addresses.tacticsNFTProxy) {
            console.log('  Setting TacticsNFT address in BattleSystem...');
            await battleSystem.setTacticsNFTAddress(addresses.tacticsNFTProxy);
            console.log('  ✅ TacticsNFT address set in BattleSystem');
        }
        
        console.log('\n🎉 All contract references have been fixed!');
        console.log('\n📋 Fixed References:');
        console.log('  ✅ GameState.altarAddress →', addresses.altarProxy);
        console.log('  ✅ GameState.gridBuildingsAddress →', addresses.gridBuildingsProxy);
        console.log('  ✅ DistrictBuildings.battleSystemAddress →', addresses.battleSystemProxy);
        console.log('  ✅ GridBuildings.altarAddress →', addresses.altarProxy);
        console.log('  ✅ Altar.gridBuildings →', addresses.gridBuildingsProxy);
        console.log('  ✅ BattleSystem.gridBuildingsAddress →', addresses.gridBuildingsProxy);
        console.log('  ✅ SonicityNFT.altarContract →', addresses.altarProxy);
        console.log('  ✅ SonicityFarm.altarContract →', addresses.altarProxy);
        console.log('  ✅ SonicityDiamond.altarContract →', addresses.altarProxy);
        console.log('  ✅ SonicityRep.altarContract →', addresses.altarProxy);
        console.log('  ✅ SonicityYieldNFT.altarContract →', addresses.altarProxy);
        
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
