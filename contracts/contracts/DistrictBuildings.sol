// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title DistrictBuildings
 * @dev Contract for managing district buildings and their configurations
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract DistrictBuildings is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to the GameState contract
    address public gameStateAddress;
    // Reference to the BattleSystem contract
    address public battleSystemAddress;

    // District Building Types
    enum DistrictBuildingType {
        CITY_HALL,    // Core building
        ALTAR,        // Core building
        MINE,         // Core building
        SHOP,
        WORKSHOP,
        OUTPOST,
        DEFENSE_TOWER,
        BARRACKS,
        SCOUT_GUILD,
        COMMAND_CENTER,
        REP_STATION,
        COUNCIL_CHAMBER,
        AUDIT_SHRINE,
        FOUNDERS_HALL,
        MINISTRY_OF_MERIT,
        ARCANE_TOWER,
        FORTRESS_WALLS,
        BANK
    }

    // District Building configuration
    struct DistrictBuildingConfig {
        string name;
        uint256 unlockCost;   // Treasury required to unlock
        uint256 buildCost;    // Gold cost to build
        uint256 upgradeCost;  // Gold cost to upgrade
        uint8 maxLevel;       // Maximum level for the building
        string description;
        uint8 tier;          // Added tier to the config
        bool isCoreBuilding; // New field to identify core buildings
    }

    // Building state
    struct Building {
        uint8 level;
        bool active;
        bool damaged;  // New flag to track damage state
    }

    // Mappings for district buildings
    mapping(address => mapping(DistrictBuildingType => Building)) public buildings;  // Tracks building state and level
    mapping(address => mapping(DistrictBuildingType => bool)) public unlockedDistrictBuildings; // Tracks which are unlocked
    mapping(DistrictBuildingType => DistrictBuildingConfig) public districtBuildingConfigs;
    mapping(address => mapping(DistrictBuildingType => bool)) public activeDistrictBuildings; // Tracks which buildings are active

    // Events
    event DistrictBuildingUnlocked(address indexed player, DistrictBuildingType buildingType);
    event DistrictBuildingBuilt(address indexed player, DistrictBuildingType buildingType);
    event DistrictBuildingUpgraded(address indexed player, DistrictBuildingType buildingType, uint256 newLevel);
    event DistrictBuildingDamaged(address indexed player, DistrictBuildingType buildingType);
    event DistrictBuildingRepaired(address indexed player, DistrictBuildingType buildingType);
    event GameStateAddressUpdated(address indexed newAddress);
    event BattleSystemAddressUpdated(address indexed newAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize core buildings (always available, but can be upgraded)
        districtBuildingConfigs[DistrictBuildingType.CITY_HALL] = DistrictBuildingConfig({
            name: "City Hall",
            unlockCost: 0,           // No unlock cost for core buildings
            buildCost: 0,            // No build cost for core buildings
            upgradeCost: 0,       // Cost to upgrade
            maxLevel: 5,             // Can be upgraded to level 5
            description: "Central hub for city management",
            tier: 0,
            isCoreBuilding: true
        });

        districtBuildingConfigs[DistrictBuildingType.ALTAR] = DistrictBuildingConfig({
            name: "Altar",
            unlockCost: 0,
            buildCost: 0,
            upgradeCost: 0,
            maxLevel: 5,
            description: "Stake NFTs to generate base Gold",
            tier: 0,
            isCoreBuilding: true
        });

        districtBuildingConfigs[DistrictBuildingType.MINE] = DistrictBuildingConfig({
            name: "Mine",
            unlockCost: 0,
            buildCost: 0,
            upgradeCost: 0,
            maxLevel: 5,
            description: "Mint game NFTs",
            tier: 0,
            isCoreBuilding: true
        });

        // Initialize district building configurations
        // Tier 0 Buildings
        districtBuildingConfigs[DistrictBuildingType.SHOP] = DistrictBuildingConfig({
            name: "Shop",
            unlockCost: 200,
            buildCost: 100,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Buy items (REP-gated premium later)",
            tier: 0,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.WORKSHOP] = DistrictBuildingConfig({
            name: "Workshop",
            unlockCost: 400,
            buildCost: 150,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Repair buildings",
            tier: 0,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.OUTPOST] = DistrictBuildingConfig({
            name: "Outpost",
            unlockCost: 300,
            buildCost: 120,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Early warning system for potential attacks",
            tier: 0,
            isCoreBuilding: false
        });

        // Tier 1 Buildings
        districtBuildingConfigs[DistrictBuildingType.DEFENSE_TOWER] = DistrictBuildingConfig({
            name: "Defense Tower",
            unlockCost: 1000,
            buildCost: 200,
            upgradeCost: 300,  // 300 gold per level
            maxLevel: 5,       // Can be upgraded to level 5
            description: "PvP defense buffs",
            tier: 1,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.BARRACKS] = DistrictBuildingConfig({
            name: "Barracks",
            unlockCost: 1250,
            buildCost: 250,
            upgradeCost: 500,    // 500 gold per level
            maxLevel: 3,         // Can be upgraded to level 3
            description: "Train troops",
            tier: 1,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.SCOUT_GUILD] = DistrictBuildingConfig({
            name: "Scout Guild",
            unlockCost: 1500,
            buildCost: 200,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Explore PvP targets",
            tier: 1,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.COMMAND_CENTER] = DistrictBuildingConfig({
            name: "Command Center",
            unlockCost: 1750,
            buildCost: 250,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Deploy troops for raids",
            tier: 1,
            isCoreBuilding: false
        });

        // Tier 2 Buildings
        // TODO: This is a grid building
        districtBuildingConfigs[DistrictBuildingType.REP_STATION] = DistrictBuildingConfig({
            name: "Rep Station",
            unlockCost: 3000,
            buildCost: 200,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Stake REP to earn revenue",
            tier: 2,
            isCoreBuilding: false
        });

        // TODO: This is engine?
        districtBuildingConfigs[DistrictBuildingType.COUNCIL_CHAMBER] = DistrictBuildingConfig({
            name: "Council Chamber",
            unlockCost: 3500,
            buildCost: 300,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Unlocks REP claim button",
            tier: 2,
            isCoreBuilding: false
        });

        // TODO: We need a building to create/burn REP with dynimic image

        districtBuildingConfigs[DistrictBuildingType.AUDIT_SHRINE] = DistrictBuildingConfig({
            name: "Audit Shrine",
            unlockCost: 4000,
            buildCost: 250,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Displays REP leaderboard and stats",
            tier: 2,
            isCoreBuilding: false
        });

        // Tier 3 Buildings
        districtBuildingConfigs[DistrictBuildingType.FOUNDERS_HALL] = DistrictBuildingConfig({
            name: "Founders' Hall",
            unlockCost: 5000,
            buildCost: 400,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Form or join a City",
            tier: 3,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.MINISTRY_OF_MERIT] = DistrictBuildingConfig({
            name: "Ministry of Merit",
            unlockCost: 6000,
            buildCost: 350,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Mints and tracks REP from raids/donations",
            tier: 3,
            isCoreBuilding: false
        });

        // Tier 4 Buildings
        districtBuildingConfigs[DistrictBuildingType.ARCANE_TOWER] = DistrictBuildingConfig({
            name: "Arcane Tower",
            unlockCost: 10000,
            buildCost: 500,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "PvP/cooldown buffs",
            tier: 4,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.FORTRESS_WALLS] = DistrictBuildingConfig({
            name: "Fortress Walls",
            unlockCost: 12000,
            buildCost: 500,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "City-wide defense bonus",
            tier: 4,
            isCoreBuilding: false
        });

        districtBuildingConfigs[DistrictBuildingType.BANK] = DistrictBuildingConfig({
            name: "Bank",
            unlockCost: 15000,
            buildCost: 600,
            upgradeCost: 0,    // Cannot be upgraded
            maxLevel: 1,       // Only level 1
            description: "Lending or staking Gold for towns",
            tier: 4,
            isCoreBuilding: false
        });
    }

    // Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Set the GameState contract address
     * @param _gameStateAddress The address of the GameState contract
     */
    function setGameStateAddress(address _gameStateAddress) external onlyOwner {
        gameStateAddress = _gameStateAddress;
        emit GameStateAddressUpdated(_gameStateAddress);
    }

    /**
     * @dev Set the BattleSystem contract address
     * @param _battleSystemAddress The address of the BattleSystem contract
     */
    function setBattleSystemAddress(address _battleSystemAddress) external onlyOwner {
        battleSystemAddress = _battleSystemAddress;
        emit BattleSystemAddressUpdated(_battleSystemAddress);
    }

    /**
     * @dev Get the number of district building types
     * @return uint8 The number of building types
     */
    function getDistrictBuildingTypeCount() public pure returns (uint8) {
        return uint8(DistrictBuildingType.BANK) + 1;
    }

    /**
     * @dev Check and unlock district buildings based on treasury
     * @param player The address of the player
     * @param treasury The player's treasury amount
     */
    function checkAndUnlockDistrictBuildings(address player, uint256 treasury) external {
        require(msg.sender == gameStateAddress, "Only GameState can call this function");
        
        // Check each building's unlock cost
        uint8 totalBuildings = getDistrictBuildingTypeCount();
        for (uint8 i = 0; i < totalBuildings; i++) {
            DistrictBuildingType buildingType = DistrictBuildingType(i);
            DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
            if (treasury >= config.unlockCost && !unlockedDistrictBuildings[player][buildingType]) {
                unlockedDistrictBuildings[player][buildingType] = true;
                emit DistrictBuildingUnlocked(player, buildingType);
            }
        }
    }

    /**
     * @dev Check if a district building is unlocked for a player
     * @param player The address of the player
     * @param buildingType The type of the building
     * @return bool Whether the building is unlocked
     */
    function isDistrictBuildingUnlocked(address player, DistrictBuildingType buildingType) public view returns (bool) {
        return unlockedDistrictBuildings[player][buildingType];
    }

    /**
     * @dev Check if a district building is built for a player
     * @param player The address of the player
     * @param buildingType The type of the building
     * @return bool Whether the building is built
     */
    function isDistrictBuildingBuilt(address player, DistrictBuildingType buildingType) public view returns (bool) {
        return buildings[player][buildingType].active;
    }

    /**
     * @dev Build a district building
     * @param buildingType The type of building to build
     */
    function buildDistrictBuilding(DistrictBuildingType buildingType) external nonReentrant {
        // If building is already active, revert
        if (buildings[msg.sender][buildingType].active) {
            revert("Building already built");
        }
        require(unlockedDistrictBuildings[msg.sender][buildingType], "Building not unlocked");
        DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
        require(config.buildCost > 0, "Invalid building");

        // Call GameState to check and deduct gold
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductGoldForDistrictBuilding(address,uint256)", msg.sender, config.buildCost)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct gold");
        }

        // Mark as built and set initial level to 1, and set active to true (even if previously damaged)
        buildings[msg.sender][buildingType] = Building({
            level: 1,
            active: true,
            damaged: false
        });

        emit DistrictBuildingBuilt(msg.sender, buildingType);
    }

    /**
     * @dev Upgrade a district building
     * @param buildingType The type of building to upgrade
     */
    function upgradeDistrictBuilding(DistrictBuildingType buildingType) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingType];
        require(building.active, "Building not built");
        
        DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
        require(building.level < config.maxLevel, "Building at max level");
        require(config.upgradeCost > 0, "Building cannot be upgraded");
        
        // Calculate upgrade cost (base cost * current level)
        uint256 upgradeCost = config.upgradeCost * building.level;
        
        // Call GameState to check and deduct gold
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductGoldForDistrictBuilding(address,uint256)", msg.sender, upgradeCost)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct gold");
        }
        
        // Upgrade building
        building.level++;
        
        emit DistrictBuildingUpgraded(msg.sender, buildingType, uint256(building.level));
    }

    /**
     * @dev Damage district buildings for a player
     * @param player The address of the player
     * @param amount Number of buildings to damage
     * @return uint256 Number of buildings actually damaged
     */
    function damageBuildings(address player, uint256 amount) external returns (uint256) {
        require(msg.sender == battleSystemAddress, "Only BattleSystem can call this function");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 buildingsDamaged = 0;
        uint8 totalBuildings = getDistrictBuildingTypeCount();

        // Start from highest tier and work down, skip tier 0
        for (uint8 tier = 4; tier > 0; tier--) {
            for (uint8 i = 0; i < totalBuildings; i++) {
                DistrictBuildingType buildingType = DistrictBuildingType(i);
                DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
                if (config.tier != tier) continue;
                
                // Only damage if built, active, and not already damaged
                if (buildings[player][buildingType].active && !buildings[player][buildingType].damaged) {
                    buildings[player][buildingType].damaged = true;
                    emit DistrictBuildingDamaged(player, buildingType);
                    buildingsDamaged++;
                    if (buildingsDamaged >= amount) {
                        return buildingsDamaged;
                    }
                }
            }
        }

        return buildingsDamaged;
    }

    /**
     * @dev Repair a damaged building
     * @param buildingType The type of building to repair
     */
    function repairBuilding(DistrictBuildingType buildingType) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingType];
        require(building.active, "Building not built");
        require(building.damaged, "Building not damaged");
        require(buildings[msg.sender][DistrictBuildingType.WORKSHOP].active, "Workshop required to repair");

        // Calculate repair cost (half of build cost)
        DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
        uint256 repairCost = config.buildCost / 2; // Half the build cost
        
        // Call GameState to check and deduct gold
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductGoldForDistrictBuilding(address,uint256)", msg.sender, repairCost)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct gold");
        }

        // Repair building
        building.damaged = false;
        
        emit DistrictBuildingRepaired(msg.sender, buildingType);
    }

    /**
     * @dev Check if a building is damaged
     * @param player The address of the player
     * @param buildingType The type of the building
     * @return bool Whether the building is damaged
     */
    function isBuildingDamaged(address player, DistrictBuildingType buildingType) public view returns (bool) {
        return buildings[player][buildingType].damaged;
    }

    /**
     * @dev Check if a district building is active for a player
     * @param player The address of the player
     * @param buildingType The type of the building
     * @return bool Whether the building is active (built and not damaged)
     */
    function isDistrictBuildingActive(address player, DistrictBuildingType buildingType) public view returns (bool) {
        Building memory building = buildings[player][buildingType];
        return building.active;
    }

    /**
     * @dev Get all district building configurations
     * @return DistrictBuildingType[] Array of building types
     * @return DistrictBuildingConfig[] Array of building configurations
     */
    function getAllDistrictBuildingConfigs() external view returns (DistrictBuildingType[] memory, DistrictBuildingConfig[] memory) {
        uint8 totalBuildings = getDistrictBuildingTypeCount();
        DistrictBuildingType[] memory buildingTypes = new DistrictBuildingType[](totalBuildings);
        DistrictBuildingConfig[] memory configs = new DistrictBuildingConfig[](totalBuildings);
        
        for (uint8 i = 0; i < totalBuildings; i++) {
            buildingTypes[i] = DistrictBuildingType(i);
            configs[i] = districtBuildingConfigs[DistrictBuildingType(i)];
        }

        return (buildingTypes, configs);
    }

    /**
     * @dev Get district buildings by tier
     * @param tier The tier to get buildings for
     * @return DistrictBuildingType[] Array of building types
     * @return DistrictBuildingConfig[] Array of building configurations
     */
    function getDistrictBuildingsByTier(uint8 tier) external view returns (DistrictBuildingType[] memory, DistrictBuildingConfig[] memory) {
        uint8 totalBuildings = getDistrictBuildingTypeCount();
        uint8 count = 0;
        
        // First count how many buildings are in this tier
        for (uint8 i = 0; i < totalBuildings; i++) {
            if (districtBuildingConfigs[DistrictBuildingType(i)].tier == tier) {
                count++;
            }
        }
        
        // Then create arrays of the right size
        DistrictBuildingType[] memory buildingTypes = new DistrictBuildingType[](count);
        DistrictBuildingConfig[] memory configs = new DistrictBuildingConfig[](count);
        
        // Fill the arrays
        uint8 index = 0;
        for (uint8 i = 0; i < totalBuildings; i++) {
            DistrictBuildingType buildingType = DistrictBuildingType(i);
            if (districtBuildingConfigs[buildingType].tier == tier) {
                buildingTypes[index] = buildingType;
                configs[index] = districtBuildingConfigs[buildingType];
                index++;
            }
        }
        
        return (buildingTypes, configs);
    }

    /**
     * @dev Get all district building names
     * @return string[] Array of building names in the same order as the enum
     */
    function getBuildingNames() public pure returns (string[] memory) {
        string[] memory names = new string[](16);
        names[0] = "SHOP";
        names[1] = "WORKSHOP";
        names[2] = "OUTPOST";
        names[3] = "DEFENSE_TOWER";
        names[4] = "BARRACKS";
        names[5] = "SCOUT_GUILD";
        names[6] = "COMMAND_CENTER";
        names[7] = "REP_STATION";
        names[8] = "COUNCIL_CHAMBER";
        names[9] = "AUDIT_SHRINE";
        names[10] = "FOUNDERS_HALL";
        names[11] = "MINISTRY_OF_MERIT";
        names[12] = "ARCANE_TOWER";
        names[13] = "FORTRESS_WALLS";
        names[14] = "BANK";
        names[15] = "ALTAR";
        return names;
    }

    function getBuiltDistrictBuildings(address player) external view returns (uint8[] memory) {
        uint8 totalBuildings = getDistrictBuildingTypeCount();
        uint8[] memory built = new uint8[](totalBuildings);
        uint8 count = 0;
        for (uint8 i = 0; i < totalBuildings; i++) {
            if (buildings[player][DistrictBuildingType(i)].active) {
                built[count] = i;
                count++;
            }
        }
        // Resize array to actual count
        uint8[] memory result = new uint8[](count);
        for (uint8 j = 0; j < count; j++) {
            result[j] = built[j];
        }
        return result;
    }

    /**
     * @dev Get defense tower power for a player
     * @param player The address of the player
     * @return uint256 The defense power (base power * level)
     */
    function getDefenseTowerPower(address player) external view returns (uint256) {
        Building memory defenseTower = buildings[player][DistrictBuildingType.DEFENSE_TOWER];
        if (!defenseTower.active) return 0;
        
        // Base power of 100 per level
        return defenseTower.level * 100;
    }

    /**
     * @dev Get building level for a player
     * @param player The address of the player
     * @param buildingType The type of the building
     * @return uint8 The building level
     */
    function getBuildingLevel(address player, DistrictBuildingType buildingType) public view returns (uint8) {
        return uint8(buildings[player][buildingType].level);
    }

    /**
     * @dev Check if a troop type can be trained based on barracks level
     * @param player The address of the player
     * @param troopType The type of troop to check
     * @return bool Whether the troop can be trained
     */
    function canTrainTroopType(address player, uint8 troopType) external view returns (bool) {
        Building memory barracks = buildings[player][DistrictBuildingType.BARRACKS];
        if (!barracks.active) return false;
        
        // Level 1: INFANTRY (0)
        // Level 2: INFANTRY (0) + CAVALRY (1)
        // Level 3: INFANTRY (0) + CAVALRY (1) + SIEGE (2)
        return barracks.level > troopType;
    }

    /**
     * @dev Initialize core buildings for a new player
     * @param player The address of the player
     */
    function initializeCoreBuildings(address player) external {
        require(msg.sender == gameStateAddress, "Only GameState can initialize core buildings");
        
        // Initialize core buildings at level 1
        buildings[player][DistrictBuildingType.CITY_HALL] = Building({
            level: 1,
            active: true,
            damaged: false
        });
        
        buildings[player][DistrictBuildingType.ALTAR] = Building({
            level: 1,
            active: true,
            damaged: false
        });
        
        buildings[player][DistrictBuildingType.MINE] = Building({
            level: 1,
            active: true,
            damaged: false
        });
    }
} 