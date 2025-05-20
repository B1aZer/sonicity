import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0xe044814c9eD1e6442Af956a817c161192cBaE98F", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0xaB837301d12cDc4b97f1E910FC56C9179894d9cf", // Will be updated by update-addresses.sh
    ALTAR: "0x01cf58e264d7578D4C67022c58A24CbC4C4a304E", // Will be updated by update-addresses.sh
    GAME_STATE: "0xFCFE742e19790Dd67a627875ef8b45F17DB1DaC6", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0x398E4948e373Db819606A459456176D31C3B1F91", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0xbe18A1B61ceaF59aEB6A9bC81AB4FB87D56Ba167" // Will be updated by update-addresses.sh
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
        isGridBuilding: true
    },
    FARM: {
        name: 'Farm',
        size: new THREE.Vector3(8, 8, 8),
        color: 0x90EE90, // Light Green
        isGridBuilding: true
    },

    // Fixed district buildings
    CITY_HALL: {
        name: 'City Hall',
        size: new THREE.Vector3(24, 24, 24),
        color: 0xB0C4DE, // Light Steel Blue
        position: { x: 0, y: 0, z: 0 }, // Center position
        rotation: 0,
        tier: 0
    },
    ALTAR: {
        name: 'Altar',
        size: new THREE.Vector3(12, 12, 12),
        color: 0xFFB6C1, // Light Pink
        position: { x: 0, y: 0, z: 0 }, // Center position
        rotation: 0,
        tier: 0
    },
    MINE: {
        name: 'Mine',
        size: new THREE.Vector3(12, 12, 12),
        color: 0xFFFFE0, // Light Yellow
        position: { x: 0, y: 0, z: 0 }, // Center position
        rotation: 0,
        tier: 0
    },
    SHOP: {
        name: 'Shop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        position: { x: -20, y: 5, z: -35 },
        rotation: 0,
        tier: 0
    },
    WORKSHOP: {
        name: 'Workshop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        position: { x: 20, y: 0, z: -35 },
        rotation: 0,
        tier: 0
    },
    DEFENSE_TOWER: {
        name: 'Defense Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xCD5C5C, // Indian Red
        position: { x: -20, y: 0, z: 35 },
        rotation: 0,
        tier: 1
    },
    BARRACKS: {
        name: 'Barracks',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B4513, // Saddle Brown
        position: { x: 35, y: 0, z: -35 },
        rotation: -Math.PI / 2,
        tier: 1
    },
    SCOUT_GUILD: {
        name: 'Scout Guild',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4682B4, // Steel Blue
        position: { x: -15, y: 0, z: 40 },
        rotation: 0,
        tier: 1
    },
    CARAVAN: {
        name: 'Caravan',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xDAA520, // Goldenrod
        position: { x: 15, y: 0, z: 40 },
        rotation: 0,
        tier: 1
    },
    REP_STATION: {
        name: 'Rep Station',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x20B2AA, // Light Sea Green
        position: { x: -25, y: 0, z: 45 },
        rotation: 0,
        tier: 2
    },
    COUNCIL_CHAMBER: {
        name: 'Council Chamber',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x800080, // Purple
        position: { x: 25, y: 0, z: 45 },
        rotation: 0,
        tier: 2
    },
    AUDIT_SHRINE: {
        name: 'Audit Shrine',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFF69B4, // Hot Pink
        position: { x: 0, y: 0, z: 50 },
        rotation: 0,
        tier: 2
    },
    FOUNDERS_HALL: {
        name: "Founders' Hall",
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4B0082, // Indigo
        position: { x: -30, y: 0, z: 55 },
        rotation: 0,
        tier: 3
    },
    MINISTRY_OF_MERIT: {
        name: 'Ministry of Merit',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x006400, // Dark Green
        position: { x: 30, y: 0, z: 55 },
        rotation: 0,
        tier: 3
    },
    ARCANE_TOWER: {
        name: 'Arcane Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x00FFFF, // Cyan
        position: { x: -35, y: 0, z: 65 },
        rotation: 0,
        tier: 4
    },
    FORTRESS_WALLS: {
        name: 'Fortress Walls',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x808080, // Gray
        position: { x: 35, y: 0, z: 65 },
        rotation: 0,
        tier: 4
    },
    BANK: {
        name: 'Bank',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold
        position: { x: 0, y: 0, z: 70 },
        rotation: 0,
        tier: 4
    }
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

export const TROOP_TYPES = {
    INFANTRY: {
        name: 'Infantry',
        description: 'Base unit for defense and offense',
        cost: {
            gold: 100,
            food: 50
        },
        image: '/images/barracks/infantry.png'
    },
    CAVALRY: {
        name: 'Cavalry',
        description: 'More powerful unit with chance to disable enemy grid buildings',
        cost: {
            gold: 200,
            food: 100
        },
        image: '/images/barracks/cavalry.png'
    },
    SIEGE: {
        name: 'Siege',
        description: 'Best at damaging structures with chance to burn enemy treasury gold',
        cost: {
            gold: 300,
            food: 150
        },
        image: '/images/barracks/siege.png'
    }
};