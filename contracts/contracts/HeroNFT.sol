// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

/**
 * @title HeroNFT
 * @dev Contract for managing hero NFTs with 3 fixed templates
 */
contract HeroNFT is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, ERC721Upgradeable {
    
    // Reference to GameState contract
    address public gameStateAddress;
    
    // Hero classes
    enum HeroClass { WARRIOR, STRATEGIST, SCOUT }
    
    // Hero structure
    struct Hero {
        string name;
        HeroClass class;
        uint8 troopBonus;  // +20 power per troop type
        bool isDeployed;
        uint256 lastBattleTime;
    }
    
    // Hero costs (Gold + Food + Diamonds)
    struct HeroCost {
        uint256 goldCost;
        uint256 foodCost;
        uint256 diamondCost;
    }
    
    // Mappings
    mapping(uint256 => Hero) public heroes;
    mapping(address => mapping(HeroClass => bool)) public playerHeroes; // Track which heroes player owns
    mapping(address => uint256) public deployedHero; // Track deployed hero ID per player
    
    // Hero templates (3 fixed templates)
    mapping(HeroClass => Hero) public heroTemplates;
    mapping(HeroClass => HeroCost) public heroCosts;
    
    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Events
    event HeroMinted(address indexed player, uint256 heroId, HeroClass class);
    event HeroDeployed(address indexed player, uint256 heroId);
    event HeroUndeployed(address indexed player, uint256 heroId);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __ERC721_init("Sonicity Heroes", "HERO");
        
        _initializeHeroTemplates();
        _initializeHeroCosts();
    }
    
    /**
     * @dev Initialize hero templates
     */
    function _initializeHeroTemplates() internal {
        // WARRIOR - Iron Guardian
        heroTemplates[HeroClass.WARRIOR] = Hero({
            name: "Iron Guardian",
            class: HeroClass.WARRIOR,
            troopBonus: 20,
            isDeployed: false,
            lastBattleTime: 0
        });
        
        // STRATEGIST - Shadow Tactician
        heroTemplates[HeroClass.STRATEGIST] = Hero({
            name: "Shadow Tactician",
            class: HeroClass.STRATEGIST,
            troopBonus: 20,
            isDeployed: false,
            lastBattleTime: 0
        });
        
        // SCOUT - Swift Scout
        heroTemplates[HeroClass.SCOUT] = Hero({
            name: "Swift Scout",
            class: HeroClass.SCOUT,
            troopBonus: 20,
            isDeployed: false,
            lastBattleTime: 0
        });
    }
    
    /**
     * @dev Initialize hero costs
     */
    function _initializeHeroCosts() internal {
        // WARRIOR - Iron Guardian
        heroCosts[HeroClass.WARRIOR] = HeroCost({
            goldCost: 1500,
            foodCost: 1000,
            diamondCost: 40
        });
        
        // STRATEGIST - Shadow Tactician
        heroCosts[HeroClass.STRATEGIST] = HeroCost({
            goldCost: 1200,
            foodCost: 1200,
            diamondCost: 35
        });
        
        // SCOUT - Swift Scout
        heroCosts[HeroClass.SCOUT] = HeroCost({
            goldCost: 1000,
            foodCost: 1000,
            diamondCost: 30
        });
    }
    
    /**
     * @dev Mint a hero
     * @param class The hero class to mint
     */
    function mintHero(HeroClass class) external nonReentrant {
        require(!hasHero(msg.sender, class), "Already have this hero");
        require(hasResources(msg.sender, class), "Insufficient resources");
        
        // Deduct resources
        deductResources(msg.sender, class);
        
        // Mint hero
        uint256 heroId = _tokenIdCounter++;
        _mint(msg.sender, heroId);
        
        // Set hero data
        heroes[heroId] = heroTemplates[class];
        playerHeroes[msg.sender][class] = true;
        
        emit HeroMinted(msg.sender, heroId, class);
    }
    
    /**
     * @dev Check if player has a specific hero
     * @param player The player address
     * @param class The hero class
     * @return bool Whether player has this hero
     */
    function hasHero(address player, HeroClass class) public view returns (bool) {
        return playerHeroes[player][class];
    }
    
    /**
     * @dev Get hero data
     * @param heroId The hero ID
     * @return Hero The hero data
     */
    function getHero(uint256 heroId) external view returns (Hero memory) {
        require(_ownerOf(heroId) != address(0), "Hero does not exist");
        return heroes[heroId];
    }
    
    /**
     * @dev Deploy hero for battle
     * @param heroId The hero ID to deploy
     */
    function deployHero(uint256 heroId) external {
        require(_ownerOf(heroId) != address(0), "Hero does not exist");
        require(ownerOf(heroId) == msg.sender, "Not your hero");
        require(!heroes[heroId].isDeployed, "Hero already deployed");
        require(deployedHero[msg.sender] == 0, "Already have deployed hero");
        
        heroes[heroId].isDeployed = true;
        deployedHero[msg.sender] = heroId;
        
        emit HeroDeployed(msg.sender, heroId);
    }
    
    /**
     * @dev Undeploy hero after battle
     * @param heroId The hero ID to undeploy
     */
    function undeployHero(uint256 heroId) external {
        require(_ownerOf(heroId) != address(0), "Hero does not exist");
        require(ownerOf(heroId) == msg.sender, "Not your hero");
        require(heroes[heroId].isDeployed, "Hero not deployed");
        require(deployedHero[msg.sender] == heroId, "Not your deployed hero");
        
        heroes[heroId].isDeployed = false;
        deployedHero[msg.sender] = 0;
        
        emit HeroUndeployed(msg.sender, heroId);
    }
    
    /**
     * @dev Get deployed hero for player
     * @param player The player address
     * @return uint256 The deployed hero ID (0 if none)
     */
    function getDeployedHero(address player) external view returns (uint256) {
        return deployedHero[player];
    }

    /**
     * @dev Get current token ID counter (for testing)
     * @return uint256 The current token ID counter
     */
    function getTokenIdCounter() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Check if player has sufficient resources for hero
     * @param player The player address
     * @param class The hero class
     * @return bool Whether player has sufficient resources
     */
    function hasResources(address player, HeroClass class) internal view returns (bool) {
        HeroCost memory cost = heroCosts[class];
        
        // Call GameState to check resources
        (bool success, bytes memory data) = gameStateAddress.staticcall(
            abi.encodeWithSignature(
                "getPlayerGold(address)",
                player
            )
        );
        
        if (!success) return false;
        uint256 playerGold = abi.decode(data, (uint256));
        
        (success, data) = gameStateAddress.staticcall(
            abi.encodeWithSignature(
                "getPlayerFood(address)",
                player
            )
        );
        
        if (!success) return false;
        uint256 playerFood = abi.decode(data, (uint256));
        
        (success, data) = gameStateAddress.staticcall(
            abi.encodeWithSignature(
                "getPlayerDiamonds(address)",
                player
            )
        );
        
        if (!success) return false;
        uint256 playerDiamonds = abi.decode(data, (uint256));
        
        return playerGold >= cost.goldCost && 
               playerFood >= cost.foodCost && 
               playerDiamonds >= cost.diamondCost;
    }
    
    /**
     * @dev Deduct resources for hero purchase
     * @param player The player address
     * @param class The hero class
     */
    function deductResources(address player, HeroClass class) internal {
        HeroCost memory cost = heroCosts[class];
        
        // Call GameState to deduct all resources at once
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature(
                "deductResources(address,uint256,uint256,uint256,uint256)",
                player,
                cost.goldCost,
                cost.foodCost,
                0, // No rep cost
                cost.diamondCost
            )
        );
        
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct resources");
        }
    }
    
    /**
     * @dev Calculate hero bonus for troops
     * @param heroId The hero ID
     * @param infantryCount Number of infantry troops
     * @param cavalryCount Number of cavalry troops
     * @param siegeCount Number of siege troops
     * @return uint256 The total hero bonus
     */
    function calculateHeroBonus(
        uint256 heroId,
        uint256 infantryCount,
        uint256 cavalryCount,
        uint256 siegeCount
    ) external view returns (uint256) {
        require(_ownerOf(heroId) != address(0), "Hero does not exist");
        Hero memory hero = heroes[heroId];
        
        // Check if the hero is actually deployed
        if (!hero.isDeployed) return 0;
        
        if (hero.class == HeroClass.WARRIOR) {
            return infantryCount * hero.troopBonus;
        } else if (hero.class == HeroClass.STRATEGIST) {
            return siegeCount * hero.troopBonus;
        } else if (hero.class == HeroClass.SCOUT) {
            return cavalryCount * hero.troopBonus;
        }
        
        return 0;
    }
    
    /**
     * @dev Set GameState address
     * @param _gameStateAddress The GameState contract address
     */
    function setGameStateAddress(address _gameStateAddress) external onlyOwner {
        gameStateAddress = _gameStateAddress;
    }
    
    /**
     * @dev Get hero cost
     * @param class The hero class
     * @return HeroCost The hero cost structure
     */
    function getHeroCost(HeroClass class) external view returns (HeroCost memory) {
        return heroCosts[class];
    }
    
    /**
     * @dev Get hero template
     * @param class The hero class
     * @return Hero The hero template
     */
    function getHeroTemplate(HeroClass class) external view returns (Hero memory) {
        return heroTemplates[class];
    }
    
    /**
     * @dev Get player's hero count
     * @param player The player address
     * @return uint256 Number of heroes owned
     */
    function getPlayerHeroCount(address player) external view returns (uint256) {
        uint256 count = 0;
        if (hasHero(player, HeroClass.WARRIOR)) count++;
        if (hasHero(player, HeroClass.STRATEGIST)) count++;
        if (hasHero(player, HeroClass.SCOUT)) count++;
        return count;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 