# Adventure System - Main Deploy Integration

## ✅ Integration Complete

The Adventure System has been successfully integrated into the main deployment script (`scripts/deploy.js`).

## What Was Changed

### 1. Import Added
```javascript
const { deployAdventureSystem } = require("./deploy-adventure-system");
```

### 2. Deployment Call Added
After Hero/Tactics deployment, the script now deploys:
- **RelicNFT** (non-upgradeable ERC721)
- **AdventureSystem** (UUPS upgradeable proxy)

### 3. Contract Setup Automatically Handled
The `deployAdventureSystem` function handles:
- Setting GameState address in AdventureSystem
- Setting HeroNFT address in AdventureSystem
- Setting RelicNFT address in AdventureSystem
- Authorizing AdventureSystem to mint RelicNFTs
- Setting AdventureSystem address in GameState

### 4. Addresses Saved
All Adventure System addresses are automatically saved to `deployed-addresses.json`:
- `relicNFT`
- `adventureSystemImpl`
- `adventureSystemProxy`

## Deployment Order

The main script now deploys in this order:
1. NFT contracts (Houses, Farms, Diamonds, Rep, Yield, ArtProxy)
2. GameState
3. DistrictBuildings
4. BattleSystem
5. MatchmakingSystem
6. GridBuildings
7. Altar
8. Hero/Tactics/Cosmetic Items
9. **Adventure System** (NEW)

## How to Deploy

### Full Deployment (All Contracts)
```bash
cd contracts
npx hardhat run scripts/deploy.js --network <network>
```

### Adventure System Only (if main contracts already deployed)
```bash
cd contracts
npx hardhat run scripts/deploy-adventure-system.js --network <network>
```

## Contract Connections

The Adventure System integrates with:
- ✅ **GameState** - For resource distribution and player tier
- ✅ **HeroNFT** - For hero availability and burning on disaster
- ✅ **RelicNFT** - For minting special rewards

## Final Probabilities

### Tile Types
- **Safe**: 40%
- **Reward**: 30%
- **Disaster**: 15%
- **Diamond**: 10%
- **Special**: 5%

### Reward Distribution
**From Reward tiles (30%):**
- Gold: 55% = 16.5% per tile
- Food: 45% = 13.5% per tile

**From Diamond tiles (10%):**
- Diamonds: 100% = 10% per tile

**From Special tiles (5%):**
- REP: 65% = 3.25% per tile
- Relic NFT: 35% = 1.75% per tile

## Next Steps

1. ✅ Deploy contracts using main script
2. ⏳ Generate relic metadata: `node scripts/generate-relic-metadata.js`
3. ⏳ Upload relic images to `/public/images/relics/`
4. ⏳ Create frontend contract wrappers
5. ⏳ Create AdventureHub page
6. ⏳ Update router with adventure-hub route

## Testing

Run Adventure System tests:
```bash
npx hardhat test test/AdventureSystem.test.js
```

Run all tests:
```bash
npx hardhat test
```

