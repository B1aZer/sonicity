import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    ALTAR: "0x...", // TODO: Add Altar address after deployment
    GAME_STATE: "0x..." // TODO: Add GameState address after deployment
};

// Contract configuration
export const CONTRACT_CONFIG = {
    MINT_PRICE: "0.01", // ETH
    MAX_SUPPLY: 10000,
    MIN_STAKING_DURATION: 7 * 24 * 60 * 60, // 7 days in seconds
    BUILDING_SLOTS_PER_SIZE: 5, // Static size for testing
    DEFAULT_CITY_ID: 1 // Default city ID for testing
};

export const BUILDING_TYPES = {
    HOUSE: {
        name: 'House',
        size: new THREE.Vector3(2, 2, 2), // Already 1 tile (2x2)
        color: 0xADD8E6, // Light Blue
        consumes: { electricity: 1, water: 1 }, // Still consumes for global calculation
        cost: 100,
        income: 10 // Generates $10 per cycle if functional
    },
    SHOP: {
        name: 'Shop',
        size: new THREE.Vector3(2, 2.5, 2), // Change footprint to 2x2
        color: 0xFFB6C1, // Light Pink
        consumes: { electricity: 3, water: 2 },
        cost: 300
    },
    POWER_PLANT: {
        name: 'Power Plant',
        size: new THREE.Vector3(2, 5, 2), // Change footprint to 2x2
        color: 0xFFFFE0, // Light Yellow
        generates: { electricity: 10 },
        cost: 1000,
        range: 3 // Number of grid cells the effect reaches (Manhattan distance)
    },
    WATER_TOWER: {
        name: 'Water Tower',
        size: new THREE.Vector3(2, 6, 2), // Change footprint to 2x2
        color: 0xB0C4DE, // Light Steel Blue
        generates: { water: 8 },
        cost: 800,
        range: 3 // Number of grid cells the effect reaches (Manhattan distance)
    }
    // Add STADIUM later if budget allows
    // STADIUM: { ... }
};

// Ordered list of keys for easy access via index (e.g., for number key selection)
export const BUILDING_TYPES_KEYS = Object.keys(BUILDING_TYPES); // ['HOUSE', 'SHOP', 'POWER_PLANT', 'WATER_TOWER']