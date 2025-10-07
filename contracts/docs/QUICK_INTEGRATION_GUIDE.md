# 🚀 Quick Integration Guide - New Contract

**Ultra-fast reference for adding a new contract to Sonicity.**

---

## 📦 Files to Create

```
contracts/
├── contracts/
│   └── YourContract.sol                    ← New contract
├── test/
│   └── YourContract.test.js                ← New tests
└── scripts/
    └── deploy-your-contract.js             ← New deployment script
```

```
src/
├── js/
│   └── contracts/
│       └── YourContractContract.js         ← New frontend wrapper
└── pages/
    └── YourPage.js                         ← New page (if needed)
```

---

## 🔧 Files to Update

### Backend (Contracts)

| File | What to Add |
|------|-------------|
| `scripts/deploy.js` | Import & call your deploy function, add addresses to output |
| `scripts/verify-contract-addresses.js` | Add to `EXPECTED_CONTRACTS` and `FRONTEND_MAPPING` |
| `scripts/verify-contract-references.js` | Add to `CONTRACT_REFERENCES` with cross-refs |
| `scripts/fix-contract-references.js` | Add setter function calls & confirmation logs |

### Frontend

| File | What to Add |
|------|-------------|
| `src/js/utils/constants.js` | Add address to `CONTRACT_ADDRESSES` |
| `scripts/update-addresses.sh` | Add jq read + sed update commands |
| `src/js/core/router.js` | Add route (if new page) |

---

## 🎯 Pattern to Follow

### 1. Contract Pattern

**Non-Upgradeable (NFT):**
```solidity
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract YourNFT is ERC721Enumerable, Ownable {
    constructor() ERC721("Name", "SYMBOL") Ownable(msg.sender) {}
}
```

**Upgradeable (Game Logic):**
```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract YourContract is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }
    
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

### 2. Deployment Script Pattern

```javascript
const { ethers, upgrades } = require("hardhat");
const fs = require('fs');

async function deployYourContract(existingAddresses = {}) {
  console.log("Deploying YourContract...");
  
  // Verify required addresses
  if (!existingAddresses.gameStateProxy) {
    throw new Error("GameState proxy address is required");
  }
  
  // Deploy implementation
  const YourContract = await ethers.getContractFactory("YourContract");
  const impl = await YourContract.deploy();
  await impl.waitForDeployment();
  const implAddress = await impl.getAddress();
  
  // Deploy proxy
  const proxy = await upgrades.deployProxy(YourContract, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  // Set up references
  await proxy.setGameStateAddress(existingAddresses.gameStateProxy);
  
  // Update related contracts
  const gameState = await ethers.getContractAt("GameState", existingAddresses.gameStateProxy);
  await gameState.setYourContractAddress(proxyAddress);
  
  return {
    yourContractImpl: implAddress,
    yourContractProxy: proxyAddress
  };
}

module.exports = { deployYourContract };
```

### 3. Frontend Wrapper Pattern

```javascript
import BaseContract from './BaseContract.js';
import YourContractABI from '../../contracts/artifacts/contracts/YourContract.sol/YourContract.json';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';

class YourContractContract extends BaseContract {
  constructor() {
    super(CONTRACT_ADDRESSES.YOUR_CONTRACT, YourContractABI.abi, 'YourContract');
  }

  // Read functions
  async getSomething(address) {
    return await this.callMethod('getSomething', address);
  }

  // Write functions
  async doSomething(param) {
    return await this.sendTransaction('doSomething', param);
  }

  // Event listeners
  setupEventListeners() {
    this.contract.on('SomethingHappened', (user, value) => {
      console.log(`Something happened: ${user}, ${value}`);
      // Update UI
    });
  }
}

export default YourContractContract;
```

---

## ⚡ Quick Commands

```bash
# Create & test contract
npx hardhat compile
npx hardhat test test/YourContract.test.js

# Deploy locally
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# Verify setup
npx hardhat run scripts/verify-contract-addresses.js --network localhost
npx hardhat run scripts/verify-contract-references.js --network localhost

# Fix if needed
npx hardhat run scripts/fix-contract-references.js --network localhost

# Update frontend
cd ..
./scripts/update-addresses.sh
```

---

## 🔍 Verification Checklist

After integration, check:

- [ ] ✅ Contract compiles without errors
- [ ] ✅ All tests pass
- [ ] ✅ Deploys successfully with main script
- [ ] ✅ `verify-contract-addresses.js` passes
- [ ] ✅ `verify-contract-references.js` passes
- [ ] ✅ Frontend constants updated
- [ ] ✅ Contract wrapper works
- [ ] ✅ UI functions properly (if applicable)

---

## 📚 Full Details

See `NEW_CONTRACT_INTEGRATION_CHECKLIST.md` for complete step-by-step guide.

---

**Example:** See Adventure System integration (`AdventureSystem.sol`, `deploy-adventure-system.js`, etc.)

