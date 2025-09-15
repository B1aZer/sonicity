# Contract Address Verification Scripts

This directory contains scripts to verify and fix contract address configurations in the Sonicity project.

## Scripts Overview

### 1. `verify-contract-addresses.js`
**Purpose**: Basic verification of contract addresses and frontend constants

**What it checks**:
- ✅ All expected contracts exist in `deployed-addresses.json`
- ✅ All addresses have valid Ethereum address format
- ✅ All contracts exist on the blockchain (have code deployed)
- ✅ Frontend constants match deployed addresses

**Usage**:
```bash
npx hardhat run scripts/verify-contract-addresses.js --network localhost
```

**Output**: Comprehensive report showing all contract addresses and their status

### 2. `verify-contract-references.js`
**Purpose**: Advanced verification of contract cross-references

**What it checks**:
- ✅ GameState knows about Altar, DistrictBuildings, GridBuildings, etc.
- ✅ Altar knows about GameState and GridBuildings
- ✅ All contracts have correct references to other contracts
- ✅ No missing or incorrect cross-references

**Usage**:
```bash
npx hardhat run scripts/verify-contract-references.js --network localhost
```

**Output**: Detailed report of contract cross-references and any mismatches

### 3. `fix-contract-references.js`
**Purpose**: Automatically fix contract cross-reference issues

**What it does**:
- 🔧 Sets missing contract addresses in GameState
- 🔧 Sets missing contract addresses in DistrictBuildings
- 🔧 Sets missing contract addresses in GridBuildings
- 🔧 Calls appropriate setter functions to establish references

**Usage**:
```bash
npx hardhat run scripts/fix-contract-references.js --network localhost
```

**Output**: Confirmation of fixes applied

## Expected Contract Structure

The scripts expect the following contracts to be deployed:

### NFT Contracts
- `sonicityNFT` - Main NFT contract
- `sonicityFarm` - Farm NFT contract
- `sonicityDiamond` - Diamond NFT contract
- `sonicityRep` - Reputation NFT contract
- `sonicityYieldNFT` - Yield NFT contract
- `sonicityArtProxy` - Art proxy contract

### Core Game Contracts
- `gameStateImpl` / `gameStateProxy` - Game state management
- `districtBuildingsImpl` / `districtBuildingsProxy` - District buildings
- `gridBuildingsImpl` / `gridBuildingsProxy` - Grid buildings
- `altarImpl` / `altarProxy` - Altar staking system
- `battleSystemImpl` / `battleSystemProxy` - Battle system

### Hero & Tactics Contracts
- `heroNFTImpl` / `heroNFTProxy` - Hero NFT contract
- `tacticsNFTImpl` / `tacticsNFTProxy` - Tactics NFT contract
- `cosmeticItemsImpl` / `cosmeticItemsProxy` - Cosmetic items contract

## Contract Cross-References

The following cross-references should be established:

### GameState References
- `altarAddress` → Altar proxy
- `districtBuildingsAddress` → DistrictBuildings proxy
- `gridBuildingsAddress` → GridBuildings proxy
- `battleSystemAddress` → BattleSystem proxy
- `heroNFTAddress` → HeroNFT proxy
- `tacticsNFTAddress` → TacticsNFT proxy
- `cosmeticItemsAddress` → CosmeticItems proxy

### DistrictBuildings References
- `gameStateAddress` → GameState proxy
- `battleSystemAddress` → BattleSystem proxy

### GridBuildings References
- `gameStateAddress` → GameState proxy
- `altarAddress` → Altar proxy
- `battleSystemAddress` → BattleSystem proxy
- `districtBuildingsAddress` → DistrictBuildings proxy

### Altar References
- `gameState` → GameState proxy
- `gridBuildings` → GridBuildings proxy
- `yieldNFT` → SonicityYieldNFT

### BattleSystem References
- `gameStateAddress` → GameState proxy
- `districtBuildingsAddress` → DistrictBuildings proxy
- `gridBuildingsAddress` → GridBuildings proxy
- `heroNFTAddress` → HeroNFT proxy
- `tacticsNFTAddress` → TacticsNFT proxy

### HeroNFT, TacticsNFT, CosmeticItems References
- `gameStateAddress` → GameState proxy

## Frontend Constants

The scripts also verify that frontend constants match deployed addresses:

- `SONICITY_NFT` → `sonicityNFT`
- `SONICITY_FARM` → `sonicityFarm`
- `SONICITY_DIAMOND` → `sonicityDiamond`
- `SONICITY_REP` → `sonicityRep`
- `SONICITY_YIELD_NFT` → `sonicityYieldNFT`
- `SONICITY_ART_PROXY` → `sonicityArtProxy`
- `ALTAR` → `altarProxy`
- `GAME_STATE` → `gameStateProxy`
- `DISTRICT_BUILDINGS` → `districtBuildingsProxy`
- `GRID_BUILDINGS` → `gridBuildingsProxy`
- `BATTLE_SYSTEM` → `battleSystemProxy`
- `HERO_NFT` → `heroNFTProxy`
- `TACTICS_NFT` → `tacticsNFTProxy`
- `COSMETIC_ITEMS` → `cosmeticItemsProxy`

## Workflow

1. **After deployment**: Run `verify-contract-addresses.js` to check basic setup
2. **Check references**: Run `verify-contract-references.js` to check cross-references
3. **Fix issues**: Run `fix-contract-references.js` if any cross-reference issues are found
4. **Verify fixes**: Run `verify-contract-references.js` again to confirm fixes
5. **Update frontend**: Use `update-addresses.sh` to sync frontend constants if needed

## Troubleshooting

### Common Issues

1. **Missing contract addresses**: Ensure all contracts are deployed and addresses are in `deployed-addresses.json`
2. **Invalid address format**: Check that addresses start with `0x` and are 42 characters long
3. **Contract not deployed**: Verify contracts exist on the blockchain
4. **Cross-reference mismatches**: Use `fix-contract-references.js` to fix them
5. **Frontend constant mismatches**: Update frontend constants to match deployed addresses

### Error Messages

- `❌ Missing address for X`: Contract address not found in `deployed-addresses.json`
- `❌ Invalid address format`: Address doesn't match Ethereum address format
- `❌ No contract code at address`: Contract not deployed at the specified address
- `❌ Expected X, got Y`: Cross-reference mismatch between contracts
- `❌ Error reading`: Failed to read contract state (check network connection)

## Network Support

These scripts work with any Hardhat network configuration:
- `localhost` - Local development
- `dev` - Development network
- `prod` - Production network
- Custom networks defined in `hardhat.config.js`

Make sure to specify the correct network when running the scripts.
