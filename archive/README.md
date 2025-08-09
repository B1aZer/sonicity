# Archived Pages

This folder contains pages that were previously part of the SoniCity application but are no longer actively used.

## Archived Pages

### DistrictPage
- **File**: `pages/DistrictPage.js`
- **CSS**: `styles/district-page.css`
- **Purpose**: Was intended to be a district management page for building district buildings
- **Status**: Replaced by CityPage which provides similar functionality with better integration
- **Archived Date**: July 31, 2025

### GridHubPage
- **File**: `pages/GridHubPage.js`
- **CSS**: `styles/grid-hub-page.css`
- **Purpose**: Was intended to be a hub for managing grid-based buildings
- **Status**: Functionality likely integrated into other pages or no longer needed
- **Archived Date**: July 31, 2025

## Copy Files
- `pages/GridHubPage copy.js.copy`
- `pages/GridHubPage copy 2.js.copy`
- `styles/grid-hub-page copy.css`

These appear to be backup/development copies of the GridHubPage.

## Restoration
If these pages need to be restored:
1. Move the files back to their original locations in `src/pages/` and `src/styles/`
2. Update the router in `src/js/core/router.js` to include the imports and route mappings
3. Add navigation links if needed

## Notes
- Both pages were registered in the router but had no active navigation links
- The CityPage now handles district building functionality
- These pages can be safely deleted if not needed for future reference 