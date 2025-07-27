import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Will be updated by update-addresses.sh
    SONICITY_DIAMOND: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Will be updated by update-addresses.sh
    SONICITY_REP: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // Will be updated by update-addresses.sh
    SONICITY_YIELD_NFT: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // Will be updated by update-addresses.sh
    SONICITY_ART_PROXY: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // Will be updated by update-addresses.sh
    ALTAR: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed", // Will be updated by update-addresses.sh
    GAME_STATE: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0x9A676e781A523b5d0C0e43731313A708CB607508", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1", // Will be updated by update-addresses.sh
    BATTLE_SYSTEM: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d" // Will be updated by update-addresses.sh
};

// Contract configuration
export const CONTRACT_CONFIG = {
    MINT_PRICE: "0.01", // ETH
    MAX_SUPPLY: 10000,
    MIN_STAKING_DURATION: 30 * 60 * 60, // 30 hours in seconds
    BUILDING_SLOTS_PER_SIZE: 5, // Static size for testing
    DEFAULT_CITY_ID: 1, // Default city ID for testing
    FARM_MAX_SUPPLY: 5000,
    FARM_MINT_PRICE: "0.015"
};

// Performance monitoring
export const SHOW_PERFORMANCE_MONITOR = true;

// Building definitions combining visual and game properties
// NOTE: These building types must match the DistrictBuildingType enum in DistrictBuildings.sol
// Contract enum order: CITY_HALL, ALTAR, MINE, SHOP, WORKSHOP, OUTPOST, DEFENSE_TOWER, BARRACKS, 
// SCOUT_GUILD, COMMAND_CENTER, GARRISON, TAVERN, ADVENTURE_CAMP, MAGE_TOWER, TACTICS_CENTER, 
// GEM_WORKSHOP, DIAMOND_VAULT, ARCANUM_OF_NAMES, REFINERY, COUNCIL_HALL, FORTRESS_WALLS, 
// EMBASSY_HOME, TREASURY_VAULT
export const BUILDINGS = {
    // Grid-based buildings (dynamic placement)
    HOUSE: {
        name: 'House',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xADD8E6, // Light Blue
        isGridBuilding: true,
        tier: 0,
        assets: {
            baseUrl: 'assets/house',
            levels: {
                1: { url: 'assets/house.glb' }
            }
        }
    },
    FARM: {
        name: 'Farm',
        size: new THREE.Vector3(8, 8, 8),
        color: 0x90EE90, // Light Green
        isGridBuilding: true,
        tier: 0,
        assets: {
            baseUrl: 'assets/farm',
            levels: {
                1: { url: 'assets/farm2.glb' }
            }
        }
    },
    DIAMOND_STATION: {
        name: 'Diamond Station',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xB9F2FF, // Diamond Blue
        isGridBuilding: true,
        tier: 2,
        assets: {
            baseUrl: 'assets/diamond_station',
            levels: {
                1: { url: 'assets/diamond_station.glb' }
            }
        }
    },
    REP_FORGE: {
        name: 'REP Forge',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xFF6B35, // Orange-Red
        isGridBuilding: true,
        tier: 3,
        assets: {
            baseUrl: 'assets/rep_forge',
            levels: {
                1: { url: 'assets/rep_forge.glb' }
            }
        }
    },

    // Fixed district buildings
    CITY_HALL: {
        name: 'City Hall',
        size: new THREE.Vector3(24, 24, 24),
        color: 0xB0C4DE, // Light Steel Blue
        position: { x: 0, y: 0, z: -40 }, // Top position
        rotation: Math.PI,
        tier: 0,
        assets: {
            baseUrl: 'assets/cityhall',
            levels: {
                1: { url: 'assets/cityhall.glb' }
            }
        }
    },
    ALTAR: {
        name: 'Altar',
        size: new THREE.Vector3(12, 12, 12),
        color: 0xFFB6C1, // Light Pink
        position: { x: -40, y: 0, z: 0 }, // Left position
        rotation: Math.PI / 2,
        tier: 0,
        assets: {
            baseUrl: 'assets/altar',
            levels: {
                1: { url: 'assets/altar.glb' }
            }
        }
    },
    MINE: {
        name: 'Mine',
        size: new THREE.Vector3(12, 12, 12),
        color: 0xFFFFE0, // Light Yellow
        position: { x: 40, y: 0, z: 0 }, // Right position
        rotation: -Math.PI / 2,
        tier: 0,
        assets: {
            baseUrl: 'assets/mine',
            levels: {
                1: { url: 'assets/mine.glb' }
            }
        }
    },
    SHOP: {
        name: 'Shop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        position: { x: -20, y: 5, z: -35 },
        rotation: 0,
        tier: 0,
        assets: {
            baseUrl: 'assets/shop',
            levels: {
                1: { url: 'assets/shop.glb' }
            }
        }
    },
    WORKSHOP: {
        name: 'Workshop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        position: { x: 20, y: 0, z: -35 },
        rotation: 0,
        tier: 0,
        assets: {
            baseUrl: 'assets/workshop',
            levels: {
                1: { url: 'assets/workshop.glb' }
            }
        }
    },
    DEFENSE_TOWER: {
        name: 'Defense Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xCD5C5C, // Indian Red
        position: { x: -50, y: 0, z: -55 },
        rotation: 0,
        tier: 0,
        assets: {
            baseUrl: 'assets/defense_tower',
            levels: {
                1: { url: 'assets/tower_lvl1.glb' },
                2: { url: 'assets/tower_lvl2.glb' },
                3: { url: 'assets/tower_lvl3.glb' }
            }
        }
    },
    BARRACKS: {
        name: 'Barracks',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B4513, // Saddle Brown
        position: { x: 35, y: 0, z: -35 },
        rotation: -Math.PI / 2,
        tier: 1,
        assets: {
            baseUrl: 'assets/barracks',
            levels: {
                1: { url: 'assets/barracks_lvl1.glb' },
                2: { url: 'assets/barracks_lvl2.glb' },
                3: { url: 'assets/barr_lvl3.glb' }
            }
        }
    },
    SCOUT_GUILD: {
        name: 'Scout Guild',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4682B4, // Steel Blue
        position: { x: 15, y: 0, z: -65 },
        rotation: 0,
        tier: 1,
        assets: {
            baseUrl: 'assets/scout_guild',
            levels: {
                1: { url: 'assets/scout_guild.glb' }
            }
        }
    },
    COMMAND_CENTER: {
        name: 'Command Center',
        size: new THREE.Vector3(30, 30, 30),
        color: 0xDAA520, // Goldenrod
        position: { x: 35, y: 0, z: -55 },
        rotation: 0,
        tier: 1,
        assets: {
            baseUrl: 'assets/command_center',
            levels: {
                1: { url: 'assets/command_center.glb' }
            }
        }
    },
    OUTPOST: {
        name: 'Outpost',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B4513, // Saddle Brown
        position: { x: -15, y: 0, z: -65 },
        rotation: 0,
        tier: 0,
        assets: null, // Model not yet implemented
    },
    GARRISON: {
        name: 'Garrison',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x696969, // Dim Gray
        position: { x: 50, y: 0, z: -45 },
        rotation: 0,
        tier: 1,
        assets: null,
    },
    TAVERN: {
        name: 'Tavern',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xD2691E, // Chocolate
        position: { x: -25, y: 0, z: -75 },
        rotation: 0,
        tier: 2,
        assets: null, // Model not yet implemented
    },
    ADVENTURE_CAMP: {
        name: 'Adventure Camp',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x228B22, // Forest Green
        position: { x: 25, y: 0, z: -75 },
        rotation: 0,
        tier: 2,
        assets: null, // Model not yet implemented
    },
    MAGE_TOWER: {
        name: 'Mage Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x9932CC, // Dark Orchid
        position: { x: -35, y: 0, z: -85 },
        rotation: 0,
        tier: 2,
        assets: null,
    },
    TACTICS_CENTER: {
        name: 'Tactics Center',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4169E1, // Royal Blue
        position: { x: 35, y: 0, z: -85 },
        rotation: 0,
        tier: 2,
        assets: null,
    },
    GEM_WORKSHOP: {
        name: 'Gem Workshop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFF1493, // Deep Pink
        position: { x: -45, y: 0, z: -95 },
        rotation: 0,
        tier: 3,
        assets: null, // Model not yet implemented
    },
    DIAMOND_VAULT: {
        name: 'Diamond Vault',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x00CED1, // Dark Turquoise
        position: { x: 45, y: 0, z: -95 },
        rotation: 0,
        tier: 3,
        assets: null, // Model not yet implemented
    },
    ARCANUM_OF_NAMES: {
        name: 'Arcanum of Names',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold
        position: { x: 0, y: 0, z: -105 },
        rotation: 0,
        tier: 3,
        assets: null // Model not yet implemented
    },
    REFINERY: {
        name: 'Refinery',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x32CD32, // Lime Green
        position: { x: -55, y: 0, z: -105 },
        rotation: 0,
        tier: 3,
        assets: null // Model not yet implemented
    },
    COUNCIL_HALL: {
        name: 'Council Hall',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B0000, // Dark Red
        position: { x: 55, y: 0, z: -105 },
        rotation: 0,
        tier: 4,
        assets: null // Model not yet implemented
    },
    FORTRESS_WALLS: {
        name: 'Fortress Walls',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x808080, // Gray
        position: { x: -65, y: 0, z: -115 },
        rotation: 0,
        tier: 4,
        assets: null // Model not yet implemented
    },
    EMBASSY_HOME: {
        name: 'Embassy Home',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4B0082, // Indigo
        position: { x: 65, y: 0, z: -115 },
        rotation: 0,
        tier: 4,
        assets: null // Model not yet implemented
    },
    TREASURY_VAULT: {
        name: 'Treasury Vault',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold
        position: { x: 0, y: 0, z: -125 },
        rotation: 0,
        tier: 4,
        assets: null // Model not yet implemented
    },
};

// Helper to get all building types
export const BUILDING_TYPES = Object.keys(BUILDINGS);

// Helper to get grid buildings only
export const GRID_BUILDINGS = Object.entries(BUILDINGS)
    .filter(([_, building]) => building.isGridBuilding)
    .map(([type]) => type);

// Helper to get district buildings only
export const DISTRICT_BUILDINGS = Object.entries(BUILDINGS)
    .filter(([_, building]) => !building.isGridBuilding)
    .map(([type]) => type);

// Helper to get buildings by tier
export const BUILDINGS_BY_TIER = Object.entries(BUILDINGS)
    .filter(([_, building]) => !building.isGridBuilding)
    .reduce((acc, [type, building]) => {
        const tier = building.tier;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(type);
        return acc;
    }, {});

export const SHOP_ITEMS = [
  {
    id: 'emergency_help',
    name: 'Emergency Help',
    description: 'Grants 100 gold immediately',
    cost: 50,
    currency: 'S',
    effect: 'GOLD_100',
    count: 5,
    image: '/images/shop/help.png',
  },
  {
    id: 'production_boost',
    name: 'Production Boost',
    description: '100% boost to production for 24h',
    cost: 100,
    currency: 'S',
    effect: 'PROD_BOOST_24H',
    count: 1,
    image: '/images/shop/boost.png',
  },
  {
    id: 'cosmetic_item',
    name: 'Some Cosmetic Item',
    description: 'FREE',
    cost: 0,
    currency: 'FREE',
    effect: 'COSMETIC',
    count: 1,
    image: '/images/shop/cosmetic.png',
  },
];

export const SCOUT_GUILD_MESSAGES = [
    "Your scouts returned from the mist, empty-handed. No banners on the horizon.",
    "The land ahead lies barren. Perhaps tomorrow, enemies will rise.",
    "Only the wind answered. Your scouts found no worthy foe.",
    "Their torches flickered. Tracks led to nothing. The trail is cold.",
    "They wandered far, but no city dared reveal itself."
];

// Validation function to ensure building constants are in sync with smart contract
export function validateBuildingConstants() {
    const expectedDistrictBuildings = [
        'CITY_HALL', 'ALTAR', 'MINE', 'SHOP', 'WORKSHOP', 'OUTPOST', 'DEFENSE_TOWER', 
        'BARRACKS', 'SCOUT_GUILD', 'COMMAND_CENTER', 'GARRISON', 'TAVERN', 'ADVENTURE_CAMP', 
        'MAGE_TOWER', 'TACTICS_CENTER', 'GEM_WORKSHOP', 'DIAMOND_VAULT', 'ARCANUM_OF_NAMES', 
        'REFINERY', 'COUNCIL_HALL', 'FORTRESS_WALLS', 'EMBASSY_HOME', 'TREASURY_VAULT'
    ];
    
    const missingBuildings = expectedDistrictBuildings.filter(building => !BUILDINGS[building]);
    const extraBuildings = Object.keys(BUILDINGS).filter(building => 
        !BUILDINGS[building].isGridBuilding && !expectedDistrictBuildings.includes(building)
    );
    
    if (missingBuildings.length > 0) {
        console.error('Missing building constants:', missingBuildings);
        return false;
    }
    
    if (extraBuildings.length > 0) {
        console.warn('Extra building constants (not in contract):', extraBuildings);
    }
    
    return true;
}

// Run validation in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    validateBuildingConstants();
}