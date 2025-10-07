# Adventure System - Utility Scripts Update Summary

## ✅ All Utility Scripts Updated

The following utility scripts have been updated to include AdventureSystem and RelicNFT contracts:

## 1. verify-contract-addresses.js

**Purpose:** Verifies that contract addresses exist and match frontend constants.

### Updates Made:
- ✅ Added `relicNFT` to EXPECTED_CONTRACTS
- ✅ Added `adventureSystemImpl` to EXPECTED_CONTRACTS  
- ✅ Added `adventureSystemProxy` to EXPECTED_CONTRACTS
- ✅ Added `RELIC_NFT` to FRONTEND_MAPPING
- ✅ Added `ADVENTURE_SYSTEM` to FRONTEND_MAPPING

### Usage:
```bash
npx hardhat run scripts/verify-contract-addresses.js --network <network>
```

---

## 2. verify-contract-references.js

**Purpose:** Verifies that contracts properly reference each other (cross-references).

### Updates Made:
- ✅ Added `adventureSystemAddress` to GameState references
- ✅ Added `adventureSystemProxy` with references to:
  - `gameStateAddress`
  - `heroNFTAddress`
  - `relicNFTAddress`
- ✅ Added `relicNFT` with reference to:
  - `adventureSystemAddress`

### Usage:
```bash
npx hardhat run scripts/verify-contract-references.js --network <network>
```

---

## 3. fix-contract-references.js

**Purpose:** Fixes broken contract cross-references by calling setter functions.

### Updates Made:
- ✅ Added GameState.setAdventureSystemAddress() call
- ✅ Added AdventureSystem reference fixing:
  - Set GameState address
  - Set HeroNFT address
  - Set RelicNFT address
- ✅ Added RelicNFT reference fixing:
  - Set AdventureSystem address
- ✅ Added confirmation logs for Adventure System references

### Usage:
```bash
npx hardhat run scripts/fix-contract-references.js --network <network>
```

---

## Contract Cross-Reference Map

### AdventureSystem References:
```
AdventureSystem
  ├─→ GameState (for player resources & tier)
  ├─→ HeroNFT (for hero availability & burning)
  └─→ RelicNFT (for minting rewards)
```

### RelicNFT References:
```
RelicNFT
  └─→ AdventureSystem (authorized minter)
```

### GameState References:
```
GameState
  └─→ AdventureSystem (for adding resources)
```

---

## Testing the Scripts

### After Deployment:

1. **Verify Addresses**
   ```bash
   npx hardhat run scripts/verify-contract-addresses.js --network localhost
   ```

2. **Verify Cross-References**
   ```bash
   npx hardhat run scripts/verify-contract-references.js --network localhost
   ```

3. **If Issues Found, Fix References**
   ```bash
   npx hardhat run scripts/fix-contract-references.js --network localhost
   ```

4. **Re-verify After Fix**
   ```bash
   npx hardhat run scripts/verify-contract-references.js --network localhost
   ```

---

## Expected Output

### verify-contract-addresses.js
```
🎉 All contract addresses are correctly configured!

✅ Address format: PASSED
✅ Contract existence: PASSED
✅ Frontend constants: PASSED

🎨 NFT Contracts:
  relicNFT: 0x...

⚔️  Hero & Tactics Contracts:
  ...

🗺️  Adventure System Contracts:
  relicNFT: 0x...
  adventureSystemImpl: 0x...
  adventureSystemProxy: 0x...
```

### verify-contract-references.js
```
🎉 All contract cross-references are correctly configured!

✅ Contract references: PASSED

AdventureSystem (0x...):
  → gameStateAddress: 0x...
  → heroNFTAddress: 0x...
  → relicNFTAddress: 0x...

RelicNFT (0x...):
  → adventureSystemAddress: 0x...
```

---

## Scripts NOT Requiring Updates

The following scripts don't need updates as they are specific to other systems:
- ❌ `add-gold.js` - Only for testing GameState
- ❌ `add-revenue-pool.js` - Only for GridBuildings
- ❌ `grant-rep.js` - Only for GameState
- ❌ `updateHouseProduction.js` - Only for GridBuildings
- ❌ `updateTacticPrices.js` - Only for TacticsNFT
- ❌ `test-actual-yield-rates.js` - Only for Altar
- ❌ `test-mint-and-stake.js` - Only for Altar
- ❌ `test-yield-rates.js` - Only for Altar

---

## ✅ Summary

All utility scripts that verify and fix contract references have been updated to include the Adventure System. The scripts will now:

1. ✅ Verify AdventureSystem and RelicNFT addresses
2. ✅ Check cross-references between Adventure contracts
3. ✅ Fix broken references automatically
4. ✅ Validate frontend constants include new contracts

**The Adventure System is now fully integrated into the contract management workflow!** 🚀

