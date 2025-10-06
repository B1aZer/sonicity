# RelicNFT Contract - Implementation Summary

## ✅ What Was Created

### 1. **RelicNFT.sol Contract**
**Location:** `contracts/contracts/RelicNFT.sol`

#### Key Features:
- ✅ ERC721Enumerable NFT contract
- ✅ Max supply: **500 relics** (rare collectibles)
- ✅ Max per player: **50 relics**
- ✅ Follows your existing NFT patterns (like SonicityNFT, SonicityFarm, etc.)
- ✅ Only mintable by AdventureSystem contract
- ✅ Auto-increment token IDs starting from 1
- ✅ Player mint count tracking

#### Rarity System:
```solidity
struct Relic {
    uint256 foundAt;    // Timestamp when discovered
    address finder;     // Player who found it
    uint8 rarity;       // 1-5 rarity level
}
```

**Rarity Distribution:**
- Common (1): 50%
- Uncommon (2): 30%
- Rare (3): 15%
- Epic (4): 4%
- Legendary (5): 1%

#### Key Functions:
- `mintForAdventure(address to)` - Mint relic (Adventure System only)
- `getRelicMetadata(uint256 tokenId)` - Get relic info
- `getRarityName(uint8 rarity)` - Get rarity name string
- `burn(uint256 tokenId)` - Burn relic (owner only)
- `setAdventureSystemAddress(address)` - Set Adventure System address

---

### 2. **Metadata Generation Script**
**Location:** `scripts/generate-relic-metadata.js`

#### Features:
- ✅ Generates 500 metadata JSON files
- ✅ Random rarity distribution matching contract
- ✅ Different images per rarity tier
- ✅ JSON attributes with rarity info
- ✅ Compatible with OpenSea/marketplaces

#### Metadata Structure:
```json
{
  "name": "Sonicity Relic #1",
  "description": "A Legendary relic discovered...",
  "image": "/images/relics/legendary.png",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Rarity Level",
      "value": 5
    },
    {
      "trait_type": "Type",
      "value": "Adventure Relic"
    }
  ]
}
```

---

## 📋 Next Steps

### 1. **Generate Metadata**
Run the metadata generation script:
```bash
cd scripts
node generate-relic-metadata.js
```

This will create 500 JSON files in `/public/metadata/relics/`

### 2. **Create Relic Images**
You need to create 5 images for different rarity tiers:
- `/public/images/relics/common.png` (50% of relics)
- `/public/images/relics/uncommon.png` (30%)
- `/public/images/relics/rare.png` (15%)
- `/public/images/relics/epic.png` (4%)
- `/public/images/relics/legendary.png` (1%)

**Image Suggestions:**
- **Common**: Simple stone artifact
- **Uncommon**: Bronze/copper relic
- **Rare**: Silver glowing artifact
- **Epic**: Gold ornate relic
- **Legendary**: Crystal/magical legendary artifact

### 3. **Add to NFT Deployment Script**
You'll need to update `scripts/deploy-nfts.js` to include RelicNFT deployment.

I can do this in the next phase when we create the full deployment script for AdventureSystem.

---

## 🔄 Integration with AdventureSystem

The RelicNFT contract is designed to work with the AdventureSystem:

```solidity
// In AdventureSystem.sol
function completeAdventure() external {
    // ... accumulate rewards ...
    
    // Mint relic NFTs if any found
    if (adventure.relicsFound > 0) {
        for (uint8 i = 0; i < adventure.relicsFound; i++) {
            relicNFTAddress.call(
                abi.encodeWithSignature("mintForAdventure(address)", msg.sender)
            );
        }
    }
}
```

---

## 📊 Contract Specifications

| Property | Value |
|----------|-------|
| **Max Supply** | 500 (rare!) |
| **Max Per Player** | 50 |
| **Base URI** | `http://localhost:3000/metadata/relics/` |
| **Token Standard** | ERC721Enumerable |
| **Rarity Levels** | 5 (Common, Uncommon, Rare, Epic, Legendary) |
| **Minting Authority** | AdventureSystem contract only |
| **Burnable** | Yes (by owner) |

---

## ✅ Completed Features

- ✅ Contract follows your existing NFT patterns
- ✅ Rarity system with weighted random generation
- ✅ Player mint limits with tracking
- ✅ Static JSON metadata (not dynamic SVG)
- ✅ Different images per rarity tier
- ✅ Metadata generation script
- ✅ OpenSea compatible metadata
- ✅ Auto-increment token IDs
- ✅ Secure minting (Adventure System only)

---

## 🎮 What This Enables

Players can now:
1. Find relics during adventures (5% chance per special tile)
2. Collect rare NFTs with different rarity tiers
3. Trade relics on marketplaces (like OpenSea)
4. Show off their legendary finds
5. Build relic collections

Future possibilities:
- Use relics for special abilities/buffs
- Craft relics into more powerful items
- Stake relics for rewards
- Relic-based quests or challenges

---

## 📝 Notes

- Contract is ready for deployment
- Metadata generation script is ready to run
- You need to create the 5 rarity tier images
- Integration with AdventureSystem will happen in Phase 1
- Deployment script will be created in Phase 11

**Status:** ✅ RelicNFT contract complete and ready for integration!

