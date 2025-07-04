#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Pages that need import syntax fixes
const pagesToFix = [
    'src/pages/StartPage.js',
    'src/pages/GamePage.js',
    'src/pages/MintPage.js',
    'src/pages/ShopPage.js',
    'src/pages/DashboardPage.js',
    'src/pages/ScoutGuildPage.js',
    'src/pages/StakePage.js',
    'src/pages/CityPage.js',
    'src/pages/GridHubPage.js',
    'src/pages/StakeHubPage.js',
    'src/pages/BarracksPage.js',
    'src/pages/CommandCenterPage.js'
];

function fixImportSyntax(filePath) {
    console.log(`Fixing import syntax in ${filePath}...`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Fix the incorrect import syntax: "import import('...')" -> "import('...')"
        const incorrectPattern = /import\s+import\('([^']+)'\);/g;
        if (incorrectPattern.test(content)) {
            content = content.replace(incorrectPattern, "import('$1');");
            modified = true;
            console.log(`  - Fixed incorrect import syntax`);
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  ✓ Fixed ${filePath}`);
        } else {
            console.log(`  - No syntax errors found in ${filePath}`);
        }
        
    } catch (error) {
        console.error(`  ✗ Error fixing ${filePath}:`, error.message);
    }
}

// Fix all pages
console.log('Fixing import syntax errors...\n');

pagesToFix.forEach(page => {
    fixImportSyntax(page);
});

console.log('\nDone! All import syntax errors have been fixed.'); 