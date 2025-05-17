import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0xddE78e6202518FF4936b5302cC2891ec180E8bFf",
    ALTAR: "0x413b1AfCa96a3df5A686d8BFBF93d30688a7f7D9",
    GAME_STATE: "0x045857BDEAE7C1c7252d611eB24eB55564198b4C",
    DISTRICT_BUILDINGS: "0x2b5A4e5493d4a54E717057B127cf0C000C876f9B"
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

export const BUILDING_TYPES = {
    HOUSE: {
        name: 'House',
        size: new THREE.Vector3(8, 8, 8), // Increased size to fill more of the cell
        color: 0xADD8E6, // Light Blue
        cost: 100,
        income: 10 // Generates $10 per cycle
    },
    SHOP: {
        name: 'Shop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        cost: 200,
        income: 20 // Generates $20 per cycle
    },
    WORKSHOP: {
        name: 'Workshop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        cost: 200,
        income: 20 // Generates $20 per cycle
    },
    ALTAR: {
        name: 'Altar',
        size: new THREE.Vector3(12, 12, 12), // Size for visual representation
        color: 0xFFB6C1, // Light Pink
        cost: 300
        // No longer tracks resource consumption (simplified)
    },
    MINE: {
        name: 'Mine',
        size: new THREE.Vector3(12, 12, 12), // Size for visual representation
        color: 0xFFFFE0, // Light Yellow
        cost: 1000
        // No longer generates resources or has range (simplified)
    },
    CITY_HALL: {
        name: 'City Hall',
        size: new THREE.Vector3(24, 24, 24), // Size for visual representation
        color: 0xB0C4DE, // Light Steel Blue
        cost: 800
        // No longer generates resources or has range (simplified)
    }
    // Add STADIUM later if budget allows
    // STADIUM: { ... }
};

// Ordered list of keys for easy access via index
export const BUILDING_TYPES_KEYS = Object.keys(BUILDING_TYPES); // ['HOUSE', 'SHOP', 'ALTAR', 'MINE', 'CITY_HALL']

// District building positions for camera-friendly layout
export const DISTRICT_BUILDING_POSITIONS = {
    // Tier 0 - Closest to camera, slightly spread out
    0: { // SHOP
        position: { x: -20, y: 5, z: -35 },
        rotation: 0
    },
    1: { // WORKSHOP
        position: { x: 20, y: 0, z: -35 },
        rotation: 0
    },

    // Tier 1 - Slightly further back, more spread out
    2: { // DEFENSE_TOWER
        position: { x: -20, y: 0, z: 35 },
        rotation: 0
    },
    3: { // BARRACKS
        position: { x: 20, y: 0, z: 35 },
        rotation: 0
    },
    4: { // SCOUT_GUILD
        position: { x: -15, y: 0, z: 40 },
        rotation: 0
    },
    5: { // CARAVAN
        position: { x: 15, y: 0, z: 40 },
        rotation: 0
    },

    // Tier 2 - Further back, wider spread
    6: { // REP_STATION
        position: { x: -25, y: 0, z: 45 },
        rotation: 0
    },
    7: { // COUNCIL_CHAMBER
        position: { x: 25, y: 0, z: 45 },
        rotation: 0
    },
    8: { // AUDIT_SHRINE
        position: { x: 0, y: 0, z: 50 },
        rotation: 0
    },

    // Tier 3 - Even further back
    9: { // FOUNDERS_HALL
        position: { x: -30, y: 0, z: 55 },
        rotation: 0
    },
    10: { // MINISTRY_OF_MERIT
        position: { x: 30, y: 0, z: 55 },
        rotation: 0
    },

    // Tier 4 - Furthest back
    11: { // ARCANE_TOWER
        position: { x: -35, y: 0, z: 65 },
        rotation: 0
    },
    12: { // FORTRESS_WALLS
        position: { x: 35, y: 0, z: 65 },
        rotation: 0
    },
    13: { // BANK
        position: { x: 0, y: 0, z: 70 },
        rotation: 0
    }
};

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