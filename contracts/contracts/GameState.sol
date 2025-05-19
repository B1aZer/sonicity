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

    // Structure to store NFT metadata
    struct NFTMetadata {
        uint8 district;      // District number (0-9)
        uint8 buildingSlots; // Number of building slots (1-5)
    }

    // Standalone player state
    struct PlayerState {
        uint256 gold;
        uint256 rep;
        uint256 food;
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
    event CollectionApproved(address indexed collection);
    event CollectionRemoved(address indexed collection);
    event NFTMetadataUpdated(address indexed collection, uint256 indexed tokenId);
    event BuildingCreated(address indexed player, string buildingType, uint256 buildingId);
    event BuildingRemoved(address indexed player, string buildingType, uint256 buildingId);
    event GoldCollected(address indexed player, uint256 buildingId, uint256 amount);
    event DistrictBuildingsAddressUpdated(address indexed newAddress);
    event GridBuildingsAddressUpdated(address indexed newAddress);
    event DistrictBuildingDamaged(address indexed player, uint8 buildingType);

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
    }

    /**
     * @dev Initialize a new player
     */
    function initializePlayer() external {
        require(playerState[msg.sender].buildingSlots == 0, "Player already initialized");
        
        playerState[msg.sender] = PlayerState({
            gold: 0,
            rep: 0,
            food: 0,
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
     * @dev Set the GridBuildings contract address
     * @param _gridBuildingsAddress The address of the GridBuildings contract
     */
    function setGridBuildingsAddress(address _gridBuildingsAddress) external onlyOwner {
        gridBuildingsAddress = _gridBuildingsAddress;
        emit GridBuildingsAddressUpdated(_gridBuildingsAddress);
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
            
            // Increase building slots based on tier
            if (nextTier == 1) {
                state.buildingSlots = 12;  // Set to 12 slots at tier 1
            } else if (nextTier == 2) {
                state.buildingSlots = 16;  // Set to 16 slots at tier 2
            } else if (nextTier == 3) {
                state.buildingSlots = 20;  // Set to 20 slots at tier 3
            } else if (nextTier == 4) {
                state.buildingSlots = 25;  // Set to 25 slots at tier 4
            }
            
            emit CityTierUpgraded(0, nextTier);
            emit BuildingSlotsUpdated(msg.sender, state.buildingSlots);
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
     * @param amount The amount of gold to earn
     */
    function earnGold(uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        playerState[msg.sender].gold += amount;
        emit GoldEarned(msg.sender, amount);
    }

    /**
     * @dev Earn food (can only be called by GridBuildings)
     * @param amount The amount of food to earn
     */
    function earnFood(uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
        playerState[msg.sender].food += amount;
        emit FoodEarned(msg.sender, amount);
    }

    /**
     * @dev Earn reputation (can only be called by GridBuildings)
     * @param amount The amount of reputation to earn
     */
    function earnRep(uint256 amount) external {
        require(msg.sender == gridBuildingsAddress, "Only GridBuildings can call this function");
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
     * @dev Get player's treasury
     * @param player The address of the player
     * @return uint256 Player's treasury balance
     */
    function getPlayerTreasury(address player) external view returns (uint256) {
        return playerState[player].treasury;
    }

    /**
     * @dev Damage a district building
     * @param player The address of the player whose building is being damaged
     * @param buildingType The type of building being damaged
     */
    function damageDistrictBuilding(address player, uint8 buildingType) external {
        require(msg.sender == owner() || msg.sender == districtBuildingsAddress, "Only owner or DistrictBuildings can call this function");
        
        // Call DistrictBuildings contract to damage the building
        (bool success, ) = districtBuildingsAddress.call(
            abi.encodeWithSignature("damageDistrictBuilding(address,uint8)", player, buildingType)
        );
        require(success, "Failed to damage building");
        
        emit DistrictBuildingDamaged(player, buildingType);
    }

    /**
     * @dev Get player's tier
     * @param player The address of the player
     * @return uint8 The player's tier
     */
    function getPlayerTier(address player) external view returns (uint8) {
        return playerState[player].tier;
    }
}