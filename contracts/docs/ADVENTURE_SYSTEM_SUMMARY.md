# AdventureSystem Contract - Complete Documentation

## ✅ Contract Overview

**File:** `contracts/contracts/AdventureSystem.sol`  
**Type:** UUPS Upgradeable  
**Pattern:** OpenZeppelin upgradeable contracts  

### Core Features:
- ✅ Purchase starting scout with 10 SONIC
- ✅ Start adventures with starting scout or hero NFT
- ✅ Reveal tiles one by one (no cooldown between tiles)
- ✅ 5 tile types with specific probabilities
- ✅ Resource accumulation (Gold, Food, Diamonds, REP)
- ✅ Relic NFT minting on special tiles
- ✅ Hero loss on disaster (permanent)
- ✅ 3-hour cooldown after adventure completion
- ✅ Tier-based grid sizes (3x3 → 3x4 → 4x4 → 4x5 → 5x5)

---

## 📊 Tile Probabilities & Rewards

### Tile Types:
```solidity
enum TileType { SAFE, REWARD, DISASTER, SPECIAL, DIAMOND }
```

### Probability Distribution:
| Tile Type | Chance | Range | Description |
|-----------|--------|-------|-------------|
| **DISASTER** | 15% | 0-14 | Lose all rewards + hero lost |
| **SPECIAL** | 5% | 15-19 | REP (50%) or Relic NFT (50%) |
| **REWARD** | 30% | 20-49 | Gold, Food, or Diamonds (33% each) |
| **DIAMOND** | 10% | 50-59 | Guaranteed diamond reward |
| **SAFE** | 40% | 60-99 | Nothing happens |

### Reward Ranges:
```solidity
// Gold rewards
MIN_GOLD_REWARD = 50
MAX_GOLD_REWARD = 300

// Food rewards
MIN_FOOD_REWARD = 25
MAX_FOOD_REWARD = 150

// Diamond rewards
MIN_DIAMOND_REWARD = 1
MAX_DIAMOND_REWARD = 5

// REP rewards (Special tiles)
MIN_REP_REWARD = 10
MAX_REP_REWARD = 50
```

---

## 🎮 Core Mechanics

### 1. Starting Scout System
```solidity
struct StartingScout {
    bool purchased;         // Has player bought starting scout
    bool onAdventure;      // Is scout currently on adventure
    uint256 availableAt;   // When scout is available again (3h cooldown)
}
```

**Purchase Cost:** 10 SONIC (payable)  
**Cooldown:** 3 hours after adventure completion  
**Lost on Disaster:** Yes - must purchase again  

### 2. Adventure System
```solidity
struct Adventure {
    uint8 gridSize;              // 9, 12, 16, 20, 25 tiles
    uint256 startTime;           // When adventure started
    uint256 heroId;              // Hero NFT ID (0 if starting scout)
    bool useStartingScout;       // Using scout vs hero
    uint8 tilesRevealed;         // Tiles revealed so far
    uint8 totalTiles;            // Total tiles in grid
    uint256 goldCollected;       // Accumulated gold
    uint256 foodCollected;       // Accumulated food
    uint256 diamondsCollected;   // Accumulated diamonds
    uint256 repCollected;        // Accumulated REP
    uint8 relicsFound;           // Relic NFTs to mint
    bool active;                 // Adventure in progress
    bool disasterEncountered;    // Hit disaster
}
```

### 3. Grid Size by Tier
```solidity
tierToGridSize[0] = 9;   // 3x3 - Tier 0
tierToGridSize[1] = 12;  // 3x4 - Tier 1
tierToGridSize[2] = 16;  // 4x4 - Tier 2
tierToGridSize[3] = 20;  // 4x5 - Tier 3
tierToGridSize[4] = 25;  // 5x5 - Tier 4
```

---

## 📝 Key Functions

### Player Functions:

#### `purchaseStartingScout()` payable
```solidity
function purchaseStartingScout() external payable nonReentrant
```
- **Cost:** 10 SONIC
- **Requires:** Player doesn't already have scout
- **Effect:** Grants starting scout for adventures
- **One-time:** Can only purchase once (lost on disaster)

#### `startAdventure(uint256 heroId, bool useStartingScout)`
```solidity
function startAdventure(uint256 heroId, bool useStartingScout) external nonReentrant
```
- **Parameters:**
  - `heroId`: Hero NFT ID (0 if using scout)
  - `useStartingScout`: true = use scout, false = use hero
- **Requires:**
  - No active adventure
  - Scout/hero is available (not on cooldown)
  - Player owns hero (if not using scout)
- **Effect:** Creates new adventure based on player's tier

#### `revealTile()`
```solidity
function revealTile() external nonReentrant returns (TileResult memory)
```
- **Returns:** TileResult with rewards/outcome
- **Requires:** Active adventure with unrevealed tiles
- **Effect:** Reveals next tile, accumulates rewards or triggers disaster
- **No Cooldown:** Can reveal all tiles continuously

#### `completeAdventure()`
```solidity
function completeAdventure() external nonReentrant
```
- **Requires:** Active adventure without disaster
- **Effect:**
  - Distributes all accumulated resources to player
  - Mints relic NFTs if found
  - Sets 3-hour cooldown on scout/hero
  - Ends adventure

### View Functions:

#### `getAdventureStatus(address player)`
```solidity
function getAdventureStatus(address player) external view returns (Adventure memory)
```
Returns complete adventure state for player.

#### `isStartingScoutAvailable(address player)`
```solidity
function isStartingScoutAvailable(address player) external view returns (bool)
```
Checks if player's starting scout is ready for adventure.

#### `isHeroAvailable(uint256 heroId)`
```solidity
function isHeroAvailable(uint256 heroId) external view returns (bool)
```
Checks if specific hero is off cooldown.

#### `getStartingScout(address player)`
```solidity
function getStartingScout(address player) external view returns (StartingScout memory)
```
Returns player's starting scout information.

#### `getGridSizeForTier(uint8 tier)`
```solidity
function getGridSizeForTier(uint8 tier) external view returns (uint8)
```
Returns grid size (tiles) for given tier.

### Admin Functions:

```solidity
function setGameStateAddress(address _address) external onlyOwner
function setHeroNFTAddress(address _address) external onlyOwner
function setBattleSystemAddress(address _address) external onlyOwner
function setRelicNFTAddress(address _address) external onlyOwner
function withdraw() external onlyOwner
```

---

## 🔄 Adventure Flow

### 1. **Preparation Phase**
```
Player → purchaseStartingScout() [10 SONIC]
  OR
Player uses existing Hero NFT
```

### 2. **Start Adventure**
```
Player → startAdventure(heroId, useStartingScout)
↓
Contract checks:
  - Player tier → determines grid size
  - Scout/hero availability
  - No active adventure
↓
Adventure created (active = true)
```

### 3. **Exploration Phase** (No cooldown!)
```
Player → revealTile() [can call repeatedly]
↓
For each tile:
  - Generate random result
  - If SAFE: continue
  - If REWARD: accumulate Gold/Food/Diamonds
  - If DIAMOND: accumulate Diamonds
  - If SPECIAL: accumulate REP or mark Relic found
  - If DISASTER: lose everything + hero lost → END
↓
Repeat until disaster or all tiles revealed
```

### 4. **Completion Phase**
```
Player → completeAdventure()
↓
Contract:
  - Calls GameState.addResources() with accumulated rewards
  - Mints Relic NFTs (if any found)
  - Sets 3-hour cooldown on scout/hero
  - Marks adventure as complete (active = false)
```

---

## ⚠️ Disaster Mechanics

When player hits a DISASTER tile:

### If Using Starting Scout:
```solidity
delete playerScouts[player];
```
- Scout is permanently lost
- Must purchase new scout (10 SONIC)
- All accumulated rewards lost

### If Using Hero NFT:
```solidity
heroNFTAddress.call(abi.encodeWithSignature("burn(uint256)", heroId));
```
- Hero NFT is burned (permanently destroyed)
- Must mint new hero or use scout
- All accumulated rewards lost

**No Refunds or Recovery!**

---

## 🔗 Contract Integrations

### GameState Integration:
```solidity
// Check player tier
gameStateAddress.staticcall(
    abi.encodeWithSignature("getPlayerTier(address)", player)
)

// Add rewards
gameStateAddress.call(
    abi.encodeWithSignature(
        "addResources(address,uint256,uint256,uint256,uint256)",
        player, gold, food, rep, diamonds
    )
)
```

### HeroNFT Integration:
```solidity
// Check ownership
heroNFTAddress.staticcall(
    abi.encodeWithSignature("ownerOf(uint256)", heroId)
)

// Burn hero on disaster
heroNFTAddress.call(
    abi.encodeWithSignature("burn(uint256)", heroId)
)
```

### RelicNFT Integration:
```solidity
// Mint relic
relicNFTAddress.call(
    abi.encodeWithSignature("mintForAdventure(address)", player)
)
```

---

## 📈 Expected Outcomes

### Per 9-Tile Adventure (Tier 0):
Based on probabilities:

| Resource | Expected Tiles | Expected Amount |
|----------|----------------|-----------------|
| Gold | 1.0 tile | ~175 Gold |
| Food | 1.0 tile | ~87.5 Food |
| Diamonds | 1.5 tiles | ~4.5 Diamonds |
| REP | 0.225 tiles | ~13.5 REP |
| Relics | 0.225 tiles | ~0.225 Relics |
| Disaster | 1.35 tiles | 76.8% chance |

**Risk Assessment:** 76.8% chance of hitting disaster on full 9-tile run!

---

## 🎯 Strategic Considerations

### Player Strategies:

**Conservative (3 tiles):**
- 38.6% disaster risk
- Lower rewards but safer

**Balanced (5 tiles):**
- 55.6% disaster risk
- Moderate rewards

**Aggressive (9 tiles):**
- 76.8% disaster risk
- Maximum rewards if successful

### Economic Balance:

**Starting Scout Investment:**
- Cost: 10 SONIC
- Risk: Can be lost on disaster
- Benefit: No hero NFT required

**Hero NFT Investment:**
- Cost: 1000-1500 Gold + 1000 Food + 30-40 Diamonds
- Risk: Can be burned on disaster
- Benefit: Reusable (with 3h cooldown)

---

## 🔒 Security Features

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Ownership checks for heroes
- ✅ Cooldown enforcement
- ✅ One active adventure per player
- ✅ Proper random number generation
- ✅ UUPS upgradeable pattern
- ✅ Input validation on all functions

---

## 🚀 Gas Optimization

- Struct packing for storage efficiency
- View functions for read operations
- Events for off-chain tracking
- Minimal storage updates
- Efficient probability calculations

---

## ✅ Testing Checklist

- [ ] Purchase starting scout
- [ ] Start adventure with scout
- [ ] Start adventure with hero
- [ ] Reveal tiles (all types)
- [ ] Handle disaster (scout)
- [ ] Handle disaster (hero)
- [ ] Complete adventure
- [ ] Cooldown enforcement
- [ ] Resource distribution
- [ ] Relic minting
- [ ] Tier-based grid sizes
- [ ] Edge cases (all tiles revealed, etc.)

---

## 📋 Deployment Checklist

1. Deploy AdventureSystem (upgradeable)
2. Set contract addresses:
   - `setGameStateAddress()`
   - `setHeroNFTAddress()`
   - `setRelicNFTAddress()`
   - `setBattleSystemAddress()` (optional)
3. Update GameState:
   - `setAdventureSystemAddress()`
4. Update HeroNFT:
   - `setAdventureSystemAddress()`
5. Update RelicNFT:
   - `setAdventureSystemAddress()`
6. Verify contracts on explorer
7. Test on testnet thoroughly
8. Deploy to mainnet

---

**Status:** ✅ AdventureSystem.sol complete and ready for integration!
**Next:** Phase 3-4 (Contract Integrations)

