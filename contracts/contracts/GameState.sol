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

    // Structure to store NFT metadata
    struct NFTMetadata {
        uint8 district;      // District number (0-9)
        uint8 buildingSlots; // Number of building slots (1-5)
    }

    // Standalone player state
    struct PlayerState {
        uint256 gold;
        uint256 rep;
        uint256 buildingSlots;
        uint8 tier;
        uint256 treasury;
    }

    // Mapping from NFT contract address to token ID to metadata
    mapping(address => mapping(uint256 => NFTMetadata)) public nftMetadata;
    
    // List of approved NFT collections
    mapping(address => bool) public approvedCollections;
    
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
    event GoldCollected(address indexed player, uint256 buildingId, uint256 amount);
    event DistrictBuildingsAddressUpdated(address indexed newAddress);

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

        // Initialize building production rates (gold per hour)
        buildingProductionRates["house"] = 10;  // 10 gold per hour
        buildingProductionRates["water-supply"] = 15;
        buildingProductionRates["workshop"] = 20;
    }

    /**
     * @dev Initialize a new player
     */
    function initializePlayer() external {
        require(playerState[msg.sender].buildingSlots == 0, "Player already initialized");
        
        playerState[msg.sender] = PlayerState({
            gold: 0,
            rep: 0,
            buildingSlots: 9,
            tier: 0,
            treasury: 0
        });
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
        if (nextTier <= 4 && state.treasury >= tierRequirements[nextTier]) {
            state.tier = nextTier;
            emit CityTierUpgraded(0, nextTier);
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
     * @dev Earn Gold
     * @param amount The amount of Gold to earn
     */
    function earnGold(uint256 amount) external nonReentrant {
        playerState[msg.sender].gold += amount;
        emit GoldEarned(msg.sender, amount);
    }

    /**
     * @dev Earn Rep points
     * @param amount The amount of Rep to earn
     */
    function earnRep(uint256 amount) external nonReentrant {
        playerState[msg.sender].rep += amount;
        emit RepEarned(msg.sender, amount);
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
     * @dev Get player's reputation balance
     * @param player The address of the player
     * @return uint256 Player's reputation balance
     */
    function getPlayerRep(address player) external view returns (uint256) {
        return playerState[player].rep;
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
     * @dev Create a new building
     * @param buildingType The type of building to create
     * @return uint256 The ID of the created building
     */
    function createBuilding(string memory buildingType) external nonReentrant returns (uint256) {
        PlayerState storage state = playerState[msg.sender];
        
        // Check if building type is valid
        require(buildingProductionRates[buildingType] > 0, "Invalid building type");
        
        // For Tier 0, only allow houses and enforce 3x3 grid
        if (state.tier == 0) {
            require(keccak256(bytes(buildingType)) == keccak256(bytes("house")), "Only houses allowed in Tier 0");
            require(playerBuildingCounts[msg.sender].total < 9, "Tier 0 grid is full (3x3)");
        }
        
        // Check available slots
        require(
            playerBuildingCounts[msg.sender].total < state.buildingSlots,
            "No building slots available"
        );
        
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
        
        return buildingId;
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
     * @dev Get building IDs of a specific type for a player
     * @param player The address of the player
     * @param buildingType The type of building
     * @return uint256[] Array of building IDs of the specified type
     */
    function getBuildingIdsOfType(address player, string memory buildingType) public view returns (uint256[] memory) {
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
    function calculateTotalClaimableGold(address player) public view returns (uint256) {
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
                
                // Cap the time passed at 24 hours
                if (timePassed > MAX_PRODUCTION_TIME) {
                    timePassed = MAX_PRODUCTION_TIME;
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

    /**
     * @dev Collect gold from all buildings of a specific type
     * @param buildingType The type of building to collect from
     * @return totalCollected The total amount of gold collected
     */
    function collectAllGoldByType(string memory buildingType) external nonReentrant returns (uint256 totalCollected) {
        // Get all building IDs of the specified type
        uint256[] memory buildingIds = getBuildingIdsOfType(msg.sender, buildingType);
        
        // Collect gold from each building
        for (uint256 i = 0; i < buildingIds.length; i++) {
            uint256 buildingId = buildingIds[i];
            Building storage building = buildings[msg.sender][buildingId];
            
            // Skip if building is not active or not of the specified type
            if (!building.active || keccak256(bytes(building.buildingType)) != keccak256(bytes(buildingType))) {
                continue;
            }
            
            // Calculate time since last collection
            uint256 timeSinceLastCollection = block.timestamp - building.lastCollectionTime;
            if (timeSinceLastCollection > MAX_PRODUCTION_TIME) {
                timeSinceLastCollection = MAX_PRODUCTION_TIME;
            }
            
            // Calculate gold to collect
            uint256 goldToCollect = (buildingProductionRates[buildingType] * timeSinceLastCollection) / 1 hours;
            if (goldToCollect > 0) {
                // Update building state
                building.lastCollectionTime = block.timestamp;
                
                // Add gold to player's balance
                playerState[msg.sender].gold += goldToCollect;
                totalCollected += goldToCollect;
                
                emit GoldCollected(msg.sender, buildingId, goldToCollect);
            }
        }
        
        return totalCollected;
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
     * @dev Create a new building on behalf of a player (only callable by Altar)
     * @param player The address of the player
     * @param buildingType The type of building to create
     * @return uint256 The ID of the created building
     */
    function createBuildingForPlayer(address player, string memory buildingType) external nonReentrant returns (uint256) {
        require(msg.sender == altarAddress, "Only Altar can create buildings for players");
        
        PlayerState storage state = playerState[player];
        
        // Check if building type is valid
        require(buildingProductionRates[buildingType] > 0, "Invalid building type");
        
        // For Tier 0, only allow houses and enforce 3x3 grid
        if (state.tier == 0) {
            require(keccak256(bytes(buildingType)) == keccak256(bytes("house")), "Only houses allowed in Tier 0");
            require(playerBuildingCounts[player].total < 9, "Tier 0 grid is full (3x3)");
        }
        
        // Check available slots
        require(
            playerBuildingCounts[player].total < state.buildingSlots,
            "No building slots available"
        );
        
        // Create building
        uint256 buildingId = nextBuildingId[player]++;
        buildings[player][buildingId] = Building({
            buildingType: buildingType,
            level: 1,
            lastUpgradeTime: block.timestamp,
            lastCollectionTime: block.timestamp,
            active: true
        });
        
        // Update counts
        playerBuildingCounts[player].total++;
        playerBuildingCounts[player].byType[buildingType]++;
        
        emit BuildingCreated(player, buildingType, buildingId);
        
        return buildingId;
    }

    /**
     * @dev Remove a building on behalf of a player (only callable by Altar)
     * @param player The address of the player
     * @param buildingId The ID of the building to remove
     */
    function removeBuildingForPlayer(address player, uint256 buildingId) external nonReentrant {
        require(msg.sender == altarAddress, "Only Altar can remove buildings for players");
        require(buildings[player][buildingId].active, "Building already removed or doesn't exist");

        string memory buildingType = buildings[player][buildingId].buildingType;

        buildings[player][buildingId].active = false;
        playerBuildingCounts[player].total--;
        playerBuildingCounts[player].byType[buildingType]--;

        emit BuildingRemoved(player, buildingType, buildingId);
    }
}