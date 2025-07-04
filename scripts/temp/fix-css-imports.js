#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Pages that need CSS import fixes
const pagesToFix = [
    'src/pages/StartPage.js',
    'src/pages/GamePage.js',
    'src/pages/MintPage.js',
    'src/pages/AccessPage.js',
    'src/pages/ShopPage.js',
    'src/pages/DashboardPage.js',
    'src/pages/ScoutGuildPage.js',
    'src/pages/FarmPage.js',
    'src/pages/WorkshopPage.js',
    'src/pages/HousePage.js',
    'src/pages/StakePage.js',
    'src/pages/MapPage.js',
    'src/pages/CityPage.js',
    'src/pages/GridHubPage.js',
    'src/pages/StakeHubPage.js',
    'src/pages/DistrictPage.js',
    'src/pages/BarracksPage.js',
    'src/pages/CommandCenterPage.js'
];

function fixCSSImports(filePath) {
    console.log(`Fixing CSS imports in ${filePath}...`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Find CSS imports in constructor
        const cssImportPattern = /import\('\.\.\/styles\/[^']+\.css'\);/g;
        const cssImports = content.match(cssImportPattern);
        
        if (cssImports && cssImports.length > 0) {
            console.log(`  - Found ${cssImports.length} CSS import(s) in constructor`);
            
            // Remove CSS imports from constructor
            content = content.replace(cssImportPattern, '');
            
            // Find the last import statement at the top of the file
            const importLines = content.split('\n');
            let lastImportIndex = -1;
            
            for (let i = 0; i < importLines.length; i++) {
                const line = importLines[i].trim();
                if (line.startsWith('import ') && !line.includes('constructor')) {
                    lastImportIndex = i;
                }
            }
            
            // Insert CSS imports after the last import statement
            if (lastImportIndex >= 0) {
                const cssImportLines = cssImports.map(importStmt => `import ${importStmt}`);
                importLines.splice(lastImportIndex + 1, 0, '', ...cssImportLines);
                content = importLines.join('\n');
                modified = true;
                console.log(`  - Moved CSS imports to top of file`);
            }
        } else {
            console.log(`  - No CSS imports found in constructor`);
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  ✓ Fixed ${filePath}`);
        } else {
            console.log(`  - No changes needed for ${filePath}`);
        }
        
    } catch (error) {
        console.error(`  ✗ Error fixing ${filePath}:`, error.message);
    }
}

// Fix all pages
console.log('Moving CSS imports from constructors to top of file...\n');

pagesToFix.forEach(page => {
    fixCSSImports(page);
});

console.log('\nDone! All CSS imports have been moved to the top of their respective files.'); 