import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0xC0BF43A4Ca27e0976195E6661b099742f10507e5", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0x43cA9bAe8dF108684E5EAaA720C25e1b32B0A075", // Will be updated by update-addresses.sh
    ALTAR: "0x021DBfF4A864Aa25c51F0ad2Cd73266Fde66199d", // Will be updated by update-addresses.sh
    GAME_STATE: "0x30426D33a78afdb8788597D5BFaBdADc3Be95698", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0x85495222Fd7069B987Ca38C2142732EbBFb7175D", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0x3abBB0D6ad848d64c8956edC9Bf6f18aC22E1485", // Will be updated by update-addresses.sh
    BATTLE_SYSTEM: "0x4CF4dd3f71B67a7622ac250f8b10d266Dc5aEbcE" // Will be updated by update-addresses.sh
};

// Contract names
export const CONTRACT_NAMES = {
    SONICITY_NFT: "0xC0BF43A4Ca27e0976195E6661b099742f10507e5",
    SONICITY_FARM: "0x43cA9bAe8dF108684E5EAaA720C25e1b32B0A075",
    ALTAR: "0x021DBfF4A864Aa25c51F0ad2Cd73266Fde66199d",
    GAME_STATE: "0x30426D33a78afdb8788597D5BFaBdADc3Be95698",
    DISTRICT_BUILDINGS: "0x85495222Fd7069B987Ca38C2142732EbBFb7175D",
    GRID_BUILDINGS: "0x3abBB0D6ad848d64c8956edC9Bf6f18aC22E1485",
    BATTLE_SYSTEM: "0x4CF4dd3f71B67a7622ac250f8b10d266Dc5aEbcE"
};

// Contract configuration
export const CONTRACT_CONFIG = {
    MINT_PRICE: "0.01", // ETH
    MAX_SUPPLY: 10000,
    MIN_STAKING_DURATION: 7 * 24 * 60 * 60, // 7 days in seconds
    BUILDING_SLOTS_PER_SIZE: 5, // Static size for testing
    DEFAULT_CITY_ID: 1, // Default city ID for testing
    FARM_MAX_SUPPLY: 5000,
    FARM_MINT_PRICE: "0.015"
};

// Performance monitoring
export const SHOW_PERFORMANCE_MONITOR = true;

// Building definitions combining visual and game properties
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
        tier: 1,
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
    /*
    REP_STATION: {
        name: 'Rep Station',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x20B2AA, // Light Sea Green
        position: { x: -25, y: 0, z: 45 },
        rotation: 0,
        tier: 2,
        assets: {
            baseUrl: 'assets/rep_station',
            levels: {
                1: { url: 'assets/rep_station.glb' }
            }
        }
    },
    COUNCIL_CHAMBER: {
        name: 'Council Chamber',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x800080, // Purple
        position: { x: 25, y: 0, z: 45 },
        rotation: 0,
        tier: 2,
        assets: {
            baseUrl: 'assets/council_chamber',
            levels: {
                1: { url: 'assets/council_chamber.glb' }
            }
        }
    },
    AUDIT_SHRINE: {
        name: 'Audit Shrine',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFF69B4, // Hot Pink
        position: { x: 0, y: 0, z: 50 },
        rotation: 0,
        tier: 2,
        assets: {
            baseUrl: 'assets/audit_shrine',
            levels: {
                1: { url: 'assets/audit_shrine.glb' }
            }
        }
    },
    FOUNDERS_HALL: {
        name: "Founders' Hall",
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4B0082, // Indigo
        position: { x: -30, y: 0, z: 55 },
        rotation: 0,
        tier: 3,
        assets: {
            baseUrl: 'assets/founders_hall',
            levels: {
                1: { url: 'assets/founders_hall.glb' }
            }
        }
    },
    MINISTRY_OF_MERIT: {
        name: 'Ministry of Merit',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x006400, // Dark Green
        position: { x: 30, y: 0, z: 55 },
        rotation: 0,
        tier: 3,
        assets: {
            baseUrl: 'assets/ministry_of_merit',
            levels: {
                1: { url: 'assets/ministry_of_merit.glb' }
            }
        }
    },
    ARCANE_TOWER: {
        name: 'Arcane Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x00FFFF, // Cyan
        position: { x: -35, y: 0, z: 65 },
        rotation: 0,
        tier: 4,
        assets: {
            baseUrl: 'assets/arcane_tower',
            levels: {
                1: { url: 'assets/arcane_tower.glb' }
            }
        }
    },
    FORTRESS_WALLS: {
        name: 'Fortress Walls',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x808080, // Gray
        position: { x: 35, y: 0, z: 65 },
        rotation: 0,
        tier: 4,
        assets: {
            baseUrl: 'assets/fortress_walls',
            levels: {
                1: { url: 'assets/fortress_walls.glb' }
            }
        }
    },
    BANK: {
        name: 'Bank',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold
        position: { x: 0, y: 0, z: 70 },
        rotation: 0,
        tier: 4,
        assets: {
            baseUrl: 'assets/bank',
            levels: {
                1: { url: 'assets/bank.glb' }
            }
        }
    },
    */
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