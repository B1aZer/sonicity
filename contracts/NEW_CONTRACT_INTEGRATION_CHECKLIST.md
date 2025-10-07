# 📋 New Contract Integration Checklist

**Use this checklist when adding ANY new contract to the Sonicity game.**

---

## 🎯 Purpose

This document ensures that when you create a new contract, you update ALL necessary files and scripts so the contract integrates properly with the existing system.

---

## ✅ Complete Checklist

### 1. Contract Development

- [ ] **Create the contract file**
  - Location: `contracts/contracts/YourContract.sol`
  - Use appropriate inheritance (Upgradeable vs Non-Upgradeable)
  - Add proper access control
  - Add events for all state changes

- [ ] **Choose contract pattern**
  - [ ] **Non-Upgradeable (e.g., NFTs)**: Use `ERC721`, `ERC1155`, or `ERC20` + `Ownable`
  - [ ] **Upgradeable (e.g., Game Logic)**: Use `Initializable`, `UUPSUpgradeable`, `OwnableUpgradeable`, `ReentrancyGuardUpgradeable`

- [ ] **Add constructor disabler (if upgradeable)**
  ```solidity
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
      _disableInitializers();
  }
  ```

- [ ] **Add initialize function (if upgradeable)**
  ```solidity
  function initialize() public initializer {
      __Ownable_init(msg.sender);
      __UUPSUpgradeable_init();
      __ReentrancyGuard_init();
  }
  ```

---

### 2. Contract Testing

- [ ] **Create test file**
  - Location: `contracts/test/YourContract.test.js`
  - Follow existing test patterns (see `AdventureSystem.test.js`)

- [ ] **Write comprehensive tests**
  - [ ] Contract initialization
  - [ ] All public/external functions
  - [ ] Access control
  - [ ] Edge cases
  - [ ] Event emissions
  - [ ] Integration with other contracts
  - [ ] Gas usage for expensive operations

- [ ] **Run tests**
  ```bash
  npx hardhat test test/YourContract.test.js
  ```

---

### 3. Deployment Scripts

#### A. Create Dedicated Deployment Script

- [ ] **Create deployment script**
  - Location: `contracts/scripts/deploy-your-contract.js`
  - Export a reusable function: `deployYourContract(existingAddresses = {})`
  - Include main() function for standalone execution
  - Pattern: See `deploy-adventure-system.js`

- [ ] **Deployment script must:**
  - [ ] Deploy implementation (if upgradeable)
  - [ ] Deploy proxy (if upgradeable)
  - [ ] Call initialize()
  - [ ] Set all contract references
  - [ ] Call setter functions on related contracts
  - [ ] Return all new addresses
  - [ ] Include error handling
  - [ ] Include helpful console logs

#### B. Update Main Deployment Script

- [ ] **Update `scripts/deploy.js`**
  - [ ] Import your deployment function
    ```javascript
    const { deployYourContract } = require("./deploy-your-contract");
    ```
  
  - [ ] Call deployment function in correct order
    ```javascript
    const yourContractAddresses = await deployYourContract({
      gameStateProxy: gameStateProxyAddress,
      // ... other required addresses
    });
    ```
  
  - [ ] Add addresses to console output
    ```javascript
    console.log("YourContract implementation:", yourContractAddresses.yourContractImpl);
    console.log("YourContract proxy:", yourContractAddresses.yourContractProxy);
    ```
  
  - [ ] Spread addresses into final addresses object
    ```javascript
    const addresses = {
      ...nftAddresses,
      ...heroTacticsAddresses,
      ...yourContractAddresses, // ADD THIS
      // ... rest
    };
    ```

---

### 4. Contract Reference Management

#### A. Update Verification Scripts

- [ ] **Update `scripts/verify-contract-addresses.js`**
  - [ ] Add to `EXPECTED_CONTRACTS` object
    ```javascript
    yourContractImpl: 'YourContract (Implementation)',
    yourContractProxy: 'YourContract (Proxy)',
    ```
  
  - [ ] Add to `FRONTEND_MAPPING` object (if used in frontend)
    ```javascript
    YOUR_CONTRACT: 'yourContractProxy',
    ```

- [ ] **Update `scripts/verify-contract-references.js`**
  - [ ] Add contract references to `CONTRACT_REFERENCES` object
    ```javascript
    // YourContract should reference:
    yourContractProxy: {
      contractName: 'YourContract',
      references: {
        gameStateAddress: 'gameStateProxy',
        // ... other references
      }
    },
    ```
  
  - [ ] Add your contract address to contracts that reference it
    ```javascript
    // In gameStateProxy references:
    yourContractAddress: 'yourContractProxy',
    ```

- [ ] **Update `scripts/fix-contract-references.js`**
  - [ ] Add fix code for your contract
    ```javascript
    // Fix YourContract references
    if (addresses.yourContractProxy) {
      console.log('\n🔧 Fixing YourContract references...');
      const yourContract = await ethers.getContractAt('YourContract', addresses.yourContractProxy);
      
      console.log('  Setting GameState address...');
      await yourContract.setGameStateAddress(addresses.gameStateProxy);
      console.log('  ✅ GameState address set');
    }
    ```
  
  - [ ] Add fix code for contracts that reference yours
    ```javascript
    // In GameState fix section:
    if (addresses.yourContractProxy) {
      console.log('  Setting YourContract address in GameState...');
      await gameState.setYourContractAddress(addresses.yourContractProxy);
      console.log('  ✅ YourContract address set');
    }
    ```
  
  - [ ] Add confirmation logs at the end
    ```javascript
    if (addresses.yourContractProxy) {
      console.log('  ✅ GameState.yourContractAddress →', addresses.yourContractProxy);
      console.log('  ✅ YourContract.gameStateAddress →', addresses.gameStateProxy);
    }
    ```

---

### 5. Frontend Integration

#### A. Update Constants

- [ ] **Update `src/js/utils/constants.js`**
  - [ ] Add to `CONTRACT_ADDRESSES` object
    ```javascript
    export const CONTRACT_ADDRESSES = {
      // ... existing contracts
      YOUR_CONTRACT: "0x0000000000000000000000000000000000000000",
    };
    ```

- [ ] **Update `scripts/update-addresses.sh`**
  - [ ] Add jq read command
    ```bash
    YOUR_CONTRACT=$(jq -r '.yourContractProxy' deployed-addresses.json)
    ```
  
  - [ ] Add sed update command
    ```bash
    sed -i '' "s/YOUR_CONTRACT: \"0x[a-fA-F0-9]*\"/YOUR_CONTRACT: \"$YOUR_CONTRACT\"/" ../src/js/utils/constants.js
    ```
  
  - [ ] Add echo log
    ```bash
    echo "YOUR_CONTRACT: $YOUR_CONTRACT"
    ```

#### B. Create Contract Wrapper

- [ ] **Create frontend contract wrapper**
  - Location: `src/js/contracts/YourContractContract.js`
  - Pattern: See `AdventureSystemContract.js`
  - Must include:
    - [ ] Import BaseContract
    - [ ] Contract ABI import
    - [ ] All read functions
    - [ ] All write functions
    - [ ] Event listeners
    - [ ] Error handling

#### C. Create Contract Manager (if needed)

- [ ] **Create manager file** (if complex state management needed)
  - Location: `src/js/managers/yourContractManager.js`
  - Pattern: See existing managers
  - Include:
    - [ ] State caching
    - [ ] Update functions
    - [ ] Event handling
    - [ ] UI updates

---

### 6. Frontend UI (if applicable)

- [ ] **Create page file**
  - Location: `src/pages/YourPage.js`
  - Pattern: See existing pages

- [ ] **Create CSS file**
  - Location: `src/styles/your-page.css`
  - Pattern: See existing styles

- [ ] **Update router**
  - Location: `src/js/core/router.js`
  - Add route and import

---

### 7. Integration with Existing Contracts

#### A. Modify Related Contracts

- [ ] **Update contracts that need to reference yours**
  - Example: If GameState needs to call your contract
    ```solidity
    // In GameState.sol
    address public yourContractAddress;
    
    function setYourContractAddress(address _addr) external onlyOwner {
        yourContractAddress = _addr;
    }
    ```

- [ ] **Update contracts that you need to reference**
  - Add address storage variables
  - Add setter functions
  - Add access control for interactions

#### B. Update Contract Interfaces

- [ ] **Add interface definitions** (if needed)
  - For cross-contract calls
  - Follow existing patterns

---

### 8. Documentation

- [ ] **Create contract summary doc**
  - Location: `contracts/YOUR_CONTRACT_SUMMARY.md`
  - Include:
    - Contract purpose
    - Key features
    - Functions list
    - Events list
    - Integration points

- [ ] **Update main README** (if significant feature)
  - Add to feature list
  - Add usage instructions

- [ ] **Create deployment guide** (if complex)
  - Location: `contracts/YOUR_CONTRACT_DEPLOYMENT.md`
  - Include step-by-step instructions

---

### 9. Metadata & Assets (if NFT)

- [ ] **Create metadata generation script**
  - Location: `scripts/generate-your-nft-metadata.js`
  - Pattern: See `generate-relic-metadata.js`

- [ ] **Create asset directory**
  - Location: `public/metadata/your-nft/`
  - Generate JSON files

- [ ] **Create image guide** (if needed)
  - Document required images
  - Specify dimensions and formats

---

### 10. Testing & Verification

- [ ] **Run all tests**
  ```bash
  npx hardhat test
  ```

- [ ] **Compile contracts**
  ```bash
  npx hardhat compile
  ```

- [ ] **Test deployment** (local)
  ```bash
  npx hardhat node
  # In another terminal:
  npx hardhat run scripts/deploy.js --network localhost
  ```

- [ ] **Verify addresses**
  ```bash
  npx hardhat run scripts/verify-contract-addresses.js --network localhost
  ```

- [ ] **Verify cross-references**
  ```bash
  npx hardhat run scripts/verify-contract-references.js --network localhost
  ```

- [ ] **Test frontend integration** (if applicable)
  - Start dev server
  - Test all UI interactions
  - Check console for errors

---

### 11. Production Deployment

- [ ] **Deploy to testnet**
  ```bash
  npx hardhat run scripts/deploy.js --network testnet
  ```

- [ ] **Verify contracts on block explorer**
  ```bash
  npx hardhat run scripts/verify.js --network testnet
  ```

- [ ] **Test on testnet**
  - Verify all functions work
  - Check gas costs
  - Test edge cases

- [ ] **Deploy to mainnet**
  ```bash
  npx hardhat run scripts/deploy.js --network mainnet
  ```

- [ ] **Update production frontend**
  ```bash
  ./scripts/update-addresses.sh
  ```

---

## 📝 Quick Reference: Files to Update

### Contract Files
- [ ] `contracts/contracts/YourContract.sol`
- [ ] `contracts/test/YourContract.test.js`

### Deployment Scripts
- [ ] `contracts/scripts/deploy-your-contract.js` (new)
- [ ] `contracts/scripts/deploy.js`

### Verification Scripts
- [ ] `contracts/scripts/verify-contract-addresses.js`
- [ ] `contracts/scripts/verify-contract-references.js`
- [ ] `contracts/scripts/fix-contract-references.js`

### Frontend
- [ ] `src/js/utils/constants.js`
- [ ] `scripts/update-addresses.sh`
- [ ] `src/js/contracts/YourContractContract.js` (new)
- [ ] `src/pages/YourPage.js` (new, if applicable)
- [ ] `src/styles/your-page.css` (new, if applicable)
- [ ] `src/js/core/router.js` (if applicable)

### Documentation
- [ ] `contracts/YOUR_CONTRACT_SUMMARY.md` (new)
- [ ] `contracts/NEW_CONTRACT_INTEGRATION_CHECKLIST.md` (this file)
- [ ] Update main README if needed

---

## 🎯 Example: Adventure System Integration

For reference, see these files for the Adventure System integration:

### Contracts
- `contracts/contracts/AdventureSystem.sol`
- `contracts/contracts/RelicNFT.sol`
- `contracts/test/AdventureSystem.test.js`

### Scripts
- `contracts/scripts/deploy-adventure-system.js`
- `contracts/scripts/deploy.js` (updated)
- `contracts/scripts/verify-contract-addresses.js` (updated)
- `contracts/scripts/verify-contract-references.js` (updated)
- `contracts/scripts/fix-contract-references.js` (updated)

### Frontend
- `src/js/contracts/AdventureSystemContract.js`
- `src/js/contracts/RelicNFTContract.js`
- `src/pages/AdventureHubPage.js`
- `src/styles/adventure-hub-page.css`
- `scripts/update-addresses.sh` (updated)

### Documentation
- `contracts/ADVENTURE_SYSTEM_SUMMARY.md`
- `contracts/ADVENTURE_SYSTEM_INTEGRATION.md`
- `contracts/ADVENTURE_SCRIPTS_UPDATE_SUMMARY.md`
- `RELIC_IMAGE_GUIDE.md`

---

## ⚠️ Common Mistakes to Avoid

1. ❌ **Forgetting to update `deploy.js`** - Contract won't be deployed with main script
2. ❌ **Not updating verification scripts** - Can't verify contract setup
3. ❌ **Missing cross-references** - Contracts can't communicate
4. ❌ **Forgetting `update-addresses.sh`** - Frontend won't get new addresses automatically
5. ❌ **Not testing locally first** - Wastes gas on failed deployments
6. ❌ **Skipping test suite** - Bugs make it to production
7. ❌ **Not documenting** - Future developers (including you) will be confused

---

## 🚀 Summary

**Minimum Files to Update for ANY New Contract:**

1. Create contract + tests
2. Create `deploy-your-contract.js`
3. Update `deploy.js`
4. Update `verify-contract-addresses.js`
5. Update `verify-contract-references.js`
6. Update `fix-contract-references.js`
7. Update `constants.js`
8. Update `update-addresses.sh`
9. Create frontend contract wrapper (if needed)
10. Document everything

**Follow this checklist every time, and your integration will be smooth!** ✅

---

**Last Updated:** 2025-10-07 (Adventure System Integration)

