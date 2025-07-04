# Routing System Refactor

## Overview

The routing system has been completely refactored to address several key issues:

1. **Page Reinitialization**: Pages were being recreated every time you navigated to them, even if you were already on that page
2. **Access Control**: The access logic was scattered and inconsistent
3. **Code Organization**: The routing logic was becoming complex and hard to maintain

## New Architecture

### Router Class (`src/js/core/router.js`)

The new `Router` class handles all routing logic with the following features:

#### Key Features

1. **Page Caching**: Pages are cached after first creation, preventing unnecessary reinitialization
2. **Access Control**: Centralized access control with proper redirects
3. **Clean Separation**: Routing logic is separated from the main App class
4. **Error Handling**: Robust error handling with fallbacks

#### Public vs Protected Pages

- **Public Pages** (no wallet required): `mint`, `access`
- **Uninitialized Pages** (no player initialization required): `''` (start), `mint`, `access`
- **Protected Pages** (require wallet + player initialization): All other pages

### Access Control Flow

```
User navigates to page
    ↓
Check if page is public
    ↓ (if not public)
Check wallet connection
    ↓ (if not connected)
Redirect to /access
    ↓ (if connected)
Check player initialization
    ↓ (if not initialized)
Redirect to / (start page)
    ↓ (if initialized)
Allow access to page
```

## Usage

### Basic Navigation

```javascript
// Navigate to a page
await router.navigate('/city');

// Check current route
const currentRoute = router.getCurrentRoute();

// Clear cache (useful for logout)
router.clearCache();
```

### Adding New Pages

1. Create your page class extending `BasePage`
2. Add it to the `routeMap` in `Router` constructor:

```javascript
this.routeMap = {
    // ... existing routes
    'new-page': NewPageClass
};
```

### Page Lifecycle

Pages now follow this lifecycle:

1. **Constructor**: Called once when page is first created
2. **Mount**: Called when page is displayed (may be called multiple times)
3. **Unmount**: Called when page is hidden (may be called multiple times)

### Caching Behavior

- Pages are created once and cached
- Subsequent navigation to the same page reuses the cached instance
- Cache can be cleared manually or on logout
- Game instances are properly disposed when leaving overview page

## Changes Made

### Files Modified

1. **`src/js/core/main.js`**
   - Simplified to use new Router class
   - Removed all routing logic
   - Cleaner error handling

2. **`src/js/core/router.js`** (NEW)
   - Complete routing system
   - Page caching
   - Access control
   - Error handling

3. **`src/pages/BasePage.js`**
   - Improved element lifecycle management
   - Better mount/unmount handling
   - Element creation in constructor

4. **`src/pages/StartPage.js`**
   - Fixed element creation conflict
   - Removed duplicate modal creation

5. **`src/pages/AccessPage.js`**
   - Fixed element creation conflict
   - Removed duplicate modal creation

### Breaking Changes

- Pages must now use the BasePage element (don't create your own)
- Page constructors should call `super()` and then set `this.element.className`
- Remove duplicate modal creation in page constructors

## Testing

A test file has been created at `test-router.html` to verify the routing functionality:

- Navigation tests
- Cache tests
- Access control tests
- Logging and debugging

## Benefits

1. **Performance**: Pages are cached and don't reinitialize unnecessarily
2. **User Experience**: Faster navigation between pages
3. **Maintainability**: Clean separation of concerns
4. **Reliability**: Better error handling and fallbacks
5. **Consistency**: Centralized access control logic

## Migration Guide

### For Existing Pages

1. Ensure your page extends `BasePage`
2. Remove any `this.element = document.createElement('div')` from constructor
3. Remove any `this.modal = new Modal()` from constructor
4. Set `this.element.className` in constructor
5. Call `this.render()` in constructor

### Example Migration

**Before:**
```javascript
export class MyPage extends BasePage {
    constructor() {
        super();
        this.element = document.createElement('div');
        this.element.className = 'my-page';
        this.modal = new Modal();
        this.render();
    }
}
```

**After:**
```javascript
export class MyPage extends BasePage {
    constructor() {
        super();
        this.element.className = 'my-page';
        this.render();
    }
}
```

## Future Improvements

1. **Route Guards**: Add more sophisticated route guards for specific permissions
2. **Lazy Loading**: Implement lazy loading for pages to reduce initial bundle size
3. **Route Parameters**: Add support for route parameters (e.g., `/city/:id`)
4. **Route History**: Add route history management for back/forward navigation
5. **Loading States**: Add loading states during page transitions

## Troubleshooting

### Common Issues

1. **Page not rendering**: Ensure you're calling `this.render()` in constructor
2. **Element conflicts**: Don't create your own element, use `this.element` from BasePage
3. **Modal errors**: Don't create your own modal, use `this.modal` from BasePage
4. **Access denied**: Check if the page requires wallet connection or player initialization

### Debugging

- Check browser console for detailed logs
- Use the test file to verify routing behavior
- Check `router.pageCache.size` to see if pages are being cached
- Verify access control with `router.checkAccess(route)` 