const { ethers } = require("hardhat");
const fs = require('fs');

/**
 * Contract Address Verification Script
 * 
 * This script verifies that:
 * 1. All contract addresses in deployed-addresses.json match the expected structure
 * 2. Contract addresses exist on the blockchain
 * 3. Frontend constants match the deployed addresses
 * 
 * Usage: npx hardhat run scripts/verify-contract-addresses.js --network <network>
 */

// Expected contract address mappings
const EXPECTED_CONTRACTS = {
    // NFT Contracts
    sonicityNFT: 'SonicityNFT',
    sonicityFarm: 'SonicityFarm', 
    sonicityDiamond: 'SonicityDiamond',
    sonicityRep: 'SonicityRep',
    sonicityYieldNFT: 'SonicityYieldNFT',
    sonicityArtProxy: 'SonicityArtProxy',
    
    // Core Game Contracts
    gameStateImpl: 'GameState (Implementation)',
    gameStateProxy: 'GameState (Proxy)',
    districtBuildingsImpl: 'DistrictBuildings (Implementation)',
    districtBuildingsProxy: 'DistrictBuildings (Proxy)',
    gridBuildingsImpl: 'GridBuildings (Implementation)',
    gridBuildingsProxy: 'GridBuildings (Proxy)',
    altarImpl: 'Altar (Implementation)',
    altarProxy: 'Altar (Proxy)',
    battleSystemImpl: 'BattleSystem (Implementation)',
    battleSystemProxy: 'BattleSystem (Proxy)',
    
    // Hero & Tactics Contracts
    heroNFTImpl: 'HeroNFT (Implementation)',
    heroNFTProxy: 'HeroNFT (Proxy)',
    tacticsNFTImpl: 'TacticsNFT (Implementation)',
    tacticsNFTProxy: 'TacticsNFT (Proxy)',
    cosmeticItemsImpl: 'CosmeticItems (Implementation)',
    cosmeticItemsProxy: 'CosmeticItems (Proxy)'
};

// Frontend constants mapping
const FRONTEND_MAPPING = {
    SONICITY_NFT: 'sonicityNFT',
    SONICITY_FARM: 'sonicityFarm',
    SONICITY_DIAMOND: 'sonicityDiamond',
    SONICITY_REP: 'sonicityRep',
    SONICITY_YIELD_NFT: 'sonicityYieldNFT',
    SONICITY_ART_PROXY: 'sonicityArtProxy',
    ALTAR: 'altarProxy',
    GAME_STATE: 'gameStateProxy',
    DISTRICT_BUILDINGS: 'districtBuildingsProxy',
    GRID_BUILDINGS: 'gridBuildingsProxy',
    BATTLE_SYSTEM: 'battleSystemProxy',
    HERO_NFT: 'heroNFTProxy',
    TACTICS_NFT: 'tacticsNFTProxy',
    COSMETIC_ITEMS: 'cosmeticItemsProxy'
};

async function loadDeployedAddresses() {
    try {
        const addressesFile = fs.readFileSync('deployed-addresses.json', 'utf8');
        return JSON.parse(addressesFile);
    } catch (error) {
        console.error('❌ Failed to load deployed-addresses.json:', error.message);
        process.exit(1);
    }
}

async function loadFrontendConstants() {
    try {
        const constantsFile = fs.readFileSync('../src/js/utils/constants-dev.js', 'utf8');
        
        // Extract CONTRACT_ADDRESSES object using regex
        const addressMatch = constantsFile.match(/export const CONTRACT_ADDRESSES = \{([\s\S]*?)\};/);
        if (!addressMatch) {
            throw new Error('Could not find CONTRACT_ADDRESSES in constants file');
        }
        
        const addressContent = addressMatch[1];
        const addresses = {};
        
        // Parse each address line
        const lines = addressContent.split('\n');
        for (const line of lines) {
            const match = line.match(/(\w+):\s*"([^"]+)"/);
            if (match) {
                addresses[match[1]] = match[2];
            }
        }
        
        return addresses;
    } catch (error) {
        console.error('❌ Failed to load frontend constants:', error.message);
        return null;
    }
}

async function verifyContractExists(address, contractName) {
    try {
        const code = await ethers.provider.getCode(address);
        if (code === '0x') {
            return { exists: false, error: 'No contract code at address' };
        }
        return { exists: true };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

async function verifyFrontendConstants(addresses) {
    console.log('\n🌐 Verifying frontend constants...\n');
    
    const frontendConstants = await loadFrontendConstants();
    if (!frontendConstants) {
        return ['❌ Could not load frontend constants'];
    }
    
    const issues = [];
    
    for (const [frontendKey, backendKey] of Object.entries(FRONTEND_MAPPING)) {
        const expectedAddress = addresses[backendKey];
        const actualAddress = frontendConstants[frontendKey];
        
        if (!expectedAddress) {
            issues.push(`❌ Missing backend address for ${backendKey}`);
            continue;
        }
        
        if (!actualAddress) {
            issues.push(`❌ Missing frontend constant for ${frontendKey}`);
            continue;
        }
        
        if (actualAddress.toLowerCase() === expectedAddress.toLowerCase()) {
            console.log(`✅ ${frontendKey}: ${actualAddress}`);
        } else {
            console.log(`❌ ${frontendKey}: Expected ${expectedAddress}, got ${actualAddress}`);
            issues.push(`❌ ${frontendKey}: Expected ${expectedAddress}, got ${actualAddress}`);
        }
    }
    
    return issues;
}

function validateAddressFormat(address) {
    if (!address) return false;
    if (!address.startsWith('0x')) return false;
    if (address.length !== 42) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateDeployedAddresses(addresses) {
    console.log('\n🔍 Validating address format...\n');
    
    const issues = [];
    
    for (const [key, contractName] of Object.entries(EXPECTED_CONTRACTS)) {
        const address = addresses[key];
        
        if (!address) {
            issues.push(`❌ Missing address for ${key} (${contractName})`);
            continue;
        }
        
        if (!validateAddressFormat(address)) {
            issues.push(`❌ Invalid address format for ${key}: ${address}`);
            continue;
        }
        
        console.log(`✅ ${key}: ${address} (${contractName})`);
    }
    
    return issues;
}

async function main() {
    console.log('🚀 Starting Contract Address Verification...\n');
    
    // Load deployed addresses
    const addresses = await loadDeployedAddresses();
    console.log('📄 Loaded deployed addresses from deployed-addresses.json\n');
    
    // Validate address format
    const formatIssues = validateDeployedAddresses(addresses);
    
    // Verify all expected contracts exist on blockchain
    console.log('\n🔍 Verifying contract existence on blockchain...\n');
    const existenceIssues = [];
    
    for (const [key, contractName] of Object.entries(EXPECTED_CONTRACTS)) {
        const address = addresses[key];
        if (!address) {
            existenceIssues.push(`❌ Missing address for ${key} (${contractName})`);
            continue;
        }
        
        const result = await verifyContractExists(address, contractName);
        if (result.exists) {
            console.log(`✅ ${key}: ${address} (${contractName})`);
        } else {
            console.log(`❌ ${key}: ${address} - ${result.error}`);
            existenceIssues.push(`❌ ${key}: ${address} - ${result.error}`);
        }
    }
    
    // Verify frontend constants
    const frontendIssues = await verifyFrontendConstants(addresses);
    
    // Summary
    console.log('\n📊 VERIFICATION SUMMARY\n');
    console.log('='.repeat(50));
    
    const allIssues = [...formatIssues, ...existenceIssues, ...frontendIssues];
    
    if (allIssues.length === 0) {
        console.log('🎉 All contract addresses are correctly configured!');
        console.log('\n✅ Address format: PASSED');
        console.log('✅ Contract existence: PASSED');
        console.log('✅ Frontend constants: PASSED');
        
        console.log('\n📋 Contract Address Summary:');
        console.log('='.repeat(50));
        
        // Group contracts by type
        const nftContracts = Object.entries(addresses).filter(([key]) => 
            key.includes('sonicity') || key.includes('Art')
        );
        const coreContracts = Object.entries(addresses).filter(([key]) => 
            key.includes('gameState') || key.includes('district') || key.includes('grid') || 
            key.includes('altar') || key.includes('battle')
        );
        const heroContracts = Object.entries(addresses).filter(([key]) => 
            key.includes('hero') || key.includes('tactics') || key.includes('cosmetic')
        );
        
        console.log('\n🎨 NFT Contracts:');
        nftContracts.forEach(([key, address]) => {
            console.log(`  ${key}: ${address}`);
        });
        
        console.log('\n🏗️  Core Game Contracts:');
        coreContracts.forEach(([key, address]) => {
            console.log(`  ${key}: ${address}`);
        });
        
        console.log('\n⚔️  Hero & Tactics Contracts:');
        heroContracts.forEach(([key, address]) => {
            console.log(`  ${key}: ${address}`);
        });
        
    } else {
        console.log(`❌ Found ${allIssues.length} issues:\n`);
        allIssues.forEach(issue => console.log(issue));
        
        console.log('\n🔧 To fix these issues:');
        console.log('1. Check that all contracts are properly deployed');
        console.log('2. Run the deployment scripts to set up contract references');
        console.log('3. Update frontend constants to match deployed addresses');
        console.log('4. Use the update-addresses.sh script to sync frontend constants');
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });