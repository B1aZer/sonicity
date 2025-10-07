# 🚀 Adventure System Deployment Guide

## Overview
This guide walks through deploying the Adventure System contracts to the blockchain.

---

## 📋 Prerequisites

### 1. **Existing Contracts Required**
The Adventure System depends on these contracts being already deployed:
- ✅ `GameState` (proxy)
- ✅ `HeroNFT` (proxy)
- ✅ `deployed-addresses.json` file with existing addresses

### 2. **Environment Setup**
```bash
cd contracts
npm install
```

### 3. **Network Configuration**
Ensure `hardhat.config.js` has your network configured:
- Sonic Testnet
- Sonic Mainnet
- Or local Anvil/Hardhat node

---

## 🎯 Deployment Steps

### **Step 1: Compile Contracts**
```bash
cd /Users/test/Sites/sonic/games/sonicity/contracts
npx hardhat compile
```

**Expected output:**
```
Compiled X Solidity files successfully
```

### **Step 2: Run Deployment Script**
```bash
npx hardhat run scripts/deploy-adventure-system.js --network <network-name>
```

**Replace `<network-name>` with:**
- `localhost` - for local testing
- `sonic_testnet` - for Sonic testnet
- `sonic` - for Sonic mainnet

**Example (local):**
```bash
npx hardhat run scripts/deploy-adventure-system.js --network localhost
```

**Example (Sonic testnet):**
```bash
npx hardhat run scripts/deploy-adventure-system.js --network sonic_testnet
```

### **Step 3: Verify Deployment Output**
The script will output:
```
============================================================
ADVENTURE SYSTEM DEPLOYMENT SCRIPT
============================================================
✅ Loaded existing deployed addresses
   GameState Proxy: 0x...
   HeroNFT Proxy: 0x...

============================================================
Starting deployment...

Deploying RelicNFT...
✅ RelicNFT deployed to: 0x...

Deploying AdventureSystem implementation...
✅ AdventureSystem implementation deployed to: 0x...

Deploying AdventureSystem proxy...
✅ AdventureSystem proxy deployed to: 0x...

Setting up AdventureSystem contract references...
✅ GameState address set
✅ HeroNFT address set
✅ RelicNFT address set

Authorizing AdventureSystem to mint RelicNFTs...
✅ AdventureSystem authorized in RelicNFT

Updating GameState with AdventureSystem address...
✅ GameState updated

✅ Adventure System deployment completed!
RelicNFT: 0x...
AdventureSystem Implementation: 0x...
AdventureSystem Proxy: 0x...

============================================================
DEPLOYMENT SUMMARY
============================================================

📝 New Contracts Deployed:
   RelicNFT:              0x...
   AdventureSystem Impl:  0x...
   AdventureSystem Proxy: 0x...

🔗 Contract Connections:
   ✅ AdventureSystem → GameState
   ✅ AdventureSystem → HeroNFT
   ✅ AdventureSystem → RelicNFT
   ✅ GameState → AdventureSystem
   ✅ RelicNFT → AdventureSystem

============================================================
✅ DEPLOYMENT COMPLETE!
============================================================
```

### **Step 4: Verify `deployed-addresses.json` Updated**
```bash
cat deployed-addresses.json
```

Should contain:
```json
{
  ...existing addresses...,
  "relicNFT": "0x...",
  "adventureSystemImpl": "0x...",
  "adventureSystemProxy": "0x..."
}
```

---

## 🔄 Step 5: Update Frontend Constants

### **Automatic Update (Recommended)**
```bash
cd /Users/test/Sites/sonic/games/sonicity
chmod +x scripts/update-addresses.sh
./scripts/update-addresses.sh
```

**Expected output:**
```
Contract addresses updated successfully!
...
RelicNFT: 0x...
AdventureSystem: 0x...
```

### **Manual Update (if needed)**
Edit `/Users/test/Sites/sonic/games/sonicity/src/js/utils/constants.js`:
```javascript
export const CONTRACT_ADDRESSES = {
    ...
    RELIC_NFT: "0x...",  // Copy from deployed-addresses.json
    ADVENTURE_SYSTEM: "0x..."  // Copy from deployed-addresses.json
};
```

---

## ✅ Step 6: Generate Relic Metadata

Generate metadata for the 500 Relic NFTs:
```bash
cd /Users/test/Sites/sonic/games/sonicity
node scripts/generate-relic-metadata.js
```

**Expected output:**
```
Generating metadata for 500 Relic NFTs...
Generated metadata/relics/1.json
Generated metadata/relics/2.json
...
Generated metadata/relics/500.json
✅ Successfully generated 500 metadata files
```

---

## 🖼️ Step 7: Verify Relic Images

Ensure images exist at:
```
/public/images/relics/common.png
/public/images/relics/uncommon.png
/public/images/relics/rare.png
/public/images/relics/epic.png
/public/images/relics/legendary.png
```

---

## 🔍 Step 8: Verify Contracts on Block Explorer

### **Get Verification Command**
```bash
# RelicNFT
npx hardhat verify --network <network-name> <RelicNFT_ADDRESS>

# AdventureSystem Proxy
npx hardhat verify --network <network-name> <AdventureSystem_PROXY_ADDRESS>
```

### **Example:**
```bash
npx hardhat verify --network sonic_testnet 0x123...RelicNFT
npx hardhat verify --network sonic_testnet 0x456...AdventureSystemProxy
```

---

## 🧪 Step 9: Test Deployment

Run the test suite:
```bash
cd /Users/test/Sites/sonic/games/sonicity/contracts
npx hardhat test test/AdventureSystem.test.js --network localhost
```

---

## 📊 Post-Deployment Checklist

- [ ] ✅ RelicNFT deployed
- [ ] ✅ AdventureSystem deployed (implementation + proxy)
- [ ] ✅ GameState.adventureSystemAddress set
- [ ] ✅ AdventureSystem.gameStateAddress set
- [ ] ✅ AdventureSystem.heroNFTAddress set
- [ ] ✅ AdventureSystem.relicNFTAddress set
- [ ] ✅ RelicNFT.adventureSystemAddress set
- [ ] ✅ deployed-addresses.json updated
- [ ] ✅ Frontend constants.js updated
- [ ] ✅ Relic metadata generated (500 files)
- [ ] ✅ Relic images uploaded (5 images)
- [ ] ✅ Contracts verified on block explorer
- [ ] ✅ Tests passing

---

## 🚨 Troubleshooting

### **Error: "GameState proxy address is required"**
**Solution:** Ensure `deployed-addresses.json` exists and contains `gameStateProxy`

### **Error: "HeroNFT proxy address is required"**
**Solution:** Ensure `deployed-addresses.json` exists and contains `heroNFTProxy`

### **Error: "Failed to deploy proxy"**
**Solution:** Check:
1. Network connection
2. Wallet has sufficient funds
3. Gas price is reasonable
4. Run `npx hardhat clean` and recompile

### **Error: "Transaction reverted"**
**Solution:** Check:
1. Wallet is the owner of GameState contract
2. Wallet has sufficient gas
3. Network is not congested

---

## 🔄 Upgrading Contracts

### **Upgrade AdventureSystem (UUPS)**
```bash
npx hardhat run scripts/upgrade-adventure-system.js --network <network-name>
```

**Note:** This requires owner privileges on the proxy contract.

---

## 📝 Network-Specific Notes

### **Localhost / Hardhat**
- Use `npx hardhat node` in a separate terminal
- Fast transactions, no gas costs
- Perfect for testing

### **Sonic Testnet**
- Get testnet tokens from faucet
- Transactions take ~2-3 seconds
- Free testing environment

### **Sonic Mainnet**
- Use real SONIC tokens
- Double-check all addresses
- Test thoroughly on testnet first!
- Consider using a multisig wallet for owner functions

---

## 🎯 Next Steps After Deployment

1. **Frontend Integration**
   - [ ] Create `AdventureSystemContract.js` wrapper
   - [ ] Create `RelicNFTContract.js` wrapper
   - [ ] Build `AdventureHubPage.js` UI
   - [ ] Add router integration

2. **Testing**
   - [ ] Test starting scout purchase
   - [ ] Test adventure creation with scout
   - [ ] Test adventure creation with hero
   - [ ] Test tile revealing
   - [ ] Test resource distribution
   - [ ] Test hero loss on disaster
   - [ ] Test relic NFT minting

3. **Monitoring**
   - [ ] Set up event listeners for adventures
   - [ ] Monitor relic minting
   - [ ] Track player engagement
   - [ ] Monitor gas usage

---

## 📞 Support

If you encounter issues:
1. Check contract compilation: `npx hardhat compile`
2. Review deployment logs
3. Verify all prerequisite contracts are deployed
4. Check network configuration in `hardhat.config.js`
5. Ensure wallet has sufficient funds

---

## ✅ Deployment Complete!

Once all steps are complete, you're ready to:
- Start adventures!
- Earn resources!
- Find rare relics!
- Build the ultimate collection!

🎮 **Happy Adventuring!** 🎮

