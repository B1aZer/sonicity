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
        bool active;
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
    event ResourcesCollected(address indexed player, uint256 buildingId, uint256 amount);
    event GameStateAddressUpdated(address indexed newAddress);

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
     * @dev Create a new building
     * @param buildingType The type of building to create
     * @return buildingId The ID of the created building
     */
    function createBuilding(GridBuildingType buildingType) external nonReentrant returns (uint256) {
        require(buildingType <= GridBuildingType.REP_STATION, "Invalid building type");
        
        // Get player's tier from GameState
        (bool success, bytes memory data) = gameStateAddress.call(
            abi.encodeWithSignature("getPlayerTier(address)", msg.sender)
        );
        require(success, "Failed to get player tier");
        uint8 playerTier = abi.decode(data, (uint8));
        
        // Check tier requirement
        require(playerTier >= buildingConfigs[buildingType].tier, "Tier requirement not met");
        
        // For Tier 0, only allow houses and enforce 3x3 grid
        if (playerTier == 0) {
            require(buildingType == GridBuildingType.HOUSE, "Only houses allowed in Tier 0");
            require(buildingCounts[msg.sender][GridBuildingType.HOUSE] < 9, "Tier 0 grid is full (3x3)");
        }
        
        // Create building
        uint256 buildingId = nextBuildingId[msg.sender]++;
        buildings[msg.sender][buildingId] = Building({
            buildingType: buildingType,
            level: 1,
            lastUpgradeTime: block.timestamp,
            lastCollectionTime: block.timestamp,
            active: true
        });
        
        // Update counts
        buildingCounts[msg.sender][buildingType]++;
        
        emit BuildingCreated(msg.sender, buildingType, buildingId);
        
        return buildingId;
    }

    /**
     * @dev Upgrade a building
     * @param buildingId The ID of the building to upgrade
     */
    function upgradeBuilding(uint256 buildingId) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.active, "Building not active");
        
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        require(building.level < config.maxLevel, "Building at max level");
        
        // Calculate upgrade cost
        uint256 upgradeCost = config.upgradeCost * building.level;
        
        // Deduct gold from player
        (bool success, ) = gameStateAddress.call(
            abi.encodeWithSignature("deductGoldForDistrictBuilding(address,uint256)", msg.sender, upgradeCost)
        );
        require(success, "Failed to deduct gold");
        
        // Upgrade building
        building.level++;
        building.lastUpgradeTime = block.timestamp;
        
        emit BuildingUpgraded(msg.sender, buildingId, building.level);
    }

    /**
     * @dev Remove a building
     * @param buildingId The ID of the building to remove
     */
    function removeBuilding(uint256 buildingId) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.active, "Building not active");
        
        building.active = false;
        buildingCounts[msg.sender][building.buildingType]--;
        
        emit BuildingRemoved(msg.sender, buildingId);
    }

    /**
     * @dev Collect resources from a building
     * @param buildingId The ID of the building to collect from
     * @return amount The amount of resources collected
     */
    function collectResources(uint256 buildingId) external nonReentrant returns (uint256) {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.active, "Building not active");
        
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
                abi.encodeWithSignature("earnGold(uint256)", amount)
            );
            require(success, "Failed to add gold");
        } else if (building.buildingType == GridBuildingType.FARM) {
            (bool success, ) = gameStateAddress.call(
                abi.encodeWithSignature("earnFood(uint256)", amount)
            );
            require(success, "Failed to add food");
        } else if (building.buildingType == GridBuildingType.REP_STATION) {
            (bool success, ) = gameStateAddress.call(
                abi.encodeWithSignature("earnRep(uint256)", amount)
            );
            require(success, "Failed to add rep");
        }
        
        emit ResourcesCollected(msg.sender, buildingId, amount);
        
        return amount;
    }

    /**
     * @dev Calculate total claimable gold for a player without collecting it
     * @param player The address of the player
     * @return uint256 Total claimable gold
     */
    function calculateClaimableGold(address player) external view returns (uint256) {
        uint256 totalGold = 0;
        uint256 currentTime = block.timestamp;
        
        // Get all building IDs
        uint256[] memory buildingIds = getActiveBuildings(player);
        
        for (uint256 i = 0; i < buildingIds.length; i++) {
            uint256 buildingId = buildingIds[i];
            Building storage building = buildings[player][buildingId];
            
            if (building.active && building.buildingType == GridBuildingType.HOUSE) {
                // Calculate time passed since last collection
                uint256 timePassed = currentTime - building.lastCollectionTime;
                
                // Cap the time passed at 24 hours
                if (timePassed > 24 hours) {
                    timePassed = 24 hours;
                }
                
                // Calculate gold to collect based on production rate and time passed
                GridBuildingConfig memory config = buildingConfigs[building.buildingType];
                uint256 goldToCollect = (config.baseProductionRate * timePassed * building.level) / 1 hours;
                
                // Add to total gold
                totalGold += goldToCollect;
            }
        }
        
        return totalGold;
    }

    /**
     * @dev Get all active buildings for a player
     * @param player The address of the player
     * @return uint256[] Array of active building IDs
     */
    function getActiveBuildings(address player) public view returns (uint256[] memory) {
        uint256 count = 0;
        uint256 nextId = nextBuildingId[player];
        
        // First count active buildings
        for (uint256 i = 0; i < nextId; i++) {
            if (buildings[player][i].active) {
                count++;
            }
        }
        
        // Create array and fill with active building IDs
        uint256[] memory activeBuildings = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nextId; i++) {
            if (buildings[player][i].active) {
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
}