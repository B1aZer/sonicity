# BasePage Render Refactor - Simplified Approach

## Overview

The BasePage has been refactored with a minimal render system that focuses on **fixing the async wallet flow** rather than adding complex guards. The key insight is that the duplicate calls were caused by both BasePage initialization and WalletButton calling `updateWalletStatus()`.

## Key Changes

### 1. State Management
- Added `this.state` object to track page state
- Added `setState(newState)` method for updating state
- State changes automatically trigger UI updates

### 2. Event Listener Management
- Added `addEventListener(selector, event, handler)` method
- Added `removeEventListeners()` for cleanup
- Prevents duplicate event listeners

### 3. Simplified Wallet Flow
- **Removed complex initialization guards** - they were masking the real issue
- **Centralized data loading** in `onInitialized()` only
- **Simplified `updateWalletStatus()`** - no longer triggers data loading
- **Single source of truth** for page initialization

## Root Cause Analysis

The duplicate calls were caused by:

1. **BasePage.initialize()** → calls `onInitialized()` → calls `loadHouseData()`
2. **WalletButton.checkInitialConnection()** → calls `updateWalletStatus()` → calls `loadHouseData()`

**Solution**: Make `updateWalletStatus()` a no-op for data loading, let `onInitialized()` handle it once.

## Usage Example

### Before (Problematic)
```javascript
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

1. **Simpler Code**: Removed complex guards and flags
2. **Single Responsibility**: Each method has one clear purpose
3. **Predictable Flow**: Data loading happens in one place only
4. **Better Performance**: No duplicate calls or unnecessary checks
5. **Easier Debugging**: Clear separation of concerns

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

## State Keys

Common state keys used across pages:
- `houseCount`, `claimableGold`, `productionRate`, `canClaim` (HousePage)
- `gold`, `buildingSlots`, `repPoints` (DashboardPage)
- `farmCount`, `claimableDiamonds`, `diamondRate` (FarmPage)

## Notes

- **Minimal and focused**: Fixes the actual problem without over-engineering
- **Async-first**: Respects the async nature of wallet connections
- **Single source of truth**: Data loading happens in one predictable place
- **Backward compatible**: Existing pages work with minimal changes 