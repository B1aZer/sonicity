import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x1c85638e118b37167e9298c2268758e058DdfDA0",
    ALTAR: "0x86A2EE8FAf9A840F7a2c64CA3d51209F9A02081D",
    GAME_STATE: "0x49fd2BE640DB2910c2fAb69bB8531Ab6E76127ff",
    DISTRICT_BUILDINGS: "0x4631BCAbD6dF18D94796344963cB60d44a4136b6"
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
        size: new THREE.Vector3(10, 10, 10),
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