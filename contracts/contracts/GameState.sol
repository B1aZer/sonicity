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

    // Structure to store NFT metadata
    struct NFTMetadata {
        uint8 district;      // District number (0-9)
        uint8 buildingSlots; // Number of building slots (1-5)
    }

    // Mapping from NFT contract address to token ID to metadata
    mapping(address => mapping(uint256 => NFTMetadata)) public nftMetadata;
    
    // List of approved NFT collections
    mapping(address => bool) public approvedCollections;
    
    // City state
    struct City {
        uint256 treasury;
        uint8 tier;
        uint256 lastTierUpgrade;
        bool peaceShield;
        mapping(address => uint256) playerGold;
        mapping(address => uint256) playerRep;
        mapping(address => uint256) playerBuildingSlots;
        mapping(address => uint256) playerMaxBuildingSlots;
    }

    // Mapping from city ID to city data
    mapping(uint256 => City) public cities;
    
    // Mapping from player to their current city
    mapping(address => uint256) public playerCity;
    
    // City tier requirements
    mapping(uint8 => uint256) public tierRequirements;
    
    // Building unlock requirements
    mapping(uint8 => mapping(string => uint256)) public buildingRequirements;
    
    // Building state
    struct Building {
        string buildingType;
        uint256 level;
        uint256 lastUpgradeTime;
        uint256 lastCollectionTime;  // New field to track last gold collection
        bool active;
    }

    // Mapping from player => buildingId => Building
    mapping(address => mapping(uint256 => Building)) public buildings;
    // Mapping from player => next available buildingId
    mapping(address => uint256) public nextBuildingId;
    // Building count tracking
    struct BuildingCount {
        uint256 total;
        mapping(string => uint256) byType;
    }
    mapping(address => BuildingCount) public playerBuildingCounts;

    // Building costs
    mapping(string => uint256) public buildingCosts;

    // Building production rates (gold per hour)
    mapping(string => uint256) public buildingProductionRates;

    // Maximum production time (24 hours in seconds)
    uint256 public constant MAX_PRODUCTION_TIME = 24 hours;

    // Events
    event CityJoined(address indexed player, uint256 indexed cityId);
    event CityTierUpgraded(uint256 indexed cityId, uint8 newTier);
    event BuildingSlotsUpdated(address indexed player, uint256 newSlots);
    event GoldDonated(address indexed player, uint256 amount);
    event GoldEarned(address indexed player, uint256 amount);
    event RepEarned(address indexed player, uint256 amount);
    event CollectionApproved(address indexed collection);
    event CollectionRemoved(address indexed collection);
    event NFTMetadataUpdated(address indexed collection, uint256 indexed tokenId);
    event BuildingCreated(address indexed player, string buildingType, uint256 buildingId);
    event BuildingRemoved(address indexed player, string buildingType, uint256 buildingId);
    event BuildingUpgraded(address indexed player, string buildingType, uint256 buildingId, uint256 newLevel);
    event GoldCollected(address indexed player, uint256 buildingId, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize tier requirements
        tierRequirements[1] = 1000;  // 1000 Gold for Tier 1
        tierRequirements[2] = 5000;  // 5000 Gold for Tier 2
        tierRequirements[3] = 10000; // 10000 Gold for Tier 3
        tierRequirements[4] = 50000; // 50000 Gold for Tier 4
        
        // Initialize building costs
        buildingCosts["house"] = 100;  // 100 Gold for a house
        buildingCosts["water-supply"] = 200;
        buildingCosts["workshop"] = 300;

        // Initialize building production rates (gold per hour)
        buildingProductionRates["house"] = 10;  // 10 gold per hour
        buildingProductionRates["water-supply"] = 15;
        buildingProductionRates["workshop"] = 20;
        
        // Initialize building requirements
        // Format: buildingRequirements[tier]["buildingName"] = goldCost
        buildingRequirements[1]["Library"] = 500;
        buildingRequirements[1]["Marketplace"] = 500;
        buildingRequirements[1]["DefenseTower"] = 500;
        buildingRequirements[2]["Barracks"] = 1000;
        buildingRequirements[2]["Church"] = 1000;
        buildingRequirements[2]["MageTower"] = 1000;
        buildingRequirements[2]["LotteryHall"] = 1000;
        buildingRequirements[3]["DiplomacyCenter"] = 2000;
        buildingRequirements[3]["Bank"] = 2000;
    }

    // Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Approve a new NFT collection
     * @param collection The address of the NFT collection
     */
    function approveCollection(address collection) external onlyOwner {
        approvedCollections[collection] = true;
        emit CollectionApproved(collection);
    }

    /**
     * @dev Remove an NFT collection
     * @param collection The address of the NFT collection
     */
    function removeCollection(address collection) external onlyOwner {
        approvedCollections[collection] = false;
        emit CollectionRemoved(collection);
    }

    /**
     * @dev Set metadata for an NFT
     * @param collection The address of the NFT collection
     * @param tokenId The token ID
     * @param metadata The metadata to set
     */
    function setNFTMetadata(
        address collection,
        uint256 tokenId,
        NFTMetadata memory metadata
    ) external onlyOwner {
        require(approvedCollections[collection], "Collection not approved");
        nftMetadata[collection][tokenId] = metadata;
        emit NFTMetadataUpdated(collection, tokenId);
    }

    /**
     * @dev Get metadata for an NFT
     * @param collection The address of the NFT collection
     * @param tokenId The token ID
     * @return NFTMetadata The metadata for the NFT
     */
    function getNFTMetadata(
        address collection,
        uint256 tokenId
    ) external view returns (NFTMetadata memory) {
        NFTMetadata memory metadata = nftMetadata[collection][tokenId];
        // If metadata is not set (district and buildingSlots are 0), return default values
        if (metadata.district == 0 && metadata.buildingSlots == 0) {
            return NFTMetadata({
                district: 0,
                buildingSlots: 5
            });
        }
        return metadata;
    }

    /**
     * @dev Verify NFT ownership
     * @param collection The address of the NFT collection
     * @param tokenId The token ID
     * @param owner The address to verify ownership for
     * @return bool Whether the address owns the NFT
     */
    function verifyNFTOwnership(
        address collection,
        uint256 tokenId,
        address owner
    ) external view returns (bool) {
        require(approvedCollections[collection], "Collection not approved");
        return IERC721(collection).ownerOf(tokenId) == owner;
    }

    /**
     * @dev Join a city
     * @param cityId The ID of the city to join
     */
    function joinCity(uint256 cityId) external {
        require(playerCity[msg.sender] == 0, "Already in a city");
        require(cityId > 0, "Invalid city ID");
        
        playerCity[msg.sender] = cityId;
        cities[cityId].peaceShield = true; // New cities start with peace shield
        
        // Grant initial gold to new players
        cities[cityId].playerGold[msg.sender] = 500; // Starting gold amount
        
        emit CityJoined(msg.sender, cityId);
    }

    /**
     * @dev Donate Gold to city treasury
     * @param amount The amount of Gold to donate
     */
    function donateGold(uint256 amount) external nonReentrant {
        uint256 cityId = playerCity[msg.sender];
        require(cityId > 0, "Not in a city");
        require(cities[cityId].playerGold[msg.sender] >= amount, "Insufficient Gold");
        
        cities[cityId].playerGold[msg.sender] -= amount;
        cities[cityId].treasury += amount;
        
        emit GoldDonated(msg.sender, amount);
    }

    /**
     * @dev Earn Gold
     * @param amount The amount of Gold to earn
     */
    function earnGold(uint256 amount) external nonReentrant {
        uint256 cityId = playerCity[msg.sender];
        require(cityId > 0, "Not in a city");
        
        cities[cityId].playerGold[msg.sender] += amount;
        
        emit GoldEarned(msg.sender, amount);
    }

    /**
     * @dev Earn Rep points
     * @param amount The amount of Rep to earn
     */
    function earnRep(uint256 amount) external nonReentrant {
        uint256 cityId = playerCity[msg.sender];
        require(cityId > 0, "Not in a city");
        
        cities[cityId].playerRep[msg.sender] += amount;
        
        emit RepEarned(msg.sender, amount);
    }

    /**
     * @dev Update building slots from Altar staking
     * @param player The address of the player
     * @param newSlots The new number of slots
     */
    function updateBuildingSlots(address player, uint256 newSlots) external {
        require(msg.sender == altarAddress, "Only Altar can update slots");
        uint256 cityId = playerCity[player];
        require(cityId > 0, "Player not in a city");
        
        cities[cityId].playerBuildingSlots[player] = newSlots;
        cities[cityId].playerMaxBuildingSlots[player] = newSlots;
        
        emit BuildingSlotsUpdated(player, newSlots);
    }

    /**
     * @dev Check if a building can be unlocked
     * @param buildingName The name of the building
     * @return bool Whether the building can be unlocked
     */
    function canUnlockBuilding(string memory buildingName) external view returns (bool) {
        uint256 cityId = playerCity[msg.sender];
        require(cityId > 0, "Not in a city");
        
        uint8 currentTier = cities[cityId].tier;
        return cities[cityId].treasury >= buildingRequirements[currentTier][buildingName];
    }

    /**
     * @dev Get player's current building slots
     * @param player The address of the player
     * @return uint256 Number of available building slots
     */
    function getBuildingSlots(address player) external view returns (uint256) {
        uint256 cityId = playerCity[player];
        require(cityId > 0, "Player not in a city");
        return cities[cityId].playerBuildingSlots[player];
    }

    /**
     * @dev Get player's maximum building slots
     * @param player The address of the player
     * @return uint256 Maximum number of building slots
     */
    function getMaxBuildingSlots(address player) external view returns (uint256) {
        uint256 cityId = playerCity[player];
        require(cityId > 0, "Player not in a city");
        return cities[cityId].playerMaxBuildingSlots[player];
    }

    /**
     * @dev Get player's gold balance
     * @param player The address of the player
     * @return uint256 Player's gold balance
     */
    function getPlayerGold(address player) external view returns (uint256) {
        uint256 cityId = playerCity[player];
        require(cityId > 0, "Player not in a city");
        return cities[cityId].playerGold[player];
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
     * @dev Update building requirements (only owner)
     * @param tier The tier number
     * @param buildingName The name of the building
     * @param requirement The new requirement in Gold
     */
    function setBuildingRequirement(uint8 tier, string memory buildingName, uint256 requirement) external onlyOwner {
        buildingRequirements[tier][buildingName] = requirement;
    }

    /**
     * @dev Update altar address (only owner)
     * @param _altarAddress The new altar address
     */
    function setAltarAddress(address _altarAddress) external onlyOwner {
        altarAddress = _altarAddress;
    }

    /**
     * @dev Create a new building
     * @param buildingType The type of building to create
     */
    function createBuilding(string memory buildingType) external nonReentrant {
        uint256 cityId = playerCity[msg.sender];
        require(cityId > 0, "Not in a city");
        
        // Check building cost
        uint256 cost = buildingCosts[buildingType];
        require(cost > 0, "Invalid building type");
        require(cities[cityId].playerGold[msg.sender] >= cost, "Insufficient Gold");
        
        // Check available slots
        require(
            playerBuildingCounts[msg.sender].total < cities[cityId].playerBuildingSlots[msg.sender],
            "No building slots available"
        );
        
        // Deduct gold
        cities[cityId].playerGold[msg.sender] -= cost;
        
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
        playerBuildingCounts[msg.sender].total++;
        playerBuildingCounts[msg.sender].byType[buildingType]++;
        
        emit BuildingCreated(msg.sender, buildingType, buildingId);
    }

    /**
     * @dev Get total buildings for a player
     * @param player The address of the player
     * @return uint256 Total number of buildings
     */
    function getTotalBuildings(address player) external view returns (uint256) {
        return playerBuildingCounts[player].total;
    }

    /**
     * @dev Get buildings of a specific type for a player
     * @param player The address of the player
     * @param buildingType The type of building
     * @return uint256 Number of buildings of that type
     */
    function getBuildingsByType(address player, string memory buildingType) external view returns (uint256) {
        return playerBuildingCounts[player].byType[buildingType];
    }

    /**
     * @dev Remove a building
     * @param buildingId The ID of the building to remove
     */
    function removeBuilding(uint256 buildingId) external nonReentrant {
        require(buildings[msg.sender][buildingId].active, "Building already removed or doesn't exist");
        
        string memory buildingType = buildings[msg.sender][buildingId].buildingType;
        
        // Mark building as inactive
        buildings[msg.sender][buildingId].active = false;
        
        // Update counts
        playerBuildingCounts[msg.sender].total--;
        playerBuildingCounts[msg.sender].byType[buildingType]--;
        
        emit BuildingRemoved(msg.sender, buildingType, buildingId);
    }

    /**
     * @dev Get all buildings for a player
     * @param player The address of the player
     * @return Building[] Array of all buildings
     */
    function getAllBuildings(address player) external view returns (Building[] memory) {
        uint256 totalBuildings = playerBuildingCounts[player].total;
        Building[] memory result = new Building[](totalBuildings);
        uint256 resultIndex = 0;
        
        // Iterate through all possible building IDs
        for (uint256 i = 0; i < nextBuildingId[player]; i++) {
            if (buildings[player][i].active) {
                result[resultIndex] = buildings[player][i];
                resultIndex++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get all buildings of a specific type for a player
     * @param player The address of the player
     * @param buildingType The type of building
     * @return Building[] Array of buildings of the specified type
     */
    function getBuildingsOfType(address player, string memory buildingType) external view returns (Building[] memory) {
        uint256 count = playerBuildingCounts[player].byType[buildingType];
        Building[] memory result = new Building[](count);
        uint256 resultIndex = 0;
        
        // Iterate through all possible building IDs
        for (uint256 i = 0; i < nextBuildingId[player]; i++) {
            if (buildings[player][i].active && 
                keccak256(bytes(buildings[player][i].buildingType)) == keccak256(bytes(buildingType))) {
                result[resultIndex] = buildings[player][i];
                resultIndex++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get all building IDs for a player (internal)
     * @param player The address of the player
     * @return uint256[] Array of active building IDs
     */
    function getBuildingIds(address player) internal view returns (uint256[] memory) {
        uint256 totalBuildings = playerBuildingCounts[player].total;
        uint256[] memory result = new uint256[](totalBuildings);
        uint256 resultIndex = 0;
        
        // Iterate through all possible building IDs
        for (uint256 i = 0; i < nextBuildingId[player]; i++) {
            if (buildings[player][i].active) {
                result[resultIndex] = i;
                resultIndex++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get all building IDs for a player (external)
     * @param player The address of the player
     * @return uint256[] Array of active building IDs
     */
    function getPlayerBuildingIds(address player) external view returns (uint256[] memory) {
        return getBuildingIds(player);
    }

    /**
     * @dev Collect gold from a building
     * @param buildingId The ID of the building to collect from
     */
    function collectGold(uint256 buildingId) external nonReentrant {
        require(buildings[msg.sender][buildingId].active, "Building not active");
        
        Building storage building = buildings[msg.sender][buildingId];
        uint256 currentTime = block.timestamp;
        
        // Calculate time passed since last collection
        uint256 timePassed = currentTime - building.lastCollectionTime;
        
        // Check if building has exceeded its 24-hour production period
        uint256 totalTimeSinceCreation = currentTime - building.lastUpgradeTime;
        if (totalTimeSinceCreation > MAX_PRODUCTION_TIME) {
            // If we've already collected all possible gold, return 0
            if (building.lastCollectionTime >= building.lastUpgradeTime + MAX_PRODUCTION_TIME) {
                return;
            }
            // Otherwise, only collect remaining time up to 24 hours
            timePassed = (building.lastUpgradeTime + MAX_PRODUCTION_TIME) - building.lastCollectionTime;
        }
        
        // Calculate gold to collect based on production rate and time passed
        uint256 productionRate = buildingProductionRates[building.buildingType];
        uint256 goldToCollect = (productionRate * timePassed * building.level) / 3600; // Convert to per-second rate
        
        // Update last collection time
        building.lastCollectionTime = currentTime;
        
        // Add gold to player's balance
        uint256 cityId = playerCity[msg.sender];
        cities[cityId].playerGold[msg.sender] += goldToCollect;
        
        emit GoldCollected(msg.sender, buildingId, goldToCollect);
    }

    /**
     * @dev Collect gold from all buildings
     * @return uint256 Total gold collected
     */
    function collectAllGold() external nonReentrant returns (uint256) {
        uint256 totalGold = 0;
        uint256 currentTime = block.timestamp;
        uint256 cityId = playerCity[msg.sender];
        
        // Get all building IDs
        uint256[] memory buildingIds = getBuildingIds(msg.sender);
        
        for (uint256 i = 0; i < buildingIds.length; i++) {
            uint256 buildingId = buildingIds[i];
            Building storage building = buildings[msg.sender][buildingId];
            
            if (building.active) {
                // Calculate time passed since last collection
                uint256 timePassed = currentTime - building.lastCollectionTime;
                
                // Check if building has exceeded its 24-hour production period
                uint256 totalTimeSinceCreation = currentTime - building.lastUpgradeTime;
                if (totalTimeSinceCreation > MAX_PRODUCTION_TIME) {
                    // If we've already collected all possible gold, skip this building
                    if (building.lastCollectionTime >= building.lastUpgradeTime + MAX_PRODUCTION_TIME) {
                        continue;
                    }
                    // Otherwise, only collect remaining time up to 24 hours
                    timePassed = (building.lastUpgradeTime + MAX_PRODUCTION_TIME) - building.lastCollectionTime;
                }
                
                // Calculate gold to collect based on production rate and time passed
                uint256 productionRate = buildingProductionRates[building.buildingType];
                uint256 goldToCollect = (productionRate * timePassed * building.level) / 3600; // Convert to per-second rate
                
                // Update last collection time
                building.lastCollectionTime = currentTime;
                
                // Add to total gold
                totalGold += goldToCollect;
                
                emit GoldCollected(msg.sender, buildingId, goldToCollect);
            }
        }
        
        // Add total gold to player's balance
        cities[cityId].playerGold[msg.sender] += totalGold;
        
        return totalGold;
    }

    /**
     * @dev Get building IDs of a specific type for a player
     * @param player The address of the player
     * @param buildingType The type of building
     * @return uint256[] Array of building IDs of the specified type
     */
    function getBuildingIdsOfType(address player, string memory buildingType) external view returns (uint256[] memory) {
        uint256 count = playerBuildingCounts[player].byType[buildingType];
        uint256[] memory result = new uint256[](count);
        uint256 resultIndex = 0;
        
        // Iterate through all possible building IDs
        for (uint256 i = 0; i < nextBuildingId[player]; i++) {
            if (buildings[player][i].active && 
                keccak256(bytes(buildings[player][i].buildingType)) == keccak256(bytes(buildingType))) {
                result[resultIndex] = i;
                resultIndex++;
            }
        }
        
        return result;
    }

    /**
     * @dev Get building details by ID
     * @param player The address of the player
     * @param buildingId The ID of the building
     * @return Building The building details
     */
    function getBuilding(address player, uint256 buildingId) external view returns (Building memory) {
        require(buildings[player][buildingId].active, "Building doesn't exist or is inactive");
        return buildings[player][buildingId];
    }

    /**
     * @dev Calculate total claimable gold for a player without collecting it
     * @param player The address of the player
     * @return uint256 Total claimable gold
     */
    function calculateTotalClaimableGold(address player) external view returns (uint256) {
        uint256 totalGold = 0;
        uint256 currentTime = block.timestamp;
        
        // Get all building IDs
        uint256[] memory buildingIds = getBuildingIds(player);
        
        for (uint256 i = 0; i < buildingIds.length; i++) {
            uint256 buildingId = buildingIds[i];
            Building storage building = buildings[player][buildingId];
            
            if (building.active) {
                // Calculate time passed since last collection
                uint256 timePassed = currentTime - building.lastCollectionTime;
                
                // Check if building has exceeded its 24-hour production period
                uint256 totalTimeSinceCreation = currentTime - building.lastUpgradeTime;
                if (totalTimeSinceCreation > MAX_PRODUCTION_TIME) {
                    // If we've already collected all possible gold, skip this building
                    if (building.lastCollectionTime >= building.lastUpgradeTime + MAX_PRODUCTION_TIME) {
                        continue;
                    }
                    // Otherwise, only collect remaining time up to 24 hours
                    timePassed = (building.lastUpgradeTime + MAX_PRODUCTION_TIME) - building.lastCollectionTime;
                }
                
                // Calculate gold to collect based on production rate and time passed
                uint256 productionRate = buildingProductionRates[building.buildingType];
                uint256 goldToCollect = (productionRate * timePassed * building.level) / 3600; // Convert to per-second rate
                
                // Add to total gold
                totalGold += goldToCollect;
            }
        }
        
        return totalGold;
    }

    /**
     * @dev Get building production rate
     * @param buildingType The type of building
     * @return uint256 The production rate in gold per hour
     */
    function getBuildingProductionRate(string memory buildingType) external view returns (uint256) {
        return buildingProductionRates[buildingType];
    }

    /**
     * @dev Set building production rate (only owner)
     * @param buildingType The type of building
     * @param rate The new production rate (gold per hour)
     */
    function setBuildingProductionRate(string memory buildingType, uint256 rate) external onlyOwner {
        buildingProductionRates[buildingType] = rate;
    }
} 