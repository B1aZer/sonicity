export const DISTRICT_BUILDINGS = {
    // Tier 0 Buildings
    WORKSHOP: {
        name: "workshop",
        displayName: "Workshop",
        description: "Repair buildings (e.g., Houses after 24h)",
        unlockCost: 200,
        buildCost: 100,
        tier: 0,
        emoji: "🧰"
    },
    SHOP: {
        name: "shop",
        displayName: "Shop",
        description: "Sells items (e.g., emergency Gold aid)",
        unlockCost: 400,
        buildCost: 150,
        tier: 0,
        emoji: "🛍"
    },

    // Tier 1 Buildings
    DEFENSE_TOWER: {
        name: "defense_tower",
        displayName: "Defense Tower",
        description: "Passive defense against raids",
        unlockCost: 1000,
        buildCost: 200,
        tier: 1,
        emoji: "🧱"
    },
    BARRACKS: {
        name: "barracks",
        displayName: "Barracks",
        description: "Train Troops using Food",
        unlockCost: 1250,
        buildCost: 250,
        tier: 1,
        emoji: "🪖"
    },
    SCOUT_GUILD: {
        name: "scout_guild",
        displayName: "Scout Guild",
        description: "Finds new cities to raid",
        unlockCost: 1500,
        buildCost: 200,
        tier: 1,
        emoji: "🕵️"
    },
    CARAVAN: {
        name: "caravan",
        displayName: "Caravan",
        description: "Sends troops for raids",
        unlockCost: 1750,
        buildCost: 250,
        tier: 1,
        emoji: "🐪"
    },

    // Tier 2 Buildings
    REP_STATION: {
        name: "rep_station",
        displayName: "Rep Station",
        description: "Stake REP → Claim $S rewards",
        unlockCost: 3000,
        buildCost: 200,
        tier: 2,
        emoji: "📜"
    },
    COUNCIL_CHAMBER: {
        name: "council_chamber",
        displayName: "Council Chamber",
        description: "Enables REP staking → players claim $S revenue",
        unlockCost: 3500,
        buildCost: 300,
        tier: 2,
        emoji: "🏛"
    },
    AUDIT_SHRINE: {
        name: "audit_shrine",
        displayName: "Audit Shrine",
        description: "Shows REP leaderboard, city-wide stats",
        unlockCost: 4000,
        buildCost: 250,
        tier: 2,
        emoji: "📊"
    },

    // Tier 3 Buildings
    FOUNDERS_HALL: {
        name: "founders_hall",
        displayName: "Founders' Hall",
        description: "Form or join a City",
        unlockCost: 5000,
        buildCost: 400,
        tier: 3,
        emoji: "🏛"
    },
    MINISTRY_OF_MERIT: {
        name: "ministry_of_merit",
        displayName: "Ministry of Merit",
        description: "Mints and tracks REP from raids/donations",
        unlockCost: 6000,
        buildCost: 350,
        tier: 3,
        emoji: "🪪"
    },

    // Tier 4 Buildings
    ARCANE_TOWER: {
        name: "arcane_tower",
        displayName: "Arcane Tower",
        description: "PvP/cooldown buffs",
        unlockCost: 10000,
        buildCost: 500,
        tier: 4,
        emoji: "🏰"
    },
    FORTRESS_WALLS: {
        name: "fortress_walls",
        displayName: "Fortress Walls",
        description: "City-wide defense bonus",
        unlockCost: 12000,
        buildCost: 500,
        tier: 4,
        emoji: "🏰"
    },
    BANK: {
        name: "bank",
        displayName: "Bank",
        description: "Lending or staking Gold for towns",
        unlockCost: 15000,
        buildCost: 600,
        tier: 4,
        emoji: "🏦"
    },
    ALTAR: {
        name: "altar",
        displayName: "Altar",
        description: "Whitelist external NFT collections",
        unlockCost: 20000,
        buildCost: 300,
        tier: 4,
        emoji: "⛪"
    }
};

// Helper functions
export const getBuildingsByTier = (tier) => {
    return Object.values(DISTRICT_BUILDINGS).filter(building => building.tier === tier);
};

export const getBuildingByName = (name) => {
    return DISTRICT_BUILDINGS[name.toUpperCase()] || null;
};

export const getAllBuildings = () => {
    return Object.values(DISTRICT_BUILDINGS);
};

// For contract initialization
export const getBuildingConfigsForContract = () => {
    return Object.values(DISTRICT_BUILDINGS).map(building => ({
        name: building.name,
        unlockCost: building.unlockCost,
        buildCost: building.buildCost,
        description: building.description
    }));
}; 