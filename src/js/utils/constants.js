import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x1429859428C0aBc9C2C47C8Ee9FBaf82cFA0F20f",
    ALTAR: "0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f",
    GAME_STATE: "0x922D6956C99E12DFeB3224DEA977D0939758A1Fe"
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
        size: new THREE.Vector3(2, 2, 2), // Size for visual representation
        color: 0xADD8E6, // Light Blue
        cost: 100,
        income: 10 // Generates $10 per cycle
    },
    ALTAR: {
        name: 'Altar',
        size: new THREE.Vector3(4, 4, 4), // Size for visual representation
        color: 0xFFB6C1, // Light Pink
        cost: 300
        // No longer tracks resource consumption (simplified)
    },
    MINE: {
        name: 'Mine',
        size: new THREE.Vector3(4, 4, 4), // Size for visual representation
        color: 0xFFFFE0, // Light Yellow
        cost: 1000
        // No longer generates resources or has range (simplified)
    },
    CITY_HALL: {
        name: 'City Hall',
        size: new THREE.Vector3(8, 8, 8), // Size for visual representation
        color: 0xB0C4DE, // Light Steel Blue
        cost: 800
        // No longer generates resources or has range (simplified)
    }
    // Add STADIUM later if budget allows
    // STADIUM: { ... }
};

// Ordered list of keys for easy access via index
export const BUILDING_TYPES_KEYS = Object.keys(BUILDING_TYPES); // ['HOUSE', 'ALTAR', 'MINE', 'CITY_HALL']