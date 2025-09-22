// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title MatchmakingSystem
 * @dev Contract for managing player matchmaking and opponent finding
 * Uses UUPS upgradeable pattern for future upgrades
 */
contract MatchmakingSystem is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Reference to other contracts
    address public gameStateAddress;
    address public battleSystemAddress;
    address public districtBuildingsAddress;
    address public gridBuildingsAddress;

    // Search state structure
    struct SearchState {
        uint256 startTime;
        address foundOpponent;
        bool hasAttemptedFind;
    }

    // Search status struct for frontend
    struct SearchStatus {
        bool active;
        bool completed;
        uint256 timeRemaining;
        address foundOpponent;
        bool hasAttemptedFind;
    }

    // Matchmaking state
    mapping(address => bool) public isRegisteredForMatchmaking;
    address[] public registeredPlayers;
    mapping(address => SearchState) public playerSearches;
    mapping(address => uint256) public lastBattleTime;
    
    // Configuration
    uint256 public searchCost; // Cost in gold to start a search
    uint256 public searchDuration; // Duration of search
    uint256 public noOpponentFoundChance; // Chance (0-100) to not find an opponent
    uint256 public searchExpiration; // Time after which search expires (24 hours)

    // Events
    event SearchStarted(address indexed player, uint256 startTime);
    event SearchCompleted(address indexed player, address indexed opponent);
    event PlayerRegistered(address indexed player);
    event PlayerUnregistered(address indexed player);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        // Initialize search parameters
        searchCost = 100; // Cost in gold to start a search
        searchDuration = 6 hours; // Duration of search
        noOpponentFoundChance = 20; // 20% chance to not find opponent (matching original BattleSystem)
        searchExpiration = 24 hours; // Search expires after 24 hours
    }

    // ============================================================================
    // MATCHMAKING FUNCTIONS
    // ============================================================================

    function registerForMatchmaking(address player) external {
        require(!isRegisteredForMatchmaking[player], "Already registered");
        
        // Add to registered players list
        isRegisteredForMatchmaking[player] = true;
        registeredPlayers.push(player);
        
        emit PlayerRegistered(player);
    }

    function unregisterFromMatchmaking(address player) external {
        require(isRegisteredForMatchmaking[player], "Not registered for matchmaking");
        isRegisteredForMatchmaking[player] = false;
        
        // Remove from registeredPlayers array
        for (uint256 i = 0; i < registeredPlayers.length; i++) {
            if (registeredPlayers[i] == player) {
                // Move last element to current position and remove last
                registeredPlayers[i] = registeredPlayers[registeredPlayers.length - 1];
                registeredPlayers.pop();
                break;
            }
        }
        
        emit PlayerUnregistered(player);
    }

    function startSearch(address player) external nonReentrant {
        require(isRegisteredForMatchmaking[player], "Not registered for matchmaking");
        
        // Deduct search cost from player's gold
        (bool success, ) = gameStateAddress.call(
            abi.encodeWithSignature(
                "deductResources(address,uint256,uint256,uint256,uint256)",
                player,
                searchCost,  // gold cost
                0,          // no food cost
                0,          // no rep cost
                0           // no diamond cost
            )
        );
        require(success, "Failed to deduct search cost");
        
        // Reset and start new search (matching original behavior - always reset)
        playerSearches[player] = SearchState({
            startTime: block.timestamp,
            foundOpponent: address(0),
            hasAttemptedFind: false
        });
        
        emit SearchStarted(player, block.timestamp);
    }

    function findRandomOpponent(address player) external returns (address) {
        SearchState memory search = playerSearches[player];
        require(search.startTime > 0, "No search in progress");
        require(block.timestamp >= search.startTime + searchDuration, "Search pending");
        require(!search.hasAttemptedFind, "Already attempted to find opponent");
        
        // Get all potential opponents
        address[] memory potentialOpponents = _findPotentialOpponents(player);
        
        // If no potential opponents, return zero address
        if (potentialOpponents.length == 0) {
            playerSearches[player].hasAttemptedFind = true;
            return address(0);
        }
        
        // Use block data to generate a random number between 0 and 99
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player
        ))) % 100;
        
        if (randomNumber < noOpponentFoundChance) {
            playerSearches[player].hasAttemptedFind = true;
            return address(0); // Chance to not find anyone
        }
        
        // Randomly select an opponent from the array
        uint256 opponentIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player,
            randomNumber
        ))) % potentialOpponents.length;
        
        // Store the found opponent and mark that we've attempted to find one
        playerSearches[player].foundOpponent = potentialOpponents[opponentIndex];
        playerSearches[player].hasAttemptedFind = true;
        
        // Emit search completed with target found (but don't clear search state yet)
        emit SearchCompleted(player, potentialOpponents[opponentIndex]);
        
        return potentialOpponents[opponentIndex];
    }

    function checkSearchStatus(address player) external view returns (SearchStatus memory) {
        SearchState memory search = playerSearches[player];
        
        if (search.startTime == 0) {
            return SearchStatus({
                active: false,
                completed: false,
                timeRemaining: 0,
                foundOpponent: address(0),
                hasAttemptedFind: false
            });
        }
        
        uint256 elapsed = block.timestamp - search.startTime;
        bool completed = elapsed >= searchDuration;
        uint256 timeRemaining = completed ? 0 : searchDuration - elapsed;
        
        return SearchStatus({
            active: true,
            completed: completed,
            timeRemaining: timeRemaining,
            foundOpponent: search.foundOpponent,
            hasAttemptedFind: search.hasAttemptedFind
        });
    }


    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================

    function _findPotentialOpponents(address player) internal view returns (address[] memory) {
        require(isRegisteredForMatchmaking[player], "Not registered for matchmaking");
        
        // Count potential opponents
        uint256 count = 0;
        for (uint256 i = 0; i < registeredPlayers.length; i++) {
            address potentialOpponent = registeredPlayers[i];
            if (potentialOpponent != player && 
                !_isActive(potentialOpponent) &&
                block.timestamp >= lastBattleTime[potentialOpponent] + 24 hours) {
                count++;
            }
        }
        
        // Create array of potential opponents
        address[] memory opponents = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < registeredPlayers.length; i++) {
            address potentialOpponent = registeredPlayers[i];
            if (potentialOpponent != player && 
                !_isActive(potentialOpponent) &&
                block.timestamp >= lastBattleTime[potentialOpponent] + 24 hours) {
                opponents[index] = potentialOpponent;
                index++;
            }
        }
        
        return opponents;
    }

    function _isActive(address player) internal view returns (bool) {
        // Check if player is in an active battle by calling BattleSystem
        (bool success, bytes memory returnData) = battleSystemAddress.staticcall(
            abi.encodeWithSignature("activeBattles(address)", player)
        );
        
        if (!success) return false;
        
        // Decode the battle data - if attacker is not zero address, player is active
        (address attacker, , , bool resolved) = abi.decode(returnData, (address, address, uint256, bool));
        return attacker != address(0) && !resolved;
    }

    // ============================================================================
    // BATTLE SYSTEM INTEGRATION
    // ============================================================================

    function updateLastBattleTime(address player) external {
        require(msg.sender == battleSystemAddress, "Only BattleSystem can call this");
        lastBattleTime[player] = block.timestamp;
    }

    function clearSearchState(address player) external {
        require(msg.sender == battleSystemAddress, "Only BattleSystem can call this");
        delete playerSearches[player];
    }


    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    function setNoOpponentFoundChance(uint256 _chance) external onlyOwner {
        require(_chance <= 100, "Chance must be <= 100");
        noOpponentFoundChance = _chance;
    }

    function setSearchCost(uint256 _cost) external onlyOwner {
        searchCost = _cost;
    }

    function setSearchDuration(uint256 _duration) external onlyOwner {
        searchDuration = _duration;
    }

    // ============================================================================
    // CONTRACT REFERENCE SETTERS
    // ============================================================================

    function setGameStateAddress(address _gameStateAddress) external onlyOwner {
        gameStateAddress = _gameStateAddress;
    }

    function setBattleSystemAddress(address _battleSystemAddress) external onlyOwner {
        battleSystemAddress = _battleSystemAddress;
    }

    function setDistrictBuildingsAddress(address _districtBuildingsAddress) external onlyOwner {
        districtBuildingsAddress = _districtBuildingsAddress;
    }

    function setGridBuildingsAddress(address _gridBuildingsAddress) external onlyOwner {
        gridBuildingsAddress = _gridBuildingsAddress;
    }

    // ============================================================================
    // UUPS UPGRADEABLE
    // ============================================================================

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
