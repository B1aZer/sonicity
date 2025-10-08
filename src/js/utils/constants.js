import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Will be updated by update-addresses.sh
    SONICITY_DIAMOND: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Will be updated by update-addresses.sh
    SONICITY_REP: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // Will be updated by update-addresses.sh
    SONICITY_YIELD_NFT: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // Will be updated by update-addresses.sh
    SONICITY_ART_PROXY: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", // Will be updated by update-addresses.sh
    ALTAR: "0x09635F643e140090A9A8Dcd712eD6285858ceBef", // Will be updated by update-addresses.sh
    GAME_STATE: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d", // Will be updated by update-addresses.sh
    BATTLE_SYSTEM: "0x0B306BF915C4d645ff596e518fAf3F9669b97016", // Will be updated by update-addresses.sh
    MATCHMAKING_SYSTEM: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE", // Will be updated by update-addresses.sh
    HERO_NFT: "0x809d550fca64d94Bd9F66E60752A544199cfAC3D", // Will be updated by update-addresses.sh
    TACTICS_NFT: "0x1291Be112d480055DaFd8a610b7d1e203891C274", // Will be updated by update-addresses.sh
    COSMETIC_ITEMS: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575", // Will be updated by update-addresses.sh
    RELIC_NFT: "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD", // Will be updated by update-addresses.sh
    ADVENTURE_SYSTEM: "0x0355B7B8cb128fA5692729Ab3AAa199C1753f726" // Will be updated by update-addresses.sh
};

// Contract configuration
// TODO: Not used anywhere except for mint page
export const CONTRACT_CONFIG = {
    MAX_SUPPLY: 10000,
    MIN_STAKING_DURATION: 30 * 60 * 60, // 30 hours in seconds
    BUILDING_SLOTS_PER_SIZE: 5, // Static size for testing
    DEFAULT_CITY_ID: 1, // Default city ID for testing
    FARM_MAX_SUPPLY: 5000
};

// Performance monitoring - now controlled via environment variables in config.js

// UI/UX timing constants
export const BUILDING_ENTER_DELAY = 450; // ms - Delay between sound and page navigation

// Props configuration for decorative objects, trees, rocks, etc.
// Each prop type can have multiple instances with specific positions and rotations
// Using 3D coordinates and rotations for full control
// Size uses THREE.Vector3 for independent x, y, z dimension control
export const PROPS = {

    
    FOREST_TREES: {
        name: 'Forest Trees',
        model: 'assets/tree.glb',
        instances: [
            /*
            // Behind City Hall area (y: -0.82 is building height)
            { location: { x: -8, y: 0, z: -55 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 0.2, z: 0 } },
            { location: { x: -12, y: 0, z: -58 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.8, z: 0 } },
            { location: { x: -5, y: 0, z: -60 }, size: new THREE.Vector3(1.3, 1.3, 1.3), rotation: { x: 0, y: 0.7, z: 0 } },
            { location: { x: -15, y: 0, z: -62 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 2.1, z: 0 } },
            { location: { x: -3, y: 0, z: -65 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 1.4, z: 0 } },
            
            // Behind Barracks area (y: 0 is building height)
            { location: { x: 18, y: 0, z: -25 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 0.5, z: 0 } },
            { location: { x: 22, y: 0, z: -28 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.6, z: 0 } },
            { location: { x: 25, y: 0, z: -30 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 0.9, z: 0 } },
            { location: { x: 20, y: 0, z: -32 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 2.3, z: 0 } },
            { location: { x: 28, y: 0, z: -35 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 1.1, z: 0 } },
            
            // Behind Defense Tower area (y: 2 is building height)
            { location: { x: -20, y: 2, z: -38 }, size: new THREE.Vector3(1.3, 1.3, 1.3), rotation: { x: 0, y: 0.3, z: 0 } },
            { location: { x: -25, y: 2, z: -40 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.7, z: 0 } },
            { location: { x: -18, y: 2, z: -42 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 0.8, z: 0 } },
            { location: { x: -22, y: 2, z: -45 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 2.0, z: 0 } },
            { location: { x: -28, y: 2, z: -47 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 1.2, z: 0 } },
            
            // Behind Outpost area (y: 0 is building height)
            { location: { x: -3, y: 0, z: -48 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 0.6, z: 0 } },
            { location: { x: -8, y: 0, z: -50 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.9, z: 0 } },
            { location: { x: -1, y: 0, z: -53 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 0.4, z: 0 } },
            { location: { x: -6, y: 0, z: -55 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 2.2, z: 0 } },
            { location: { x: -10, y: 0, z: -58 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 1.0, z: 0 } },
            
            // Far background trees (can be on hills or elevated areas)
            { location: { x: 50, y: 5, z: -80 }, size: new THREE.Vector3(1.4, 1.4, 1.4), rotation: { x: 0, y: 0.1, z: 0 } },
            { location: { x: 60, y: 3, z: -85 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 1.5, z: 0 } },
            { location: { x: 70, y: 8, z: -90 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 0.8, z: 0 } },
            { location: { x: 80, y: 4, z: -95 }, size: new THREE.Vector3(1.3, 1.3, 1.3), rotation: { x: 0, y: 2.1, z: 0 } },
            { location: { x: 90, y: 6, z: -100 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 1.3, z: 0 } },
            
            // Left side background (elevated terrain)
            { location: { x: -80, y: 10, z: -60 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 0.7, z: 0 } },
            { location: { x: -90, y: 7, z: -65 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.8, z: 0 } },
            { location: { x: -100, y: 12, z: -70 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 0.5, z: 0 } },
            { location: { x: -110, y: 9, z: -75 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 2.0, z: 0 } },
            { location: { x: -120, y: 15, z: -80 }, size: new THREE.Vector3(1.3, 1.3, 1.3), rotation: { x: 0, y: 1.1, z: 0 } },
            
            // Hills and elevated areas around the map
            { location: { x: 40, y: 6, z: -40 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 0.9, z: 0 } },
            { location: { x: -40, y: 8, z: -30 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 1.6, z: 0 } },
            { location: { x: 35, y: 4, z: -70 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 0.3, z: 0 } },
            { location: { x: -35, y: 5, z: -70 }, size: new THREE.Vector3(1.1, 1.1, 1.1), rotation: { x: 0, y: 2.2, z: 0 } },
            { location: { x: 45, y: 7, z: -90 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 1.0, z: 0 } }
            */
        ]
    },
    
    DECORATIVE_ROCKS: {
        name: 'Decorative Rocks',
        model: 'assets/rock.glb',
        instances: [
            /*
            // Scattered rocks around the area (on ground level)
            { location: { x: 15, y: 0, z: -20 }, size: new THREE.Vector3(0.6, 0.6, 0.6), rotation: { x: 0, y: 0.3, z: 0 } },
            { location: { x: -10, y: 0, z: -25 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 1.2, z: 0 } },
            { location: { x: 25, y: 0, z: -40 }, size: new THREE.Vector3(0.5, 0.5, 0.5), rotation: { x: 0, y: 0.8, z: 0 } },
            { location: { x: -15, y: 0, z: -35 }, size: new THREE.Vector3(0.7, 0.7, 0.7), rotation: { x: 0, y: 1.9, z: 0 } },
            { location: { x: 30, y: 0, z: -15 }, size: new THREE.Vector3(0.6, 0.6, 0.6), rotation: { x: 0, y: 0.4, z: 0 } },
            
            // Rocks on elevated areas
            { location: { x: 45, y: 6, z: -45 }, size: new THREE.Vector3(0.7, 0.7, 0.7), rotation: { x: 0, y: 1.1, z: 0 } },
            { location: { x: -45, y: 8, z: -35 }, size: new THREE.Vector3(0.5, 0.5, 0.5), rotation: { x: 0, y: 0.8, z: 0 } },
            { location: { x: 55, y: 4, z: -75 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 1.7, z: 0 } },
            { location: { x: -55, y: 5, z: -75 }, size: new THREE.Vector3(0.6, 0.6, 0.6), rotation: { x: 0, y: 0.2, z: 0 } }
            */
        ]
    },
    
    BUSHES: {
        name: 'Bushes',
        model: 'assets/bush.glb',
        instances: [
            /*
            // Small decorative bushes (ground level)
            { location: { x: 5, y: 0, z: -18 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 0.0, z: 0 } },
            { location: { x: -8, y: 0, z: -22 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.1, z: 0 } },
            { location: { x: 12, y: 0, z: -28 }, size: new THREE.Vector3(0.7, 0.7, 0.7), rotation: { x: 0, y: 0.6, z: 0 } },
            { location: { x: -12, y: 0, z: -32 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 1.8, z: 0 } },
            { location: { x: 18, y: 0, z: -12 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 0.2, z: 0 } },
            
            // Bushes on elevated areas
            { location: { x: 42, y: 6, z: -42 }, size: new THREE.Vector3(0.8, 0.8, 0.8), rotation: { x: 0, y: 1.3, z: 0 } },
            { location: { x: -42, y: 8, z: -32 }, size: new THREE.Vector3(0.7, 0.7, 0.7), rotation: { x: 0, y: 0.9, z: 0 } },
            { location: { x: 52, y: 4, z: -72 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 1.5, z: 0 } }
            */
        ]
    },
    
    PINE_TREES_RIGHT_1: {
        name: 'Pine Trees Right Type 1',
        model: 'assets/pine1.glb',
        instances: [
            // Right side pine forest
            { location: { x: 34, y: 0, z: -72 }, size: new THREE.Vector3(2.2, 2.2, 2.2), rotation: { x: 0, y: 0.3, z: 0 } },
            { location: { x: 68, y: -5, z: -180 }, size: new THREE.Vector3(5.5, 5.5, 5.5), rotation: { x: 0, y: 1.4, z: 0 } },
            
            { location: { x: 53, y: 0, z: -60 }, size: new THREE.Vector3(2.3, 2.3, 2.3), rotation: { x: 0, y: -0.8, z: 0 } },
            
            { location: { x: 70, y: 0, z: -55  }, size: new THREE.Vector3(2.4, 2.4, 2.4), rotation: { x: 0, y: 1.6, z: 0 } },
            
            { location: { x: 119, y: 0, z: -170 }, size: new THREE.Vector3(5.3, 5.3, 5.3), rotation: { x: 0, y: 0.5, z: 0 } },
    
            { location: { x: 50, y: -10, z: -140 }, size: new THREE.Vector3(5.5, 5.5, 5.5), rotation: { x: 0, y: -1.8, z: 0 } },
            // right front
            { location: { x: 42, y: 0, z: -24 }, size: new THREE.Vector3(1.6, 1.6, 1.6), rotation: { x: 0, y: 0.7, z: 0 } },
        ]
    },
    
    PINE_TREES_RIGHT_2: {
        name: 'Pine Trees Right Type 2',
        model: 'assets/pine2.glb',
        instances: [
            // Right side pine forest
            { location: { x: 79, y: -5, z: -135 }, size: new THREE.Vector3(5.8, 5.8, 5.8), rotation: { x: 0, y: 0.5, z: 0 } },
            { location: { x: 58, y: 0, z: -40 }, size: new THREE.Vector3(3, 3, 3), rotation: { x: 0, y: 0.7, z: 0 } },
            
            { location: { x: 54, y: 0, z: -50 }, size: new THREE.Vector3(2.6, 2.6, 2.6), rotation: { x: 0, y: 1.2, z: 0 } },
            
            { location: { x: 65, y: 0, z: -55 }, size: new THREE.Vector3(3.2, 3.2, 3.2), rotation: { x: 0, y: 0.3, z: 0 } },
        
            { location: { x: 126, y: 0, z: -170  }, size: new THREE.Vector3(4.8, 4.8, 4.8), rotation: { x: 0, y: 1.6, z: 0 } },
             
            { location: { x: 110, y: -2, z: -170 }, size: new THREE.Vector3(5.1, 5.1, 5.1), rotation: { x: 0, y: 0.9, z: 0 } },
            // right front
            { location: { x: 40, y: 0, z: -25 }, size: new THREE.Vector3(1.4, 1.4, 1.4), rotation: { x: 0, y: 1.4, z: 0 } },
             
            { location: { x: 38, y: 0, z: -30 }, size: new THREE.Vector3(1.6, 1.6, 1.6), rotation: { x: 0, y: 0.6, z: 0 } },
            
            { location: { x: 39, y: 0, z: -28 }, size: new THREE.Vector3(1.4, 1.4, 1.4), rotation: { x: 0, y: 1.1, z: 0 } },
            
            { location: { x: 34, y: 0, z: -28 }, size: new THREE.Vector3(1.3, 1.3, 1.3), rotation: { x: 0, y: 0.8, z: 0 } },
            
            { location: { x: 38, y: 3, z: -36 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 1.3, z: 0 } },
        ]
    },
    
    PINE_TREES_RIGHT_3: {
        name: 'Pine Trees Right Type 3',
        model: 'assets/pine3.glb',
        instances: [
            // Right side forest
            { location: { x: 40, y: -1.8, z: -70 }, size: new THREE.Vector3(2.4, 2.4, 2.4), rotation: { x: 0, y: 3.8, z: 0 } },
            { location: { x: 96, y: 0, z: -90 }, size: new THREE.Vector3(4.3, 4.3, 4.3), rotation: { x: 0, y: 3.8, z: 0 } },
            { location: { x: 59, y: -2, z: -75 }, size: new THREE.Vector3(3.1, 3.1, 3.1), rotation: { x: 0, y: 0.6, z: 0 } },
            
            { location: { x: 60, y: 0, z: -60 }, size: new THREE.Vector3(2.4, 2.4, 2.4), rotation: { x: 0, y: 1.5, z: 0 } },
            
            { location: { x: 72, y: 0, z: -55 }, size: new THREE.Vector3(3.2, 3.2, 3.2), rotation: { x: 0, y: 0.9, z: 0 } },
            
            { location: { x: 80, y: -5, z: -170 }, size: new THREE.Vector3(5.5, 5.5, 5.5), rotation: { x: 0, y: 1.7, z: 0 } },
            
            { location: { x: 106, y: 0, z: -170 }, size: new THREE.Vector3(4.8, 4.8, 4.8), rotation: { x: 0, y: 0.4, z: 0 } },
    
            { location: { x: 58, y: -8, z: -200 }, size: new THREE.Vector3(5.3, 5.3, 5.3), rotation: { x: 0, y: 1.6, z: 0 } },
            // right front
            { location: { x: 38, y: 0, z: -25 }, size: new THREE.Vector3(1.5, 1.5, 1.5), rotation: { x: 0, y: 0.7, z: 0 } },
            
            
            { location: { x: 37, y: 0, z: -29 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 1.9, z: 0 } },
            
            { location: { x: 38, y: 2, z: -34 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 0.5, z: 0 } },
        ]
    },
    
    PINE_TREES_RIGHT_4: {
        name: 'Pine Trees Right Type 4',
        model: 'assets/pine4.glb',
        instances: [
            // Right side forest
            { location: { x: 50, y: 0, z: -70 }, size: new THREE.Vector3(2.2, 2.2, 2.2), rotation: { x: 0, y: 0.8, z: 0 } },
            { location: { x: 109, y: 0, z: -130 }, size: new THREE.Vector3(4.8, 4.8, 4.8), rotation: { x: 0, y: 1.7, z: 0 } },
            
            { location: { x: 109, y: -5, z: -170 }, size: new THREE.Vector3(5.1, 5.1, 5.1), rotation: { x: 0, y: 1.9, z: 0 } },
           
            { location: { x: 94, y: -5, z: -170  }, size: new THREE.Vector3(6.3, 6.3, 6.3), rotation: { x: 0, y: 0.5, z: 0 } },
            
            { location: { x: 40, y: 2, z: -30 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: -0.3, z: 0 } },
    
            { location: { x: 48, y: -6, z: -200 }, size: new THREE.Vector3(5.0, 5.0, 5.0), rotation: { x: 0, y: 2.0, z: 0 } },
        ]
    },

    PINE_TREES_LEFT_1: {
        name: 'Pine Trees Left Type 1',
        model: 'assets/pine1.glb',
        instances: [
            // Left side pine forest - close to viewport
            { location: { x: -42, y: 0, z: -24 }, size: new THREE.Vector3(2.0, 2.0, 2.0), rotation: { x: 0, y: 0.7, z: 0 } },
            { location: { x: -38, y: 0, z: -28 }, size: new THREE.Vector3(1.4, 1.4, 1.4), rotation: { x: 0, y: 1.4, z: 0 } },
            
            // Mid-distance left forest
            { location: { x: -34, y: 0, z: -72 }, size: new THREE.Vector3(2.2, 2.2, 2.2), rotation: { x: 0, y: 0.3, z: 0 } },
            { location: { x: -53, y: 0, z: -60 }, size: new THREE.Vector3(2.3, 2.3, 2.3), rotation: { x: 0, y: -0.8, z: 0 } },
            { location: { x: -70, y: 0, z: -55 }, size: new THREE.Vector3(2.4, 2.4, 2.4), rotation: { x: 0, y: 1.6, z: 0 } },
            
            // Deep background left forest
            { location: { x: -68, y: -5, z: -180 }, size: new THREE.Vector3(5.5, 5.5, 5.5), rotation: { x: 0, y: 1.4, z: 0 } },
            { location: { x: -119, y: 0, z: -170 }, size: new THREE.Vector3(5.3, 5.3, 5.3), rotation: { x: 0, y: 0.5, z: 0 } },
            { location: { x: -45, y: -10, z: -140 }, size: new THREE.Vector3(5.5, 5.5, 5.5), rotation: { x: 0, y: -1.8, z: 0 } },
        ]
    },
    
    PINE_TREES_LEFT_2: {
        name: 'Pine Trees Left Type 2',
        model: 'assets/pine2.glb',
        instances: [
            // Left side pine forest - close to viewport
            { location: { x: -40, y: 0, z: -25 }, size: new THREE.Vector3(1.4, 1.4, 1.4), rotation: { x: 0, y: 1.4, z: 0 } },
            { location: { x: -38, y: 0, z: -30 }, size: new THREE.Vector3(1.6, 1.6, 1.6), rotation: { x: 0, y: 0.6, z: 0 } },
            { location: { x: -39, y: 0, z: -28 }, size: new THREE.Vector3(1.4, 1.4, 1.4), rotation: { x: 0, y: 1.1, z: 0 } },
            { location: { x: -30, y: 0, z: -30 }, size: new THREE.Vector3(1.3, 1.3, 1.3), rotation: { x: 0, y: 0.8, z: 0 } },
            { location: { x: -38, y: 3, z: -36 }, size: new THREE.Vector3(1.0, 1.0, 1.0), rotation: { x: 0, y: 1.3, z: 0 } },
            
            // Mid-distance left forest
            { location: { x: -58, y: 0, z: -40 }, size: new THREE.Vector3(3, 3, 3), rotation: { x: 0, y: 0.7, z: 0 } },
            { location: { x: -54, y: 0, z: -50 }, size: new THREE.Vector3(2.6, 2.6, 2.6), rotation: { x: 0, y: 1.2, z: 0 } },
            { location: { x: -65, y: 0, z: -55 }, size: new THREE.Vector3(3.2, 3.2, 3.2), rotation: { x: 0, y: 0.3, z: 0 } },
            
            // Deep background left forest
            { location: { x: -80, y: -5, z: -135 }, size: new THREE.Vector3(5.8, 5.8, 5.8), rotation: { x: 0, y: 0.5, z: 0 } },
            { location: { x: -126, y: 0, z: -170 }, size: new THREE.Vector3(4.8, 4.8, 4.8), rotation: { x: 0, y: 1.6, z: 0 } },
            { location: { x: -110, y: -2, z: -170 }, size: new THREE.Vector3(5.1, 5.1, 5.1), rotation: { x: 0, y: 0.9, z: 0 } },
        ]
    },
    
    PINE_TREES_LEFT_3: {
        name: 'Pine Trees Left Type 3',
        model: 'assets/pine3.glb',
        instances: [
            // Left side pine forest - close to viewport
            { location: { x: -38, y: 0, z: -25 }, size: new THREE.Vector3(1.5, 1.5, 1.5), rotation: { x: 0, y: 0.7, z: 0 } },
            { location: { x: -37, y: 0, z: -29 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: 1.9, z: 0 } },
            { location: { x: -38, y: 2, z: -34 }, size: new THREE.Vector3(0.9, 0.9, 0.9), rotation: { x: 0, y: 0.5, z: 0 } },
            
            // Mid-distance left forest
            { location: { x: -40, y: -1.8, z: -70 }, size: new THREE.Vector3(2.4, 2.4, 2.4), rotation: { x: 0, y: 3.8, z: 0 } },
            { location: { x: -59, y: -2, z: -75 }, size: new THREE.Vector3(3.1, 3.1, 3.1), rotation: { x: 0, y: 0.6, z: 0 } },
            { location: { x: -60, y: 0, z: -60 }, size: new THREE.Vector3(2.4, 2.4, 2.4), rotation: { x: 0, y: 1.5, z: 0 } },
            { location: { x: -72, y: 0, z: -55 }, size: new THREE.Vector3(3.2, 3.2, 3.2), rotation: { x: 0, y: 0.9, z: 0 } },
            
            // Deep background left forest
            { location: { x: -96, y: 0, z: -90 }, size: new THREE.Vector3(4.3, 4.3, 4.3), rotation: { x: 0, y: 3.8, z: 0 } },
            { location: { x: -80, y: -5, z: -170 }, size: new THREE.Vector3(5.5, 5.5, 5.5), rotation: { x: 0, y: 1.7, z: 0 } },
            { location: { x: -106, y: 0, z: -170 }, size: new THREE.Vector3(4.8, 4.8, 4.8), rotation: { x: 0, y: 0.4, z: 0 } },
            { location: { x: -58, y: -8, z: -200 }, size: new THREE.Vector3(5.3, 5.3, 5.3), rotation: { x: 0, y: 1.6, z: 0 } },
        ]
    },
    
    PINE_TREES_LEFT_4: {
        name: 'Pine Trees Left Type 4',
        model: 'assets/pine4.glb',
        instances: [
            // Left side pine forest - close to viewport
            { location: { x: -40, y: 2, z: -30 }, size: new THREE.Vector3(1.2, 1.2, 1.2), rotation: { x: 0, y: -0.3, z: 0 } },
            
            // Mid-distance left forest
            { location: { x: -50, y: 0, z: -70 }, size: new THREE.Vector3(2.2, 2.2, 2.2), rotation: { x: 0, y: 0.8, z: 0 } },
            
            // Deep background left forest
            { location: { x: -109, y: 0, z: -130 }, size: new THREE.Vector3(4.8, 4.8, 4.8), rotation: { x: 0, y: 1.7, z: 0 } },
            { location: { x: -109, y: -5, z: -170 }, size: new THREE.Vector3(5.1, 5.1, 5.1), rotation: { x: 0, y: 1.9, z: 0 } },
            { location: { x: -94, y: -5, z: -170 }, size: new THREE.Vector3(6.3, 6.3, 6.3), rotation: { x: 0, y: 0.5, z: 0 } },
            { location: { x: -45, y: -8, z: -200 }, size: new THREE.Vector3(5.0, 5.0, 5.0), rotation: { x: 0, y: -1.8, z: 0 } },
        ]
    }
};

// Fog configuration for atmospheric effects in the pine forest area
// Multiple planes with increasing opacity towards the background
export const FOG_CONFIG = {
    RIGHT_PINE_FOREST_FOG: {
        name: 'Right Pine Forest Fog',
        enabled: true,
        debug: false, // Enable to show wireframe helpers for fog plane positioning
        // Base fog properties
        baseColor: 0xf5efab, // Soft blue-white fog color
        baseOpacity: 0.18,
        
        // Animation settings
        animated: true,
        animationSpeed: 0.002,
        driftSpeed: { x: 0.001, y: 0, z: 0.0005 },
        
        // Noise settings for realistic variation
        noise: {
            enabled: true,
            scale: 2.0,
            intensity: 0.3,
            timeScale: 0.0008
        },
        
        // Multiple fog planes with increasing opacity
        planes: [
            // Foreground - very subtle
            {
                position: { x: 45, y: 1, z: -35 },
                size: { width: 60, height: 15 },
                rotation: { x: 0, y: 0.2, z: 0 },
                opacity: 0.14,
                opacityVariation: 0.02
            },
            // Mid-distance - slightly more visible
            {
                position: { x: 70, y: 2, z: -65 },
                size: { width: 140, height: 20 },
                rotation: { x: 0, y: -0.15, z: 0 },
                opacity: 0.36,
                opacityVariation: 0.06
            },
            // Background pines - more pronounced
            {
                position: { x: 90, y: 3, z: -95 },
                size: { width: 160, height: 25 },
                rotation: { x: 0, y: 0.3, z: 0 },
                opacity: 0.58,
                opacityVariation: 0.08
            },
            // Far background - strongest effect
            {
                position: { x: 110, y: 4, z: -130 },
                size: { width: 180, height: 30 },
                rotation: { x: 0, y: -0.1, z: 0 },
                opacity: 0.72,
                opacityVariation: 0.10
            },
            // Deep background - atmospheric perspective
            {
                position: { x: 105, y: 5, z: -170 },
                size: { width: 220, height: 45 },
                rotation: { x: 0, y: 0.25, z: 0 },
                opacity: 0.96,
                opacityVariation: 0.16
            }
        ]
    },
    
    LEFT_PINE_FOREST_FOG: {
        name: 'Left Pine Forest Fog',
        enabled: true,
        debug: false, // Enable to show wireframe helpers for fog plane positioning
        // Base fog properties
        baseColor: 0xf5efab, // Soft blue-white fog color (matching right side)
        baseOpacity: 0.18,
        
        // Animation settings
        animated: true,
        animationSpeed: 0.002,
        driftSpeed: { x: -0.001, y: 0, z: 0.0005 }, // Opposite drift direction for variety
        
        // Noise settings for realistic variation
        noise: {
            enabled: true,
            scale: 2.0,
            intensity: 0.3,
            timeScale: 0.0008
        },
        
        // Multiple fog planes with increasing opacity (mirrored from right side)
        planes: [
            // Foreground - very subtle
            {
                position: { x: -45, y: 1, z: -35 },
                size: { width: 60, height: 15 },
                rotation: { x: 0, y: -0.2, z: 0 },
                opacity: 0.14,
                opacityVariation: 0.02
            },
            // Mid-distance - slightly more visible
            {
                position: { x: -40, y: 2, z: -65 },
                size: { width: 90, height: 20 },
                rotation: { x: 0, y: 0.15, z: 0 },
                opacity: 0.36,
                opacityVariation: 0.06
            },
            // Background pines - more pronounced
            {
                position: { x: -70, y: 3, z: -95 },
                size: { width: 120, height: 25 },
                rotation: { x: 0, y: -0.3, z: 0 },
                opacity: 0.58,
                opacityVariation: 0.08
            },
            // Far background - strongest effect
            {
                position: { x: -70, y: 4, z: -130 },
                size: { width: 140, height: 30 },
                rotation: { x: 0, y: 0.1, z: 0 },
                opacity: 0.72,
                opacityVariation: 0.10
            },
            // Deep background - atmospheric perspective
            {
                position: { x: -105, y: 5, z: -150 },
                size: { width: 160, height: 45 },
                rotation: { x: 0, y: 0.25, z: 0 },
                opacity: 0.96,
                opacityVariation: 0.16
            }
        ]
    },
    
    CENTER_FOG: {
        name: 'Center Background Fog',
        enabled: true,
        debug: false, // Enable to show wireframe helpers for fog plane positioning
        // Base fog properties - background atmospheric effect
        baseColor: 0xf5efab, // Matching the side fogs color
        baseOpacity: 0.018,
        
        // Animation settings
        animated: true,
        animationSpeed: 0.002,
        driftSpeed: { x: 0, y: 0, z: 0.0005 }, // Gentle forward drift
        
        // Noise settings for realistic variation
        noise: {
            enabled: true,
            scale: 2.0,
            intensity: 0.3,
            timeScale: 0.0008
        },
        
        // Background center fog planes - positioned after terrain
        planes: [
            // Mid-background center
            {
                position: { x: 0, y: 3, z: -100 },
                size: { width: 120, height: 25 },
                rotation: { x: 0, y: 0, z: 0 },
                opacity: 0.28,
                opacityVariation: 0.08
            },
            // Far background center
            {
                position: { x: 0, y: 4.5, z: -140 },
                size: { width: 160, height: 35 },
                rotation: { x: 0, y: 0.1, z: 0 },
                opacity: 0.45,
                opacityVariation: 0.12
            },
        
        ]
    }
};

// Building definitions combining visual and game properties
// NOTE: These building types must match the DistrictBuildingType enum in DistrictBuildings.sol
// Contract enum order (23 buildings):
// CITY_HALL, ALTAR, MINE, SHOP, WORKSHOP, OUTPOST, DEFENSE_TOWER, BARRACKS, 
// SCOUT_GUILD, GARRISON, COMMAND_CENTER, TAVERN, ADVENTURE_CAMP, MAGE_TOWER, TACTICS_CENTER, 
// GEM_WORKSHOP, DIAMOND_VAULT, ARCANUM_OF_NAMES, REFINERY, COUNCIL_HALL, FORTRESS_WALLS, 
// EMBASSY_HOME, TREASURY_VAULT
export const BUILDINGS = {
    // Grid-based buildings (dynamic placement)
    HOUSE: {
        name: 'House',
        size: new THREE.Vector3(2, 2, 2), // Scaled to match Blender house proportions
        color: 0xADD8E6, // Light Blue
        isGridBuilding: true,
        tier: 0,
        assets: {
            baseUrl: 'assets/house',
            levels: {
                1: { url: 'assets/house.glb' },
                2: { url: 'assets/house_lvl2.glb' },
                3: { url: 'assets/house_lvl2.glb' } // Using level 2 model for level 3 for now
            }
        }
    },
    FARM: {
        name: 'Farm',
        size: new THREE.Vector3(2, 2, 2), // Scaled down to fit 2-unit grid cells
        color: 0x90EE90, // Light Green
        isGridBuilding: true,
        tier: 0,
        assets: {
            baseUrl: 'assets/farm',
            levels: {
                1: { url: 'assets/farm.glb' },
                2: { url: 'assets/farm.glb' }, // Using same model for now
                3: { url: 'assets/farm.glb' }  // Using same model for now
            }
        }
    },
    DIAMOND_STATION: {
        name: 'Diamond Station',
        size: new THREE.Vector3(2, 2, 2), // Scaled down to fit 2-unit grid cells
        color: 0xB9F2FF, // Diamond Blue
        isGridBuilding: true,
        tier: 2,
        assets: {
            baseUrl: 'assets/diamond_station',
            levels: {
                1: { url: 'assets/diamond_station.glb' },
                2: { url: 'assets/diamond_station.glb' }, // Using same model for now
                3: { url: 'assets/diamond_station.glb' }  // Using same model for now
            }
        }
    },
    REP_FORGE: {
        name: 'REP Forge',
        size: new THREE.Vector3(2, 2, 2), // Scaled down to fit 2-unit grid cells
        color: 0xFF6B35, // Orange-Red
        isGridBuilding: true,
        tier: 3,
        assets: {
            baseUrl: 'assets/rep_forge',
            levels: {
                1: { url: 'assets/rep_forge.glb' },
                2: { url: 'assets/rep_forge.glb' }, // Using same model for now
                3: { url: 'assets/rep_forge.glb' }  // Using same model for now
            }
        }
    },
    YIELD_STATION: {
        name: 'Yield Station',
        size: new THREE.Vector3(2, 2, 2), // Scaled down to fit 2-unit grid cells
        color: 0xFFD700, // Gold
        isGridBuilding: true,
        tier: 4,
        assets: {
            baseUrl: 'assets/yield_station',
            levels: {
                1: { url: 'assets/yield_station.glb' },
                2: { url: 'assets/yield_station.glb' }, // Using same model for now
                3: { url: 'assets/yield_station.glb' }  // Using same model for now
            }
        }
    },

    // Fixed district buildings
    CITY_HALL: {
        name: 'City Hall',
        size: new THREE.Vector3(5, 5, 5),
        color: 0xB0C4DE, // Light Steel Blue
        position: { x: 0, y: -0.82, z: -10 }, // Top position
        rotation: { x: 0, y: Math.PI + Math.PI / 2 + 0.4, z: -Math.PI / 64 }, // Converted to Vector3 format
        tier: 0,
        description: "The administrative center where district governance and important decisions are managed.",
        assets: {
            baseUrl: 'assets/cityhall',
            levels: {
                1: { url: 'assets/cityhall.glb' }
            }
        }
    },
    ALTAR: {
        name: 'Altar',
        size: new THREE.Vector3(3, 3, 3),
        color: 0xFFB6C1, // Light Pink
        position: { x: -7, y: -1.4, z: 1.4 }, // Left position
        rotation: { x: Math.PI / 64, y: Math.PI / 2 - 0.4, z: 0 }, // Converted to Vector3 format
        tier: 0,
        description: "A sacred place for performing rituals and ceremonies to unlock special abilities.",
        assets: {
            baseUrl: 'assets/altar',
            levels: {
                1: { url: 'assets/altar.glb' }
            }
        }
    },
    MINE: {
        name: 'Mine',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xFFFFE0, // Light Yellow
        position: { x: 8, y: -1.9, z: 0 }, // Right position
        rotation: { x: 0, y: -Math.PI / 2 + 0.3, z: -Math.PI / 16 }, // Y: -90°, Z: 45° (as requested)
        tier: 0,
        description: "Extracts valuable minerals and resources from the earth for production and upgrades.",
        assets: {
            baseUrl: 'assets/mine',
            levels: {
                1: { url: 'assets/mine.glb' }
            }
        }
    },
    SHOP: {
        name: 'Shop',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xFFD700, // Gold color
        position: { x: -10, y: -0.3, z: -15 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 0,
        description: "A stylish boutique offering decorative items and cosmetic enhancements for your district.",
        assets: {
            baseUrl: 'assets/shop',
            levels: {
                1: { url: 'assets/shop.glb' }
            }
        }
    },
    WORKSHOP: {
        name: 'Workshop',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xFFD700, // Gold color
        position: { x: 7, y: -0.4, z: -15 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 0,
        description: "Repairs buildings to maintain district infrastructure.",
        assets: {
            baseUrl: 'assets/workshop',
            levels: {
                1: { url: 'assets/workshop.glb' }
            }
        }
    },
    OUTPOST: {
        name: 'Outpost',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x8B4513, // Saddle Brown
        position: { x: -5, y: 0, z: -45 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 0,
        description: "A forward base for scouting territory and providing early warning of threats.",
        assets: {
            baseUrl: 'assets/outpost',
            levels: {
                1: { url: 'assets/outpost.glb' }
            }
        }
    },
    DEFENSE_TOWER: {
        name: 'Defense Tower',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xCD5C5C, // Indian Red
        position: { x: -18, y: 2, z: -35 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 0,
        description: "Protects your district from enemy attacks with formidable defensive capabilities.",
        assets: {
            baseUrl: 'assets/tower',
            levels: {
                1: { url: 'assets/tower_lvl1.glb' },
                2: { url: 'assets/tower_lvl2.glb' },
                3: { url: 'assets/tower_lvl3.glb' },
                4: { url: 'assets/tower_lvl3.glb' },
                5: { url: 'assets/tower_lvl3.glb' },
            }
        }
    },
    BARRACKS: {
        name: 'Barracks',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x8B4513, // Saddle Brown
        position: { x: 12, y: -0.5, z: -10 },
        rotation: { x: 0, y: -1, z: -Math.PI / 180 }, // Converted to Vector3 format
        tier: 1,
        description: "Trains and houses military units for district defense and expansion.",
        assets: {
            baseUrl: 'assets/barracks',
            levels: {
                1: { url: 'assets/barracks_lvl1.glb' },
                2: { url: 'assets/barracks_lvl2.glb' },
                3: { url: 'assets/barracks_lvl3.glb' }
            }
        }
    },
    SCOUT_GUILD: {
        name: 'Scout Guild',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x32CD32, // Lime Green
        position: { x: 16, y: -0.5, z: -38 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 1,
        description: "Specialized training facility for reconnaissance and intelligence gathering.",
        assets: {
            baseUrl: 'assets/scout_guild',
            levels: {
                1: { url: 'assets/scout_guild.glb' }
            }
        }
    },
    GARRISON: {
        name: 'Garrison',
        size: new THREE.Vector3(5, 5, 5),
        color: 0x8B4513, // Saddle Brown
        position: { x: 7, y: 1.8, z: -35 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 1,
        description: "Provides secure quarters for defensive troops to protect the district.",
        assets: {
            baseUrl: 'assets/garrison',
            levels: {
                1: { url: 'assets/garrison.glb' }
            }
        }
    },
    COMMAND_CENTER: {
        name: 'Command Center',
        size: new THREE.Vector3(6, 6, 6),
        color: 0x4169E1, // Royal Blue
        position: { x: 16, y: 0, z: -25 },
        rotation: { x: 0, y: -0.4, z: 0 }, // Converted to Vector3 format
        tier: 1,
        description: "Strategic headquarters for coordinating military operations and raids.",
        assets: {
            baseUrl: 'assets/command_center',
            levels: {
                1: { url: 'assets/command_center.glb' }
            }
        }
    },
    TAVERN: {
        name: 'Tavern',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xD2691E, // Chocolate
        position: { x: -5.5, y: 0, z: -25 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 2,
        description: "A gathering place where you can hire powerful heroes to lead your armies.",
        assets: {
            baseUrl: 'assets/tavern',
            levels: {
                1: { url: 'assets/tavern.glb' }
            }
        }
    },
    ADVENTURE_CAMP: {
        name: 'Adventure Camp',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x228B22, // Forest Green
        position: { x: 25, y: 0, z: -75 },
        rotation: 0,
        tier: 2,
        description: "Embark on exciting quests and adventures to earn unique rewards and resources.",
        assets: null, // Model not yet implemented
    },
    MAGE_TOWER: {
        name: 'Mage Tower',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x9932CC, // Dark Orchid
        position: { x: -35, y: 0, z: -85 },
        rotation: 0,
        tier: 2,
        description: "Mystical structure for studying ancient relics and magical artifacts.",
        assets: null,
    },
    TACTICS_CENTER: {
        name: 'Tactics Center',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x2F4F4F, // Dark Slate Gray
        position: { x: -10, y: 0, z: -5 },
        rotation: { x: 0, y: Math.PI / 2 + 0.1, z: 0 }, // Converted to Vector3 format
        tier: 2,
        description: "Advanced training facility for developing military strategies and tactics.",
        assets: {
            baseUrl: 'assets/tactics_center',
            levels: {
                1: { url: 'assets/tactics_center.glb' }
            }
        }
    },
    GEM_WORKSHOP: {
        name: 'Gem Workshop',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xFF1493, // Deep Pink
        position: { x: -45, y: 0, z: -95 },
        rotation: 0,
        tier: 3,
        description: "Crafts precious gems for upgrades, trading, and advanced crafting recipes.",
        assets: null, // Model not yet implemented
    },
    DIAMOND_VAULT: {
        name: 'Diamond Vault',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x00CED1, // Dark Turquoise
        position: { x: 45, y: 0, z: -95 },
        rotation: 0,
        tier: 3,
        description: "Provides secure storage for your most valuable diamonds and precious resources.",
        assets: null, // Model not yet implemented
    },
    ARCANUM_OF_NAMES: {
        name: 'Arcanum of Names',
        size: new THREE.Vector3(8, 8, 8),
        color: 0x8A2BE2, // Blue Violet
        position: { x: -12, y: 1, z: -34 },
        rotation: { x: 0, y: 0.2, z: 0 }, // Converted to Vector3 format
        tier: 3,
        description: "Mystical archive for storing reputation and minting unique NFTs.",
        assets: {
            baseUrl: 'assets/arcanum_of_names',
            levels: {
                1: { url: 'assets/arcanum_of_names.glb' }
            }
        }
    },
    REFINERY: {
        name: 'Refinery',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x32CD32, // Lime Green
        position: { x: -55, y: 0, z: -105 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 3,
        description: "Processes raw materials into more valuable forms for advanced resource production.",
        assets: null // Model not yet implemented
    },
    COUNCIL_HALL: {
        name: 'Council Hall',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x8B0000, // Dark Red
        position: { x: 55, y: 0, z: -105 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 4,
        description: "The center of political power where district leaders meet for governance and diplomacy.",
        assets: null // Model not yet implemented
    },
    FORTRESS_WALLS: {
        name: 'Fortress Walls',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x808080, // Gray
        position: { x: -65, y: 0, z: -115 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 4,
        description: "Massive fortifications that provide ultimate defense against even the most determined attacks.",
        assets: null // Model not yet implemented
    },
    EMBASSY_HOME: {
        name: 'Embassy Home',
        size: new THREE.Vector3(4, 4, 4),
        color: 0x4B0082, // Indigo
        position: { x: 65, y: 0, z: -115 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 4,
        description: "A diplomatic center for establishing alliances and peaceful trade agreements with other cities.",
        assets: null // Model not yet implemented
    },
    TREASURY_VAULT: {
        name: 'Treasury Vault',
        size: new THREE.Vector3(4, 4, 4),
        color: 0xFFD700, // Gold
        position: { x: 0, y: 0, z: -125 },
        rotation: { x: 0, y: 0, z: 0 }, // Converted to Vector3 format
        tier: 4,
        description: "The most secure location for storing your district's wealth and valuable assets.",
        assets: null // Model not yet implemented
    },
};

// Helper to get all building types
export const BUILDING_TYPES = Object.keys(BUILDINGS);

// Helper to get grid buildings only
export const GRID_BUILDINGS = Object.entries(BUILDINGS)
    .filter(([_, building]) => building.isGridBuilding)
    .map(([type]) => type);

// Hero system constants
/*
export const HERO_CLASSES = {
    WARRIOR: 0,
    STRATEGIST: 1,
    SCOUT: 2
};

export const HERO_TEMPLATES = {
    [HERO_CLASSES.WARRIOR]: {
        name: "Iron Guardian",
        class: HERO_CLASSES.WARRIOR,
        troopBonus: 20,
        description: "Specializes in infantry combat",
        troopType: "INFANTRY"
    },
    [HERO_CLASSES.STRATEGIST]: {
        name: "Shadow Tactician", 
        class: HERO_CLASSES.STRATEGIST,
        troopBonus: 20,
        description: "Specializes in siege warfare",
        troopType: "SIEGE"
    },
    [HERO_CLASSES.SCOUT]: {
        name: "Swift Scout",
        class: HERO_CLASSES.SCOUT,
        troopBonus: 20,
        description: "Specializes in cavalry tactics",
        troopType: "CAVALRY"
    }
};

// Tactics system constants
export const TACTIC_TYPES = {
    STRIKE: 0,
    SHIELD: 1,
    TRICK: 2
};

export const TACTICS = {
    1: {
        id: 1,
        name: "Iron Strike",
        type: TACTIC_TYPES.STRIKE,
        effectMagnitude: 3,
        description: "Damage +3 buildings",
        cost: { gold: 300, diamonds: 24 }
    },
    2: {
        id: 2,
        name: "Guardian Wall",
        type: TACTIC_TYPES.SHIELD,
        effectMagnitude: 75,
        description: "Lose 75% fewer troops",
        cost: { gold: 300, diamonds: 24 }
    },
    3: {
        id: 3,
        name: "Battle Rage",
        type: TACTIC_TYPES.TRICK,
        effectMagnitude: 100,
        description: "Gain +100% REP bonus (2x REP)",
        cost: { gold: 300, diamonds: 24 }
    },
    4: {
        id: 4,
        name: "Cavalry Rush",
        type: TACTIC_TYPES.STRIKE,
        effectMagnitude: 2,
        description: "Damage +2 buildings",
        cost: { gold: 200, diamonds: 16 }
    },
    5: {
        id: 5,
        name: "Defensive Circle",
        type: TACTIC_TYPES.SHIELD,
        effectMagnitude: 50,
        description: "Lose 50% fewer troops",
        cost: { gold: 200, diamonds: 16 }
    },
    6: {
        id: 6,
        name: "Tactical Feint",
        type: TACTIC_TYPES.TRICK,
        effectMagnitude: 75,
        description: "Gain +75% REP bonus (1.75x REP)",
        cost: { gold: 200, diamonds: 16 }
    },
    7: {
        id: 7,
        name: "Swift Strike",
        type: TACTIC_TYPES.STRIKE,
        effectMagnitude: 1,
        description: "Damage +1 building",
        cost: { gold: 100, diamonds: 8 }
    },
    8: {
        id: 8,
        name: "Shadow Guard",
        type: TACTIC_TYPES.SHIELD,
        effectMagnitude: 25,
        description: "Lose 25% fewer troops",
        cost: { gold: 100, diamonds: 8 }
    },
    9: {
        id: 9,
        name: "Stealth Trap",
        type: TACTIC_TYPES.TRICK,
        effectMagnitude: 50,
        description: "Gain +50% REP bonus (1.5x REP)",
        cost: { gold: 100, diamonds: 8 }
    }
};

// Helper functions for hero and tactics
export const getHeroByClass = (heroClass) => HERO_TEMPLATES[heroClass];
export const getTacticById = (tacticId) => TACTICS[tacticId];
export const getTacticsByType = (tacticType) => Object.values(TACTICS).filter(tactic => tactic.type === tacticType);
*/



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

// Cosmetic item types for frontend display
export const COSMETIC_TYPES = {
  BANNER: 'banner',
  DECORATION: 'decoration', 
  EFFECT: 'effect',
  TERRAIN_MODIFIER: 'terrain'
};

// Resource type mapping for frontend display
export const RESOURCE_TYPES = {
  0: 'GOLD',
  1: 'DIAMONDS', 
  2: 'FOOD',
  3: 'REP',
  4: 'SONIC'
};

// Emergency help configuration
export const EMERGENCY_HELP_CONFIG = {
  PURCHASE_LIMIT: 5, // Maximum purchases per player
  GOLD_AMOUNT: 1000, // Gold given per purchase
  SONIC_COST: 20     // SONIC cost per purchase
};

// Static cosmetic metadata (images, descriptions, model paths, positioning)
// This data doesn't change often and is UI-specific
export const COSMETIC_METADATA = {
  0: {
    image: '/images/shop/banner-icon.png',
    description: 'A majestic banner to display your achievements',
    type: COSMETIC_TYPES.BANNER,
    modelPath: 'assets/banner.glb',
    position: { x: -20, y: 0, z: -22 }, // Near city center, in front
    rotation: { x: 0, y: 1.2, z: 0 },   // Default rotation
    size: new THREE.Vector3(1.5, 1.5, 1.5)  // Default size (consistent with PROPS)
  },
  1: {
    image: '/images/shop/help.png',
    description: 'Instant 1000 gold for emergency situations',
    type: 'emergency',
    modelPath: '',
    position: { x: 0, y: 0, z: 0 }, // Not a 3D item
    rotation: { x: 0, y: 0, z: 0 },
    size: new THREE.Vector3(1, 1, 1)
  }
  // Future cosmetic metadata will be added here
};

export const SCOUT_GUILD_MESSAGES = [
    "Your scouts returned from the mist, empty-handed. No banners on the horizon.",
    "The land ahead lies barren. Perhaps tomorrow, enemies will rise.",
    "Only the wind answered. Your scouts found no worthy foe.",
    "Their torches flickered. Tracks led to nothing. The trail is cold.",
    "They wandered far, but no city dared reveal itself."
];

// Unit model paths and configurations for patrol and battle systems
export const UNIT_MODELS = {
    INFANTRY: {
        modelPath: 'assets/Infantry_A.glb',
        size: new THREE.Vector3(0.5, 0.5, 0.5) // Standard unit size, scaled down from default
    },
    CAVALRY: {
        modelPath: 'assets/Cavalery_A.glb',
        size: new THREE.Vector3(0.5, 0.5, 0.5) // Slightly larger for mounted units
    },
    SIEGE: {
        modelPath: 'assets/Catapult.glb',
        size: new THREE.Vector3(1.0, 1.0, 1.0) // Larger for heavy equipment
    }
};

// Patrol system configuration
export const PATROL_CONFIG = {
    // Movement speeds (units per second)
    INFANTRY_SPEED: 0.75,      // Standard patrol speed
    CAVALRY_SPEED: 0.9,       // Faster for mounted units
    SIEGE_SPEED: 0.5,         // Slower for heavy equipment
    
    // Behavior settings
    WAYPOINT_PAUSE_TIME: 2.0, // Seconds to pause at each waypoint
    UPDATE_INTERVAL: 5.0,     // Seconds between troop count checks
    
    // Spawn ratios (troops needed per patrol unit)
    INFANTRY_PER_PATROL: 1,   // 1 patrol per infantry
    CAVALRY_PER_PATROL: 1,    // 1 patrol per 2 cavalry  
    SIEGE_PER_PATROL: 1,      // 1 patrol per 3 siege units
    
    // Limits - separate max patrols for each unit type
    MAX_PATROLS: {
        INFANTRY: 3,  // Maximum infantry patrol units
        CAVALRY: 2,   // Maximum cavalry patrol units  
        SIEGE: 1      // Maximum siege patrol units
    },
    TERRAIN_OFFSET: 0.01,      // Height above terrain to prevent clipping
    
    // Animation settings
    ANIMATION_FADE_TIME: 0.3, // Seconds for animation transitions
    UNIT_SCALE: 0.8          // Scale factor for patrol units
};

// Terrain rotation settings for building alignment
export const TERRAIN_ROTATION_CONFIG = {
    // How steep terrain must be before buildings rotate
    MIN_SLOPE_THRESHOLD: 0.95,     // Minimum slope to trigger rotation (0.95 = ~18°)
    // Maximum degrees buildings can tilt to match terrain
    MAX_ROTATION_ANGLE: Math.PI / 6 // Maximum rotation angle (30 degrees)
};

// Validation function to ensure building constants are in sync with smart contract
export function validateBuildingConstants() {
    const expectedDistrictBuildings = [
        'CITY_HALL', 'ALTAR', 'MINE', 'SHOP', 'WORKSHOP', 'OUTPOST', 'DEFENSE_TOWER', 
        'BARRACKS', 'SCOUT_GUILD', 'GARRISON', 'COMMAND_CENTER', 'TAVERN', 'ADVENTURE_CAMP', 
        'MAGE_TOWER', 'TACTICS_CENTER', 'GEM_WORKSHOP', 'DIAMOND_VAULT', 'ARCANUM_OF_NAMES', 
        'REFINERY', 'COUNCIL_HALL', 'FORTRESS_WALLS', 'EMBASSY_HOME', 'TREASURY_VAULT'
    ];
    
    const missingBuildings = expectedDistrictBuildings.filter(building => !BUILDINGS[building]);
    const extraBuildings = Object.keys(BUILDINGS).filter(building => 
        !BUILDINGS[building].isGridBuilding && !expectedDistrictBuildings.includes(building)
    );
    
    if (missingBuildings.length > 0) {
        console.error('Missing building constants:', missingBuildings);
        return false;
    }
    
    if (extraBuildings.length > 0) {
        console.warn('Extra building constants (not in contract):', extraBuildings);
    }
    
    return true;
}

// Run validation in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    validateBuildingConstants();
}