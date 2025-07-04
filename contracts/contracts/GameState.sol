// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title GameState
 * @dev Contract for managing the overall game state including building slots, city tiers, and treasury
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract GameState is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to the Altar contract that's authorized to update building slots
    address public altarAddress;
    // Reference to the DistrictBuildings contract
    address public districtBuildingsAddress;
    // Reference to the GridBuildings contract
    address public gridBuildingsAddress;
    // Reference to the BattleSystem contract
    address public battleSystemAddress;

    // Upgrade level thresholds (in SONIC wei)
    uint256 public constant UPGRADE_LEVEL_2_THRESHOLD = 0.1 ether;    // 0.1 SONIC for level 2
    uint256 public constant UPGRADE_LEVEL_3_THRESHOLD = 1 ether;      // 1 SONIC for level 3
    uint256 public constant UPGRADE_LEVEL_4_THRESHOLD = 10 ether;     // 10 SONIC for level 4
    uint256 public constant UPGRADE_LEVEL_5_THRESHOLD = 100 ether;    // 100 SONIC for level 5

    // Standalone player state
    struct PlayerState {
        uint256 gold;
        uint256 rep;
        uint256 food;
        uint256 diamonds;
        uint256 buildingSlots;
        uint8 tier;
        uint256 treasury;
        mapping(uint8 => uint256) totalRechargeAmountByType;  // Track total SONIC recharges per building type
        mapping(uint8 => uint8) maxUpgradeLevelByType;        // Track unlocked upgrade level per building type (1-3)
    }

    // City state (modified)
    struct City {
        uint256 treasury;
        uint8 tier;
        address founder;        // Track city founder
        mapping(address => bool) members;  // Track city members
    }

    // State mappings
    mapping(address => PlayerState) public playerState;  // Standalone player state
    mapping(uint256 => City) public cities;             // City state
    mapping(address => uint256) public playerCity;      // Keep this for when players join cities
    
    // City tier requirements
    mapping(uint8 => uint256) public tierRequirements;
    
    // Building slots per tier
    mapping(uint8 => uint256) public buildingSlotsPerTier;
    
    // Maximum production time (24 hours in seconds)
    uint256 public constant MAX_PRODUCTION_TIME = 24 hours;

    // Events
    event CityJoined(address indexed player, uint256 indexed cityId);
    event CityTierUpgraded(uint256 indexed cityId, uint8 newTier);
    event BuildingSlotsUpdated(address indexed player, uint256 newSlots);
    event GoldDonated(address indexed player, uint256 amount);
    event GoldEarned(address indexed player, uint256 amount);
    event RepEarned(address indexed player, uint256 amount);
    event FoodEarned(address indexed player, uint256 amount);
    event ResourcesDeducted(address indexed player, uint256 gold, uint256 food, uint256 rep);
    event NFTMetadataUpdated(address indexed collection, uint256 indexed tokenId);
    event BuildingCreated(address indexed player, string buildingType, uint256 buildingId);
    event BuildingRemoved(address indexed player, string buildingType, uint256 buildingId);
    event GoldCollected(address indexed player, uint256 buildingId, uint256 amount);
    event DistrictBuildingsAddressUpdated(address indexed newAddress);
    event GridBuildingsAddressUpdated(address indexed newAddress);
    event TreasuryBurned(address indexed player, uint256 amount);
    event UpgradeLevelUnlocked(address indexed player, uint8 newLevel, uint256 totalRechargeAmount);
    event DiamondsEarned(address indexed player, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize tier requirements
        tierRequirements[0] = 0;      // Tier 0 is the starting tier, no requirement
        tierRequirements[1] = 1000;   // 1000 Gold for Tier 1
        tierRequirements[2] = 2500;   // 2500 Gold for Tier 2
        tierRequirements[3] = 5000;   // 5000 Gold for Tier 3
        tierRequirements[4] = 10000;  // 10000 Gold for Tier 4

        // Initialize building slots per tier
        buildingSlotsPerTier[0] = 9;   // 3x3 grid
        buildingSlotsPerTier[1] = 12;  // 3x4 grid
        buildingSlotsPerTier[2] = 16;  // 4x4 grid
        buildingSlotsPerTier[3] = 20;  // 4x5 grid
        buildingSlotsPerTier[4] = 25;  // 5x5 grid
    }

    /**
     * @dev Initialize a new player
     */
    function initializePlayer() external {
        require(playerState[msg.sender].buildingSlots == 0, "Player already initialized");
        
        PlayerState storage state = playerState[msg.sender];
        state.gold = 0;
        state.rep = 0;
        state.food = 0;
        state.diamonds = 0;
        state.buildingSlots = 9;
        state.tier = 0;
        state.treasury = 0;
        
        // Initialize mappings (they default to 0, but we can set them explicitly if needed)
        state.maxUpgradeLevelByType[0] = 1; // HOUSE starts at level 1
        state.maxUpgradeLevelByType[1] = 1; // FARM starts at level 1
        state.maxUpgradeLevelByType[2] = 1; // DIAMOND_STATION starts at level 1
        state.maxUpgradeLevelByType[3] = 1; // REP_STATION starts at level 1

        // Initialize core buildings for the new player
        (bool success, bytes memory returnData) = districtBuildingsAddress.call(
            abi.encodeWithSignature("initializeCoreBuildings(address)", msg.sender)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to initialize core buildings");
        }
    }

    // Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Set the DistrictBuildings contract address
     * @param _districtBuildingsAddress The address of the DistrictBuildings contract
     */
    function setDistrictBuildingsAddress(address _districtBuildingsAddress) external onlyOwner {
        districtBuildingsAddress = _districtBuildingsAddress;
        emit DistrictBuildingsAddressUpdated(_districtBuildingsAddress);
    }

    /**
     * @dev Set the GridBuildings contract address
     * @param _gridBuildingsAddress The address of the GridBuildings contract
     */
    function setGridBuildingsAddress(address _gridBuildingsAddress) external onlyOwner {
        gridBuildingsAddress = _gridBuildingsAddress;
        emit GridBuildingsAddressUpdated(_gridBuildingsAddress);
    }

    /**
     * @dev Set the BattleSystem contract address
     * @param _battleSystemAddress The address of the BattleSystem contract
     */
    function setBattleSystemAddress(address _battleSystemAddress) external onlyOwner {
        battleSystemAddress = _battleSystemAddress;
    }

    /**
     * @dev Deduct gold for district building construction
     * @param player The address of the player
     * @param amount The amount of gold to deduct
     */
    function deductGoldForDistrictBuilding(address player, uint256 amount) external {
        require(msg.sender == districtBuildingsAddress, "Only DistrictBuildings can call this function");
        require(playerState[player].gold >= amount, "Insufficient gold");
        playerState[player].gold -= amount;
    }

    /**
     * @dev Join a city
     * @param cityId The ID of the city to join
     */
    function joinCity(uint256 cityId) external nonReentrant {
        // This is a placeholder for future city formation logic
        // For now, we'll just set a default city ID of 1 for all players
        // This maintains compatibility with existing code while removing city joining requirements
        playerCity[msg.sender] = 1;
        
        // Set initial city state
        cities[cityId].members[msg.sender] = true;
        cities[cityId].tier = 0; // Start at tier 0
        
        emit CityJoined(msg.sender, 1);
    }

    /**
     * @dev Donate Gold to treasury
     * @param amount The amount of Gold to donate
     */
    function donateGold(uint256 amount) external nonReentrant {
        PlayerState storage state = playerState[msg.sender];
        require(state.gold >= amount, "Insufficient Gold");
        
        state.gold -= amount;
        state.treasury += amount;
        
        // Check for tier upgrade
        uint8 currentTier = state.tier;
        uint8 nextTier = currentTier + 1;
        
        // Check if player meets requirements for next tier
        while (nextTier <= 4 && state.treasury >= tierRequirements[nextTier]) {
            state.tier = nextTier;
            
            // Update building slots based on tier using the mapping
            state.buildingSlots = buildingSlotsPerTier[nextTier];
            
            // If player reaches tier 1, register them for matchmaking
            if (nextTier == 1) {
                (bool matchmakingSuccess, bytes memory returnData) = battleSystemAddress.call(
                    abi.encodeWithSignature("registerForMatchmaking()")
                );
                if (!matchmakingSuccess) {
                    // If the call failed, decode and propagate the error message
                    if (returnData.length > 0) {
                        assembly {
                            revert(add(returnData, 32), mload(returnData))
                        }
                    }
                    revert("Failed to register for matchmaking");
                }
            }
            
            emit CityTierUpgraded(0, nextTier);
            emit BuildingSlotsUpdated(msg.sender, state.buildingSlots);
            
            nextTier++;
        }
        
        // Calculate rep points (1% of donated amount, with tier multiplier)
        uint256 repPoints = (amount * 1) / 100; // 1% base rate
        
        // Apply tier multiplier (each tier gives 20% bonus, starting from tier 1)
        if (currentTier > 0) {
            repPoints = repPoints * (100 + (currentTier * 20)) / 100;
        }
        
        // Award rep points
        state.rep += repPoints;
        
        // Check for building unlocks in DistrictBuildings contract
        (bool success, ) = districtBuildingsAddress.call(
            abi.encodeWithSignature("checkAndUnlockDistrictBuildings(address,uint256)", msg.sender, state.treasury)
        );
        require(success, "Failed to check district building unlocks");
        
        emit GoldDonated(msg.sender, amount);
        emit RepEarned(msg.sender, repPoints);
    }

    /**
     * @dev Earn gold (can only be called by GridBuildings)
     * @param player The address of the player
     * @param amount The amount of gold to earn
     */
    function earnGold(address player, uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        playerState[player].gold += amount;
        emit GoldEarned(player, amount);
    }

    /**
     * @dev Earn food (can only be called by GridBuildings)
     * @param player The address of the player
     * @param amount The amount of food to earn
     */
    function earnFood(address player, uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        playerState[player].food += amount;
        emit FoodEarned(player, amount);
    }

    /**
     * @dev Earn reputation (can only be called by GridBuildings or BattleSystem)
     * @param player The address of the player
     * @param amount The amount of reputation to earn
     */
    function earnRep(address player, uint256 amount) external {
        require(
            msg.sender == gridBuildingsAddress || 
            msg.sender == battleSystemAddress, 
            "Only GridBuildings or BattleSystem can call this function"
        );
        playerState[player].rep += amount;
        emit RepEarned(player, amount);
    }

    /**
     * @dev Earn diamonds (can only be called by GridBuildings)
     * @param player The address of the player
     * @param amount The amount of diamonds to earn
     */
    function earnDiamonds(address player, uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        playerState[player].diamonds += amount;
        emit DiamondsEarned(player, amount);
    }

    /**
     * @dev Update building slots from Altar staking
     * @param player The address of the player
     * @param newSlots The new number of slots
     */
    function updateBuildingSlots(address player, uint256 newSlots) external {
        require(msg.sender == altarAddress, "Only Altar can update slots");
        playerState[player].buildingSlots = newSlots;
        emit BuildingSlotsUpdated(player, newSlots);
    }

    /**
     * @dev Get player's current building slots
     * @param player The address of the player
     * @return uint256 Number of available building slots
     */
    function getBuildingSlots(address player) external view returns (uint256) {
        return playerState[player].buildingSlots;
    }

    /**
     * @dev Get player's gold balance
     * @param player The address of the player
     * @return uint256 Player's gold balance
     */
    function getPlayerGold(address player) external view returns (uint256) {
        return playerState[player].gold;
    }

    /**
     * @dev Get player's food balance
     * @param player The address of the player
     * @return uint256 Player's food balance
     */
    function getPlayerFood(address player) external view returns (uint256) {
        return playerState[player].food;
    }

    /**
     * @dev Get player's reputation balance
     * @param player The address of the player
     * @return uint256 Player's reputation balance
     */
    function getPlayerRep(address player) external view returns (uint256) {
        return playerState[player].rep;
    }

    /**
     * @dev Get player's diamonds balance
     * @param player The address of the player
     * @return uint256 Player's diamonds balance
     */
    function getPlayerDiamonds(address player) external view returns (uint256) {
        return playerState[player].diamonds;
    }

    /**
     * @dev Get city's treasury balance
     * @param cityId The ID of the city
     * @return uint256 City's treasury balance
     */
    function getCityTreasury(uint256 cityId) external view returns (uint256) {
        require(cityId > 0, "Invalid city ID");
        return cities[cityId].treasury;
    }

    /**
     * @dev Update tier requirements (only owner)
     * @param tier The tier number
     * @param requirement The new requirement in Gold
     */
    function setTierRequirement(uint8 tier, uint256 requirement) external onlyOwner {
        tierRequirements[tier] = requirement;
    }

    /**
     * @dev Update altar address (only owner)
     * @param _altarAddress The new altar address
     */
    function setAltarAddress(address _altarAddress) external onlyOwner {
        altarAddress = _altarAddress;
    }

    /**
     * @dev Get player's treasury
     * @param player The address of the player
     * @return uint256 Player's treasury balance
     */
    function getPlayerTreasury(address player) external view returns (uint256) {
        return playerState[player].treasury;
    }

    /**
     * @dev Get player's tier
     * @param player The address of the player
     * @return uint8 The player's tier
     */
    function getPlayerTier(address player) external view returns (uint8) {
        return playerState[player].tier;
    }

    /**
     * @dev Deduct multiple resources from a player
     * @param player The address of the player
     * @param goldAmount The amount of gold to deduct (0 if not needed)
     * @param foodAmount The amount of food to deduct (0 if not needed)
     * @param repAmount The amount of rep to deduct (0 if not needed)
     */
    function deductResources(
        address player,
        uint256 goldAmount,
        uint256 foodAmount,
        uint256 repAmount
    ) external {
        require(
            msg.sender == districtBuildingsAddress || 
            msg.sender == gridBuildingsAddress || 
            msg.sender == battleSystemAddress, 
            "Unauthorized caller"
        );
        PlayerState storage state = playerState[player];
        
        // Check if player has enough resources
        if (goldAmount > 0) {
            require(state.gold >= goldAmount, "Insufficient gold");
            state.gold -= goldAmount;
        }
        
        if (foodAmount > 0) {
            require(state.food >= foodAmount, "Insufficient food");
            state.food -= foodAmount;
        }
        
        if (repAmount > 0) {
            require(state.rep >= repAmount, "Insufficient rep");
            state.rep -= repAmount;
        }
        
        emit ResourcesDeducted(player, goldAmount, foodAmount, repAmount);
    }

    /**
     * @dev Deduct gold (can only be called by GridBuildings)
     * @param player The address of the player
     * @param amount The amount of gold to deduct
     */
    function deductGold(address player, uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        require(playerState[player].gold >= amount, "Insufficient gold");
        playerState[player].gold -= amount;
    }

    /**
     * @dev Test function to earn gold (only for testing)
     * @param player The address of the player
     * @param amount The amount of gold to earn
     */
    function testEarnGold(address player, uint256 amount) external {
        // Only allow owner to call this function
        require(msg.sender == owner(), "Only owner can call this function");
        // Only allow in test environment
        require(block.chainid == 31337 || block.chainid == 1337, "Only available in test environment");
        
        playerState[player].gold += amount;
        emit GoldEarned(player, amount);
    }

    /**
     * @dev Test function to earn food (only for testing)
     * @param player The address of the player
     * @param amount The amount of food to earn
     */
    function testEarnFood(address player, uint256 amount) external {
        // Only allow owner to call this function
        require(msg.sender == owner(), "Only owner can call this function");
        // Only allow in test environment
        require(block.chainid == 31337 || block.chainid == 1337, "Only available in test environment");
        
        playerState[player].food += amount;
        emit FoodEarned(player, amount);
    }

    /**
     * @dev Burn treasury during battles
     * @param player The address of the player whose treasury is being burned
     * @param amount The amount of treasury to burn
     */
    function burnTreasury(address player, uint256 amount) external {
        require(msg.sender == battleSystemAddress, "Only BattleSystem can call this function");
        PlayerState storage state = playerState[player];
        require(state.treasury >= amount, "Insufficient treasury");
        
        state.treasury -= amount;
        emit TreasuryBurned(player, amount);
    }

    /**
     * @dev Track recharge amount and update upgrade level if threshold is met
     * @param player The address of the player
     * @param amount The amount of SONIC recharged
     * @param buildingType The type of building being recharged (0=HOUSE, 1=FARM, 2=REP_STATION)
     */
    function trackRechargeAmount(address player, uint256 amount, uint8 buildingType) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        require(buildingType <= 2, "Invalid building type"); // 0=HOUSE, 1=FARM, 2=REP_STATION
        
        PlayerState storage state = playerState[player];
        state.totalRechargeAmountByType[buildingType] += amount;
        
        // Check and update upgrade level based on thresholds
        checkAndUpdateUpgradeLevel(player, buildingType);
    }

    /**
     * @dev Check recharge thresholds and update max upgrade level
     * @param player The address of the player
     * @param buildingType The type of building
     */
    function checkAndUpdateUpgradeLevel(address player, uint8 buildingType) internal {
        PlayerState storage state = playerState[player];
        uint8 currentMaxLevel = state.maxUpgradeLevelByType[buildingType];
        uint8 newMaxLevel = currentMaxLevel;
        
        // Upgrade level thresholds (in SONIC wei) - now only 3 levels
        if (state.totalRechargeAmountByType[buildingType] >= UPGRADE_LEVEL_3_THRESHOLD) {
            newMaxLevel = 3;  // 0.1 SONIC for level 3
        } else if (state.totalRechargeAmountByType[buildingType] >= UPGRADE_LEVEL_2_THRESHOLD) {
            newMaxLevel = 2;  // 0.01 SONIC for level 2
        } else {
            newMaxLevel = 1;  // Default level 1
        }
        
        // Update if level increased
        if (newMaxLevel > currentMaxLevel) {
            state.maxUpgradeLevelByType[buildingType] = newMaxLevel;
            emit UpgradeLevelUnlocked(player, newMaxLevel, state.totalRechargeAmountByType[buildingType]);
        }
    }

    /**
     * @dev Get the maximum upgrade level a player can reach for a specific building type
     * @param player The address of the player
     * @param buildingType The type of building (0=HOUSE, 1=FARM, 2=REP_STATION)
     * @return uint8 The maximum upgrade level (1-3)
     */
    function getMaxUpgradeLevel(address player, uint8 buildingType) external view returns (uint8) {
        require(buildingType <= 2, "Invalid building type");
        return playerState[player].maxUpgradeLevelByType[buildingType];
    }

    /**
     * @dev Get the total recharge amount for a player for a specific building type
     * @param player The address of the player
     * @param buildingType The type of building (0=HOUSE, 1=FARM, 2=REP_STATION)
     * @return uint256 The total SONIC recharged for this building type
     */
    function getTotalRechargeAmount(address player, uint8 buildingType) external view returns (uint256) {
        require(buildingType <= 2, "Invalid building type");
        return playerState[player].totalRechargeAmountByType[buildingType];
    }

    /**
     * @dev Get progress towards next upgrade level for a building type
     * @param player The address of the player
     * @param buildingType The type of building (0=HOUSE, 1=FARM, 2=REP_STATION)
     * @return currentAmount Current recharge amount
     * @return nextThreshold Amount needed for next level
     * @return progressPercent Progress percentage (0-100)
     * @return currentLevel Current max upgrade level
     */
    function getUpgradeProgress(address player, uint8 buildingType) external view returns (
        uint256 currentAmount,
        uint256 nextThreshold,
        uint8 progressPercent,
        uint8 currentLevel
    ) {
        require(buildingType <= 2, "Invalid building type");
        
        PlayerState storage state = playerState[player];
        currentAmount = state.totalRechargeAmountByType[buildingType];
        currentLevel = state.maxUpgradeLevelByType[buildingType];
        
        if (currentLevel >= 3) {
            // Already at max level
            nextThreshold = 0;
            progressPercent = 100;
        } else if (currentLevel == 2) {
            // Progressing to level 3
            nextThreshold = UPGRADE_LEVEL_3_THRESHOLD;
            uint256 progress = currentAmount >= UPGRADE_LEVEL_2_THRESHOLD ? 
                currentAmount - UPGRADE_LEVEL_2_THRESHOLD : 0;
            uint256 required = UPGRADE_LEVEL_3_THRESHOLD - UPGRADE_LEVEL_2_THRESHOLD;
            progressPercent = required > 0 ? uint8((progress * 100) / required) : 0;
        } else {
            // Progressing to level 2
            nextThreshold = UPGRADE_LEVEL_2_THRESHOLD;
            progressPercent = uint8((currentAmount * 100) / UPGRADE_LEVEL_2_THRESHOLD);
        }
    }
}