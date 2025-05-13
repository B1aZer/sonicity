# GameState Contract Split Plan

## Overview
The current GameState contract (769 lines) will be split into multiple contracts for better maintainability, gas optimization, and separation of concerns.

## Contract Structure

### 1. GameState.sol (Core Contract)
```solidity
// Core game state and city management
contract GameState is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Dependencies
    IBuildingSystem public buildingSystem;
    IResourceManager public resourceManager;
    INFTIntegration public nftIntegration;
    ICityGovernance public cityGovernance;

    // Core state
    struct City {
        uint256 treasury;
        uint8 tier;
        uint256 lastTierUpgrade;
        bool peaceShield;
    }
    mapping(uint256 => City) public cities;
    mapping(address => uint256) public playerCity;

    // Core functions
    function joinCity(uint256 cityId) external;
    function getCityInfo(uint256 cityId) external view returns (City memory);
    function setContractDependencies(
        address _buildingSystem,
        address _resourceManager,
        address _nftIntegration,
        address _cityGovernance
    ) external onlyOwner;
}
```

### 2. BuildingSystem.sol
```solidity
// Building management and production
contract BuildingSystem is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Dependencies
    IGameState public gameState;
    IResourceManager public resourceManager;

    // Building state
    struct Building {
        string buildingType;
        uint256 level;
        uint256 lastUpgradeTime;
        uint256 lastCollectionTime;
        bool active;
    }
    mapping(address => mapping(uint256 => Building)) public buildings;
    mapping(address => uint256) public nextBuildingId;
    mapping(string => uint256) public buildingCosts;
    mapping(string => uint256) public buildingProductionRates;

    // Core functions
    function createBuilding(string memory buildingType) external;
    function removeBuilding(uint256 buildingId) external;
    function collectGold(uint256 buildingId) external;
    function collectAllGold() external returns (uint256);
    function getBuilding(address player, uint256 buildingId) external view returns (Building memory);
}
```

### 3. ResourceManager.sol
```solidity
// Resource management and collection
contract ResourceManager is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Dependencies
    IGameState public gameState;

    // Resource state
    struct PlayerResources {
        uint256 gold;
        uint256 reputation;
        uint256 buildingSlots;
        uint256 maxBuildingSlots;
    }
    mapping(uint256 => mapping(address => PlayerResources)) public playerResources;

    // Core functions
    function donateGold(uint256 amount) external;
    function earnGold(uint256 amount) external;
    function earnRep(uint256 amount) external;
    function getPlayerResources(address player) external view returns (PlayerResources memory);
}
```

### 4. NFTIntegration.sol
```solidity
// NFT management and verification
contract NFTIntegration is Initializable, OwnableUpgradeable {
    // Dependencies
    IGameState public gameState;

    // NFT state
    struct NFTMetadata {
        uint8 district;
        uint8 buildingSlots;
    }
    mapping(address => mapping(uint256 => NFTMetadata)) public nftMetadata;
    mapping(address => bool) public approvedCollections;

    // Core functions
    function setNFTMetadata(address collection, uint256 tokenId, NFTMetadata memory metadata) external;
    function verifyNFTOwnership(address collection, uint256 tokenId, address owner) external view returns (bool);
    function getNFTMetadata(address collection, uint256 tokenId) external view returns (NFTMetadata memory);
}
```

### 5. CityGovernance.sol
```solidity
// City governance and progression
contract CityGovernance is Initializable, OwnableUpgradeable {
    // Dependencies
    IGameState public gameState;
    IResourceManager public resourceManager;

    // Governance state
    mapping(uint8 => uint256) public tierRequirements;
    mapping(uint8 => mapping(string => uint256)) public buildingRequirements;

    // Core functions
    function upgradeCityTier(uint256 cityId) external;
    function canUnlockBuilding(string memory buildingName) external view returns (bool);
    function getNextTierCost(uint256 cityId) external view returns (uint256);
}
```

## Interfaces

### IGameState.sol
```solidity
interface IGameState {
    function cities(uint256) external view returns (
        uint256 treasury,
        uint8 tier,
        uint256 lastTierUpgrade,
        bool peaceShield
    );
    function playerCity(address) external view returns (uint256);
}
```

### IBuildingSystem.sol
```solidity
interface IBuildingSystem {
    function createBuilding(string memory buildingType) external;
    function removeBuilding(uint256 buildingId) external;
    function collectGold(uint256 buildingId) external;
    function collectAllGold() external returns (uint256);
}
```

### IResourceManager.sol
```solidity
interface IResourceManager {
    function donateGold(uint256 amount) external;
    function earnGold(uint256 amount) external;
    function earnRep(uint256 amount) external;
}
```

### INFTIntegration.sol
```solidity
interface INFTIntegration {
    function setNFTMetadata(address collection, uint256 tokenId, NFTMetadata memory metadata) external;
    function verifyNFTOwnership(address collection, uint256 tokenId, address owner) external view returns (bool);
}
```

### ICityGovernance.sol
```solidity
interface ICityGovernance {
    function upgradeCityTier(uint256 cityId) external;
    function canUnlockBuilding(string memory buildingName) external view returns (bool);
}
```

## Implementation Steps

1. **Phase 1: Contract Creation**
   - Create all new contracts and interfaces
   - Move state variables to appropriate contracts
   - Set up proper inheritance and dependencies

2. **Phase 2: Function Migration**
   - Move functions to their respective contracts
   - Update function calls to use interfaces
   - Add proper access control
   - Update event emissions

3. **Phase 3: Testing**
   - Create test files for each contract
   - Test contract interactions
   - Verify gas optimizations
   - Test upgrade paths

4. **Phase 4: Frontend Updates**
   - Update contract ABIs
   - Update contract addresses
   - Update function calls
   - Test all interactions

5. **Phase 5: Deployment**
   - Deploy new contracts
   - Initialize contracts
   - Set up dependencies
   - Verify contract interactions

## Migration Strategy

1. **Preparation**
   - Create new contracts
   - Set up interfaces
   - Prepare test environment

2. **Implementation**
   - Implement one contract at a time
   - Test each contract thoroughly
   - Update dependencies as needed

3. **Deployment**
   - Deploy contracts in correct order
   - Initialize with proper parameters
   - Verify all interactions

4. **Verification**
   - Test all functionality
   - Verify gas optimizations
   - Check upgrade paths
   - Validate frontend integration

## Notes
- All contracts will be upgradeable using UUPS pattern
- Proper access control will be implemented
- Events will be maintained for all important actions
- Gas optimizations will be considered in implementation
- Security best practices will be followed
- Comprehensive testing will be required 