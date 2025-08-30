import * as THREE from 'three';

// Contract addresses
export const CONTRACT_ADDRESSES = {
    SONICITY_NFT: "0xab16A69A5a8c12C732e0DEFF4BE56A70bb64c926", // Will be updated by update-addresses.sh
    SONICITY_FARM: "0xE3011A37A904aB90C8881a99BD1F6E21401f1522", // Will be updated by update-addresses.sh
    SONICITY_DIAMOND: "0x1f10F3Ba7ACB61b2F50B9d6DdCf91a6f787C0E82", // Will be updated by update-addresses.sh
    SONICITY_REP: "0x457cCf29090fe5A24c19c1bc95F492168C0EaFdb", // Will be updated by update-addresses.sh
    SONICITY_YIELD_NFT: "0x525C7063E7C20997BaaE9bDa922159152D0e8417", // Will be updated by update-addresses.sh
    SONICITY_ART_PROXY: "0x38a024C0b412B9d1db8BC398140D00F5Af3093D4", // Will be updated by update-addresses.sh
    ALTAR: "0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9", // Will be updated by update-addresses.sh
    GAME_STATE: "0xd6e1afe5cA8D00A2EFC01B89997abE2De47fdfAf", // Will be updated by update-addresses.sh
    DISTRICT_BUILDINGS: "0x99dBE4AEa58E518C50a1c04aE9b48C9F6354612f", // Will be updated by update-addresses.sh
    GRID_BUILDINGS: "0x6F6f570F45833E249e27022648a26F4076F48f78", // Will be updated by update-addresses.sh
    BATTLE_SYSTEM: "0xB0f05d25e41FbC2b52013099ED9616f1206Ae21B", // Will be updated by update-addresses.sh
    HERO_NFT: "0x5FeaeBfB4439F3516c74939A9D04e95AFE82C4ae", // Will be updated by update-addresses.sh
    TACTICS_NFT: "0x976fcd02f7C4773dd89C309fBF55D5923B4c98a1" // Will be updated by update-addresses.sh
};

// Contract configuration
export const CONTRACT_CONFIG = {
    MAX_SUPPLY: 10000,
    MIN_STAKING_DURATION: 30 * 60 * 60, // 30 hours in seconds
    BUILDING_SLOTS_PER_SIZE: 5, // Static size for testing
    DEFAULT_CITY_ID: 1, // Default city ID for testing
    FARM_MAX_SUPPLY: 5000
};

// Performance monitoring
export const SHOW_PERFORMANCE_MONITOR = true;

// Building definitions combining visual and game properties
// NOTE: These building types must match the DistrictBuildingType enum in DistrictBuildings.sol
// Contract enum order: CITY_HALL, ALTAR, MINE, SHOP, WORKSHOP, OUTPOST, DEFENSE_TOWER, BARRACKS, 
// SCOUT_GUILD, GARRISON, COMMAND_CENTER, TAVERN, ADVENTURE_CAMP, MAGE_TOWER, TACTICS_CENTER, 
// GEM_WORKSHOP, DIAMOND_VAULT, ARCANUM_OF_NAMES, REFINERY, COUNCIL_HALL, FORTRESS_WALLS, 
// EMBASSY_HOME, TREASURY_VAULT
export const BUILDINGS = {
    // Grid-based buildings (dynamic placement)
    HOUSE: {
        name: 'House',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xADD8E6, // Light Blue
        isGridBuilding: true,
        tier: 0,
        assets: {
            baseUrl: 'assets/house',
            levels: {
                1: { url: 'assets/house.glb' }
            }
        }
    },
    FARM: {
        name: 'Farm',
        size: new THREE.Vector3(8, 8, 8),
        color: 0x90EE90, // Light Green
        isGridBuilding: true,
        tier: 0,
        assets: {
            baseUrl: 'assets/farm',
            levels: {
                1: { url: 'assets/farm2.glb' }
            }
        }
    },
    DIAMOND_STATION: {
        name: 'Diamond Station',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xB9F2FF, // Diamond Blue
        isGridBuilding: true,
        tier: 2,
        assets: {
            baseUrl: 'assets/diamond_station',
            levels: {
                1: { url: 'assets/diamond_station.glb' }
            }
        }
    },
    REP_FORGE: {
        name: 'REP Forge',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xFF6B35, // Orange-Red
        isGridBuilding: true,
        tier: 3,
        assets: {
            baseUrl: 'assets/rep_forge',
            levels: {
                1: { url: 'assets/mine.glb' }
            }
        }
    },
    YIELD_STATION: {
        name: 'Yield Station',
        size: new THREE.Vector3(8, 8, 8),
        color: 0xFFD700, // Gold
        isGridBuilding: true,
        tier: 4,
        assets: {
            baseUrl: 'assets/yield_station',
            levels: {
                1: { url: 'assets/yield_station.glb' }
            }
        }
    },

    // Fixed district buildings
    CITY_HALL: {
        name: 'City Hall',
        size: new THREE.Vector3(24, 24, 24),
        color: 0xB0C4DE, // Light Steel Blue
        position: { x: 0, y: 0, z: -40 }, // Top position
        rotation: Math.PI,
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
        size: new THREE.Vector3(12, 12, 12),
        color: 0xFFB6C1, // Light Pink
        position: { x: -40, y: 0, z: 0 }, // Left position
        rotation: Math.PI / 2,
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
        size: new THREE.Vector3(12, 12, 12),
        color: 0xFFFFE0, // Light Yellow
        position: { x: 40, y: 0, z: 0 }, // Right position
        rotation: -Math.PI / 2,
        tier: 0,
        description: "Extracts valuable minerals and resources from the earth for production and upgrades.",
        assets: {
            baseUrl: 'assets/mine',
            levels: {
                1: { url: 'assets/rep_forge.glb' }
            }
        }
    },
    SHOP: {
        name: 'Shop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        position: { x: -20, y: 5, z: -35 },
        rotation: 0,
        tier: 0,
        description: "A bustling marketplace for trading goods.",
        assets: {
            baseUrl: 'assets/shop',
            levels: {
                1: { url: 'assets/shop.glb' }
            }
        }
    },
    WORKSHOP: {
        name: 'Workshop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold color
        position: { x: 20, y: 0, z: -35 },
        rotation: 0,
        tier: 0,
        description: "Repairs buildings to maintain district infrastructure.",
        assets: {
            baseUrl: 'assets/workshop',
            levels: {
                1: { url: 'assets/workshop.glb' }
            }
        }
    },
    DEFENSE_TOWER: {
        name: 'Defense Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xCD5C5C, // Indian Red
        position: { x: -50, y: 0, z: -55 },
        rotation: 0,
        tier: 0,
        description: "Protects your district from enemy attacks with formidable defensive capabilities.",
        assets: {
            baseUrl: 'assets/defense_tower',
            levels: {
                1: { url: 'assets/tower_lvl1.glb' },
                2: { url: 'assets/tower_lvl2.glb' },
                3: { url: 'assets/tower_lvl3.glb' }
            }
        }
    },
    BARRACKS: {
        name: 'Barracks',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B4513, // Saddle Brown
        position: { x: 35, y: 0, z: -35 },
        rotation: -Math.PI / 2,
        tier: 1,
        description: "Trains and organizes military forces for district defense and attacks.",
        assets: {
            baseUrl: 'assets/barracks',
            levels: {
                1: { url: 'assets/barracks_lvl1.glb' },
                2: { url: 'assets/barracks_lvl2.glb' },
                3: { url: 'assets/barr_lvl3.glb' }
            }
        }
    },
    SCOUT_GUILD: {
        name: 'Scout Guild',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4682B4, // Steel Blue
        position: { x: 15, y: 0, z: -65 },
        rotation: 0,
        tier: 1,
        description: "Specializes in reconnaissance to find PvP targets and gather intelligence.",
        assets: {
            baseUrl: 'assets/scout_guild',
            levels: {
                1: { url: 'assets/scout_guild.glb' }
            }
        }
    },
    GARRISON: {
        name: 'Garrison',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x696969, // Dim Gray
        position: { x: 35, y: 0, z: -55 },
        rotation: 0,
        tier: 1,
        description: "Provides secure quarters for defensive troops to protect the district.",
        assets: null,
    },
    OUTPOST: {
        name: 'Outpost',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B4513, // Saddle Brown
        position: { x: -15, y: 0, z: -65 },
        rotation: 0,
        tier: 0,
        description: "A forward base for scouting territory and providing early warning of threats.",
        assets: null, // Model not yet implemented
    },
    COMMAND_CENTER: {
        name: 'Command Center',
        size: new THREE.Vector3(30, 30, 30),
        color: 0xDAA520, // Goldenrod
        position: { x: 50, y: 0, z: -45 },
        rotation: 0,
        tier: 1,
        description: "Strategic headquarters for planning and executing military raids against other players.",
        assets: {
            baseUrl: 'assets/command_center',
            levels: {
                1: { url: 'assets/command_center.glb' }
            }
        }
    },
    TAVERN: {
        name: 'Tavern',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xD2691E, // Chocolate
        position: { x: -25, y: 0, z: -75 },
        rotation: 0,
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
        size: new THREE.Vector3(15, 15, 15),
        color: 0x228B22, // Forest Green
        position: { x: 25, y: 0, z: -75 },
        rotation: 0,
        tier: 2,
        description: "Embark on exciting quests and adventures to earn unique rewards and resources.",
        assets: null, // Model not yet implemented
    },
    MAGE_TOWER: {
        name: 'Mage Tower',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x9932CC, // Dark Orchid
        position: { x: -35, y: 0, z: -85 },
        rotation: 0,
        tier: 2,
        description: "A center for magical research and developing powerful spells for battle.",
        assets: null,
    },
    TACTICS_CENTER: {
        name: 'Tactics Center',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4169E1, // Royal Blue
        position: { x: 35, y: 0, z: -85 },
        rotation: 0,
        tier: 2,
        description: "Study advanced military strategies and develop tactical cards for battle advantages.",
        assets: {
            baseUrl: 'assets/tactics-center',
            levels: {
                1: { url: 'assets/tactics-center.glb' }
            }
        }
    },
    GEM_WORKSHOP: {
        name: 'Gem Workshop',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFF1493, // Deep Pink
        position: { x: -45, y: 0, z: -95 },
        rotation: 0,
        tier: 3,
        description: "Crafts precious gems for upgrades, trading, and advanced crafting recipes.",
        assets: null, // Model not yet implemented
    },
    DIAMOND_VAULT: {
        name: 'Diamond Vault',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x00CED1, // Dark Turquoise
        position: { x: 45, y: 0, z: -95 },
        rotation: 0,
        tier: 3,
        description: "Provides secure storage for your most valuable diamonds and precious resources.",
        assets: null, // Model not yet implemented
    },
    ARCANUM_OF_NAMES: {
        name: 'Arcanum of Names',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold
        position: { x: 55, y: 0, z: -75 },
        rotation: 0,
        tier: 3,
        description: "Converts REP points into dynamic on-chain yield NFTs for staking and passive income.",
        assets: {
            baseUrl: 'assets/arcanum',
            levels: {
                1: { url: 'assets/arcanum.glb' }
            }
        }
    },
    REFINERY: {
        name: 'Refinery',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x32CD32, // Lime Green
        position: { x: -55, y: 0, z: -105 },
        rotation: 0,
        tier: 3,
        description: "Processes raw materials into more valuable forms for advanced resource production.",
        assets: null // Model not yet implemented
    },
    COUNCIL_HALL: {
        name: 'Council Hall',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x8B0000, // Dark Red
        position: { x: 55, y: 0, z: -105 },
        rotation: 0,
        tier: 4,
        description: "The center of political power where district leaders meet for governance and diplomacy.",
        assets: null // Model not yet implemented
    },
    FORTRESS_WALLS: {
        name: 'Fortress Walls',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x808080, // Gray
        position: { x: -65, y: 0, z: -115 },
        rotation: 0,
        tier: 4,
        description: "Massive fortifications that provide ultimate defense against even the most determined attacks.",
        assets: null // Model not yet implemented
    },
    EMBASSY_HOME: {
        name: 'Embassy Home',
        size: new THREE.Vector3(15, 15, 15),
        color: 0x4B0082, // Indigo
        position: { x: 65, y: 0, z: -115 },
        rotation: 0,
        tier: 4,
        description: "A diplomatic center for establishing alliances and peaceful trade agreements with other cities.",
        assets: null // Model not yet implemented
    },
    TREASURY_VAULT: {
        name: 'Treasury Vault',
        size: new THREE.Vector3(15, 15, 15),
        color: 0xFFD700, // Gold
        position: { x: 0, y: 0, z: -125 },
        rotation: 0,
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
        cost: { gold: 800, diamonds: 8 }
    },
    2: {
        id: 2,
        name: "Guardian Wall",
        type: TACTIC_TYPES.SHIELD,
        effectMagnitude: 75,
        description: "Lose 75% fewer troops",
        cost: { gold: 800, diamonds: 8 }
    },
    3: {
        id: 3,
        name: "Battle Rage",
        type: TACTIC_TYPES.TRICK,
        effectMagnitude: 30,
        description: "Gain +30 REP points",
        cost: { gold: 800, diamonds: 8 }
    },
    4: {
        id: 4,
        name: "Cavalry Rush",
        type: TACTIC_TYPES.STRIKE,
        effectMagnitude: 2,
        description: "Damage +2 buildings",
        cost: { gold: 800, diamonds: 8 }
    },
    5: {
        id: 5,
        name: "Defensive Circle",
        type: TACTIC_TYPES.SHIELD,
        effectMagnitude: 50,
        description: "Lose 50% fewer troops",
        cost: { gold: 800, diamonds: 8 }
    },
    6: {
        id: 6,
        name: "Tactical Feint",
        type: TACTIC_TYPES.TRICK,
        effectMagnitude: 20,
        description: "Gain +20 REP points",
        cost: { gold: 800, diamonds: 8 }
    },
    7: {
        id: 7,
        name: "Swift Strike",
        type: TACTIC_TYPES.STRIKE,
        effectMagnitude: 1,
        description: "Damage +1 building",
        cost: { gold: 800, diamonds: 8 }
    },
    8: {
        id: 8,
        name: "Shadow Guard",
        type: TACTIC_TYPES.SHIELD,
        effectMagnitude: 25,
        description: "Lose 25% fewer troops",
        cost: { gold: 800, diamonds: 8 }
    },
    9: {
        id: 9,
        name: "Stealth Trap",
        type: TACTIC_TYPES.TRICK,
        effectMagnitude: 15,
        description: "Gain +15 REP points",
        cost: { gold: 800, diamonds: 8 }
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