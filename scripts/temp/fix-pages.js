#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Pages that need to be fixed
const pagesToFix = [
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

function fixPage(filePath) {
    console.log(`Fixing ${filePath}...`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Remove this.element = document.createElement('div');
        const elementPattern = /this\.element\s*=\s*document\.createElement\('div'\);/g;
        if (elementPattern.test(content)) {
            content = content.replace(elementPattern, '');
            modified = true;
            console.log(`  - Removed element creation`);
        }
        
        // Remove this.modal = new Modal();
        const modalPattern = /this\.modal\s*=\s*new\s*Modal\(\);/g;
        if (modalPattern.test(content)) {
            content = content.replace(modalPattern, '');
            modified = true;
            console.log(`  - Removed modal creation`);
        }
        
        // Update constructor to set element.className
        const constructorPattern = /constructor\(\)\s*\{\s*super\(\);/g;
        if (constructorPattern.test(content)) {
            // Find the class name that should be set
            const classNameMatch = content.match(/this\.element\.className\s*=\s*['"`]([^'"`]+)['"`]/);
            if (classNameMatch) {
                const className = classNameMatch[1];
                console.log(`  - Found className: ${className}`);
            }
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
console.log('Fixing pages to use new BasePage pattern...\n');

pagesToFix.forEach(page => {
    fixPage(page);
});

console.log('\nDone! Please review the changes and test the application.'); 