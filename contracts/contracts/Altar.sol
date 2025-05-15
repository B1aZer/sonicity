// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./GameState.sol";

/**
 * @title Altar
 * @dev Contract for staking Sonicity NFTs
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract Altar is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to the Sonicity NFT contract
    IERC721 public sonicityNFT;
    
    // Reference to the GameState contract
    GameState public gameState;

    // Staking data structures
    struct Stake {
        uint256 tokenId;
        uint256 stakedAt;
        address owner;
        bool isActive;
    }

    // Mapping from token ID to stake data
    mapping(uint256 => Stake) public stakes;
    
    // Mapping from user address to their staked token IDs
    mapping(address => uint256[]) public userStakes;
    
    // Minimum staking duration in seconds (e.g., 7 days)
    uint256 public minStakingDuration;

    // Add mapping to track staked NFT to buildingId
    mapping(address => mapping(uint256 => uint256)) public stakedBuilding;

    // Events
    event NFTStaked(address indexed user, uint256 indexed tokenId, uint256 timestamp);
    event NFTUnstaked(address indexed user, uint256 indexed tokenId, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _sonicityNFT, address _gameState) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        sonicityNFT = IERC721(_sonicityNFT);
        gameState = GameState(_gameState);
        minStakingDuration = 7 days;
    }

    // Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Stake an NFT
     * @param tokenId The ID of the NFT to stake
     */
    function stake(uint256 tokenId) external nonReentrant {
        require(sonicityNFT.ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        require(!stakes[tokenId].isActive, "NFT already staked");
        
        // Get NFT metadata from GameState
        GameState.NFTMetadata memory metadata = gameState.getNFTMetadata(address(sonicityNFT), tokenId);
        
        // Check building slots
        require(metadata.buildingSlots > 0, "NFT must have at least 1 building slot");
             
        // Transfer NFT to this contract
        sonicityNFT.transferFrom(msg.sender, address(this), tokenId);
        
        // Create stake record
        stakes[tokenId] = Stake({
            tokenId: tokenId,
            stakedAt: block.timestamp,
            owner: msg.sender,
            isActive: true
        });
        
        // Add to user's staked tokens
        userStakes[msg.sender].push(tokenId);
        
        // Create a house for the player
        uint256 buildingId = gameState.createBuildingForPlayer(msg.sender, "house");
        stakedBuilding[address(sonicityNFT)][tokenId] = buildingId;
        
        emit NFTStaked(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @dev Unstake an NFT
     * @param tokenId The ID of the NFT to unstake
     */
    function unstake(uint256 tokenId) external nonReentrant {
        Stake memory stakeData = stakes[tokenId];
        require(stakeData.isActive, "NFT not staked");
        require(stakeData.owner == msg.sender, "Not the staker");
        require(
            block.timestamp >= stakeData.stakedAt + minStakingDuration,
            "Staking period not completed"
        );
        
        // Update stake status
        stakes[tokenId].isActive = false;
        
        // Remove from user's staked tokens
        uint256[] storage userTokens = userStakes[msg.sender];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == tokenId) {
                userTokens[i] = userTokens[userTokens.length - 1];
                userTokens.pop();
                break;
            }
        }
        
        // Transfer NFT back to owner
        sonicityNFT.transferFrom(address(this), msg.sender, tokenId);
        
        // In the unstake function, after updating stake status, remove the building and delete the mapping entry
        uint256 buildingId = stakedBuilding[address(sonicityNFT)][tokenId];
        gameState.removeBuildingForPlayer(msg.sender, buildingId);
        delete stakedBuilding[address(sonicityNFT)][tokenId];
        
        emit NFTUnstaked(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @dev Get all staked NFTs for a user
     * @param user The address of the user
     * @return Array of staked token IDs
     */
    function getUserStakes(address user) external view returns (uint256[] memory) {
        return userStakes[user];
    }

    /**
     * @dev Get stake data for a specific NFT
     * @param tokenId The ID of the NFT
     * @return Stake data
     */
    function getStakeData(uint256 tokenId) external view returns (Stake memory) {
        return stakes[tokenId];
    }

    /**
     * @dev Update minimum staking duration (only owner)
     * @param _duration New duration in seconds
     */
    function setMinStakingDuration(uint256 _duration) external onlyOwner {
        minStakingDuration = _duration;
    }
} 