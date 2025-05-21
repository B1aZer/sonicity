// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title GridBuildings
 * @dev Contract for managing grid-based buildings (houses, farms, rep stations)
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract GridBuildings is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to the GameState contract
    address public gameStateAddress;
    // Reference to the Altar contract
    address public altarAddress;
    // Reference to the BattleSystem contract
    address public battleSystemAddress;

    // Grid Building Types
    enum GridBuildingType {
        HOUSE,
        FARM,
        REP_STATION
    }

    // Grid Building configuration
    struct GridBuildingConfig {
        string name;
        uint256 baseProductionRate;  // Base production rate (gold/food/rep per hour)
        uint256 upgradeCost;         // Cost to upgrade
        uint256 maxLevel;            // Maximum level
        string description;
        uint8 tier;                  // Required tier to build
    }

    // Building state
    struct Building {
        GridBuildingType buildingType;
        uint256 level;
        uint256 lastUpgradeTime;
        uint256 lastCollectionTime;
        bool damaged;  // Only keep damaged flag
    }

    // Mappings
    mapping(address => mapping(uint256 => Building)) public buildings;
    mapping(address => uint256) public nextBuildingId;
    mapping(GridBuildingType => GridBuildingConfig) public buildingConfigs;
    mapping(address => mapping(GridBuildingType => uint256)) public buildingCounts;

    // Events
    event BuildingCreated(address indexed player, GridBuildingType buildingType, uint256 buildingId);
    event BuildingUpgraded(address indexed player, uint256 buildingId, uint256 newLevel);
    event BuildingRemoved(address indexed player, uint256 buildingId);
    event BuildingDamaged(address indexed player, uint256 buildingId);
    event ResourcesCollected(address indexed player, uint256 buildingId, uint256 amount);
    event GameStateAddressUpdated(address indexed newAddress);
    event AltarAddressUpdated(address indexed newAddress);
    event BuildingRepaired(address indexed player, uint256 buildingId);
    event BattleSystemAddressUpdated(address indexed newAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize building configurations
        buildingConfigs[GridBuildingType.HOUSE] = GridBuildingConfig({
            name: "House",
            baseProductionRate: 10,  // 10 gold per hour
            upgradeCost: 100,        // 100 gold to upgrade
            maxLevel: 5,
            description: "Produces gold",
            tier: 0
        });

        buildingConfigs[GridBuildingType.FARM] = GridBuildingConfig({
            name: "Farm",
            baseProductionRate: 5,   // 5 food per hour
            upgradeCost: 150,        // 150 gold to upgrade
            maxLevel: 5,
            description: "Produces food",
            tier: 1
        });

        buildingConfigs[GridBuildingType.REP_STATION] = GridBuildingConfig({
            name: "Rep Station",
            baseProductionRate: 2,   // 2 rep per hour
            upgradeCost: 200,        // 200 gold to upgrade
            maxLevel: 5,
            description: "Produces reputation",
            tier: 2
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
     * @dev Set the Altar contract address
     * @param _altarAddress The address of the Altar contract
     */
    function setAltarAddress(address _altarAddress) external onlyOwner {
        altarAddress = _altarAddress;
        emit AltarAddressUpdated(_altarAddress);
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
     * @dev Remove a building (only callable by Altar)
     * @param player The address of the player for whom to remove the building
     * @param buildingId The ID of the building to remove
     */
    function removeBuilding(address player, uint256 buildingId) external nonReentrant {
        require(msg.sender == altarAddress, "Only Altar can remove buildings");
        
        Building storage building = buildings[player][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        
        // Update counts
        buildingCounts[player][building.buildingType]--;
        
        // Delete the building
        delete buildings[player][buildingId];
        
        emit BuildingRemoved(player, buildingId);
    }

    /**
     * @dev Create a new building
     * @param player The address of the player for whom to create the building
     * @param buildingType The type of building to create
     * @return buildingId The ID of the created building
     */
    function createBuilding(address player, GridBuildingType buildingType) external nonReentrant returns (uint256) {
        require(msg.sender == altarAddress, "Only Altar can create buildings");
        require(buildingType <= GridBuildingType.REP_STATION, "Invalid building type");
        
        // Get player's tier from GameState
        (bool success, bytes memory data) = gameStateAddress.call(
            abi.encodeWithSignature("getPlayerTier(address)", player)
        );
        require(success, "Failed to get player tier");
        uint8 playerTier = abi.decode(data, (uint8));
        
        // Check tier requirement
        require(playerTier >= buildingConfigs[buildingType].tier, "Tier requirement not met");
        
        // Get total building slots for player's tier
        (success, data) = gameStateAddress.call(
            abi.encodeWithSignature("buildingSlotsPerTier(uint8)", playerTier)
        );
        require(success, "Failed to get building slots per tier");
        uint256 maxSlots = abi.decode(data, (uint256));
        
        // Get current total buildings count
        uint256 totalBuildings = 0;
        for (uint8 i = 0; i <= uint8(GridBuildingType.REP_STATION); i++) {
            totalBuildings += buildingCounts[player][GridBuildingType(i)];
        }
        
        // Check if player has reached their building slot limit
        require(totalBuildings < maxSlots, "Building slot limit reached for current tier");
        
        // Create building
        uint256 buildingId = nextBuildingId[player]++;
        buildings[player][buildingId] = Building({
            buildingType: buildingType,
            level: 1,
            lastUpgradeTime: block.timestamp,
            lastCollectionTime: block.timestamp,
            damaged: false
        });
        
        // Update counts
        buildingCounts[player][buildingType]++;
        
        emit BuildingCreated(player, buildingType, buildingId);
        
        return buildingId;
    }

    /**
     * @dev Upgrade a building
     * @param buildingId The ID of the building to upgrade
     */
    function upgradeBuilding(uint256 buildingId) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        require(!building.damaged, "Building is damaged");
        
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        require(building.level < config.maxLevel, "Building at max level");
        
        // Calculate upgrade cost
        uint256 upgradeCost = config.upgradeCost * building.level;
        
        // Deduct gold from player
        (bool success, ) = gameStateAddress.call(
            abi.encodeWithSignature("deductGold(address,uint256)", msg.sender, upgradeCost)
        );
        require(success, "Failed to deduct gold");
        
        // Upgrade building
        building.level++;
        building.lastUpgradeTime = block.timestamp;
        
        emit BuildingUpgraded(msg.sender, buildingId, building.level);
    }

    /**
     * @dev Collect resources from a building
     * @param buildingId The ID of the building to collect from
     * @return amount The amount of resources collected
     */
    function collectResources(uint256 buildingId) external nonReentrant returns (uint256) {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        require(!building.damaged, "Building is damaged");
        
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        
        // Calculate time passed since last collection
        uint256 timePassed = block.timestamp - building.lastCollectionTime;
        if (timePassed > 24 hours) {
            timePassed = 24 hours;
        }
        
        // Calculate resources to collect
        uint256 amount = (config.baseProductionRate * timePassed * building.level) / 1 hours;
        
        // Update last collection time
        building.lastCollectionTime = block.timestamp;
        
        // Add resources to player based on building type
        if (building.buildingType == GridBuildingType.HOUSE) {
            (bool success, ) = gameStateAddress.call(
                abi.encodeWithSignature("earnGold(address,uint256)", msg.sender, amount)
            );
            require(success, "Failed to add gold");
        } else if (building.buildingType == GridBuildingType.FARM) {
            (bool success, ) = gameStateAddress.call(
                abi.encodeWithSignature("earnFood(address,uint256)", msg.sender, amount)
            );
            require(success, "Failed to add food");
        } else if (building.buildingType == GridBuildingType.REP_STATION) {
            (bool success, ) = gameStateAddress.call(
                abi.encodeWithSignature("earnRep(address,uint256)", msg.sender, amount)
            );
            require(success, "Failed to add rep");
        }
        
        emit ResourcesCollected(msg.sender, buildingId, amount);
        
        return amount;
    }

    /**
     * @dev Collect resources from all buildings of a specific type
     * @param buildingType The type of building to collect from
     * @return totalAmount Total amount of resources collected
     */
    function collectResourcesByType(GridBuildingType buildingType) external nonReentrant returns (uint256) {
        uint256 totalAmount = 0;
        uint256[] memory buildingIds = getActiveBuildings(msg.sender);
        
        for (uint256 i = 0; i < buildingIds.length; i++) {
            Building storage building = buildings[msg.sender][buildingIds[i]];
            if (building.buildingType == buildingType) {
                GridBuildingConfig memory config = buildingConfigs[building.buildingType];
                
                // Calculate time passed since last collection
                uint256 timePassed = block.timestamp - building.lastCollectionTime;
                if (timePassed > 24 hours) {
                    timePassed = 24 hours;
                }
                
                // Calculate resources to collect
                uint256 amount = (config.baseProductionRate * timePassed * building.level) / 1 hours;
                
                // Update last collection time
                building.lastCollectionTime = block.timestamp;
                
                // Add resources to player based on building type
                if (building.buildingType == GridBuildingType.HOUSE) {
                    (bool success, ) = gameStateAddress.call(
                        abi.encodeWithSignature("earnGold(address,uint256)", msg.sender, amount)
                    );
                    require(success, "Failed to add gold");
                } else if (building.buildingType == GridBuildingType.FARM) {
                    (bool success, ) = gameStateAddress.call(
                        abi.encodeWithSignature("earnFood(address,uint256)", msg.sender, amount)
                    );
                    require(success, "Failed to add food");
                } else if (building.buildingType == GridBuildingType.REP_STATION) {
                    (bool success, ) = gameStateAddress.call(
                        abi.encodeWithSignature("earnRep(address,uint256)", msg.sender, amount)
                    );
                    require(success, "Failed to add rep");
                }
                
                emit ResourcesCollected(msg.sender, buildingIds[i], amount);
                totalAmount += amount;
            }
        }
        
        return totalAmount;
    }

    /**
     * @dev Calculate claimable resources for a specific building
     * @param player The address of the player
     * @param buildingId The ID of the building to calculate for
     * @return uint256 Amount of claimable resources
     */
    function calculateClaimableResources(address player, uint256 buildingId) external view returns (uint256) {
        Building storage building = buildings[player][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        
        // Calculate time passed since last collection
        uint256 timePassed = block.timestamp - building.lastCollectionTime;
        if (timePassed > 24 hours) {
            timePassed = 24 hours;
        }
        
        // Calculate resources to collect based on production rate and time passed
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        return (config.baseProductionRate * timePassed * building.level) / 1 hours;
    }

    /**
     * @dev Calculate total claimable resources for a player's buildings of a specific type
     * @param player The address of the player
     * @param buildingType The type of building to calculate for
     * @return uint256 Total amount of claimable resources
     */
    function calculateTotalClaimableResources(address player, GridBuildingType buildingType) external view returns (uint256) {
        uint256 totalResources = 0;
        uint256[] memory buildingIds = getActiveBuildings(player);
        
        for (uint256 i = 0; i < buildingIds.length; i++) {
            Building storage building = buildings[player][buildingIds[i]];
            if (building.buildingType == buildingType) {
                totalResources += this.calculateClaimableResources(player, buildingIds[i]);
            }
        }
        
        return totalResources;
    }

    /**
     * @dev Get all active buildings for a player
     * @param player The address of the player
     * @return uint256[] Array of active building IDs
     */
    function getActiveBuildings(address player) public view returns (uint256[] memory) {
        uint256 count = 0;
        uint256 nextId = nextBuildingId[player];
        
        // First count existing buildings
        for (uint256 i = 0; i < nextId; i++) {
            Building storage building = buildings[player][i];
            if (building.buildingType != GridBuildingType(0) || building.level != 0) {
                count++;
            }
        }
        
        // Create array and fill with building IDs
        uint256[] memory activeBuildings = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextId; i++) {
            Building storage building = buildings[player][i];
            if (building.buildingType != GridBuildingType(0) || building.level != 0) {
                activeBuildings[index] = i;
                index++;
            }
        }
        
        return activeBuildings;
    }

    /**
     * @dev Get building details
     * @param player The address of the player
     * @param buildingId The ID of the building
     * @return Building The building details
     */
    function getBuilding(address player, uint256 buildingId) external view returns (Building memory) {
        return buildings[player][buildingId];
    }

    /**
     * @dev Get building configuration
     * @param buildingType The type of building
     * @return GridBuildingConfig The building configuration
     */
    function getBuildingConfig(GridBuildingType buildingType) external view returns (GridBuildingConfig memory) {
        return buildingConfigs[buildingType];
    }

    /**
     * @dev Damage buildings for a player
     * @param player The address of the player
     * @param amount Number of buildings to damage
     */
    function damageBuildings(address player, uint256 amount) external {
        require(msg.sender == battleSystemAddress, "Only BattleSystem can call this function");
        require(amount > 0, "Amount must be greater than 0");

        uint256 buildingsDamaged = 0;
        bool hasBuildingsToDamage = false;

        // First check if there are any buildings that can be damaged
        for (uint256 i = 0; i < nextBuildingId[player]; i++) {
            Building storage building = buildings[player][i];
            if ((building.buildingType != GridBuildingType(0) || building.level != 0) && !building.damaged) {
                hasBuildingsToDamage = true;
                break;
            }
        }

        if (!hasBuildingsToDamage) {
            revert("No buildings available to damage");
        }

        // Start from highest tier and work down
        for (uint8 tier = 2; tier >= 0; tier--) {
            for (uint256 i = 0; i < nextBuildingId[player]; i++) {
                Building storage building = buildings[player][i];
                if (building.buildingType == GridBuildingType(0) && building.level == 0) continue;
                if (building.damaged) continue;
                
                GridBuildingConfig memory config = buildingConfigs[building.buildingType];
                if (config.tier == tier) {
                    building.damaged = true;
                    emit BuildingDamaged(player, i);
                    buildingsDamaged++;
                    if (buildingsDamaged >= amount) {
                        return;
                    }
                }
            }
        }
    }

    /**
     * @dev Repair a damaged building
     * @param buildingId The ID of the building to repair
     */
    function repairBuilding(uint256 buildingId) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        require(building.damaged, "Building not damaged");

        // Calculate repair cost (base cost * level)
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        uint256 repairCost = config.upgradeCost * building.level / 2; // Half the upgrade cost per level
        
        // Call GameState to check and deduct gold
        (bool success, ) = gameStateAddress.call(
            abi.encodeWithSignature("deductGold(address,uint256)", msg.sender, repairCost)
        );
        require(success, "Failed to deduct gold");

        // Repair building
        building.damaged = false;
        
        emit BuildingRepaired(msg.sender, buildingId);
    }

    /**
     * @dev Check if a building is damaged
     * @param player The address of the player
     * @param buildingId The ID of the building
     * @return bool Whether the building is damaged
     */
    function isBuildingDamaged(address player, uint256 buildingId) public view returns (bool) {
        Building storage building = buildings[player][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        return building.damaged;
    }
}