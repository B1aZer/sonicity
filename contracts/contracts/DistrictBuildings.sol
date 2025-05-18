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

    // District Building Types
    enum DistrictBuildingType {
        SHOP,
        WORKSHOP,
        DEFENSE_TOWER,
        BARRACKS,
        SCOUT_GUILD,
        CARAVAN,
        REP_STATION,
        COUNCIL_CHAMBER,
        AUDIT_SHRINE,
        FOUNDERS_HALL,
        MINISTRY_OF_MERIT,
        ARCANE_TOWER,
        FORTRESS_WALLS,
        BANK,
        ALTAR
    }

    // District Building configuration
    struct DistrictBuildingConfig {
        string name;
        uint256 unlockCost;   // Treasury required to unlock
        uint256 buildCost;    // Gold cost to build
        string description;
        uint8 tier;          // Added tier to the config
    }

    // Mappings for district buildings
    mapping(address => mapping(DistrictBuildingType => bool)) public builtDistrictBuildings;  // Tracks which district buildings are built
    mapping(address => mapping(DistrictBuildingType => bool)) public unlockedDistrictBuildings; // Tracks which are unlocked
    mapping(address => mapping(DistrictBuildingType => bool)) public activeDistrictBuildings; // Tracks which buildings are active
    mapping(DistrictBuildingType => DistrictBuildingConfig) public districtBuildingConfigs;

    // Events
    event DistrictBuildingUnlocked(address indexed player, DistrictBuildingType buildingType);
    event DistrictBuildingBuilt(address indexed player, DistrictBuildingType buildingType);
    event DistrictBuildingDamaged(address indexed player, DistrictBuildingType buildingType);
    event DistrictBuildingRepaired(address indexed player, DistrictBuildingType buildingType);
    event GameStateAddressUpdated(address indexed newAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize district building configurations
        // Tier 0 Buildings
        districtBuildingConfigs[DistrictBuildingType.SHOP] = DistrictBuildingConfig({
            name: "Shop",
            unlockCost: 200,
            buildCost: 100,
            description: "Buy items (REP-gated premium later)",
            tier: 0
        });

        districtBuildingConfigs[DistrictBuildingType.WORKSHOP] = DistrictBuildingConfig({
            name: "Workshop",
            unlockCost: 400,
            buildCost: 150,
            description: "Repair buildings",
            tier: 0
        });

        // Tier 1 Buildings
        districtBuildingConfigs[DistrictBuildingType.DEFENSE_TOWER] = DistrictBuildingConfig({
            name: "Defense Tower",
            unlockCost: 1000,
            buildCost: 200,
            description: "PvP defense buffs",
            tier: 1
        });

        districtBuildingConfigs[DistrictBuildingType.BARRACKS] = DistrictBuildingConfig({
            name: "Barracks",
            unlockCost: 1250,
            buildCost: 250,
            description: "Train troops (requires food)",
            tier: 1
        });

        districtBuildingConfigs[DistrictBuildingType.SCOUT_GUILD] = DistrictBuildingConfig({
            name: "Scout Guild",
            unlockCost: 1500,
            buildCost: 200,
            description: "Explore PvP targets",
            tier: 1
        });

        districtBuildingConfigs[DistrictBuildingType.CARAVAN] = DistrictBuildingConfig({
            name: "Caravan",
            unlockCost: 1750,
            buildCost: 250,
            description: "Deploy troops for raids",
            tier: 1
        });

        // Tier 2 Buildings
        districtBuildingConfigs[DistrictBuildingType.REP_STATION] = DistrictBuildingConfig({
            name: "Rep Station",
            unlockCost: 3000,
            buildCost: 200,
            description: "Stake REP to earn revenue",
            tier: 2
        });

        districtBuildingConfigs[DistrictBuildingType.COUNCIL_CHAMBER] = DistrictBuildingConfig({
            name: "Council Chamber",
            unlockCost: 3500,
            buildCost: 300,
            description: "Unlocks REP claim button",
            tier: 2
        });

        districtBuildingConfigs[DistrictBuildingType.AUDIT_SHRINE] = DistrictBuildingConfig({
            name: "Audit Shrine",
            unlockCost: 4000,
            buildCost: 250,
            description: "Displays REP leaderboard and stats",
            tier: 2
        });

        // Tier 3 Buildings
        districtBuildingConfigs[DistrictBuildingType.FOUNDERS_HALL] = DistrictBuildingConfig({
            name: "Founders' Hall",
            unlockCost: 5000,
            buildCost: 400,
            description: "Form or join a City",
            tier: 3
        });

        districtBuildingConfigs[DistrictBuildingType.MINISTRY_OF_MERIT] = DistrictBuildingConfig({
            name: "Ministry of Merit",
            unlockCost: 6000,
            buildCost: 350,
            description: "Mints and tracks REP from raids/donations",
            tier: 3
        });

        // Tier 4 Buildings
        districtBuildingConfigs[DistrictBuildingType.ARCANE_TOWER] = DistrictBuildingConfig({
            name: "Arcane Tower",
            unlockCost: 10000,
            buildCost: 500,
            description: "PvP/cooldown buffs",
            tier: 4
        });

        districtBuildingConfigs[DistrictBuildingType.FORTRESS_WALLS] = DistrictBuildingConfig({
            name: "Fortress Walls",
            unlockCost: 12000,
            buildCost: 500,
            description: "City-wide defense bonus",
            tier: 4
        });

        districtBuildingConfigs[DistrictBuildingType.BANK] = DistrictBuildingConfig({
            name: "Bank",
            unlockCost: 15000,
            buildCost: 600,
            description: "Lending or staking Gold for towns",
            tier: 4
        });

        districtBuildingConfigs[DistrictBuildingType.ALTAR] = DistrictBuildingConfig({
            name: "Altar",
            unlockCost: 20000,
            buildCost: 300,
            description: "Whitelist external NFT collections",
            tier: 4
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
     * @dev Check and unlock district buildings based on treasury
     * @param player The address of the player
     * @param treasury The player's treasury amount
     */
    function checkAndUnlockDistrictBuildings(address player, uint256 treasury) external {
        require(msg.sender == gameStateAddress, "Only GameState can call this function");
        
        // Check each building's unlock cost
        for (uint8 i = 0; i < uint8(DistrictBuildingType.ALTAR) + 1; i++) {
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
        return builtDistrictBuildings[player][buildingType];
    }

    /**
     * @dev Build a district building
     * @param buildingType The type of building to build
     */
    function buildDistrictBuilding(DistrictBuildingType buildingType) external nonReentrant {
        require(!builtDistrictBuildings[msg.sender][buildingType], "Building already built");
        require(unlockedDistrictBuildings[msg.sender][buildingType], "Building not unlocked");
        
        DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
        require(config.buildCost > 0, "Invalid building");
        
        // Call GameState to check and deduct gold
        (bool success, ) = gameStateAddress.call(
            abi.encodeWithSignature("deductGoldForDistrictBuilding(address,uint256)", msg.sender, config.buildCost)
        );
        require(success, "Failed to deduct gold");
        
        // Mark as built and active
        builtDistrictBuildings[msg.sender][buildingType] = true;
        activeDistrictBuildings[msg.sender][buildingType] = true;
        
        emit DistrictBuildingBuilt(msg.sender, buildingType);
    }

    /**
     * @dev Damage a district building (can only be called by GameState)
     * @param player The address of the player whose building is being damaged
     * @param buildingType The type of building being damaged
     */
    function damageDistrictBuilding(address player, DistrictBuildingType buildingType) external {
        require(msg.sender == gameStateAddress, "Only GameState can call this function");
        require(builtDistrictBuildings[player][buildingType], "Building not built");
        require(activeDistrictBuildings[player][buildingType], "Building already damaged");
        
        activeDistrictBuildings[player][buildingType] = false;
        emit DistrictBuildingDamaged(player, buildingType);
    }

    /**
     * @dev Repair a damaged district building
     * @param buildingType The type of building to repair
     */
    function repairDistrictBuilding(DistrictBuildingType buildingType) external nonReentrant {
        require(builtDistrictBuildings[msg.sender][buildingType], "Building not built");
        require(!activeDistrictBuildings[msg.sender][buildingType], "Building not damaged");
        
        DistrictBuildingConfig memory config = districtBuildingConfigs[buildingType];
        uint256 repairCost = config.buildCost / 2; // Repair costs half of build cost
        
        // Call GameState to check and deduct gold
        (bool success, ) = gameStateAddress.call(
            abi.encodeWithSignature("deductGoldForDistrictBuilding(address,uint256)", msg.sender, repairCost)
        );
        require(success, "Failed to deduct gold");
        
        activeDistrictBuildings[msg.sender][buildingType] = true;
        emit DistrictBuildingRepaired(msg.sender, buildingType);
    }

    /**
     * @dev Check if a district building is active for a player
     * @param player The address of the player
     * @param buildingType The type of the building
     * @return bool Whether the building is active
     */
    function isDistrictBuildingActive(address player, DistrictBuildingType buildingType) public view returns (bool) {
        return activeDistrictBuildings[player][buildingType];
    }

    /**
     * @dev Get all district building configurations
     * @return DistrictBuildingType[] Array of building types
     * @return DistrictBuildingConfig[] Array of building configurations
     */
    function getAllDistrictBuildingConfigs() external view returns (DistrictBuildingType[] memory, DistrictBuildingConfig[] memory) {
        uint8 totalBuildings = uint8(DistrictBuildingType.ALTAR) + 1;
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
        uint8 totalBuildings = uint8(DistrictBuildingType.ALTAR) + 1;
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
        string[] memory names = new string[](15);
        names[0] = "SHOP";
        names[1] = "WORKSHOP";
        names[2] = "DEFENSE_TOWER";
        names[3] = "BARRACKS";
        names[4] = "SCOUT_GUILD";
        names[5] = "CARAVAN";
        names[6] = "REP_STATION";
        names[7] = "COUNCIL_CHAMBER";
        names[8] = "AUDIT_SHRINE";
        names[9] = "FOUNDERS_HALL";
        names[10] = "MINISTRY_OF_MERIT";
        names[11] = "ARCANE_TOWER";
        names[12] = "FORTRESS_WALLS";
        names[13] = "BANK";
        names[14] = "ALTAR";
        return names;
    }
} 