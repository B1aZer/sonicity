// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title AdventureSystem
 * @dev Contract for managing player adventures with tile-based exploration
 * Players can purchase starting scouts or use existing heroes to explore adventures
 */
contract AdventureSystem is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    
    // Tile types enum
    enum TileType { SAFE, REWARD, DISASTER, SPECIAL, DIAMOND }
    
    // Adventure struct
    struct Adventure {
        uint8 gridSize;              // 9, 12, 16, 20, 25 tiles based on tier
        uint256 startTime;           // When adventure started
        uint256 heroId;              // Hero NFT ID (0 if using starting scout)
        bool useStartingScout;       // True if using starting scout
        uint8 tilesRevealed;         // Number of tiles revealed
        uint8 totalTiles;            // Total tiles in grid
        uint256 goldCollected;       // Accumulated gold (not yet claimed)
        uint256 foodCollected;       // Accumulated food (not yet claimed)
        uint256 diamondsCollected;   // Accumulated diamonds (not yet claimed)
        uint256 repCollected;        // Accumulated REP (not yet claimed)
        uint8 relicsFound;           // Number of relic NFTs to mint
        bool active;                 // Adventure in progress
        bool disasterEncountered;    // Hit disaster - hero lost
    }
    
    // Starting scout state per player
    struct StartingScout {
        bool purchased;              // Has player bought starting scout
        bool onAdventure;            // Is scout currently on adventure
        uint256 availableAt;         // When scout is available again (3h cooldown)
    }
    
    // Tile reveal result
    struct TileResult {
        TileType tileType;
        uint256 goldReward;
        uint256 foodReward;
        uint256 diamondReward;
        uint256 repReward;
        bool relicFound;
    }
    
    // Constants
    uint256 public constant HERO_COOLDOWN = 3 hours;
    uint256 public constant STARTING_SCOUT_COST = 10 ether; // 10 SONIC
    
    // Tile probabilities (out of 100)
    uint8 public constant SAFE_CHANCE = 40;        // 40%
    uint8 public constant REWARD_CHANCE = 30;      // 30%
    uint8 public constant DISASTER_CHANCE = 15;    // 15%
    uint8 public constant DIAMOND_CHANCE = 10;     // 10%
    uint8 public constant SPECIAL_CHANCE = 5;      // 5%
    
    // Reward ranges
    uint256 public constant MIN_GOLD_REWARD = 50;
    uint256 public constant MAX_GOLD_REWARD = 300;
    uint256 public constant MIN_FOOD_REWARD = 25;
    uint256 public constant MAX_FOOD_REWARD = 150;
    uint256 public constant MIN_DIAMOND_REWARD = 1;
    uint256 public constant MAX_DIAMOND_REWARD = 5;
    uint256 public constant MIN_REP_REWARD = 10;
    uint256 public constant MAX_REP_REWARD = 50;
    
    // Mappings
    mapping(address => Adventure) public activeAdventures;
    mapping(address => StartingScout) public playerScouts;
    mapping(uint8 => uint8) public tierToGridSize; // Tier => grid size (9,12,16,20,25)
    mapping(uint256 => uint256) public heroAvailableAt; // heroId => timestamp when available
    mapping(address => mapping(uint8 => bool)) public revealedTiles; // player => tileIndex => revealed
    
    // Contract references
    address public gameStateAddress;
    address public heroNFTAddress;
    address public battleSystemAddress;
    address public relicNFTAddress;
    
    // Events
    event StartingScoutPurchased(address indexed player);
    event AdventureStarted(address indexed player, uint256 heroId, bool useStartingScout, uint8 gridSize);
    event TileRevealed(address indexed player, uint8 tileIndex, TileType tileType, uint256 goldReward, uint256 foodReward, uint256 diamondReward, uint256 repReward, bool relicFound);
    event AdventureCompleted(address indexed player, uint256 goldEarned, uint256 foodEarned, uint256 diamondsEarned, uint256 repEarned, uint8 relicsFound);
    event AdventureDisaster(address indexed player, uint256 heroId, bool wasStartingScout);
    event HeroLost(address indexed player, uint256 heroId);
    event StartingScoutLost(address indexed player);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        // Initialize tier to grid size mapping
        tierToGridSize[0] = 9;   // 3x3
        tierToGridSize[1] = 12;  // 3x4
        tierToGridSize[2] = 16;  // 4x4
        tierToGridSize[3] = 20;  // 4x5
        tierToGridSize[4] = 25;  // 5x5
    }
    
    /**
     * @dev Purchase starting scout with SONIC
     */
    function purchaseStartingScout() external payable nonReentrant {
        require(msg.value >= STARTING_SCOUT_COST, "Insufficient SONIC");
        require(!playerScouts[msg.sender].purchased, "Already have starting scout");
        
        playerScouts[msg.sender] = StartingScout({
            purchased: true,
            onAdventure: false,
            availableAt: block.timestamp
        });
        
        emit StartingScoutPurchased(msg.sender);
    }
    
    /**
     * @dev Start a new adventure
     * @param heroId Hero NFT ID to use (0 if using starting scout)
     * @param useStartingScout True to use starting scout instead of hero NFT
     */
    function startAdventure(uint256 heroId, bool useStartingScout) external nonReentrant {
        require(!activeAdventures[msg.sender].active, "Adventure already active");
        
        // Clear any old revealed tiles from previous adventures
        Adventure storage oldAdventure = activeAdventures[msg.sender];
        if (oldAdventure.totalTiles > 0) {
            for (uint8 i = 0; i < oldAdventure.totalTiles; i++) {
                delete revealedTiles[msg.sender][i];
            }
        }
        
        // Get player tier from GameState
        (bool success, bytes memory data) = gameStateAddress.staticcall(
            abi.encodeWithSignature("getPlayerTier(address)", msg.sender)
        );
        require(success, "Failed to get player tier");
        uint8 playerTier = abi.decode(data, (uint8));
        
        uint8 gridSize = tierToGridSize[playerTier];
        
        if (useStartingScout) {
            // Validate starting scout
            StartingScout storage scout = playerScouts[msg.sender];
            require(scout.purchased, "Starting scout not purchased");
            require(!scout.onAdventure, "Starting scout on adventure");
            require(block.timestamp >= scout.availableAt, "Starting scout on cooldown");
            
            // Mark scout as on adventure
            scout.onAdventure = true;
        } else {
            // Validate hero NFT
            require(heroId > 0, "Invalid hero ID");
            
            // Check hero ownership
            (success, data) = heroNFTAddress.staticcall(
                abi.encodeWithSignature("ownerOf(uint256)", heroId)
            );
            require(success, "Failed to check hero ownership");
            address heroOwner = abi.decode(data, (address));
            require(heroOwner == msg.sender, "Not hero owner");
            
            // Check hero availability
            require(block.timestamp >= heroAvailableAt[heroId], "Hero on cooldown");
        }
        
        // Create adventure
        activeAdventures[msg.sender] = Adventure({
            gridSize: gridSize,
            startTime: block.timestamp,
            heroId: heroId,
            useStartingScout: useStartingScout,
            tilesRevealed: 0,
            totalTiles: gridSize,
            goldCollected: 0,
            foodCollected: 0,
            diamondsCollected: 0,
            repCollected: 0,
            relicsFound: 0,
            active: true,
            disasterEncountered: false
        });
        
        emit AdventureStarted(msg.sender, heroId, useStartingScout, gridSize);
    }
    
    /**
     * @dev Reveal next tile - no cooldown, can reveal all tiles continuously
     */
    function revealTile(uint8 tileIndex) external nonReentrant returns (TileResult memory) {
        Adventure storage adventure = activeAdventures[msg.sender];
        require(adventure.active, "No active adventure");
        require(adventure.tilesRevealed < adventure.totalTiles, "All tiles revealed");
        require(tileIndex < adventure.totalTiles, "Invalid tile index");
        require(!revealedTiles[msg.sender][tileIndex], "Tile already revealed");
        
        // Mark tile as revealed
        revealedTiles[msg.sender][tileIndex] = true;
        
        // Generate random tile result
        TileResult memory result = _generateTileResult(msg.sender, tileIndex);
        
        adventure.tilesRevealed++;
        
        // Handle tile type
        if (result.tileType == TileType.SAFE) {
            // Nothing happens, continue
        } else if (result.tileType == TileType.REWARD) {
            // Add rewards to accumulated totals (Gold and Food only)
            adventure.goldCollected += result.goldReward;
            adventure.foodCollected += result.foodReward;
        } else if (result.tileType == TileType.DIAMOND) {
            // Guaranteed diamond reward
            adventure.diamondsCollected += result.diamondReward;
        } else if (result.tileType == TileType.SPECIAL) {
            // Add REP or mark relic found
            if (result.relicFound) {
                adventure.relicsFound++;
            } else {
                adventure.repCollected += result.repReward;
            }
        } else if (result.tileType == TileType.DISASTER) {
            // DISASTER: Lose everything and hero is LOST
            adventure.disasterEncountered = true;
            adventure.active = false;
            
            // Handle hero loss
            _handleHeroLoss(msg.sender, adventure);
            
            emit TileRevealed(msg.sender, adventure.tilesRevealed - 1, result.tileType, 0, 0, 0, 0, false);
            emit AdventureDisaster(msg.sender, adventure.heroId, adventure.useStartingScout);
            
            return result;
        }
        
        emit TileRevealed(
            msg.sender, 
            adventure.tilesRevealed - 1, 
            result.tileType, 
            result.goldReward, 
            result.foodReward,
            result.diamondReward,
            result.repReward, 
            result.relicFound
        );
        
        return result;
    }
    
    /**
     * @dev Complete adventure and claim rewards (manual return or all tiles revealed)
     */
    function completeAdventure() external nonReentrant {
        Adventure storage adventure = activeAdventures[msg.sender];
        require(adventure.active, "No active adventure");
        require(!adventure.disasterEncountered, "Adventure ended in disaster");
        
        // Distribute rewards to GameState
        if (adventure.goldCollected > 0 || adventure.foodCollected > 0 || adventure.repCollected > 0 || adventure.diamondsCollected > 0) {
            (bool success, ) = gameStateAddress.call(
                abi.encodeWithSignature(
                    "addResources(address,uint256,uint256,uint256,uint256)",
                    msg.sender,
                    adventure.goldCollected,
                    adventure.foodCollected,
                    adventure.repCollected,
                    adventure.diamondsCollected
                )
            );
            require(success, "Failed to add resources");
        }
        
        // Mint relic NFTs if any found
        if (adventure.relicsFound > 0) {
            for (uint8 i = 0; i < adventure.relicsFound; i++) {
                (bool success, ) = relicNFTAddress.call(
                    abi.encodeWithSignature("mintForAdventure(address)", msg.sender)
                );
                require(success, "Failed to mint relic");
            }
        }
        
        // Set hero/scout cooldown (3 hours)
        if (adventure.useStartingScout) {
            playerScouts[msg.sender].onAdventure = false;
            playerScouts[msg.sender].availableAt = block.timestamp + HERO_COOLDOWN;
        } else {
            heroAvailableAt[adventure.heroId] = block.timestamp + HERO_COOLDOWN;
        }
        
        emit AdventureCompleted(
            msg.sender,
            adventure.goldCollected,
            adventure.foodCollected,
            adventure.diamondsCollected,
            adventure.repCollected,
            adventure.relicsFound
        );
        
        // Clear adventure and revealed tiles
        _clearAdventure(msg.sender);
    }
    
    /**
     * @dev Handle hero loss on disaster
     */
    function _handleHeroLoss(address player, Adventure storage adventure) internal {
        if (adventure.useStartingScout) {
            // Starting scout is lost - need to buy again
            delete playerScouts[player];
            emit StartingScoutLost(player);
        } else {
            // Hero NFT is burned/lost
            (bool success, ) = heroNFTAddress.call(
                abi.encodeWithSignature("burn(uint256,address)", adventure.heroId, msg.sender)
            );
            require(success, "Failed to burn hero");
            
            emit HeroLost(player, adventure.heroId);
        }
    }
    
    /**
     * @dev Clear adventure and revealed tiles mapping
     */
    function _clearAdventure(address player) internal {
        Adventure storage adventure = activeAdventures[player];
        uint8 totalTiles = adventure.totalTiles;
        
        // Clear revealed tiles mapping
        for (uint8 i = 0; i < totalTiles; i++) {
            delete revealedTiles[player][i];
        }
        
        // Clear adventure
        adventure.active = false;
    }
    
    /**
     * @dev Generate random tile result based on probabilities
     */
    function _generateTileResult(address player, uint8 tileIndex) internal view returns (TileResult memory) {
        // Generate random number 0-99
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player,
            tileIndex
        ))) % 100;
        
        TileResult memory result;
        
        // Determine tile type based on probability ranges
        if (random < DISASTER_CHANCE) {
            // 0-14: DISASTER (15%)
            result.tileType = TileType.DISASTER;
        } else if (random < DISASTER_CHANCE + SPECIAL_CHANCE) {
            // 15-19: SPECIAL (5%)
            result.tileType = TileType.SPECIAL;
            
            // 65% chance for REP, 35% for relic
            uint256 specialRandom = uint256(keccak256(abi.encodePacked(random, player))) % 100;
            if (specialRandom < 65) {
                result.repReward = MIN_REP_REWARD + (uint256(keccak256(abi.encodePacked(random, tileIndex))) % (MAX_REP_REWARD - MIN_REP_REWARD + 1));
            } else {
                result.relicFound = true;
            }
        } else if (random < DISASTER_CHANCE + SPECIAL_CHANCE + REWARD_CHANCE) {
            // 20-49: REWARD (30%)
            result.tileType = TileType.REWARD;
            
            // 55% Gold, 45% Food (NO Diamonds - diamonds only from Diamond tiles)
            uint256 rewardTypeRandom = uint256(keccak256(abi.encodePacked(random, player, "type"))) % 100;
            if (rewardTypeRandom < 55) {
                // Gold reward (55%)
                result.goldReward = MIN_GOLD_REWARD + (uint256(keccak256(abi.encodePacked(random, tileIndex, "gold"))) % (MAX_GOLD_REWARD - MIN_GOLD_REWARD + 1));
            } else {
                // Food reward (45%)
                result.foodReward = MIN_FOOD_REWARD + (uint256(keccak256(abi.encodePacked(random, tileIndex, "food"))) % (MAX_FOOD_REWARD - MIN_FOOD_REWARD + 1));
            }
        } else if (random < DISASTER_CHANCE + SPECIAL_CHANCE + REWARD_CHANCE + DIAMOND_CHANCE) {
            // 50-59: DIAMOND (10%)
            result.tileType = TileType.DIAMOND;
            result.diamondReward = MIN_DIAMOND_REWARD + (uint256(keccak256(abi.encodePacked(random, tileIndex, "diamond"))) % (MAX_DIAMOND_REWARD - MIN_DIAMOND_REWARD + 1));
        } else {
            // 60-99: SAFE (40%)
            result.tileType = TileType.SAFE;
        }
        
        return result;
    }
    
    /**
     * @dev Get adventure status
     */
    function getAdventureStatus(address player) external view returns (Adventure memory) {
        return activeAdventures[player];
    }
    
    /**
     * @dev Check if starting scout is available
     */
    function isStartingScoutAvailable(address player) external view returns (bool) {
        StartingScout memory scout = playerScouts[player];
        return scout.purchased && !scout.onAdventure && block.timestamp >= scout.availableAt;
    }
    
    /**
     * @dev Check if hero is available for adventure
     */
    function isHeroAvailable(uint256 heroId) external view returns (bool) {
        return block.timestamp >= heroAvailableAt[heroId];
    }
    
    /**
     * @dev Get player's starting scout info
     */
    function getStartingScout(address player) external view returns (StartingScout memory) {
        return playerScouts[player];
    }
    
    /**
     * @dev Get grid size for player's tier
     */
    function getGridSizeForTier(uint8 tier) external view returns (uint8) {
        return tierToGridSize[tier];
    }
    
    /**
     * @dev Check if a specific tile is revealed
     */
    function isTileRevealed(address player, uint8 tileIndex) external view returns (bool) {
        return revealedTiles[player][tileIndex];
    }
    
    // Contract reference setters
    function setGameStateAddress(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        gameStateAddress = _address;
    }
    
    function setHeroNFTAddress(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        heroNFTAddress = _address;
    }
    
    function setBattleSystemAddress(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        battleSystemAddress = _address;
    }
    
    function setRelicNFTAddress(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        relicNFTAddress = _address;
    }
    
    /**
     * @dev Withdraw accumulated SONIC from scout purchases
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

