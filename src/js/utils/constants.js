import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0xAdE429ba898c34722e722415D722A70a297cE3a2", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0x7B4f352Cd40114f12e82fC675b5BA8C7582FC513", // Will be updated by update-addresses.sh
    ALTAR: "0xD5724171C2b7f0AA717a324626050BD05767e2C6", // Will be updated by update-addresses.sh
    GAME_STATE: "0xC7143d5bA86553C06f5730c8dC9f8187a621A8D4", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0xc9952Fc93Fa9bE383ccB39008c786b9f94eAc95d", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0xDde063eBe8E85D666AD99f731B4Dbf8C98F29708", // Will be updated by update-addresses.sh
    BATTLE_SYSTEM: "0x70eE76691Bdd9696552AF8d4fd634b3cF79DD529" // Will be updated by update-addresses.sh
};

// Contract names
export const CONTRACT_NAMES = {
    SONICITY_NFT: "0xAdE429ba898c34722e722415D722A70a297cE3a2",
    SONICITY_FARM: "0x7B4f352Cd40114f12e82fC675b5BA8C7582FC513",
    ALTAR: "0xD5724171C2b7f0AA717a324626050BD05767e2C6",
    GAME_STATE: "0xC7143d5bA86553C06f5730c8dC9f8187a621A8D4",
    DISTRICT_BUILDINGS: "0xc9952Fc93Fa9bE383ccB39008c786b9f94eAc95d",
    GRID_BUILDINGS: "0xDde063eBe8E85D666AD99f731B4Dbf8C98F29708",
    BATTLE_SYSTEM: "0x70eE76691Bdd9696552AF8d4fd634b3cF79DD529"
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
        position: { x: 25, y: 0, z: -65 },
        rotation: 0,
        tier: 1
    },
    COMMAND_CENTER: {
        name: 'Command Center',
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

export const SCOUT_GUILD_MESSAGES = [
    "Your scouts returned from the mist, empty-handed. No banners on the horizon.",
    "The land ahead lies barren. Perhaps tomorrow, enemies will rise.",
    "Only the wind answered. Your scouts found no worthy foe.",
    "Their torches flickered. Tracks led to nothing. The trail is cold.",
    "They wandered far, but no city dared reveal itself."
];