import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x33E45b187da34826aBCEDA1039231Be46f1b05Af", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0x0c626FC4A447b01554518550e30600136864640B", // Will be updated by update-addresses.sh
    ALTAR: "0x8ac5eE52F70AE01dB914bE459D8B3d50126fd6aE", // Will be updated by update-addresses.sh
    GAME_STATE: "0xF342E904702b1D021F03f519D6D9614916b03f37", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0x9849832a1d8274aaeDb1112ad9686413461e7101", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0xa4E00CB342B36eC9fDc4B50b3d527c3643D4C49e" // Will be updated by update-addresses.sh
};

// Contract configuration
export const CONTRACT_CONFIG = {
    MINT_PRICE: "0.01", // ETH
    MAX_SUPPLY: 10000,
    MIN_STAKING_DURATION: 7 * 24 * 60 * 60, // 7 days in seconds
    BUILDING_SLOTS_PER_SIZE: 5, // Static size for testing
    DEFAULT_CITY_ID: 1 // Default city ID for testing
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