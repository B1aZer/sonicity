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
    event DistrictBuildingsAddressUpdated(address indexed newAddress);
    event BuildingRecharged(address indexed player, uint256 buildingId, uint256 fee);
    event BuildingsRecharged(address indexed player, uint256[] buildingIds, uint256 totalFee);

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
     * @dev Set the DistrictBuildings contract address
     * @param _districtBuildingsAddress The address of the DistrictBuildings contract
     */
    function setDistrictBuildingsAddress(address _districtBuildingsAddress) external onlyOwner {
        districtBuildingsAddress = _districtBuildingsAddress;
        emit DistrictBuildingsAddressUpdated(_districtBuildingsAddress);
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
     * @param level The level of the building (0 = new building, >0 = restore level)
     * @param lastUpgradeTime The timestamp of the last upgrade (0 = current time, >0 = preserved time)
     * @return buildingId The ID of the created building
     */
    function createBuilding(
        address player, 
        GridBuildingType buildingType, 
        uint256 level, 
        uint256 lastUpgradeTime
    ) external nonReentrant returns (uint256) {
        require(msg.sender == altarAddress, "Only Altar can create buildings");
        require(buildingType <= GridBuildingType.REP_STATION, "Invalid building type");
        
        // If level is 0, this is a new building; if >0, this is restoring preserved data
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
            lastCollectionTime: block.timestamp, // Always reset collection time
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
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnGold(address,uint256)", msg.sender, amount)
            );
            if (!success) {
                // If the call failed, decode and propagate the error message
                if (returnData.length > 0) {
                    assembly {
                        revert(add(returnData, 32), mload(returnData))
                    }
                }
                revert("Failed to add gold");
            }
        } else if (building.buildingType == GridBuildingType.FARM) {
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnFood(address,uint256)", msg.sender, amount)
            );
            if (!success) {
                // If the call failed, decode and propagate the error message
                if (returnData.length > 0) {
                    assembly {
                        revert(add(returnData, 32), mload(returnData))
                    }
                }
                revert("Failed to add food");
            }
        } else if (building.buildingType == GridBuildingType.REP_STATION) {
            (bool success, bytes memory returnData) = gameStateAddress.call(
                abi.encodeWithSignature("earnRep(address,uint256)", msg.sender, amount)
            );
            if (!success) {
                // If the call failed, decode and propagate the error message
                if (returnData.length > 0) {
                    assembly {
                        revert(add(returnData, 32), mload(returnData))
                    }
                }
                revert("Failed to add rep");
            }
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
                    (bool success, bytes memory returnData) = gameStateAddress.call(
                        abi.encodeWithSignature("earnGold(address,uint256)", msg.sender, amount)
                    );
                    if (!success) {
                        // If the call failed, decode and propagate the error message
                        if (returnData.length > 0) {
                            assembly {
                                revert(add(returnData, 32), mload(returnData))
                            }
                        }
                        revert("Failed to add gold");
                    }
                } else if (building.buildingType == GridBuildingType.FARM) {
                    (bool success, bytes memory returnData) = gameStateAddress.call(
                        abi.encodeWithSignature("earnFood(address,uint256)", msg.sender, amount)
                    );
                    if (!success) {
                        // If the call failed, decode and propagate the error message
                        if (returnData.length > 0) {
                            assembly {
                                revert(add(returnData, 32), mload(returnData))
                            }
                        }
                        revert("Failed to add food");
                    }
                } else if (building.buildingType == GridBuildingType.REP_STATION) {
                    (bool success, bytes memory returnData) = gameStateAddress.call(
                        abi.encodeWithSignature("earnRep(address,uint256)", msg.sender, amount)
                    );
                    if (!success) {
                        // If the call failed, decode and propagate the error message
                        if (returnData.length > 0) {
                            assembly {
                                revert(add(returnData, 32), mload(returnData))
                            }
                        }
                        revert("Failed to add rep");
                    }
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
     * @dev Check if a building is at production cap (24 hours since last collection)
     * @param player The address of the player
     * @param buildingId The ID of the building to check
     * @return bool Whether the building is at production cap
     */
    function isBuildingAtCap(address player, uint256 buildingId) public view returns (bool) {
        Building storage building = buildings[player][buildingId];
        require(building.buildingType != GridBuildingType(0) || building.level != 0, "Building does not exist");
        
        uint256 timeSinceCollection = block.timestamp - building.lastCollectionTime;
        return timeSinceCollection >= 24 hours;
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
            if (!building.damaged && (block.timestamp - building.lastCollectionTime) >= 24 hours) {
                capCount++;
            }
        }
        
        // Create array of buildings at cap
        uint256[] memory buildingsAtCap = new uint256[](capCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeBuildings.length; i++) {
            Building storage building = buildings[player][activeBuildings[i]];
            if (!building.damaged && (block.timestamp - building.lastCollectionTime) >= 24 hours) {
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
        
        // Reset last collection time to restart production
        building.lastCollectionTime = block.timestamp;
        
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
            
            // Reset last collection time to restart production
            building.lastCollectionTime = block.timestamp;
            
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
            
            // Reset last collection time to restart production
            building.lastCollectionTime = block.timestamp;
            
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
}