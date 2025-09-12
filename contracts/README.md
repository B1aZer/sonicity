# Sonicity Game Contracts Deployment Guide

This guide provides comprehensive instructions for deploying the complete Sonicity game smart contract ecosystem to the blockchain.

## 📋 Contract Overview

Sonicity consists of multiple interconnected smart contracts that must be deployed in a specific order due to dependencies:

### Core Contracts
- **GameState**: Central state management and player data
- **GridBuildings**: Houses, farms, diamond stations, rep forges, yield stations
- **DistrictBuildings**: City-level buildings and infrastructure
- **Altar**: NFT staking and building creation hub
- **BattleSystem**: Combat mechanics and hero battles

### NFT Contracts
- **SonicityNFT**: House NFTs
- **SonicityFarm**: Farm NFTs  
- **SonicityDiamond**: Diamond station NFTs
- **SonicityRep**: Rep forge NFTs
- **SonicityYieldNFT**: Yield station NFTs
- **SonicityArtProxy**: Art metadata proxy
- **HeroNFT**: Hero character NFTs
- **TacticsNFT**: Battle tactics NFTs
- **CosmeticItems**: Cosmetic upgrades

## 🔗 Contract Dependencies

### Critical Deployment Dependencies

```
NFT Contracts (independent)
    ↓
GameState ← DistrictBuildings
    ↓           ↓
GridBuildings ← Altar ← BattleSystem
    ↓           ↓       ↓
    └─── Cross-references ───┘
```

**Key Dependencies:**
1. **GridBuildings depends on**: GameState, Altar (for building creation)
2. **Altar depends on**: GameState, GridBuildings (for initialization)
3. **BattleSystem depends on**: GameState, GridBuildings, DistrictBuildings
4. **All contracts**: Must be connected via setter functions after deployment

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Hardhat
- Local blockchain (Anvil/Sonic) or testnet access

### Environment Setup
```bash
cd contracts
npm install
cp env.example .env
# Edit .env with your keys
```

### Local Development (Anvil)
```bash
# Start Anvil fork of Sonic network
npm run anvil:sonic

# Full deployment (recommended for fresh setup)
npm run deploy

# Individual contract deployment (for updates)
npm run deploy:grid    # GridBuildings only
npm run deploy:altar   # Altar only
```

### Testnet/Mainnet
```bash
npm run deploy:testnet
npm run deploy:mainnet
```

## 📂 Deployment Scripts

### Main Scripts
- **`scripts/deploy.js`**: Complete ecosystem deployment
- **`scripts/deploy-grid.js`**: GridBuildings-only deployment (reusable)
- **`scripts/deploy-altar.js`**: Altar-only deployment (reusable)
- **`scripts/upgrade.js`**: Contract upgrades

### Utility Scripts
- **`scripts/approveCollection.js`**: Approve NFT collections in Altar
- **`scripts/grant-rep.js`**: Grant REP to players for testing
- **`scripts/add-gold.js`**: Add gold to players for testing
- **`scripts/fast-forward.js`**: Fast-forward time for testing

## ⚠️ Deployment Order & Dependencies

### Critical Order Requirements

1. **NFT Contracts First** (no dependencies)
   ```bash
   # These are deployed first in main script
   - SonicityNFT, SonicityFarm, SonicityDiamond, etc.
   ```

2. **Core Infrastructure** (order matters!)
   ```bash
   # GameState must be deployed before others reference it
   GameState → DistrictBuildings → GridBuildings
   ```

3. **Altar Deployment** (complex dependencies)
   ```bash
   # Altar needs GameState + GridBuildings addresses for initialization
   Altar(gameStateAddress, gridBuildingsAddress)
   ```

4. **Cross-Contract Setup** (after all deployments)
   ```bash
   # Bidirectional references must be set up correctly
   gameState.setAltarAddress(altar)
   altar.setGameStateAddress(gameState)
   # ... many more connections
   ```

### Why GridBuildings Depends on Altar

**Building Creation Flow:**
```
Player → Altar.stakeNFT() → GridBuildings.createBuilding()
```

- **Altar** creates buildings in **GridBuildings** via `createBuilding()`
- **Only Altar** can call `createBuilding()` (access control)
- **GridBuildings** validates with **GameState** for tier requirements
- If **Altar** has wrong **GridBuildings** address → buildings created in wrong contract!

**This is why we needed to redeploy Altar when GridBuildings was redeployed.**

## 🔄 Contract Updates

### When to Use Each Deployment Script

#### Full Redeployment (`npm run deploy`)
- ✅ Fresh local development setup
- ✅ Major contract changes affecting multiple contracts
- ✅ New network deployment

#### GridBuildings Only (`npm run deploy:grid`)
- ✅ GridBuildings contract logic updates
- ✅ Building config changes
- ✅ Production system improvements
- ⚠️ **Requires Altar redeployment** if address changes

#### Altar Only (`npm run deploy:altar`)
- ✅ Altar logic updates
- ✅ Staking mechanism changes
- ✅ After GridBuildings redeployment (to fix address references)

#### Upgrade (`npm run upgrade`)
- ✅ Minor logic changes in existing contracts
- ✅ When contract addresses don't change
- ✅ UUPS proxy upgrades

### Update Sequence Example

If you need to update GridBuildings in production:

```bash
# 1. Deploy new GridBuildings (gets new address)
npm run deploy:grid

# 2. Deploy new Altar (to point to new GridBuildings)
npm run deploy:altar

# 3. Frontend automatically updates via update-addresses.sh
# Players can now mint/stake → creates buildings in new GridBuildings
# Players can charge buildings → charges in new GridBuildings
```

## 🧪 Testing

### Local Testing
```bash
# Run all tests
npm test

# Test specific contracts
npx hardhat test test/GridBuildings.test.js
npx hardhat test test/Altar.test.js
```

### Manual Testing Commands
```bash
# Add resources for testing
npm run add-gold -- --player 0x123... --amount 1000
npm run grant-rep -- --player 0x123... --amount 500

# Fast-forward time for production cycles
npm run fast-forward -- --hours 24
```

## 📁 File Structure

```
contracts/
├── contracts/           # Solidity contracts
│   ├── GameState.sol
│   ├── GridBuildings.sol
│   ├── Altar.sol
│   └── ...
├── scripts/             # Deployment & utility scripts
│   ├── deploy.js        # Main deployment
│   ├── deploy-grid.js   # GridBuildings deployment
│   ├── deploy-altar.js  # Altar deployment
│   └── ...
├── test/               # Contract tests
├── deployed-addresses.json  # Contract addresses
└── README.md           # This file
```

## 🔧 Configuration

### Network Configuration
Edit `hardhat.config.js` for different networks:

```javascript
networks: {
  localhost: { url: "http://localhost:8545" },
  testnet: { url: "https://api.testnet.sonic.game" },
  mainnet: { url: "https://api.sonic.game" }
}
```

### Environment Variables
Required in `.env`:
```
PRIVATE_KEY=your_deployer_private_key
SONIC_API_KEY=your_sonic_api_key (if needed)
```

## 🚨 Common Issues & Solutions

### Issue: "Building does not exist" when charging
**Cause**: Frontend points to new GridBuildings, but Altar still points to old GridBuildings
**Solution**: Redeploy Altar with `npm run deploy:altar`

### Issue: "Only Altar can create buildings"
**Cause**: Altar address not set in GridBuildings
**Solution**: Check contract setup in deployment logs

### Issue: "Tier requirement not met"
**Cause**: GameState not connected to GridBuildings
**Solution**: Verify GameState address setup

## 📊 Frontend Integration

After deployment:
1. **Addresses auto-update**: `scripts/update-addresses.sh` updates `src/js/utils/constants.js`
2. **Frontend uses**: New contract addresses automatically
3. **No manual config**: Required in frontend code

## 🔐 Security Considerations

- **Owner controls**: All contracts have owner-only functions
- **Access control**: Cross-contract calls protected by address validation
- **Upgrade safety**: UUPS pattern allows upgrades while preserving state
- **Proxy pattern**: Implementation can be upgraded without losing data

## 📞 Support

For deployment issues:
1. Check contract addresses in `deployed-addresses.json`
2. Verify all cross-contract addresses are set correctly
3. Check transaction logs for deployment errors
4. Test with smaller operations first (mint single NFT, charge single building)

---

**Remember**: Contract deployment order matters! Always deploy GridBuildings before Altar, and ensure all address references are updated correctly.