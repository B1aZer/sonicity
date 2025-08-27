// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

/**
 * @title TacticsNFT
 * @dev Contract for managing tactics NFTs with 9 fixed cards
 */
contract TacticsNFT is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, ERC1155Upgradeable {
    
    // Reference to GameState contract
    address public gameStateAddress;
    
    // Tactic types
    enum TacticType { STRIKE, SHIELD, TRICK }
    
    // Hero classes (for reference)
    enum HeroClass { WARRIOR, STRATEGIST, SCOUT }
    
    // Tactic structure
    struct Tactic {
        uint8 tacticId;
        string name;
        TacticType tacticType;
        uint8 effectMagnitude;  // 3, 2, 1 for STRIKE; 75, 50, 25 for SHIELD; 30, 20, 15 for TRICK
        uint256 cost;
    }
    
    // Tactic costs (Gold + Diamonds)
    struct TacticCost {
        uint256 goldCost;
        uint256 diamondCost;
    }
    
    // Mappings
    mapping(uint8 => Tactic) public tactics;
    mapping(uint8 => TacticCost) public tacticCosts;
    mapping(address => mapping(uint8 => bool)) public playerTactics; // Track which tactics player owns
    
    // Events
    event TacticMinted(address indexed player, uint8 tacticId, string name);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __ERC1155_init("");
        
        _initializeTactics();
        _initializeTacticCosts();
    }
    
    /**
     * @dev Initialize 9 fixed tactics
     */
    function _initializeTactics() internal {
        // STRIKE Tactics (3 variations)
        tactics[1] = Tactic({
            tacticId: 1,
            name: "Iron Strike",
            tacticType: TacticType.STRIKE,
            effectMagnitude: 3,  // +3 buildings damaged
            cost: 800
        });
        
        tactics[2] = Tactic({
            tacticId: 2,
            name: "Guardian Wall",
            tacticType: TacticType.SHIELD,
            effectMagnitude: 75,  // Lose 75% fewer troops
            cost: 800
        });
        
        tactics[3] = Tactic({
            tacticId: 3,
            name: "Battle Rage",
            tacticType: TacticType.TRICK,
            effectMagnitude: 30,  // +30 REP points
            cost: 800
        });
        
        tactics[4] = Tactic({
            tacticId: 4,
            name: "Cavalry Rush",
            tacticType: TacticType.STRIKE,
            effectMagnitude: 2,  // +2 buildings damaged
            cost: 800
        });
        
        tactics[5] = Tactic({
            tacticId: 5,
            name: "Defensive Circle",
            tacticType: TacticType.SHIELD,
            effectMagnitude: 50,  // Lose 50% fewer troops
            cost: 800
        });
        
        tactics[6] = Tactic({
            tacticId: 6,
            name: "Tactical Feint",
            tacticType: TacticType.TRICK,
            effectMagnitude: 20,  // +20 REP points
            cost: 800
        });
        
        tactics[7] = Tactic({
            tacticId: 7,
            name: "Swift Strike",
            tacticType: TacticType.STRIKE,
            effectMagnitude: 1,  // +1 building damaged
            cost: 800
        });
        
        tactics[8] = Tactic({
            tacticId: 8,
            name: "Shadow Guard",
            tacticType: TacticType.SHIELD,
            effectMagnitude: 25,  // Lose 25% fewer troops
            cost: 800
        });
        
        tactics[9] = Tactic({
            tacticId: 9,
            name: "Stealth Trap",
            tacticType: TacticType.TRICK,
            effectMagnitude: 15,  // +15 REP points
            cost: 800
        });
    }
    
    /**
     * @dev Initialize tactic costs
     */
    function _initializeTacticCosts() internal {
        // All tactics cost the same
        for (uint8 i = 1; i <= 9; i++) {
            tacticCosts[i] = TacticCost({
                goldCost: 800,
                diamondCost: 8
            });
        }
    }
    
    /**
     * @dev Mint a tactic
     * @param tacticId The tactic ID to mint (1-9)
     */
    function mintTactic(uint8 tacticId) external nonReentrant {
        require(tacticId >= 1 && tacticId <= 9, "Invalid tactic ID");
        require(!hasTactic(msg.sender, tacticId), "Already have this tactic");
        require(hasResources(msg.sender, tacticId), "Insufficient resources");
        
        // Deduct resources
        deductResources(msg.sender, tacticId);
        
        // Mint tactic
        _mint(msg.sender, tacticId, 1, "");
        
        // Track ownership
        playerTactics[msg.sender][tacticId] = true;
        
        emit TacticMinted(msg.sender, tacticId, tactics[tacticId].name);
    }
    
    /**
     * @dev Check if player has a specific tactic
     * @param player The player address
     * @param tacticId The tactic ID
     * @return bool Whether player has this tactic
     */
    function hasTactic(address player, uint8 tacticId) public view returns (bool) {
        return playerTactics[player][tacticId];
    }
    
    /**
     * @dev Get tactic data
     * @param tacticId The tactic ID
     * @return Tactic The tactic data
     */
    function getTactic(uint8 tacticId) external view returns (Tactic memory) {
        require(tacticId >= 1 && tacticId <= 9, "Invalid tactic ID");
        return tactics[tacticId];
    }
    
    /**
     * @dev Get tactic cost
     * @param tacticId The tactic ID
     * @return TacticCost The tactic cost structure
     */
    function getTacticCost(uint8 tacticId) external view returns (TacticCost memory) {
        require(tacticId >= 1 && tacticId <= 9, "Invalid tactic ID");
        return tacticCosts[tacticId];
    }
    
    /**
     * @dev Check if player has sufficient resources for tactic
     * @param player The player address
     * @param tacticId The tactic ID
     * @return bool Whether player has sufficient resources
     */
    function hasResources(address player, uint8 tacticId) internal view returns (bool) {
        TacticCost memory cost = tacticCosts[tacticId];
        
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
                "getPlayerDiamonds(address)",
                player
            )
        );
        
        if (!success) return false;
        uint256 playerDiamonds = abi.decode(data, (uint256));
        
        return playerGold >= cost.goldCost && playerDiamonds >= cost.diamondCost;
    }
    
    /**
     * @dev Deduct resources for tactic purchase
     * @param player The player address
     * @param tacticId The tactic ID
     */
    function deductResources(address player, uint8 tacticId) internal {
        TacticCost memory cost = tacticCosts[tacticId];
        
        // Call GameState to deduct resources
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature(
                "deductResources(address,uint256,uint256,uint256,uint256)",
                player,
                cost.goldCost,
                0,  // No food cost
                0,  // No rep cost
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
     * @dev Validate tactics array for battle deployment
     * @param player The player address
     * @param tacticIds Array of tactic IDs to validate
     */
    function validateTacticsForBattle(address player, uint8[3] memory tacticIds) external view returns (bool) {
        for (uint8 i = 0; i < 3; i++) {
            if (tacticIds[i] > 0) {
                // Check if tactic exists and player owns it
                if (tacticIds[i] < 1 || tacticIds[i] > 9) return false;
                if (!hasTactic(player, tacticIds[i])) return false;
            }
        }
        return true;
    }
    
    /**
     * @dev Get player's tactic count
     * @param player The player address
     * @return uint256 Number of tactics owned
     */
    function getPlayerTacticCount(address player) external view returns (uint256) {
        uint256 count = 0;
        for (uint8 i = 1; i <= 9; i++) {
            if (hasTactic(player, i)) count++;
        }
        return count;
    }
    
    /**
     * @dev Get player's owned tactics
     * @param player The player address
     * @return uint8[] Array of owned tactic IDs
     */
    function getPlayerTactics(address player) external view returns (uint8[] memory) {
        uint256 count = 0;
        uint8[] memory temp = new uint8[](9);
        
        for (uint8 i = 1; i <= 9; i++) {
            if (hasTactic(player, i)) {
                temp[count] = i;
                count++;
            }
        }
        
        uint8[] memory result = new uint8[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get tactics by type
     * @param tacticType The tactic type
     * @return uint8[] Array of tactic IDs of that type
     */
    function getTacticsByType(TacticType tacticType) external view returns (uint8[] memory) {
        uint256 count = 0;
        uint8[] memory temp = new uint8[](9);
        
        for (uint8 i = 1; i <= 9; i++) {
            if (tactics[i].tacticType == tacticType) {
                temp[count] = i;
                count++;
            }
        }
        
        uint8[] memory result = new uint8[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    /**
     * @dev Set GameState address
     * @param _gameStateAddress The GameState contract address
     */
    function setGameStateAddress(address _gameStateAddress) external onlyOwner {
        gameStateAddress = _gameStateAddress;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 