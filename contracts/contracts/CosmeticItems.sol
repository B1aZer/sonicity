// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title CosmeticItems
 * @dev Contract for managing purchasable cosmetic items for player customization
 */
contract CosmeticItems is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    
    // Resource types for pricing
    enum ResourceType {
        GOLD,
        DIAMONDS,
        FOOD,
        REP
    }
    
    // Cosmetic item configuration
    struct CosmeticConfig {
        string name;
        uint256 cost;
        ResourceType resourceType;
        bool enabled;
    }
    
    // Player cosmetic inventory - mapping(player => mapping(cosmeticId => owned))
    mapping(address => mapping(uint8 => bool)) public ownedCosmetics;
    
    // Cosmetic configurations
    mapping(uint8 => CosmeticConfig) public cosmeticConfigs;
    
    // Contract addresses
    address public gameStateAddress;
    
    // Events
    event CosmeticPurchased(address indexed player, uint8 indexed cosmeticId, uint256 cost, ResourceType resourceType);
    event CosmeticConfigUpdated(uint8 indexed cosmeticId, string name, uint256 cost, ResourceType resourceType);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        // Initialize cosmetic items with banner as the first item
        cosmeticConfigs[0] = CosmeticConfig({
            name: "Royal Banner",
            cost: 10,
            resourceType: ResourceType.DIAMONDS,
            enabled: true
        });
        
        // Add more cosmetic items here in the future
        // cosmeticConfigs[1] = CosmeticConfig({...});
    }
    
    /**
     * @dev Authorize the upgrade (required by UUPSUpgradeable)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev Set the GameState contract address
     * @param _gameStateAddress The address of the GameState contract
     */
    function setGameStateAddress(address _gameStateAddress) external onlyOwner {
        require(_gameStateAddress != address(0), "Invalid GameState address");
        gameStateAddress = _gameStateAddress;
    }
    
    /**
     * @dev Purchase a cosmetic item with the specified resource
     * @param cosmeticId The ID of the cosmetic to purchase
     */
    function purchaseCosmetic(uint8 cosmeticId) external nonReentrant {
        CosmeticConfig memory config = cosmeticConfigs[cosmeticId];
        require(config.enabled, "Cosmetic not available");
        require(config.cost > 0, "Invalid cosmetic");
        require(!ownedCosmetics[msg.sender][cosmeticId], "Already owned");
        
        // Deduct the required resource from player via GameState
        uint256 goldAmount = 0;
        uint256 foodAmount = 0;
        uint256 repAmount = 0;
        uint256 diamondAmount = 0;
        
        if (config.resourceType == ResourceType.GOLD) {
            goldAmount = config.cost;
        } else if (config.resourceType == ResourceType.FOOD) {
            foodAmount = config.cost;
        } else if (config.resourceType == ResourceType.REP) {
            repAmount = config.cost;
        } else if (config.resourceType == ResourceType.DIAMONDS) {
            diamondAmount = config.cost;
        }
        
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductResources(address,uint256,uint256,uint256,uint256)", 
                msg.sender, goldAmount, foodAmount, repAmount, diamondAmount)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct resources");
        }
        
        // Mark cosmetic as owned
        ownedCosmetics[msg.sender][cosmeticId] = true;
        
        emit CosmeticPurchased(msg.sender, cosmeticId, config.cost, config.resourceType);
    }
    

    
    /**
     * @dev Check if a player owns a specific cosmetic
     * @param player The player address
     * @param cosmeticId The cosmetic ID
     * @return bool Whether the player owns the cosmetic
     */
    function ownsCosmetic(address player, uint8 cosmeticId) external view returns (bool) {
        return ownedCosmetics[player][cosmeticId];
    }
    

    
    /**
     * @dev Get cosmetic configuration
     * @param cosmeticId The cosmetic ID
     * @return CosmeticConfig The cosmetic configuration
     */
    function getCosmeticConfig(uint8 cosmeticId) external view returns (CosmeticConfig memory) {
        return cosmeticConfigs[cosmeticId];
    }
    
    /**
     * @dev Get all owned cosmetics for a player
     * @param player The player address
     * @param maxId The maximum cosmetic ID to check (for pagination)
     * @return uint8[] Array of owned cosmetic IDs
     */
    function getOwnedCosmetics(address player, uint8 maxId) external view returns (uint8[] memory) {
        uint8[] memory tempResult = new uint8[](maxId + 1);
        uint8 count = 0;
        
        for (uint8 i = 0; i <= maxId; i++) {
            if (ownedCosmetics[player][i] && cosmeticConfigs[i].enabled) {
                tempResult[count] = i;
                count++;
            }
        }
        
        // Create properly sized array
        uint8[] memory result = new uint8[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = tempResult[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get all available cosmetics (for shop display)
     * @param maxId The maximum cosmetic ID to check
     * @return uint8[] Array of available cosmetic IDs
     */
    function getAvailableCosmetics(uint8 maxId) external view returns (uint8[] memory) {
        uint8[] memory tempResult = new uint8[](maxId + 1);
        uint8 count = 0;
        
        for (uint8 i = 0; i <= maxId; i++) {
            if (cosmeticConfigs[i].enabled && cosmeticConfigs[i].cost > 0) {
                tempResult[count] = i;
                count++;
            }
        }
        
        // Create properly sized array
        uint8[] memory result = new uint8[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = tempResult[i];
        }
        
        return result;
    }
    
    // Owner functions for managing cosmetics
    
    /**
     * @dev Add or update a cosmetic configuration (only owner)
     * @param cosmeticId The cosmetic ID
     * @param name The name of the cosmetic
     * @param cost The cost of the cosmetic
     * @param resourceType The type of resource required
     * @param enabled Whether the cosmetic is available
     */
    function setCosmeticConfig(
        uint8 cosmeticId,
        string memory name,
        uint256 cost,
        ResourceType resourceType,
        bool enabled
    ) external onlyOwner {
        cosmeticConfigs[cosmeticId] = CosmeticConfig({
            name: name,
            cost: cost,
            resourceType: resourceType,
            enabled: enabled
        });
        
        emit CosmeticConfigUpdated(cosmeticId, name, cost, resourceType);
    }
    
    /**
     * @dev Enable or disable a cosmetic (only owner)
     * @param cosmeticId The cosmetic ID
     * @param enabled Whether the cosmetic should be enabled
     */
    function setCosmeticEnabled(uint8 cosmeticId, bool enabled) external onlyOwner {
        cosmeticConfigs[cosmeticId].enabled = enabled;
    }
    
    /**
     * @dev Update cosmetic price (only owner)
     * @param cosmeticId The cosmetic ID
     * @param newPrice The new price
     */
    function setCosmeticPrice(uint8 cosmeticId, uint256 newPrice) external onlyOwner {
        cosmeticConfigs[cosmeticId].cost = newPrice;
        emit CosmeticConfigUpdated(cosmeticId, cosmeticConfigs[cosmeticId].name, newPrice, cosmeticConfigs[cosmeticId].resourceType);
    }
} 