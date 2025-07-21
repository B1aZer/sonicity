# Mint and Stake Functionality

This document explains the new `mintAndStake` functionality that allows users to mint NFTs and stake them in one atomic operation.

## Overview

The new system includes:

1. **Deprecated mint functions** - The old `mint` functions in NFT contracts are now deprecated and will be disabled on production
2. **New `mintForAltar` functions** - Only the Altar contract can call these functions
3. **New `mintAndStake` function** - Allows minting and staking in one operation
4. **Updated deployment scripts** - Include SonicityDiamond and proper contract linking

## Contract Changes

### NFT Contracts (SonicityNFT, SonicityFarm, SonicityDiamond)

- Added `altarContract` variable to track the Altar contract address
- Added `mintForAltar(address to, uint256 tokenId)` function - only callable by Altar contract
- Added `setAltarContract(address _altarContract)` function for owner to set Altar address
- Marked existing `mint` functions as DEPRECATED

### Altar Contract

- Added `IMintableNFT` interface for NFT contract interaction
- Added `mintAndStake(address collection, uint256 tokenId, GridBuildings.GridBuildingType buildingType)` function
- The function mints the NFT directly to the Altar contract and then stakes it

## Deployment Scripts

### Updated Scripts

1. **`deploy.js`** - Now includes:
   - SonicityDiamond deployment
   - Setting Altar contract addresses on all NFT contracts
   - Approving SonicityDiamond collection in Altar

2. **`upgrade.js`** - Now includes:
   - Setting Altar contract addresses on NFT contracts after upgrade
   - Conditional approval of collections

### New Scripts

1. **`setup-altar-nft-links.js`** - For existing deployments:
   ```bash
   npx hardhat run scripts/setup-altar-nft-links.js --network <network>
   ```

2. **`test-mint-and-stake.js`** - Test the new functionality:
   ```bash
   npx hardhat run scripts/test-mint-and-stake.js --network <network>
   ```

3. **`disable-deprecated-mint.js`** - Disable old mint functions on production:
   ```bash
   npx hardhat run scripts/disable-deprecated-mint.js --network <network>
   ```

## Usage

### For New Deployments

1. Deploy contracts:
   ```bash
   npx hardhat run scripts/deploy.js --network <network>
   ```

2. Test the functionality:
   ```bash
   npx hardhat run scripts/test-mint-and-stake.js --network <network>
   ```

### For Existing Deployments

1. Upgrade contracts:
   ```bash
   npx hardhat run scripts/upgrade.js --network <network>
   ```

2. Set up Altar contract links:
   ```bash
   npx hardhat run scripts/setup-altar-nft-links.js --network <network>
   ```

3. Test the functionality:
   ```bash
   npx hardhat run scripts/test-mint-and-stake.js --network <network>
   ```

### For Production

1. Disable deprecated mint functions:
   ```bash
   npx hardhat run scripts/disable-deprecated-mint.js --network <network>
   ```

## Function Parameters

### mintAndStake Function

```solidity
function mintAndStake(
    address collection,           // NFT contract address
    uint256 tokenId,            // Specific token ID to mint
    GridBuildings.GridBuildingType buildingType  // Building type (0=HOUSE, 1=FARM, 2=REP_STATION)
) external nonReentrant
```

### Building Types

- `0` - HOUSE (SonicityNFT)
- `1` - FARM (SonicityFarm)  
- `2` - REP_STATION (SonicityDiamond)

## Example Usage

```javascript
// Mint and stake a house NFT
await altar.mintAndStake(sonicityNFTAddress, 1, 0);

// Mint and stake a farm NFT
await altar.mintAndStake(sonicityFarmAddress, 1, 1);

// Mint and stake a diamond station NFT
await altar.mintAndStake(sonicityDiamondAddress, 1, 2);
```

## Security Features

1. **Access Control** - Only the Altar contract can call `mintForAltar`
2. **Collection Approval** - Only approved collections can be used
3. **Atomic Operations** - Mint and stake happen in one transaction
4. **Building Data Preservation** - Existing staking functionality is preserved

## Migration Notes

- Existing staked NFTs continue to work normally
- Building data preservation is maintained
- Users can still unstake and restake existing NFTs
- New NFTs must be minted through the Altar contract

## Testing

The `test-mint-and-stake.js` script performs comprehensive testing:

1. Mints and stakes NFTs from all three collections
2. Verifies NFT ownership by Altar contract
3. Checks stake data integrity
4. Validates user stake tracking
5. Confirms building creation

Run the test script to ensure everything is working correctly before production deployment. 