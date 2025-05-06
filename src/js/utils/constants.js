import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49",
    ALTAR: "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf",
    GAME_STATE: "0x0E801D84Fa97b50751Dbf25036d067dCf18858bF"
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