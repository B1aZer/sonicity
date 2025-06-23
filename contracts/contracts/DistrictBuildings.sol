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
        GARRISON,     // New building for staking troops to defend district
        TAVERN,       // Allows to hire heroes
        ADVENTURE_CAMP, // Allows heroes to start adventure - explore map etc
        MAGE_TOWER,   // Explore relics found on the adventure
        TACTICS_CENTER, // Allows troops to learn new tactics
        GEM_WORKSHOP, // Unlocks the ability to turn stored Food into Gems via your grid building
        DIAMOND_VAULT, // Unlocks the ability to refine stored Food into Diamonds through your grid building
        ARCANUM_OF_NAMES, // Allows players to store Rep and mint a NFT that reflects their reputation
        REFINERY,     // Improves processing speed in grid buildings
        COUNCIL_HALL, // Where votes are cast and city-wide proposals begin
        FORTRESS_WALLS, // City-wide defense bonus
        EMBASSY_HOME, // Tracks active alliances, wars, and diplomatic history
        TREASURY_VAULT // Holds game revenue on behalf of the city
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
        bool disabled;       // New field to disable buildings
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
        
        // Initialize all building configurations
        _initializeBuildingConfigs();
    }

    /**
     * @dev Initialize all building configurations
     */
    function _initializeBuildingConfigs() internal {
        _initializeCoreBuildings();
        _initializeTier0Buildings();
        _initializeTier1Buildings();
        _initializeTier2Buildings();
        _initializeTier3Buildings();
        _initializeTier4Buildings();
    }

    /**
     * @dev Initialize core buildings
     */
    function _initializeCoreBuildings() internal {
        districtBuildingConfigs[DistrictBuildingType.CITY_HALL] = DistrictBuildingConfig({
            name: "City Hall",
            unlockCost: 0,
            buildCost: 0,
            upgradeCost: 0,
            maxLevel: 5,
            description: "Central hub",
            tier: 0,
            isCoreBuilding: true,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.ALTAR] = DistrictBuildingConfig({
            name: "Altar",
            unlockCost: 0,
            buildCost: 0,
            upgradeCost: 0,
            maxLevel: 5,
            description: "Stake NFTs for Gold",
            tier: 0,
            isCoreBuilding: true,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.MINE] = DistrictBuildingConfig({
            name: "Mine",
            unlockCost: 0,
            buildCost: 0,
            upgradeCost: 0,
            maxLevel: 5,
            description: "Mint game NFTs",
            tier: 0,
            isCoreBuilding: true,
            disabled: false
        });
    }

    /**
     * @dev Initialize tier 0 buildings
     */
    function _initializeTier0Buildings() internal {
        districtBuildingConfigs[DistrictBuildingType.SHOP] = DistrictBuildingConfig({
            name: "Shop",
            unlockCost: 200,
            buildCost: 100,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Buy items",
            tier: 0,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.WORKSHOP] = DistrictBuildingConfig({
            name: "Workshop",
            unlockCost: 400,
            buildCost: 150,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Repair buildings",
            tier: 0,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.OUTPOST] = DistrictBuildingConfig({
            name: "Outpost",
            unlockCost: 300,
            buildCost: 120,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Early warning system",
            tier: 0,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.DEFENSE_TOWER] = DistrictBuildingConfig({
            name: "Defense Tower",
            unlockCost: 800,
            buildCost: 200,
            upgradeCost: 300,
            maxLevel: 5,
            description: "PvP defense buffs",
            tier: 0,
            isCoreBuilding: false,
            disabled: false
        });
    }

    /**
     * @dev Initialize tier 1 buildings
     */
    function _initializeTier1Buildings() internal {
        districtBuildingConfigs[DistrictBuildingType.BARRACKS] = DistrictBuildingConfig({
            name: "Barracks",
            unlockCost: 1000,
            buildCost: 250,
            upgradeCost: 500,
            maxLevel: 3,
            description: "Train troops",
            tier: 1,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.SCOUT_GUILD] = DistrictBuildingConfig({
            name: "Scout Guild",
            unlockCost: 1500,
            buildCost: 200,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Explore PvP targets",
            tier: 1,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.COMMAND_CENTER] = DistrictBuildingConfig({
            name: "Command Center",
            unlockCost: 1750,
            buildCost: 250,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Deploy troops for raids",
            tier: 1,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.GARRISON] = DistrictBuildingConfig({
            name: "Garrison",
            unlockCost: 2000,
            buildCost: 300,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Stake troops to defend",
            tier: 1,
            isCoreBuilding: false,
            disabled: true
        });
    }

    /**
     * @dev Initialize tier 2 buildings
     */
    function _initializeTier2Buildings() internal {
        districtBuildingConfigs[DistrictBuildingType.TAVERN] = DistrictBuildingConfig({
            name: "Tavern",
            unlockCost: 3000,
            buildCost: 200,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Hire heroes",
            tier: 2,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.ADVENTURE_CAMP] = DistrictBuildingConfig({
            name: "Adventure Camp",
            unlockCost: 3500,
            buildCost: 300,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Start adventures",
            tier: 2,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.MAGE_TOWER] = DistrictBuildingConfig({
            name: "Mage Tower",
            unlockCost: 4000,
            buildCost: 250,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Explore relics",
            tier: 2,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.TACTICS_CENTER] = DistrictBuildingConfig({
            name: "Tactics Center",
            unlockCost: 4500,
            buildCost: 300,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Learn new tactics",
            tier: 2,
            isCoreBuilding: false,
            disabled: true
        });
    }

    /**
     * @dev Initialize tier 3 buildings
     */
    function _initializeTier3Buildings() internal {
        districtBuildingConfigs[DistrictBuildingType.GEM_WORKSHOP] = DistrictBuildingConfig({
            name: "Gem Workshop",
            unlockCost: 5000,
            buildCost: 400,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Food to Gems",
            tier: 3,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.DIAMOND_VAULT] = DistrictBuildingConfig({
            name: "Diamond Vault",
            unlockCost: 6000,
            buildCost: 350,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Gold to Diamonds",
            tier: 3,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.ARCANUM_OF_NAMES] = DistrictBuildingConfig({
            name: "Arcanum of Names",
            unlockCost: 7000,
            buildCost: 450,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Store Rep as NFT",
            tier: 3,
            isCoreBuilding: false,
            disabled: false
        });

        districtBuildingConfigs[DistrictBuildingType.REFINERY] = DistrictBuildingConfig({
            name: "Refinery",
            unlockCost: 8000,
            buildCost: 500,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Improve processing speed",
            tier: 3,
            isCoreBuilding: false,
            disabled: true
        });
    }

    /**
     * @dev Initialize tier 4 buildings
     */
    function _initializeTier4Buildings() internal {
        districtBuildingConfigs[DistrictBuildingType.COUNCIL_HALL] = DistrictBuildingConfig({
            name: "Council Hall",
            unlockCost: 10000,
            buildCost: 500,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Vote and proposals",
            tier: 4,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.FORTRESS_WALLS] = DistrictBuildingConfig({
            name: "Fortress Walls",
            unlockCost: 12000,
            buildCost: 500,
            upgradeCost: 0,
            maxLevel: 1,
            description: "City defense bonus",
            tier: 4,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.EMBASSY_HOME] = DistrictBuildingConfig({
            name: "Embassy Home",
            unlockCost: 15000,
            buildCost: 500,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Track alliances/wars",
            tier: 4,
            isCoreBuilding: false,
            disabled: true
        });

        districtBuildingConfigs[DistrictBuildingType.TREASURY_VAULT] = DistrictBuildingConfig({
            name: "Treasury Vault",
            unlockCost: 20000,
            buildCost: 1000,
            upgradeCost: 0,
            maxLevel: 1,
            description: "Hold city revenue",
            tier: 4,
            isCoreBuilding: false,
            disabled: true
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
        return uint8(DistrictBuildingType.TREASURY_VAULT) + 1;
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
        require(!config.disabled, "Building is currently disabled");

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
        string[] memory names = new string[](23);
        names[0] = "CITY_HALL";
        names[1] = "ALTAR";
        names[2] = "MINE";
        names[3] = "SHOP";
        names[4] = "WORKSHOP";
        names[5] = "OUTPOST";
        names[6] = "DEFENSE_TOWER";
        names[7] = "BARRACKS";
        names[8] = "SCOUT_GUILD";
        names[9] = "COMMAND_CENTER";
        names[10] = "GARRISON";
        names[11] = "TAVERN";
        names[12] = "ADVENTURE_CAMP";
        names[13] = "MAGE_TOWER";
        names[14] = "TACTICS_CENTER";
        names[15] = "GEM_WORKSHOP";
        names[16] = "DIAMOND_VAULT";
        names[17] = "ARCANUM_OF_NAMES";
        names[18] = "REFINERY";
        names[19] = "COUNCIL_HALL";
        names[20] = "FORTRESS_WALLS";
        names[21] = "EMBASSY_HOME";
        names[22] = "TREASURY_VAULT";
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

        // Mark core buildings as unlocked
        unlockedDistrictBuildings[player][DistrictBuildingType.CITY_HALL] = true;
        unlockedDistrictBuildings[player][DistrictBuildingType.ALTAR] = true;
        unlockedDistrictBuildings[player][DistrictBuildingType.MINE] = true;
    }
} 