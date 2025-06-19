# BasePage Render Refactor - Complete WalletManager Integration

## Overview

The BasePage has been refactored with a minimal render system that **completely removes appState** and makes `WalletManager` the **single source of truth** for wallet state. This eliminates the duplicate calls issue and simplifies the architecture significantly.

## Key Changes

### 1. State Management
- Added `this.state` object to track page state
- Added `setState(newState)` method for updating state
- State changes automatically trigger UI updates

### 2. Event Listener Management
- Added `addEventListener(selector, event, handler)` method
- Added `removeEventListeners()` for cleanup
- Prevents duplicate event listeners

### 3. Complete WalletManager Integration
- **Removed appState entirely** - no more dual state management
- **WalletManager is now the single source of truth** for wallet state
- **Added state persistence** directly to WalletManager
- **Added subscription system** to WalletManager
- **Centralized data loading** in `onInitialized()` only

## Root Cause Analysis

The duplicate calls were caused by:

1. **BasePage.initialize()** → calls `onInitialized()` → calls `loadHouseData()`
2. **WalletButton.checkInitialConnection()** → calls `updateWalletStatus()` → calls `loadHouseData()`

**Solution**: 
- Made `updateWalletStatus()` a no-op for data loading
- Let `onInitialized()` handle it once
- **Removed appState entirely** to eliminate sync issues

## Usage Example

### Before (Problematic)
```javascript
// Multiple sources of truth
const state = appState.getState();
if (state.walletConnected) { ... }

// Multiple paths calling loadHouseData()
updateWalletStatus(address) {
    if (address) {
        this.loadHouseData(); // Called from WalletButton
    }
}

async onInitialized(walletResult) {
    await this.loadHouseData(); // Called from BasePage
}
```

### After (Fixed)
```javascript
// Single source of truth
if (WalletManager.isWalletConnected()) { ... }

// Single path for data loading
updateWalletStatus(address) {
    // No-op - just for UI updates if needed
    Logger.info('Updating wallet status with address:', address);
}

async onInitialized(walletResult) {
    await this.loadHouseData(); // Only place data is loaded
    this.setupEventListeners();
}
```

## HTML Template Changes

Use `data-state` attributes to bind elements to state:

```html
<!-- Before -->
<span class="status-value house-count">0</span>

<!-- After -->
<span class="status-value" data-state="houseCount">0</span>
```

## Benefits

1. **Single Source of Truth**: WalletManager handles all wallet state
2. **Simpler Architecture**: No more sync between appState and WalletManager
3. **No Duplicate Calls**: Data loading happens in one place only
4. **Better Performance**: Fewer state checks and updates
5. **Easier Debugging**: Clear separation of concerns
6. **Less Code**: Removed appState complexity entirely

## Migration Guide

To migrate existing pages:

1. Add state initialization in constructor:
   ```javascript
   this.setState({
       key1: defaultValue1,
       key2: defaultValue2
   });
   ```

2. Move all data loading to `onInitialized()`:
   ```javascript
   async onInitialized(walletResult) {
       await this.loadData();
       this.setupEventListeners();
   }
   ```

3. Make `updateWalletStatus()` a no-op or UI-only:
   ```javascript
   updateWalletStatus(address) {
       // Only update UI elements, don't load data
   }
   ```

4. Replace manual DOM updates with `setState()`:
   ```javascript
   this.setState({ key: newValue });
   ```

5. Replace manual event listeners with `addEventListener()`:
   ```javascript
   this.addEventListener('.selector', 'click', handler);
   ```

6. Add `data-state` attributes to HTML elements.

7. **Replace all appState calls with WalletManager**:
   ```javascript
   // Instead of: appState.getState().walletConnected
   // Use: WalletManager.isWalletConnected()
   
   // Instead of: appState.getState().currentWallet
   // Use: WalletManager.getCurrentWallet()
   ```

## State Keys

Common state keys used across pages:
- `houseCount`, `claimableGold`, `productionRate`, `canClaim` (HousePage)
- `gold`, `buildingSlots`, `repPoints` (DashboardPage)
- `farmCount`, `claimableDiamonds`, `diamondRate` (FarmPage)

## WalletManager API

```javascript
// State checks
WalletManager.isWalletConnected()
WalletManager.getCurrentWallet()
WalletManager.isNFTVerified()

// State management
WalletManager.subscribe(listener)
WalletManager.clearState()

// Connection
WalletManager.connectWallet()
WalletManager.disconnectWallet()
WalletManager.checkExistingConnection()
```

## Notes

- **Complete removal of appState**: No more dual state management
- **WalletManager is the single source of truth**: All wallet state is centralized
- **Backward compatible**: Existing pages work with minimal changes
- **Better performance**: No more state synchronization overhead
- **Cleaner architecture**: Clear separation between wallet logic and UI state 