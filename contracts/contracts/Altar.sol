// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./GameState.sol";
import "./GridBuildings.sol";

// Interface for NFT contracts that support mintForAltar
interface IMintableNFT {
    function mintForAltar(address to, uint256 tokenId) external;
    function burnForAltar(uint256 tokenId) external;
}

// Interface for Yield NFT contracts that support mintForAltar with REP amount
interface IYieldNFT {
    function mintForAltar(address to, uint256 tokenId, uint256 repAmount) external;
    function totalSupply() external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title Altar
 * @dev Contract for staking Sonicity NFTs with building upgrade preservation
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract Altar is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC721Receiver {
    // Reference to the GameState contract
    GameState public gameState;

    // Reference to the GridBuildings contract
    GridBuildings public gridBuildings;

    // Reference to the SonicityYieldNFT contract
    IYieldNFT public yieldNFT;

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

    // Yield Station specific data (stored in Altar, not GridBuildings)
    struct YieldStationData {
        uint256 nftTokenId;      // Staked NFT token ID
        uint256 repAmount;       // REP amount staked in NFT
        uint256 nftTier;         // NFT tier (1=Bronze, 2=Silver, 3=Gold, 4=Legendary)
        uint256 stakeTime;       // When NFT was staked
        uint256 lastClaimTime;   // Last time revenue was calculated
    }
    
    // Mapping from player to buildingId to yield station data
    mapping(address => mapping(uint256 => YieldStationData)) public yieldStationData;

    // Events
    event NFTStaked(address indexed user, uint256 indexed tokenId, uint256 buildingId, address indexed collection);
    event NFTUnstaked(address indexed user, uint256 indexed tokenId, uint256 timestamp, address indexed collection);
    event NFTMinted(address indexed user, uint256 indexed tokenId, address indexed collection, GridBuildings.GridBuildingType buildingType);
    event CollectionApproved(address indexed collection);
    event CollectionRemoved(address indexed collection);
    // New events for building data preservation
    event BuildingDataPreserved(address indexed collection, uint256 indexed tokenId, GridBuildings.GridBuildingType buildingType, uint8 level);
    event BuildingDataRestored(address indexed collection, uint256 indexed tokenId, GridBuildings.GridBuildingType buildingType, uint8 level);
    event YieldNFTStaked(address indexed user, uint256 indexed tokenId, uint256 buildingId, uint256 repAmount, uint256 nftTier);
    event NFTBurned(address indexed user, uint256 indexed tokenId, uint256 timestamp, address indexed collection);

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
        minStakingDuration = 30 hours;
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
     * @dev Mint and stake an NFT in one operation
     * @param collection The address of the NFT collection to mint from
     * @param tokenId The specific token ID to mint
     * @param buildingType The type of building to create (0: HOUSE, 1: FARM, 2: DIAMOND_STATION, 3: REP_FORGE)
     */
    function mintAndStake(address collection, uint256 tokenId, GridBuildings.GridBuildingType buildingType) external payable nonReentrant {
        require(approvedCollections[collection], "Collection not approved");
        
        // Step 1: Validate and collect payment
        _validateAndCollectPayment(buildingType);
        
        // Step 2: Mint the NFT directly to this contract
        IMintableNFT(collection).mintForAltar(address(this), tokenId);
        
        // Step 3: Stake the NFT (shared logic)
        _stakeNFT(collection, tokenId, buildingType);
    }

    /**
     * @dev Mint an NFT with payment validation
     * @param collection The address of the NFT collection to mint from
     * @param tokenId The specific token ID to mint
     * @param buildingType The type of building to create
     */
    function mint(address collection, uint256 tokenId, GridBuildings.GridBuildingType buildingType) external payable {
        require(approvedCollections[collection], "Collection not approved");
        
        // Validate and collect payment
        _validateAndCollectPayment(buildingType);
        
        // Mint to player
        IMintableNFT(collection).mintForAltar(msg.sender, tokenId);
        
        emit NFTMinted(msg.sender, tokenId, collection, buildingType);
    }

    /**
     * @dev Shared payment validation function
     * @param buildingType The type of building
     */
    function _validateAndCollectPayment(GridBuildings.GridBuildingType buildingType) internal {
        (uint256 cost, uint8 resourceType) = gridBuildings.getBuildingCost(buildingType);
        
        if (resourceType == 4) { // SONIC
            require(msg.value == cost, "Incorrect SONIC amount");
            // Add to revenue pool
            gridBuildings.addToRevenuePool(msg.value);
        } else {
            // Resource-based payment
            require(msg.value == 0, "No SONIC required for resource-based buildings");
            
            // Get player resources and validate
            uint256 gold = gameState.getPlayerGold(msg.sender);
            uint256 food = gameState.getPlayerFood(msg.sender);
            uint256 rep = gameState.getPlayerRep(msg.sender);
            uint256 diamonds = gameState.getPlayerDiamonds(msg.sender);
            
            if (resourceType == 0 && gold < cost) revert("Insufficient Gold");
            if (resourceType == 1 && food < cost) revert("Insufficient Food");
            if (resourceType == 2 && rep < cost) revert("Insufficient REP");
            if (resourceType == 3 && diamonds < cost) revert("Insufficient Diamonds");
            
            // Deduct resources using the existing deductResources function
            gameState.deductResources(msg.sender, 
                resourceType == 0 ? cost : 0,
                resourceType == 1 ? cost : 0,
                resourceType == 2 ? cost : 0,
                resourceType == 3 ? cost : 0
            );
        }
    }

    /**
     * @dev Shared staking logic function
     * @param collection The address of the NFT collection
     * @param tokenId The token ID to stake
     * @param buildingType The type of building to create
     */
    function _stakeNFT(address collection, uint256 tokenId, GridBuildings.GridBuildingType buildingType) internal {
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
        
        // Add to user's collection-specific staked tokens
        userStakesByCollection[msg.sender][collection].push(tokenId);
        
        uint256 buildingId = stakedBuilding[collection][tokenId];
        emit NFTStaked(msg.sender, tokenId, buildingId, collection);
    }

    /**
     * @dev Stake an NFT
     * @param tokenId The ID of the NFT to stake
     * @param buildingType The type of building to create (0: HOUSE, 1: FARM, 2: DIAMOND_STATION, 3: REP_FORGE)
     * @param collection The address of the NFT collection
     */
    function stake(uint256 tokenId, GridBuildings.GridBuildingType buildingType, address collection) external nonReentrant {
        require(approvedCollections[collection], "Collection not approved");
        require(IERC721(collection).ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        
        // Transfer NFT to this contract
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);
        
        // Use shared staking logic
        _stakeNFT(collection, tokenId, buildingType);
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
        GridBuildings.Building memory buildingData = gridBuildings.getBuilding(msg.sender, buildingId);
        
        // Preserve building data (buildingLevel > 0 indicates preserved data)
        stakes[collection][tokenId] = Stake({
            tokenId: tokenId,
            stakedAt: stakeData.stakedAt,
            owner: msg.sender,
            isActive: false,
            collection: collection,
            buildingType: buildingData.buildingType,
            buildingLevel: buildingData.level,        // This indicates preserved data exists
            lastUpgradeTime: buildingData.lastUpgradeTime
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
        emit BuildingDataPreserved(collection, tokenId, buildingData.buildingType, buildingData.level);
    }

    /**
     * @dev Burn an NFT permanently (destroys building and NFT)
     * @param collection The address of the NFT collection
     * @param tokenId The ID of the NFT to burn
     */
    function burnNFT(address collection, uint256 tokenId) external nonReentrant {
        Stake memory stakeData = stakes[collection][tokenId];
        require(stakeData.isActive, "NFT not staked");
        require(stakeData.owner == msg.sender, "Not the staker");
        require(
            block.timestamp >= stakeData.stakedAt + minStakingDuration,
            "Staking period not completed"
        );
        
        // Get building data before removal
        uint256 buildingId = stakedBuilding[stakeData.collection][tokenId];
        
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
        
        // Burn the NFT using the burnForAltar function
        IMintableNFT(stakeData.collection).burnForAltar(tokenId);
        
        // Clear stake data
        delete stakes[stakeData.collection][tokenId];
        
        emit NFTBurned(msg.sender, tokenId, block.timestamp, stakeData.collection);
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

    /**
     * @dev Set the SonicityYieldNFT contract address (only owner)
     * @param _yieldNFT The address of the SonicityYieldNFT contract
     */
    function setYieldNFT(address _yieldNFT) external onlyOwner {
        require(_yieldNFT != address(0), "Invalid yield NFT contract address");
        yieldNFT = IYieldNFT(_yieldNFT);
    }

    /**
     * @dev Mint a yield NFT by staking REP points
     * @param repAmount The amount of REP to stake for the NFT
     * @return tokenId The ID of the newly minted yield NFT
     */
    function mintYieldNFT(uint256 repAmount) external nonReentrant returns (uint256) {
        require(address(yieldNFT) != address(0), "Yield NFT contract not set");
        require(repAmount > 0, "REP amount must be positive");
        
        // Check if user has enough REP
        uint256 userRep = gameState.getPlayerRep(msg.sender);
        require(userRep >= repAmount, "Insufficient REP balance");
        
        // Deduct REP from user
        gameState.deductResources(msg.sender, 0, 0, repAmount, 0);
        
        // Get next token ID for yield NFT
        uint256 tokenId = yieldNFT.totalSupply() + 1;
        
        // Mint the yield NFT with the REP amount
        yieldNFT.mintForAltar(msg.sender, tokenId, repAmount);
        
        return tokenId;
    }

    /**
     * @dev Implementation of IERC721Receiver.onERC721Received
     * Required for the contract to receive NFTs when minting directly to the contract
     * @return bytes4 `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
     */
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ============ YIELD NFT STAKING FUNCTIONS ============

    /**
     * @dev Stake a yield NFT to create a yield station
     * @param tokenId The token ID of the yield NFT to stake
     */
    function stakeYieldNFT(uint256 tokenId) external nonReentrant {
        require(address(yieldNFT) != address(0), "Yield NFT contract not set");
        
        // Verify ownership
        require(yieldNFT.ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        
        // Get NFT details
        uint256 repAmount = getYieldNFTRepAmount(tokenId);
        uint256 nftTier = gridBuildings.calculateNFTTier(repAmount);
        
        // Use existing createBuilding function (gets all validation)
        uint256 buildingId = gridBuildings.createBuilding(
            msg.sender, 
            GridBuildings.GridBuildingType.YIELD_STATION, 
            0, 0
        );
        
        // Store yield-specific data in Altar
        yieldStationData[msg.sender][buildingId] = YieldStationData({
            nftTokenId: tokenId,
            repAmount: repAmount,
            nftTier: nftTier,
            stakeTime: block.timestamp,
            lastClaimTime: block.timestamp
        });
        
        // Transfer NFT to Altar
        IERC721(address(yieldNFT)).transferFrom(msg.sender, address(this), tokenId);
        
        // Store standard staking data
        stakes[address(yieldNFT)][tokenId] = Stake({
            tokenId: tokenId,
            stakedAt: block.timestamp,
            owner: msg.sender,
            isActive: true,
            collection: address(yieldNFT),
            buildingType: GridBuildings.GridBuildingType.YIELD_STATION,
            buildingLevel: 1,
            lastUpgradeTime: block.timestamp
        });
        
        // Add to user's collection-specific staked tokens
        userStakesByCollection[msg.sender][address(yieldNFT)].push(tokenId);
        
        // Update staked building mapping
        stakedBuilding[address(yieldNFT)][tokenId] = buildingId;
        
        emit YieldNFTStaked(msg.sender, tokenId, buildingId, repAmount, nftTier);
    }

    /**
     * @dev Get REP amount from a yield NFT token
     * @param tokenId The token ID to get REP amount for
     * @return uint256 The REP amount staked in this NFT
     */
    function getYieldNFTRepAmount(uint256 tokenId) public view returns (uint256) {
        // Call the yield NFT contract to get stake info
        (bool success, bytes memory data) = address(yieldNFT).staticcall(
            abi.encodeWithSignature("stakeInfo(uint256)", tokenId)
        );
        
        if (success && data.length >= 64) {
            (uint256 repAmount, ) = abi.decode(data, (uint256, uint256));
            return repAmount;
        }
        
        // Fallback: return 0 if call fails
        return 0;
    }

    /**
     * @dev Get yield station data for a specific building (called by GridBuildings for revenue distribution)
     * @param player The address of the player
     * @param buildingId The building ID
     * @return repAmount The REP amount staked in the NFT
     * @return nftTier The NFT tier
     */
    function getYieldStationData(address player, uint256 buildingId) external view returns (uint256 repAmount, uint256 nftTier) {
        YieldStationData storage data = yieldStationData[player][buildingId];
        return (data.repAmount, data.nftTier);
    }
} 