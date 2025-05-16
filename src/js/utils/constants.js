import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x36b58F5C1969B7b6591D752ea6F5486D069010AB",
    ALTAR: "0x4EE6eCAD1c2Dae9f525404De8555724e3c35d07B",
    GAME_STATE: "0xf4B146FbA71F41E0592668ffbF264F1D186b2Ca8",
    DISTRICT_BUILDINGS: "0x172076E0166D1F9Cc711C77Adf8488051744980C"
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
export const BUILDING_TYPES_KEYS = Object.keys(BUILDING_TYPES); // ['HOUSE', 'ALTAR', 'MINE', 'CITY_HALL']