const { ethers } = require("hardhat");
const fs = require('fs');

/**
 * Contract Cross-Reference Verification Script
 * 
 * This script verifies that contract addresses are properly set in each contract
 * (i.e., GameState knows about Altar, Altar knows about GameState, etc.)
 * 
 * Usage: npx hardhat run scripts/verify-contract-references.js --network <network>
 */

// Contract cross-reference mappings (what addresses each contract should store)
// Based on the actual deployment script setup
const CONTRACT_REFERENCES = {
    // GameState should reference:
    gameStateProxy: {
        contractName: 'GameState',
        references: {
            altarAddress: 'altarProxy',
            districtBuildingsAddress: 'districtBuildingsProxy',
            gridBuildingsAddress: 'gridBuildingsProxy',
            battleSystemAddress: 'battleSystemProxy',
            matchmakingSystemAddress: 'matchmakingSystemProxy',
            heroNFTAddress: 'heroNFTProxy',
            tacticsNFTAddress: 'tacticsNFTProxy',
            cosmeticItemsAddress: 'cosmeticItemsProxy',
            adventureSystemAddress: 'adventureSystemProxy'
        }
    },
    
    // DistrictBuildings should reference:
    districtBuildingsProxy: {
        contractName: 'DistrictBuildings',
        references: {
            gameStateAddress: 'gameStateProxy',
            battleSystemAddress: 'battleSystemProxy'
        }
    },
    
    // GridBuildings should reference:
    gridBuildingsProxy: {
        contractName: 'GridBuildings',
        references: {
            gameStateAddress: 'gameStateProxy',
            altarAddress: 'altarProxy',
            battleSystemAddress: 'battleSystemProxy',
            districtBuildingsAddress: 'districtBuildingsProxy'
        }
    },
    
    // Altar should reference:
    altarProxy: {
        contractName: 'Altar',
        references: {
            gameState: 'gameStateProxy',
            gridBuildings: 'gridBuildingsProxy',
            yieldNFT: 'sonicityYieldNFT'
        }
    },
    
    // BattleSystem should reference:
    battleSystemProxy: {
        contractName: 'BattleSystem',
        references: {
            gameStateAddress: 'gameStateProxy',
            districtBuildingsAddress: 'districtBuildingsProxy',
            gridBuildingsAddress: 'gridBuildingsProxy',
            matchmakingSystemAddress: 'matchmakingSystemProxy',
            heroNFTAddress: 'heroNFTProxy',
            tacticsNFTAddress: 'tacticsNFTProxy'
        }
    },
    
    // HeroNFT should reference:
    heroNFTProxy: {
        contractName: 'HeroNFT',
        references: {
            gameStateAddress: 'gameStateProxy'
        }
    },
    
    // TacticsNFT should reference:
    tacticsNFTProxy: {
        contractName: 'TacticsNFT',
        references: {
            gameStateAddress: 'gameStateProxy'
        }
    },
    
    // CosmeticItems should reference:
    cosmeticItemsProxy: {
        contractName: 'CosmeticItems',
        references: {
            gameStateAddress: 'gameStateProxy'
        }
    },
    
    // MatchmakingSystem should reference:
    matchmakingSystemProxy: {
        contractName: 'MatchmakingSystem',
        references: {
            gameStateAddress: 'gameStateProxy',
            battleSystemAddress: 'battleSystemProxy',
            districtBuildingsAddress: 'districtBuildingsProxy',
            gridBuildingsAddress: 'gridBuildingsProxy'
        }
    },
    
    // NFT contracts should reference:
    sonicityNFT: {
        contractName: 'SonicityNFT',
        references: {
            altarContract: 'altarProxy'
        }
    },
    
    sonicityFarm: {
        contractName: 'SonicityFarm',
        references: {
            altarContract: 'altarProxy'
        }
    },
    
    sonicityDiamond: {
        contractName: 'SonicityDiamond',
        references: {
            altarContract: 'altarProxy'
        }
    },
    
    sonicityRep: {
        contractName: 'SonicityRep',
        references: {
            altarContract: 'altarProxy'
        }
    },
    
    sonicityYieldNFT: {
        contractName: 'SonicityYieldNFT',
        references: {
            altarContract: 'altarProxy',
            artProxy: 'sonicityArtProxy'
        }
    },
    
    // Adventure System should reference:
    adventureSystemProxy: {
        contractName: 'AdventureSystem',
        references: {
            gameStateAddress: 'gameStateProxy',
            heroNFTAddress: 'heroNFTProxy',
            relicNFTAddress: 'relicNFT'
        }
    },
    
    // RelicNFT should reference:
    relicNFT: {
        contractName: 'RelicNFT',
        references: {
            adventureSystemAddress: 'adventureSystemProxy'
        }
    }
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

async function verifyContractReferences(addresses) {
    console.log('🔍 Verifying contract cross-references...\n');
    
    const issues = [];
    
    for (const [contractKey, contractInfo] of Object.entries(CONTRACT_REFERENCES)) {
        const contractAddress = addresses[contractKey];
        if (!contractAddress) {
            issues.push(`❌ Missing contract address for ${contractKey}`);
            continue;
        }
        
        console.log(`📋 Checking ${contractKey} (${contractAddress})`);
        
        try {
            const contractInstance = await ethers.getContractAt(contractInfo.contractName, contractAddress);
            
            for (const [refField, expectedAddressKey] of Object.entries(contractInfo.references)) {
                const expectedAddress = addresses[expectedAddressKey];
                if (!expectedAddress) {
                    issues.push(`❌ Missing expected address for ${expectedAddressKey}`);
                    continue;
                }
                
                try {
                    const actualAddress = await contractInstance[refField]();
                    
                    if (actualAddress.toLowerCase() === expectedAddress.toLowerCase()) {
                        console.log(`  ✅ ${refField}: ${actualAddress}`);
                    } else {
                        console.log(`  ❌ ${refField}: Expected ${expectedAddress}, got ${actualAddress}`);
                        issues.push(`❌ ${contractKey}.${refField}: Expected ${expectedAddress}, got ${actualAddress}`);
                    }
                } catch (error) {
                    console.log(`  ❌ ${refField}: Error reading - ${error.message}`);
                    issues.push(`❌ ${contractKey}.${refField}: Error reading - ${error.message}`);
                }
            }
        } catch (error) {
            console.log(`  ❌ Failed to get contract instance: ${error.message}`);
            issues.push(`❌ ${contractKey}: Failed to get contract instance - ${error.message}`);
        }
        
        console.log('');
    }
    
    return issues;
}

async function main() {
    console.log('🚀 Starting Contract Cross-Reference Verification...\n');
    
    // Load deployed addresses
    const addresses = await loadDeployedAddresses();
    console.log('📄 Loaded deployed addresses from deployed-addresses.json\n');
    
    // Verify contract cross-references
    const referenceIssues = await verifyContractReferences(addresses);
    
    // Summary
    console.log('\n📊 CROSS-REFERENCE VERIFICATION SUMMARY\n');
    console.log('='.repeat(50));
    
    if (referenceIssues.length === 0) {
        console.log('🎉 All contract cross-references are correctly configured!');
        console.log('\n✅ Contract references: PASSED');
        
        console.log('\n📋 Reference Summary:');
        console.log('='.repeat(50));
        
        for (const [contractKey, contractInfo] of Object.entries(CONTRACT_REFERENCES)) {
            const contractAddress = addresses[contractKey];
            console.log(`\n${contractInfo.contractName} (${contractAddress}):`);
            
            for (const [refField, expectedAddressKey] of Object.entries(contractInfo.references)) {
                const expectedAddress = addresses[expectedAddressKey];
                console.log(`  → ${refField}: ${expectedAddress}`);
            }
        }
        
    } else {
        console.log(`❌ Found ${referenceIssues.length} issues:\n`);
        referenceIssues.forEach(issue => console.log(issue));
        
        console.log('\n🔧 To fix these issues:');
        console.log('1. Run the deployment scripts to set up contract references');
        console.log('2. Check that all setter functions were called during deployment');
        console.log('3. Manually call the setter functions if needed');
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
