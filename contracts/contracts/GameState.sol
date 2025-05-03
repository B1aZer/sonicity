// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Altar.sol";

/**
 * @title GameState
 * @dev Contract for managing the overall game state including building slots, city tiers, and treasury
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract GameState is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to the Altar contract
    Altar public altar;

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
    
    // Events
    event CityJoined(address indexed player, uint256 indexed cityId);
    event CityTierUpgraded(uint256 indexed cityId, uint8 newTier);
    event BuildingSlotsUpdated(address indexed player, uint256 newSlots);
    event GoldDonated(address indexed player, uint256 amount);
    event GoldEarned(address indexed player, uint256 amount);
    event RepEarned(address indexed player, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _altar) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        altar = Altar(_altar);
        
        // Initialize tier requirements
        tierRequirements[1] = 1000 ether;  // 1000 Gold for Tier 1
        tierRequirements[2] = 5000 ether;  // 5000 Gold for Tier 2
        tierRequirements[3] = 10000 ether; // 10000 Gold for Tier 3
        tierRequirements[4] = 50000 ether; // 50000 Gold for Tier 4
        
        // Initialize building requirements
        // Format: buildingRequirements[tier]["buildingName"] = goldCost
        buildingRequirements[1]["Library"] = 500 ether;
        buildingRequirements[1]["Marketplace"] = 500 ether;
        buildingRequirements[1]["DefenseTower"] = 500 ether;
        buildingRequirements[2]["Barracks"] = 1000 ether;
        buildingRequirements[2]["Church"] = 1000 ether;
        buildingRequirements[2]["MageTower"] = 1000 ether;
        buildingRequirements[2]["LotteryHall"] = 1000 ether;
        buildingRequirements[3]["DiplomacyCenter"] = 2000 ether;
        buildingRequirements[3]["Bank"] = 2000 ether;
    }

    // Required by UUPS pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Join a city
     * @param cityId The ID of the city to join
     */
    function joinCity(uint256 cityId) external {
        require(playerCity[msg.sender] == 0, "Already in a city");
        require(cityId > 0, "Invalid city ID");
        
        playerCity[msg.sender] = cityId;
        cities[cityId].peaceShield = true; // New cities start with peace shield
        
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
        require(msg.sender == address(altar), "Only Altar can update slots");
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
     * @param _altar The new altar address
     */
    function setAltarAddress(address _altar) external onlyOwner {
        altar = Altar(_altar);
    }
} 