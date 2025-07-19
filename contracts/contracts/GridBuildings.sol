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
    // Reference to the DistrictBuildings contract
    address public districtBuildingsAddress;

    // Recharge fee in native tokens (0.01 SONIC)
    uint256 public constant RECHARGE_FEE = 0.01 ether;

    // Production cap duration (default 24 hours)
    uint256 public productionCapDuration;

    // Grid Building Types
    enum GridBuildingType {
        HOUSE,
        FARM,
        DIAMOND_STATION,
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
        uint8 level;
        uint256 lastUpgradeTime;
        uint256 lastRechargeTime;    // When building was last recharged (started production)
        uint256 lastCollectionTime;  // When resources were last collected
        bool damaged;  // Only keep damaged flag
        uint256 startProductionTime;  // When production started (timestamp)
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
    event DistrictBuildingsAddressUpdated(address indexed newAddress);
    event BuildingRecharged(address indexed player, uint256 buildingId, uint256 fee);
    event BuildingsRecharged(address indexed player, uint256[] buildingIds, uint256 totalFee);
    event ProductionCapDurationUpdated(uint256 newDuration);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize production cap duration to 24 hours
        productionCapDuration = 24 hours;
        
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

        buildingConfigs[GridBuildingType.DIAMOND_STATION] = GridBuildingConfig({
            name: "Diamond Station",
            baseProductionRate: 1,   // 1 diamond per hour (example)
            upgradeCost: 500,        // 500 gold to upgrade (example)
            maxLevel: 5,
            description: "Produces diamonds",
            tier: 2
        });

        buildingConfigs[GridBuildingType.REP_STATION] = GridBuildingConfig({
            name: "Rep Station",
            baseProductionRate: 2,   // 2 rep per hour
            upgradeCost: 200,        // 200 gold to upgrade
            maxLevel: 5,
            description: "Produces reputation",
            tier: 3
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
     * @dev Set the DistrictBuildings contract address
     * @param _districtBuildingsAddress The address of the DistrictBuildings contract
     */
    function setDistrictBuildingsAddress(address _districtBuildingsAddress) external onlyOwner {
        districtBuildingsAddress = _districtBuildingsAddress;
        emit DistrictBuildingsAddressUpdated(_districtBuildingsAddress);
    }

    /**
     * @dev Set the production cap duration
     * @param _duration The new production cap duration in seconds
     */
    function setProductionCapDuration(uint256 _duration) external onlyOwner {
        require(_duration > 0, "Duration must be greater than 0");
        require(_duration <= 7 days, "Duration cannot exceed 7 days");
        productionCapDuration = _duration;
        emit ProductionCapDurationUpdated(_duration);
    }

    /**
     * @dev Get the current production cap duration
     * @return uint256 The current production cap duration in seconds
     */
    function getProductionCapDuration() external view returns (uint256) {
        return productionCapDuration;
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
     * @param player The address of the player
     * @param buildingType The type of building to create
     * @param level The level of the building (0 for new, preserved for restored)
     * @param lastUpgradeTime The last upgrade time (0 for new, preserved for restored)
     * @return buildingId The ID of the created building
     */
    function createBuilding(address player, GridBuildingType buildingType, uint8 level, uint256 lastUpgradeTime) external returns (uint256) {
        require(msg.sender == altarAddress, "Only Altar can create buildings");
        require(buildingType <= GridBuildingType.REP_STATION, "Invalid building type");
        
        // Validate level for restored buildings
        if (level > 0) {
            require(lastUpgradeTime > 0, "Invalid upgrade time for restored building");
        }
        
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
            level: level == 0 ? 1 : level,  // Use level 1 for new buildings, preserved level for restored
            lastUpgradeTime: lastUpgradeTime == 0 ? block.timestamp : lastUpgradeTime,  // Use current time for new, preserved time for restored
            lastRechargeTime: 0, // Buildings start with no production - must be recharged to start producing
            lastCollectionTime: 0, // Buildings start with no production - must be recharged to start producing
            damaged: false,
            startProductionTime: 0
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
        
        // Check if player has unlocked the required upgrade level for this building type
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("getMaxUpgradeLevel(address,uint8)", msg.sender, uint8(building.buildingType))
        );
        require(success, "Failed to get max upgrade level");
        uint8 maxUpgradeLevel = abi.decode(returnData, (uint8));
        
        require(building.level + 1 <= maxUpgradeLevel, "Upgrade level not unlocked. Recharge more buildings to unlock higher levels.");
        
        // Calculate upgrade cost
        uint256 upgradeCost = config.upgradeCost * building.level;
        
        // Deduct gold from player
        (success, returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductGold(address,uint256)", msg.sender, upgradeCost)
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
        building.lastUpgradeTime = block.timestamp;
        
        emit BuildingUpgraded(msg.sender, buildingId, building.level);
    }

    // Internal helper to calculate claimable resources for a building
    function _calculateClaimable(Building storage building, uint256 currentTime) internal view returns (uint256) {
        if (building.lastRechargeTime == 0 || building.startProductionTime == 0) {
            return 0;
        }
        
        // Calculate from lastCollectionTime (or startProductionTime if never collected)
        // This prevents double-collecting the same resources
        uint256 startTime = building.lastCollectionTime == 0 ? building.startProductionTime : building.lastCollectionTime;
        uint256 endTime = currentTime;
        uint256 maxEndTime = building.lastRechargeTime + productionCapDuration;
        if (endTime > maxEndTime) {
            endTime = maxEndTime;
        }
        if (endTime <= startTime) {
            return 0;
        }
        uint256 timePassed = endTime - startTime;
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        return (config.baseProductionRate * timePassed * building.level) / 1 hours;
    }

    // Internal helper to recharge a building
    function _rechargeBuilding(Building storage building) internal {
        // If this is the first recharge, set startProductionTime
        if (building.startProductionTime == 0) {
            building.startProductionTime = block.timestamp;
        }
        
        // Check if building was at cap before recharge
        bool wasAtCap = building.lastRechargeTime > 0 && 
                       (block.timestamp - building.lastRechargeTime) >= productionCapDuration;
        
        // Always update lastRechargeTime to extend the production cap
        building.lastRechargeTime = block.timestamp;
        
        // If building was at cap, reset lastCollectionTime to start fresh production
        if (wasAtCap) {
            building.lastCollectionTime = block.timestamp;
        }
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
        return _calculateClaimable(building, block.timestamp);
    }

    // Internal helper to distribute resources to player based on building type
    function _distributeResources(address player, GridBuildingType buildingType, uint256 amount) internal {
        if (buildingType == GridBuildingType.HOUSE) {
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnGold(address,uint256)", player, amount)
            );
            if (!success) {
                if (returnData.length > 0) {
                    assembly { revert(add(returnData, 32), mload(returnData)) }
                }
                revert("Failed to add gold");
            }
        } else if (buildingType == GridBuildingType.FARM) {
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnFood(address,uint256)", player, amount)
            );
            if (!success) {
                if (returnData.length > 0) {
                    assembly { revert(add(returnData, 32), mload(returnData)) }
                }
                revert("Failed to add food");
            }
        } else if (buildingType == GridBuildingType.DIAMOND_STATION) {
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnDiamonds(address,uint256)", player, amount)
            );
            if (!success) {
                if (returnData.length > 0) {
                    assembly { revert(add(returnData, 32), mload(returnData)) }
                }
                revert("Failed to add diamonds");
            }
        } else if (buildingType == GridBuildingType.REP_STATION) {
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnRep(address,uint256)", player, amount)
            );
            if (!success) {
                if (returnData.length > 0) {
                    assembly { revert(add(returnData, 32), mload(returnData)) }
                }
                revert("Failed to add rep");
            }
        }
    }

    // Internal helper to update collection time based on cap status
    function _updateCollectionTime(Building storage building) internal {
        // If building is at cap, set lastCollectionTime to the cap time to prevent additional production
        if (block.timestamp >= building.lastRechargeTime + productionCapDuration) {
            building.lastCollectionTime = building.lastRechargeTime + productionCapDuration;
        } else {
            building.lastCollectionTime = block.timestamp;
        }
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
                uint256 amount = _calculateClaimable(building, block.timestamp);
                if (amount > 0) {
                    _updateCollectionTime(building);
                    _distributeResources(msg.sender, building.buildingType, amount);
                    emit ResourcesCollected(msg.sender, buildingIds[i], amount);
                    totalAmount += amount;
                }
            }
        }
        
        return totalAmount;
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
     * @return uint256 Number of buildings actually damaged
     */
    function damageBuildings(address player, uint256 amount) external returns (uint256) {
        require(msg.sender == battleSystemAddress, "Only BattleSystem can call this function");
        require(amount > 0, "Amount must be greater than 0");
        
        // Count available buildings to damage
        uint256 availableBuildings = 0;
        for (uint256 i = 0; i < nextBuildingId[player]; i++) {
            Building storage building = buildings[player][i];
            if ((building.buildingType != GridBuildingType(0) || building.level != 0) && !building.damaged) {
                availableBuildings++;
            }
        }
        
        // If no buildings available, return 0
        if (availableBuildings == 0) {
            return 0;
        }
        
        uint256 buildingsDamaged = 0;

        // Start from highest tier and work down
        for (uint8 tier = 2; tier >= 0; tier--) {
            for (uint256 i = 0; i < nextBuildingId[player]; i++) {
                Building storage building = buildings[player][i];
                // Skip if building doesn't exist or is already damaged
                if ((building.buildingType == GridBuildingType(0) && building.level == 0) || building.damaged) continue;
                
                GridBuildingConfig memory config = buildingConfigs[building.buildingType];
                if (config.tier == tier) {
                    building.damaged = true;
                    emit BuildingDamaged(player, i);
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
     * @param buildingId The ID of the building to repair
     */
    function repairBuilding(uint256 buildingId) external nonReentrant {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        require(building.damaged, "Building not damaged");

        // Check if player has a workshop
        (bool success, bytes memory returnData) = districtBuildingsAddress.staticcall(
            abi.encodeWithSignature("isDistrictBuildingActive(address,uint8)", msg.sender, 4) // 4 is WORKSHOP in DistrictBuildingType enum
        );
        require(success && abi.decode(returnData, (bool)), "Workshop required to repair");

        // Calculate repair cost (base cost * level)
        GridBuildingConfig memory config = buildingConfigs[building.buildingType];
        uint256 repairCost = config.upgradeCost * building.level / 2; // Half the upgrade cost per level
        
        // Call GameState to check and deduct gold
        (success, returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductGold(address,uint256)", msg.sender, repairCost)
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
        return building.damaged;
    }

    /**
     * @dev Check if a building is at production cap (production cap duration since last recharge)
     * @param player The address of the player
     * @param buildingId The ID of the building to check
     * @return bool Whether the building is at production cap
     */
    function isBuildingAtCap(address player, uint256 buildingId) public view returns (bool) {
        Building storage building = buildings[player][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        
        // If building has never been recharged, it's not at cap
        if (building.lastRechargeTime == 0) {
            return false;
        }
        
        uint256 timeSinceRecharge = block.timestamp - building.lastRechargeTime;
        return timeSinceRecharge >= productionCapDuration;
    }

    /**
     * @dev Get buildings that are at production cap for a player
     * @param player The address of the player
     * @return uint256[] Array of building IDs that are at cap
     */
    function getBuildingsAtCap(address player) public view returns (uint256[] memory) {
        uint256[] memory activeBuildings = getActiveBuildings(player);
        uint256 capCount = 0;
        
        // Count buildings at cap
        for (uint256 i = 0; i < activeBuildings.length; i++) {
            Building storage building = buildings[player][activeBuildings[i]];
            if (!building.damaged && building.lastRechargeTime > 0 && (block.timestamp - building.lastRechargeTime) >= productionCapDuration) {
                capCount++;
            }
        }
        
        // Create array of buildings at cap
        uint256[] memory buildingsAtCap = new uint256[](capCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeBuildings.length; i++) {
            Building storage building = buildings[player][activeBuildings[i]];
            if (!building.damaged && building.lastRechargeTime > 0 && (block.timestamp - building.lastRechargeTime) >= productionCapDuration) {
                buildingsAtCap[index] = activeBuildings[i];
                index++;
            }
        }
        
        return buildingsAtCap;
    }

    /**
     * @dev Recharge a building to refresh production time
     * @param buildingId The ID of the building to recharge
     */
    function rechargeBuilding(uint256 buildingId) external payable nonReentrant {
        require(msg.value == RECHARGE_FEE, "Incorrect fee amount");
        
        Building storage building = buildings[msg.sender][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        require(!building.damaged, "Building is damaged");
        
        // Track recharge amount in GameState with building type
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("trackRechargeAmount(address,uint256,uint8)", msg.sender, msg.value, uint8(building.buildingType))
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to track recharge amount");
        }
        
        // Set startProduction flag to true and reset last recharge time
        _rechargeBuilding(building);
        
        emit BuildingRecharged(msg.sender, buildingId, msg.value);
    }

    /**
     * @dev Recharge multiple buildings to refresh production time
     * @param buildingIds Array of building IDs to recharge
     */
    function rechargeBuildings(uint256[] calldata buildingIds) external payable nonReentrant {
        require(msg.value == RECHARGE_FEE * buildingIds.length, "Incorrect fee amount");
        require(buildingIds.length > 0, "No buildings specified");
        
        uint256 totalFee = 0;
        for (uint256 i = 0; i < buildingIds.length; i++) {
            Building storage building = buildings[msg.sender][buildingIds[i]];
            require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
            require(!building.damaged, "Building is damaged");
            
            // Set startProduction flag to true and reset last recharge time
            _rechargeBuilding(building);
            
            totalFee += RECHARGE_FEE;
        }
        
        // Track recharge amount in GameState (for simplicity, track as HOUSE type for bulk operations)
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("trackRechargeAmount(address,uint256,uint8)", msg.sender, msg.value, 0)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to track recharge amount");
        }
        
        emit BuildingsRecharged(msg.sender, buildingIds, totalFee);
    }

    /**
     * @dev Recharge all active buildings for the caller
     */
    function rechargeAllBuildings() external payable nonReentrant {
        uint256[] memory activeBuildings = getActiveBuildings(msg.sender);
        require(activeBuildings.length > 0, "No buildings to recharge");
        require(msg.value == RECHARGE_FEE * activeBuildings.length, "Incorrect fee amount");
        
        uint256 totalFee = 0;
        for (uint256 i = 0; i < activeBuildings.length; i++) {
            Building storage building = buildings[msg.sender][activeBuildings[i]];
            require(!building.damaged, "Building is damaged");
            
            // Set startProduction flag to true and reset last recharge time
            _rechargeBuilding(building);
            
            totalFee += RECHARGE_FEE;
        }
        
        // Track recharge amount in GameState (for simplicity, track as HOUSE type for bulk operations)
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("trackRechargeAmount(address,uint256,uint8)", msg.sender, msg.value, 0)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to track recharge amount");
        }
        
        emit BuildingsRecharged(msg.sender, activeBuildings, totalFee);
    }

    /**
     * @dev Withdraw accumulated fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Failed to withdraw fees");
    }

    /**
     * @dev Get contract balance (for fee tracking)
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Calculate production progress for a building
     * @param player The address of the player
     * @param buildingId The ID of the building to calculate for
     * @return currentTime The current production time in seconds
     * @return maxTime The maximum production time (production cap duration) in seconds
     * @return progressPercent The progress percentage (0-100)
     */
    function calculateProductionProgress(address player, uint256 buildingId) external view returns (uint256 currentTime, uint256 maxTime, uint256 progressPercent) {
        Building storage building = buildings[player][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        
        maxTime = productionCapDuration; // Production cap duration in seconds
        
        // If building has never been recharged, no production
        if (building.lastRechargeTime == 0) {
            return (0, maxTime, 0);
        }
        
        // Calculate time passed since last recharge (production time)
        uint256 timePassed = block.timestamp - building.lastRechargeTime;
        if (timePassed > maxTime) {
            timePassed = maxTime;
        }
        
        // The current production time is simply the time passed since last recharge
        currentTime = timePassed;
        
        // Calculate progress percentage
        progressPercent = (currentTime * 100) / maxTime;
        
        return (currentTime, maxTime, progressPercent);
    }

    function collectResources(uint256 buildingId) external nonReentrant returns (uint256) {
        Building storage building = buildings[msg.sender][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        require(!building.damaged, "Building is damaged");

        uint256 amount = _calculateClaimable(building, block.timestamp);

        // If no resources to claim, just return 0 (no revert)
        if (amount == 0) {
            return 0;
        }

        // Update last collection time based on cap status
        _updateCollectionTime(building);

        // DO NOT reset lastRechargeTime - it should only be reset by recharge

        // Distribute resources to player
        _distributeResources(msg.sender, building.buildingType, amount);

        emit ResourcesCollected(msg.sender, buildingId, amount);
        return amount;
    }
}