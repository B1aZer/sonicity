// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title BattleSystem
 * @dev Contract for managing PvP battles between players
 */
contract BattleSystem is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to other contracts
    address public gameStateAddress;
    address public districtBuildingsAddress;
    address public gridBuildingsAddress;

    // Troop types
    enum TroopType {
        INFANTRY,
        CAVALRY,
        SIEGE
    }

    // Battle state
    struct Battle {
        address attacker;
        address defender;
        uint256 startTime;
        bool resolved;
        uint256 attackerPower;
        uint256 defenderPower;
        uint256 treasuryBurned;
        uint256 gridBuildingsDamaged;
        uint256 districtBuildingsDamaged;
        uint256 repPoints;
        uint256 deployedInfantry;  // Add deployed troop counts
        uint256 deployedCavalry;
        uint256 deployedSiege;
    }

    // Troop costs and effects
    struct TroopConfig {
        uint256 goldCost;
        uint256 foodCost;
        uint256 power;
        uint256 gridDamageChance;    // Chance to damage grid buildings (0-100)
        uint256 districtDamageChance; // Chance to damage district buildings (0-100)
        uint256 treasuryBurnChance;   // Chance to burn treasury (0-100)
    }

    // Mappings
    mapping(address => mapping(TroopType => uint256)) public playerTroops;
    mapping(address => Battle) public activeBattles;
    mapping(TroopType => TroopConfig) public troopConfigs;

    // Constants
    uint256 public BATTLE_DURATION;
    uint256 public constant MAX_TREASURY_BURN_PERCENT = 20; // 20% max treasury burn
    uint256 public constant BATTLE_TIMEOUT = 48 hours; // Auto-resolve after 48 hours
    uint256 public noOpponentFoundChance;
    uint256 public searchCost; // Cost in gold to start a search
    uint256 public searchDuration; // Duration of search

    // Search state
    struct SearchState {
        uint256 startTime;
        bool active;
        address foundOpponent;  // Store the found opponent
        bool hasAttemptedFind;  // Track if player has already tried to find an opponent
    }

    // Search status struct for frontend
    struct SearchStatus {
        bool active;
        bool completed;
        uint256 timeRemaining;
        address foundOpponent;
        bool hasAttemptedFind;
    }

    mapping(address => SearchState) public playerSearches;

    // Battle history record
    struct BattleRecord {
        address attacker;
        address defender;
        uint256 timestamp;
        bool attackerWon;
        uint256 attackerPower;
        uint256 defenderPower;
        uint256 treasuryBurned;
        uint256 gridBuildingsDamaged;
        uint256 districtBuildingsDamaged;
        uint256 repPoints;
    }

    // Matchmaking pool
    mapping(address => bool) public isRegisteredForMatchmaking;
    mapping(address => uint256) public lastBattleTime;
    address[] public registeredPlayers;

    // Battle history tracking
    mapping(uint256 => BattleRecord) public battleHistory;
    uint256 private nextBattleId;

    // Mapping to track which battles a player was involved in
    mapping(address => uint256[]) private playerBattles;

    // Events
    event BattleStarted(address indexed attacker, address indexed defender, uint256 startTime);
    event BattleResolved(
        address indexed attacker, 
        address indexed defender, 
        bool attackerWon, 
        uint256 treasuryBurned,
        uint256 gridBuildingsDamaged,
        uint256 districtBuildingsDamaged
    );
    event TroopsTrained(address indexed player, TroopType troopType, uint256 amount);
    event TroopsDeployed(address indexed player, TroopType troopType, uint256 amount);
    event PlayerRegisteredForMatchmaking(address indexed player);
    event PlayerUnregisteredFromMatchmaking(address indexed player);
    event BattleRecorded(
        uint256 indexed battleId,
        address indexed attacker,
        address indexed defender,
        bool attackerWon,
        uint256 timestamp
    );
    event SearchStarted(address indexed player, uint256 startTime);
    event SearchCompleted(address indexed player);
    event BattleAutoResolved(address indexed attacker, address indexed defender, string reason);

    struct BattleEffects {
        uint256 gridBuildingsDamaged;
        uint256 districtBuildingsDamaged;
        uint256 treasuryBurned;
        uint256 repPoints;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        // Initialize battle duration
        BATTLE_DURATION = 24 hours;

        // Initialize troop configurations
        troopConfigs[TroopType.INFANTRY] = TroopConfig({
            goldCost: 100,
            foodCost: 50,
            power: 10,           // Increased from 10 to 15 (10 resources per power)
            gridDamageChance: 0,
            districtDamageChance: 0,
            treasuryBurnChance: 0
        });

        troopConfigs[TroopType.CAVALRY] = TroopConfig({
            goldCost: 200,
            foodCost: 100,
            power: 15,           // Increased from 25 to 30 (10 resources per power)
            gridDamageChance: 30,    // 30% chance to damage grid buildings
            districtDamageChance: 0,
            treasuryBurnChance: 0
        });

        troopConfigs[TroopType.SIEGE] = TroopConfig({
            goldCost: 300,
            foodCost: 150,
            power: 20,           // Increased from 40 to 45 (10 resources per power)
            gridDamageChance: 0,
            districtDamageChance: 50, // 50% chance to damage district buildings
            treasuryBurnChance: 10    // 10% chance to burn treasury
        });

        // Set the initial value for noOpponentFoundChance
        noOpponentFoundChance = 20;

        // Initialize search parameters
        searchCost = 100; // Cost in gold to start a search
        searchDuration = 6 hours; // Duration of search
    }

    /**
     * @dev Train new troops
     * @param troopType Type of troop to train
     * @param amount Amount of troops to train
     */
    function trainTroops(TroopType troopType, uint256 amount) external nonReentrant {
        TroopConfig memory config = troopConfigs[troopType];
        require(amount > 0, "Amount must be greater than 0");

        // Check if player can train this troop type based on barracks level
        (bool success, bytes memory returnData) = districtBuildingsAddress.staticcall(
            abi.encodeWithSignature("canTrainTroopType(address,uint8)", msg.sender, uint8(troopType))
        );
        require(success && abi.decode(returnData, (bool)), "Cannot train this troop type at current barracks level");

        // Check and deduct resources
        (success, returnData) = gameStateAddress.call(
            abi.encodeWithSignature(
                "deductResources(address,uint256,uint256,uint256,uint256)",
                msg.sender,
                config.goldCost * amount,
                config.foodCost * amount,
                0,  // No rep cost for training
                0   // No diamond cost for training
            )
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

        // Add troops to player's army
        playerTroops[msg.sender][troopType] += amount;

        emit TroopsTrained(msg.sender, troopType, amount);
    }

    /**
     * @dev Start a battle against another player
     * @param infantryCount Number of infantry to deploy
     * @param cavalryCount Number of cavalry to deploy
     * @param siegeCount Number of siege units to deploy
     */
    function startBattle(
        uint256 infantryCount,
        uint256 cavalryCount,
        uint256 siegeCount
    ) external nonReentrant {
        require(playerSearches[msg.sender].active, "No active search");
        require(block.timestamp >= playerSearches[msg.sender].startTime + searchDuration, "Search not complete");
        address defender = playerSearches[msg.sender].foundOpponent;
        require(defender != address(0), "No opponent found");
        require(defender != msg.sender, "Cannot attack yourself");
        
        // Auto-resolve expired battles before checking if players are in battle
        autoResolveExpiredBattle(msg.sender);
        autoResolveExpiredBattle(defender);
        
        require(activeBattles[msg.sender].startTime == 0, "Already in a battle");
        require(activeBattles[defender].startTime == 0, "Defender already in a battle");
        require(infantryCount > 0 || cavalryCount > 0 || siegeCount > 0, "Must deploy at least one troop");

        // Clear search state
        playerSearches[msg.sender].active = false;
        playerSearches[msg.sender].foundOpponent = address(0);
        emit SearchCompleted(msg.sender);

        // Check if attacker has enough troops
        require(playerTroops[msg.sender][TroopType.INFANTRY] >= infantryCount, "Not enough infantry");
        require(playerTroops[msg.sender][TroopType.CAVALRY] >= cavalryCount, "Not enough cavalry");
        require(playerTroops[msg.sender][TroopType.SIEGE] >= siegeCount, "Not enough siege units");

        // Calculate total power
        uint256 attackerPower = (
            infantryCount * troopConfigs[TroopType.INFANTRY].power +
            cavalryCount * troopConfigs[TroopType.CAVALRY].power +
            siegeCount * troopConfigs[TroopType.SIEGE].power
        );

        // Get defender's power (from defense tower)
        (bool success, uint256 defenderPower) = getDefenderPower(defender);
        require(success, "Failed to get defender power");

        // Create battle
        Battle memory newBattle = Battle({
            attacker: msg.sender,
            defender: defender,
            startTime: block.timestamp,
            resolved: false,
            attackerPower: attackerPower,
            defenderPower: defenderPower,
            treasuryBurned: 0,
            gridBuildingsDamaged: 0,
            districtBuildingsDamaged: 0,
            repPoints: 0,
            deployedInfantry: infantryCount,  // Store deployed counts
            deployedCavalry: cavalryCount,
            deployedSiege: siegeCount
        });

        activeBattles[msg.sender] = newBattle;
        activeBattles[defender] = newBattle;

        // Lock troops
        playerTroops[msg.sender][TroopType.INFANTRY] -= infantryCount;
        playerTroops[msg.sender][TroopType.CAVALRY] -= cavalryCount;
        playerTroops[msg.sender][TroopType.SIEGE] -= siegeCount;

        emit BattleStarted(msg.sender, defender, block.timestamp);
    }

    /**
     * @dev Resolve a battle after the duration has passed
     * @param battleId ID of the battle to resolve
     */
    function resolveBattle(address battleId) external nonReentrant {
        Battle storage battle = activeBattles[battleId];
        require(battle.startTime > 0, "Battle does not exist");
        require(!battle.resolved, "Battle already resolved");
        require(block.timestamp >= battle.startTime + BATTLE_DURATION, "Battle duration not elapsed");

        bool attackerWon = battle.attackerPower > battle.defenderPower;
        
        if (attackerWon) {
            // Apply effects
            applyBattleEffects(
                battle.attacker,
                battle.defender,
                battle.attackerPower,
                battle.defenderPower
            );

            // Update battle state
            battle.repPoints = calculateRepPoints(battle.attackerPower, battle.defenderPower);
        }

        // Record battle history
        uint256 currentBattleId = nextBattleId++;
        battleHistory[currentBattleId] = BattleRecord({
            attacker: battle.attacker,
            defender: battle.defender,
            timestamp: battle.startTime,
            attackerWon: attackerWon,
            attackerPower: battle.attackerPower,
            defenderPower: battle.defenderPower,
            treasuryBurned: battle.treasuryBurned,
            gridBuildingsDamaged: battle.gridBuildingsDamaged,
            districtBuildingsDamaged: battle.districtBuildingsDamaged,
            repPoints: battle.repPoints
        });

        // Add battle to both players' history
        playerBattles[battle.attacker].push(currentBattleId);
        playerBattles[battle.defender].push(currentBattleId);

        // Update last battle time for both players
        lastBattleTime[battle.attacker] = block.timestamp;
        lastBattleTime[battle.defender] = block.timestamp;

        battle.resolved = true;

        // Clear the battle from activeBattles for both players
        delete activeBattles[battle.attacker];
        delete activeBattles[battle.defender];

        emit BattleRecorded(
            currentBattleId,
            battle.attacker,
            battle.defender,
            attackerWon,
            battle.startTime
        );

        emit BattleResolved(
            battle.attacker,
            battle.defender,
            attackerWon,
            battle.treasuryBurned,
            battle.gridBuildingsDamaged,
            battle.districtBuildingsDamaged
        );
    }

    /**
     * @dev Test function to damage grid buildings (only for testing)
     * @param defender The address of the player to damage buildings for
     * @param amount Number of buildings to damage
     * @return uint256 Number of buildings actually damaged
     */
    function testDamageGridBuildings(address defender, uint256 amount) external returns (uint256) {
        require(msg.sender == owner(), "Only owner can call this function");
        
        // Call GridBuildings contract directly to damage buildings
        (bool success, bytes memory returnData) = gridBuildingsAddress.call(
            abi.encodeWithSignature("damageBuildings(address,uint256)", defender, amount)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to damage grid building");
        }
        
        // Decode and return the number of buildings damaged
        return abi.decode(returnData, (uint256));
    }

    /**
     * @dev Test function to damage district buildings (only for testing)
     * @param defender The address of the player to damage buildings for
     * @param amount Number of buildings to damage
     * @return uint256 Number of buildings actually damaged
     */
    function testDamageDistrictBuildings(address defender, uint256 amount) external returns (uint256) {
        require(msg.sender == owner(), "Only owner can call this function");
        
        // Call DistrictBuildings contract directly to damage buildings
        (bool success, bytes memory returnData) = districtBuildingsAddress.call(
            abi.encodeWithSignature("damageBuildings(address,uint256)", defender, amount)
        );
        if (!success) {
            // If the call failed, decode and propagate the error message
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to damage district building");
        }
        
        // Decode and return the number of buildings damaged
        return abi.decode(returnData, (uint256));
    }

    // Internal helper functions

    function getDefenderPower(address defender) internal view returns (bool, uint256) {
        // Call DistrictBuildings to get defense tower level and calculate power
        (bool success, bytes memory data) = districtBuildingsAddress.staticcall(
            abi.encodeWithSignature("getDefenseTowerPower(address)", defender)
        );
        if (!success) return (false, 0);
        return (true, abi.decode(data, (uint256)));
    }

    function calculateTreasuryBurn(uint256 attackerPower, uint256 defenderPower) internal pure returns (uint256) {
        // Calculate burn percentage based on power difference
        if (attackerPower == 0) return 0;
        uint256 powerDiff = attackerPower > defenderPower ? attackerPower - defenderPower : 0;
        uint256 burnPercent = (powerDiff * 100) / attackerPower;
        return burnPercent > MAX_TREASURY_BURN_PERCENT ? MAX_TREASURY_BURN_PERCENT : burnPercent;
    }

    function calculateTreasuryBurnAmount(address defender, uint256 burnPercent) internal view returns (uint256) {
        (bool success, bytes memory data) = gameStateAddress.staticcall(
            abi.encodeWithSignature("getPlayerTreasury(address)", defender)
        );
        require(success, "Failed to get treasury amount");
        uint256 treasuryAmount = abi.decode(data, (uint256));
        return (treasuryAmount * burnPercent) / 100;
    }

    function calculateRepPoints(uint256 attackerPower, uint256 defenderPower) internal pure returns (uint256) {
        if (attackerPower == 0) return 0;
        uint256 powerDiff = attackerPower > defenderPower ? attackerPower - defenderPower : 0;
        return (powerDiff * 10) / 100; // 10 REP points per 100 power difference
    }

    function applyBattleEffects(
        address attacker,
        address defender,
        uint256 attackerPower,
        uint256 defenderPower
    ) internal {
        BattleEffects memory effects;
        
        // Apply cavalry effects (grid building damage)
        effects.gridBuildingsDamaged = applyCavalryEffects(attacker, defender);
        
        // Apply siege effects (district building damage and treasury burn)
        (effects.districtBuildingsDamaged, effects.treasuryBurned) = applySiegeEffects(
            attacker, 
            defender,
            attackerPower,
            defenderPower
        );

        // Update battle state with effects
        Battle storage battle = activeBattles[attacker];
        battle.gridBuildingsDamaged += effects.gridBuildingsDamaged;
        battle.districtBuildingsDamaged += effects.districtBuildingsDamaged;
        battle.treasuryBurned = effects.treasuryBurned;

        // Award REP points for winning the battle
        effects.repPoints = calculateRepPoints(attackerPower, defenderPower);
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("earnRep(address,uint256)", attacker, effects.repPoints)
        );
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to award REP points");
        }
    }

    function applyCavalryEffects(address attacker, address defender) internal returns (uint256) {
        Battle storage battle = activeBattles[attacker];
        uint256 cavalryCount = battle.deployedCavalry;  // Use deployed count instead of total
        if (cavalryCount == 0) return 0;

        uint256 damageChance = troopConfigs[TroopType.CAVALRY].gridDamageChance;
        bytes32 randomSeed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            attacker,
            defender,
            "cavalry"
        ));

        if (uint256(randomSeed) % 100 >= damageChance) return 0;

        // Calculate buildings to damage: 1 per 5 cavalry, max 3
        uint256 buildingsToDamage = (cavalryCount / 5) + 1;
        if (buildingsToDamage > 3) buildingsToDamage = 3;

        (bool success, bytes memory returnData) = gridBuildingsAddress.call(
            abi.encodeWithSignature("damageBuildings(address,uint256)", defender, buildingsToDamage)
        );
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to damage grid building");
        }

        return abi.decode(returnData, (uint256));
    }

    function applySiegeEffects(
        address attacker,
        address defender,
        uint256 attackerPower,
        uint256 defenderPower
    ) internal returns (uint256 districtBuildingsDamaged, uint256 treasuryBurned) {
        Battle storage battle = activeBattles[attacker];
        uint256 siegeCount = battle.deployedSiege;  // Use deployed count instead of total
        if (siegeCount == 0) return (0, 0);

        // Apply district building damage
        districtBuildingsDamaged = applySiegeBuildingDamage(attacker, defender, siegeCount);

        // Calculate and apply treasury burn
        uint256 burnPercent = calculateTreasuryBurn(attackerPower, defenderPower);
        if (burnPercent > 0) {
            uint256 burnAmount = calculateTreasuryBurnAmount(defender, burnPercent);
            treasuryBurned = applySiegeTreasuryBurn(attacker, defender, burnAmount);
        }

        return (districtBuildingsDamaged, treasuryBurned);
    }

    function applySiegeBuildingDamage(
        address attacker,
        address defender,
        uint256 siegeCount
    ) internal returns (uint256) {
        uint256 damageChance = troopConfigs[TroopType.SIEGE].districtDamageChance;
        bytes32 randomSeed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            attacker,
            defender,
            "siege"
        ));

        if (uint256(randomSeed) % 100 >= damageChance) return 0;

        // Calculate buildings to damage: 1 per 3 siege, max 2
        uint256 buildingsToDamage = (siegeCount / 3) + 1;
        if (buildingsToDamage > 2) buildingsToDamage = 2;

        (bool success, bytes memory returnData) = districtBuildingsAddress.call(
            abi.encodeWithSignature("damageBuildings(address,uint256)", defender, buildingsToDamage)
        );
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to damage district building");
        }

        return abi.decode(returnData, (uint256));
    }

    function applySiegeTreasuryBurn(
        address attacker,
        address defender,
        uint256 treasuryBurned
    ) internal returns (uint256) {
        uint256 burnChance = troopConfigs[TroopType.SIEGE].treasuryBurnChance;
        bytes32 randomSeed = keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            attacker,
            defender,
            "treasury"
        ));

        if (uint256(randomSeed) % 100 >= burnChance) return 0;

        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature("burnTreasury(address,uint256)", defender, treasuryBurned)
        );
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to burn treasury");
        }

        return treasuryBurned;
    }

    function registerForMatchmaking() external {
        require(msg.sender == gameStateAddress, "Only GameState can call this function");

        // Only register if not already registered
        if (!isRegisteredForMatchmaking[tx.origin]) {
            isRegisteredForMatchmaking[tx.origin] = true;
            registeredPlayers.push(tx.origin);
            emit PlayerRegisteredForMatchmaking(tx.origin);
        }
    }

    function unregisterFromMatchmaking() external {
        require(isRegisteredForMatchmaking[msg.sender], "Not registered for matchmaking");
        isRegisteredForMatchmaking[msg.sender] = false;
        
        // Remove from registeredPlayers array
        for (uint256 i = 0; i < registeredPlayers.length; i++) {
            if (registeredPlayers[i] == msg.sender) {
                // Replace with last element and pop
                registeredPlayers[i] = registeredPlayers[registeredPlayers.length - 1];
                registeredPlayers.pop();
                break;
            }
        }
        
        emit PlayerUnregisteredFromMatchmaking(msg.sender);
    }

    function findPotentialOpponents() external view returns (address[] memory) {
        return _findPotentialOpponents();
    }

    function _findPotentialOpponents() internal view returns (address[] memory) {
        require(isRegisteredForMatchmaking[msg.sender], "Not registered for matchmaking");
        
        // Count potential opponents
        uint256 count = 0;
        for (uint256 i = 0; i < registeredPlayers.length; i++) {
            address potentialOpponent = registeredPlayers[i];
            if (potentialOpponent != msg.sender && 
                activeBattles[potentialOpponent].startTime == 0 &&
                block.timestamp >= lastBattleTime[potentialOpponent] + BATTLE_DURATION) {
                count++;
            }
        }
        
        // Create array of potential opponents
        address[] memory opponents = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < registeredPlayers.length; i++) {
            address potentialOpponent = registeredPlayers[i];
            if (potentialOpponent != msg.sender && 
                activeBattles[potentialOpponent].startTime == 0 &&
                block.timestamp >= lastBattleTime[potentialOpponent] + BATTLE_DURATION) {
                opponents[index] = potentialOpponent;
                index++;
            }
        }
        
        return opponents;
    }

    function autoResolveExpiredBattle(address player) internal {
        Battle storage battle = activeBattles[player];
        
        // Check if battle exists and is expired (past BATTLE_TIMEOUT)
        if (battle.startTime > 0 && 
            !battle.resolved && 
            block.timestamp >= battle.startTime + BATTLE_TIMEOUT) {
            
            // Auto-resolve as timeout (no rewards, no effects)
            battle.resolved = true;
            
            // Record battle history as timeout
            uint256 currentBattleId = nextBattleId++;
            battleHistory[currentBattleId] = BattleRecord({
                attacker: battle.attacker,
                defender: battle.defender,
                timestamp: block.timestamp,
                attackerWon: false, // Timeout - no winner
                attackerPower: 0,
                defenderPower: 0,
                treasuryBurned: 0,
                gridBuildingsDamaged: 0,
                districtBuildingsDamaged: 0,
                repPoints: 0
            });
            
            // Clear both players from active battles
            delete activeBattles[battle.attacker];
            delete activeBattles[battle.defender];
            
            // Emit auto-resolve event
            emit BattleAutoResolved(battle.attacker, battle.defender, "Timeout after 48 hours");
        }
    }

    function startSearch() external nonReentrant {
        // Auto-resolve expired battle before checking if player is in battle
        autoResolveExpiredBattle(msg.sender);
        
        // Only check if player is in battle
        require(activeBattles[msg.sender].startTime == 0, "Already in a battle");

        // Deduct search cost
        (bool success, bytes memory returnData) = gameStateAddress.call(
            abi.encodeWithSignature(
                "deductResources(address,uint256,uint256,uint256,uint256)",
                msg.sender,
                searchCost,  // gold cost
                0,          // no food cost
                0,          // no rep cost
                0           // no diamond cost
            )
        );
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
            revert("Failed to deduct search cost");
        }

        // Reset and start new search
        playerSearches[msg.sender] = SearchState({
            startTime: block.timestamp,
            active: true,
            foundOpponent: address(0),
            hasAttemptedFind: false
        });

        emit SearchStarted(msg.sender, block.timestamp);
    }

    function checkSearchStatus() external view returns (SearchStatus memory) {
        SearchState storage search = playerSearches[msg.sender];
        if (!search.active) {
            return SearchStatus({
                active: false,
                completed: false,
                timeRemaining: 0,
                foundOpponent: address(0),
                hasAttemptedFind: false
            });
        }

        uint256 elapsed = block.timestamp - search.startTime;
        if (elapsed >= searchDuration) {
            return SearchStatus({
                active: true,
                completed: true,
                timeRemaining: 0,
                foundOpponent: search.foundOpponent,
                hasAttemptedFind: search.hasAttemptedFind
            });
        }

        return SearchStatus({
            active: true,
            completed: false,
            timeRemaining: searchDuration - elapsed,
            foundOpponent: address(0),
            hasAttemptedFind: search.hasAttemptedFind
        });
    }

    function findRandomOpponent() external returns (address) {
        SearchState memory search = playerSearches[msg.sender];
        require(search.startTime > 0, "No search in progress");
        require(block.timestamp >= search.startTime + searchDuration, "Search not complete");
        require(!search.hasAttemptedFind, "Already attempted to find opponent");
        
        // Get all potential opponents
        address[] memory potentialOpponents = _findPotentialOpponents();
        
        // If no potential opponents, return zero address
        if (potentialOpponents.length == 0) {
            playerSearches[msg.sender].hasAttemptedFind = true;
            return address(0);
        }
        
        // Use block data to generate a random number between 0 and 99
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ))) % 100;
        
        if (randomNumber < noOpponentFoundChance) {
            playerSearches[msg.sender].hasAttemptedFind = true;
            return address(0); // Chance to not find anyone
        }
        
        // Randomly select an opponent from the array
        uint256 opponentIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            randomNumber
        ))) % potentialOpponents.length;
        
        // Store the found opponent and mark that we've attempted to find one
        playerSearches[msg.sender].foundOpponent = potentialOpponents[opponentIndex];
        playerSearches[msg.sender].hasAttemptedFind = true;
        
        return potentialOpponents[opponentIndex];
    }

    function getBattleRecord(uint256 battleId) external view returns (BattleRecord memory) {
        return battleHistory[battleId];
    }

    /**
     * @dev Get the latest battle ID
     * @return uint256 The latest battle ID (nextBattleId - 1)
     */
    function getLatestBattleId() external view returns (uint256) {
        return nextBattleId > 0 ? nextBattleId - 1 : 0;
    }

    /**
     * @dev Get battle records for a specific player
     * @param player The address of the player
     * @return BattleRecord[] Array of battle records where the player was involved
     */
    function getPlayerBattleHistory(address player) external view returns (BattleRecord[] memory) {
        uint256[] storage battleIds = playerBattles[player];
        BattleRecord[] memory records = new BattleRecord[](battleIds.length);
        
        for (uint256 i = 0; i < battleIds.length; i++) {
            records[i] = battleHistory[battleIds[i]];
        }
        
        return records;
    }

    /**
     * @dev Get the number of battles a player has been involved in
     * @param player The address of the player
     * @return uint256 Number of battles
     */
    function getPlayerBattleCount(address player) external view returns (uint256) {
        return playerBattles[player].length;
    }

    // Admin functions

    function setGameStateAddress(address _gameStateAddress) external onlyOwner {
        gameStateAddress = _gameStateAddress;
    }

    function setDistrictBuildingsAddress(address _districtBuildingsAddress) external onlyOwner {
        districtBuildingsAddress = _districtBuildingsAddress;
    }

    function setGridBuildingsAddress(address _gridBuildingsAddress) external onlyOwner {
        gridBuildingsAddress = _gridBuildingsAddress;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Add setter function for the chance
    function setNoOpponentFoundChance(uint256 _chance) external onlyOwner {
        require(_chance <= 100, "Chance must be between 0 and 100");
        noOpponentFoundChance = _chance;
    }

    /**
     * @dev Set troop configuration
     * @param troopType Type of troop to configure
     * @param goldCost Cost in gold to train
     * @param foodCost Cost in food to train
     * @param power Power of the troop
     * @param gridDamageChance Chance to damage grid buildings (0-100)
     * @param districtDamageChance Chance to damage district buildings (0-100)
     * @param treasuryBurnChance Chance to burn treasury (0-100)
     */
    function setTroopConfig(
        uint8 troopType,
        uint256 goldCost,
        uint256 foodCost,
        uint256 power,
        uint256 gridDamageChance,
        uint256 districtDamageChance,
        uint256 treasuryBurnChance
    ) external onlyOwner {
        require(troopType <= uint8(TroopType.SIEGE), "Invalid troop type");
        require(gridDamageChance <= 100, "Grid damage chance must be between 0 and 100");
        require(districtDamageChance <= 100, "District damage chance must be between 0 and 100");
        require(treasuryBurnChance <= 100, "Treasury burn chance must be between 0 and 100");

        troopConfigs[TroopType(troopType)] = TroopConfig({
            goldCost: goldCost,
            foodCost: foodCost,
            power: power,
            gridDamageChance: gridDamageChance,
            districtDamageChance: districtDamageChance,
            treasuryBurnChance: treasuryBurnChance
        });
    }

    function setSearchCost(uint256 _cost) external onlyOwner {
        searchCost = _cost;
    }

    function setSearchDuration(uint256 _duration) external onlyOwner {
        searchDuration = _duration;
    }

    /**
     * @dev Set the battle duration (only owner)
     * @param newDuration New battle duration in seconds
     */
    function setBattleDuration(uint256 newDuration) external onlyOwner {
        require(newDuration > 0, "Duration must be greater than 0");
        BATTLE_DURATION = newDuration;
    }
} 