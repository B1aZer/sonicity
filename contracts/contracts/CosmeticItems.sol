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
    
    // Cosmetic item types
    enum CosmeticType {
        BANNER,
        DECORATION,
        EFFECT,
        TERRAIN_MODIFIER
    }
    
    // Cosmetic item configuration
    struct CosmeticConfig {
        string name;
        string description;
        uint256 diamondCost;
        string modelPath;
        CosmeticType cosmeticType;
        bool enabled;
    }
    
    // Player cosmetic inventory - mapping(player => mapping(cosmeticId => owned))
    mapping(address => mapping(uint8 => bool)) public ownedCosmetics;
    
    // Player active cosmetics - mapping(player => mapping(cosmeticType => activeCosmeticId))
    mapping(address => mapping(CosmeticType => uint8)) public activeCosmetics;
    
    // Cosmetic configurations
    mapping(uint8 => CosmeticConfig) public cosmeticConfigs;
    
    // Contract addresses
    address public gameStateAddress;
    
    // Events
    event CosmeticPurchased(address indexed player, uint8 indexed cosmeticId, uint256 diamondCost);
    event CosmeticActivated(address indexed player, uint8 indexed cosmeticId, CosmeticType cosmeticType);
    event CosmeticDeactivated(address indexed player, CosmeticType cosmeticType);
    event CosmeticConfigUpdated(uint8 indexed cosmeticId, string name, uint256 diamondCost);
    
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
            description: "A majestic banner to display your achievements",
            diamondCost: 10,
            modelPath: "assets/banner.glb",
            cosmeticType: CosmeticType.BANNER,
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
     * @dev Purchase a cosmetic item with diamonds
     * @param cosmeticId The ID of the cosmetic to purchase
     */
    function purchaseCosmetic(uint8 cosmeticId) external nonReentrant {
        CosmeticConfig memory config = cosmeticConfigs[cosmeticId];
        require(config.enabled, "Cosmetic not available");
        require(config.diamondCost > 0, "Invalid cosmetic");
        require(!ownedCosmetics[msg.sender][cosmeticId], "Already owned");
        
        // Deduct diamonds from player via GameState
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("deductResources(address,uint256,uint256,uint256,uint256)", 
                msg.sender, 0, 0, 0, config.diamondCost)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct diamonds");
        }
        
        // Mark cosmetic as owned
        ownedCosmetics[msg.sender][cosmeticId] = true;
        
        // Auto-activate if it's the first of its type
        if (activeCosmetics[msg.sender][config.cosmeticType] == 0 || 
            !ownedCosmetics[msg.sender][activeCosmetics[msg.sender][config.cosmeticType]]) {
            activeCosmetics[msg.sender][config.cosmeticType] = cosmeticId;
            emit CosmeticActivated(msg.sender, cosmeticId, config.cosmeticType);
        }
        
        emit CosmeticPurchased(msg.sender, cosmeticId, config.diamondCost);
    }
    
    /**
     * @dev Activate a cosmetic item (switch between owned cosmetics)
     * @param cosmeticId The ID of the cosmetic to activate
     */
    function activateCosmetic(uint8 cosmeticId) external {
        require(ownedCosmetics[msg.sender][cosmeticId], "Cosmetic not owned");
        
        CosmeticConfig memory config = cosmeticConfigs[cosmeticId];
        require(config.enabled, "Cosmetic not available");
        
        activeCosmetics[msg.sender][config.cosmeticType] = cosmeticId;
        emit CosmeticActivated(msg.sender, cosmeticId, config.cosmeticType);
    }
    
    /**
     * @dev Deactivate a cosmetic type (remove active cosmetic)
     * @param cosmeticType The type of cosmetic to deactivate
     */
    function deactivateCosmetic(CosmeticType cosmeticType) external {
        activeCosmetics[msg.sender][cosmeticType] = 0;
        emit CosmeticDeactivated(msg.sender, cosmeticType);
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
     * @dev Get the active cosmetic for a player and type
     * @param player The player address
     * @param cosmeticType The cosmetic type
     * @return uint8 The active cosmetic ID (0 if none)
     */
    function getActiveCosmetic(address player, CosmeticType cosmeticType) external view returns (uint8) {
        return activeCosmetics[player][cosmeticType];
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
            if (cosmeticConfigs[i].enabled && cosmeticConfigs[i].diamondCost > 0) {
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
     * @param description The description
     * @param diamondCost The cost in diamonds
     * @param modelPath The path to the 3D model
     * @param cosmeticType The type of cosmetic
     * @param enabled Whether the cosmetic is available
     */
    function setCosmeticConfig(
        uint8 cosmeticId,
        string memory name,
        string memory description,
        uint256 diamondCost,
        string memory modelPath,
        CosmeticType cosmeticType,
        bool enabled
    ) external onlyOwner {
        cosmeticConfigs[cosmeticId] = CosmeticConfig({
            name: name,
            description: description,
            diamondCost: diamondCost,
            modelPath: modelPath,
            cosmeticType: cosmeticType,
            enabled: enabled
        });
        
        emit CosmeticConfigUpdated(cosmeticId, name, diamondCost);
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
     * @param newPrice The new price in diamonds
     */
    function setCosmeticPrice(uint8 cosmeticId, uint256 newPrice) external onlyOwner {
        cosmeticConfigs[cosmeticId].diamondCost = newPrice;
        emit CosmeticConfigUpdated(cosmeticId, cosmeticConfigs[cosmeticId].name, newPrice);
    }
} 