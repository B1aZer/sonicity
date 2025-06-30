// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./GameState.sol";
import "./GridBuildings.sol";

/**
 * @title Altar
 * @dev Contract for staking Sonicity NFTs with building upgrade preservation
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract Altar is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to the GameState contract
    GameState public gameState;

    // Reference to the GridBuildings contract
    GridBuildings public gridBuildings;

    // Mapping of approved NFT collections
    mapping(address => bool) public approvedCollections;

    // Enhanced staking data structures with building data preservation
    struct Stake {
        uint256 tokenId;
        uint256 stakedAt;
        address owner;
        bool isActive;
        address collection;
        // Building data preservation fields
        GridBuildings.GridBuildingType buildingType;
        uint8 buildingLevel;      // 0 = no preserved data, >0 = has preserved data
        uint256 lastUpgradeTime;
    }

    // Mapping from token ID to stake data
    mapping(address => mapping(uint256 => Stake)) public stakes;
    
    // Mapping from user address to collection address to array of staked token IDs
    mapping(address => mapping(address => uint256[])) public userStakesByCollection;
    
    // Minimum staking duration in seconds (e.g., 7 days)
    uint256 public minStakingDuration;

    // Add mapping to track staked NFT to buildingId
    mapping(address => mapping(uint256 => uint256)) public stakedBuilding;

    // Events
    event NFTStaked(address indexed user, uint256 indexed tokenId, uint256 buildingId, address indexed collection);
    event NFTUnstaked(address indexed user, uint256 indexed tokenId, uint256 timestamp, address indexed collection);
    event CollectionApproved(address indexed collection);
    event CollectionRemoved(address indexed collection);
    // New events for building data preservation
    event BuildingDataPreserved(address indexed collection, uint256 indexed tokenId, GridBuildings.GridBuildingType buildingType, uint8 level);
    event BuildingDataRestored(address indexed collection, uint256 indexed tokenId, GridBuildings.GridBuildingType buildingType, uint8 level);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _gameStateAddress, address _gridBuildingsAddress) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        gameState = GameState(_gameStateAddress);
        gridBuildings = GridBuildings(_gridBuildingsAddress);
        minStakingDuration = 7 days;
    }

    // Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Approve a new NFT collection for staking
     * @param collection The address of the NFT collection to approve
     */
    function approveCollection(address collection) external onlyOwner {
        require(collection != address(0), "Invalid collection address");
        approvedCollections[collection] = true;
        emit CollectionApproved(collection);
    }

    /**
     * @dev Remove an NFT collection from approved collections
     * @param collection The address of the NFT collection to remove
     */
    function removeCollection(address collection) external onlyOwner {
        require(approvedCollections[collection], "Collection not approved");
        approvedCollections[collection] = false;
        emit CollectionRemoved(collection);
    }

    /**
     * @dev Stake an NFT
     * @param tokenId The ID of the NFT to stake
     * @param buildingType The type of building to create (0: HOUSE, 1: FARM, 2: REP_STATION)
     * @param collection The address of the NFT collection
     */
    function stake(uint256 tokenId, GridBuildings.GridBuildingType buildingType, address collection) external nonReentrant {
        require(approvedCollections[collection], "Collection not approved");
        require(IERC721(collection).ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        
        // Check if this NFT was previously staked and has preserved building data
        Stake memory existingStake = stakes[collection][tokenId];
        
        if (existingStake.buildingLevel > 0 && !existingStake.isActive) {
            // Restore building with preserved data
            uint256 restoredBuildingId = gridBuildings.createBuilding(
                msg.sender, 
                existingStake.buildingType, 
                existingStake.buildingLevel, 
                existingStake.lastUpgradeTime
            );
            
            // Update stake record to active state, clear preserved data
            stakes[collection][tokenId] = Stake({
                tokenId: tokenId,
                stakedAt: block.timestamp,
                owner: msg.sender,
                isActive: true,
                collection: collection,
                buildingType: buildingType,  // Use requested building type
                buildingLevel: 0,            // Clear preserved data
                lastUpgradeTime: 0           // Clear preserved data
            });
            
            // Update staked building mapping
            stakedBuilding[collection][tokenId] = restoredBuildingId;
            
            emit BuildingDataRestored(collection, tokenId, existingStake.buildingType, existingStake.buildingLevel);
        } else {
            // Create new building
            require(!existingStake.isActive, "NFT already staked");
            
            uint256 newBuildingId = gridBuildings.createBuilding(msg.sender, buildingType, 0, 0);
            
            // Create new stake record
            stakes[collection][tokenId] = Stake({
                tokenId: tokenId,
                stakedAt: block.timestamp,
                owner: msg.sender,
                isActive: true,
                collection: collection,
                buildingType: buildingType,
                buildingLevel: 1,
                lastUpgradeTime: block.timestamp
            });
            
            // Update staked building mapping
            stakedBuilding[collection][tokenId] = newBuildingId;
        }
        
        // Transfer NFT to this contract
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);
        
        // Add to user's collection-specific staked tokens
        userStakesByCollection[msg.sender][collection].push(tokenId);
        
        uint256 buildingId = stakedBuilding[collection][tokenId];
        emit NFTStaked(msg.sender, tokenId, buildingId, collection);
    }

    /**
     * @dev Unstake an NFT
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT to unstake
     */
    function unstake(address collection, uint256 tokenId) external nonReentrant {
        Stake memory stakeData = stakes[collection][tokenId];
        require(stakeData.isActive, "NFT not staked");
        require(stakeData.owner == msg.sender, "Not the staker");
        require(
            block.timestamp >= stakeData.stakedAt + minStakingDuration,
            "Staking period not completed"
        );
        
        // Get building data before removal
        uint256 buildingId = stakedBuilding[stakeData.collection][tokenId];
        
        // Get building data from GridBuildings
        (GridBuildings.GridBuildingType buildingType, uint8 level, uint256 lastUpgradeTime, , ) = gridBuildings.buildings(msg.sender, buildingId);
        
        // Preserve building data (buildingLevel > 0 indicates preserved data)
        stakes[collection][tokenId] = Stake({
            tokenId: tokenId,
            stakedAt: stakeData.stakedAt,
            owner: msg.sender,
            isActive: false,
            collection: collection,
            buildingType: buildingType,
            buildingLevel: level,        // This indicates preserved data exists
            lastUpgradeTime: lastUpgradeTime
        });
        
        // Remove from user's collection-specific staked tokens
        uint256[] storage userCollectionTokens = userStakesByCollection[msg.sender][stakeData.collection];
        for (uint256 i = 0; i < userCollectionTokens.length; i++) {
            if (userCollectionTokens[i] == tokenId) {
                userCollectionTokens[i] = userCollectionTokens[userCollectionTokens.length - 1];
                userCollectionTokens.pop();
                break;
            }
        }
        
        // Remove building from GridBuildings
        gridBuildings.removeBuilding(msg.sender, buildingId);
        delete stakedBuilding[stakeData.collection][tokenId];
        
        // Transfer NFT back to owner
        IERC721(stakeData.collection).transferFrom(address(this), msg.sender, tokenId);
        
        emit NFTUnstaked(msg.sender, tokenId, block.timestamp, stakeData.collection);
        emit BuildingDataPreserved(collection, tokenId, buildingType, level);
    }

    /**
     * @dev Get stake data for a specific NFT
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT
     * @return Stake data
     */
    function getStakeDataWithCollection(address collection, uint256 tokenId) external view returns (Stake memory) {
        return stakes[collection][tokenId];
    }

    /**
     * @dev Get all staked NFTs for a user from a specific collection
     * @param user The address of the user
     * @param collection The address of the NFT collection
     * @return Array of staked token IDs from the specified collection
     */
    function getUserStakesByCollection(address user, address collection) external view returns (uint256[] memory) {
        return userStakesByCollection[user][collection];
    }

    /**
     * @dev Check if NFT has preserved building data
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT
     * @return bool Whether the NFT has preserved building data
     */
    function hasPreservedBuildingData(address collection, uint256 tokenId) external view returns (bool) {
        return stakes[collection][tokenId].buildingLevel > 0;
    }

    /**
     * @dev Get preserved building data for an NFT
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT
     * @return buildingType The type of building that was preserved
     * @return level The level of the building that was preserved
     * @return lastUpgradeTime The timestamp of the last upgrade
     */
    function getPreservedBuildingData(address collection, uint256 tokenId) 
        external view returns (GridBuildings.GridBuildingType buildingType, uint8 level, uint256 lastUpgradeTime) {
        Stake memory stakeData = stakes[collection][tokenId];
        require(stakeData.buildingLevel > 0, "No preserved building data");
        return (stakeData.buildingType, stakeData.buildingLevel, stakeData.lastUpgradeTime);
    }

    /**
     * @dev Update minimum staking duration (only owner)
     * @param _duration New duration in seconds
     */
    function setMinStakingDuration(uint256 _duration) external onlyOwner {
        minStakingDuration = _duration;
    }
} 