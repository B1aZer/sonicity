#!/usr/bin/env node

/**
 * Asset Optimization Script
 * Compresses and optimizes GLB/GLTF files for better loading performance
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const ASSETS_DIR = 'public/assets';
const SUPPORTED_EXTENSIONS = ['.glb', '.gltf'];

// Check if gltf-pipeline is installed
function checkDependencies() {
    try {
        execSync('npx gltf-pipeline --help', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.log('Installing gltf-pipeline for asset optimization...');
        try {
            execSync('npm install -g gltf-pipeline', { stdio: 'inherit' });
            return true;
        } catch (installError) {
            console.error('Failed to install gltf-pipeline. Please install it manually:');
            console.error('npm install -g gltf-pipeline');
            return false;
        }
    }
}

// Get all asset files
function getAssetFiles(dir) {
    const files = [];
    
    function scanDirectory(currentDir) {
        const items = readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = join(currentDir, item);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            } else if (SUPPORTED_EXTENSIONS.includes(extname(item).toLowerCase())) {
                files.push(fullPath);
            }
        }
    }
    
    scanDirectory(dir);
    return files;
}

// Optimize a single GLB/GLTF file
function optimizeFile(filePath) {
    const ext = extname(filePath).toLowerCase();
    const baseName = filePath.replace(ext, '');
    const outputPath = `${baseName}_optimized${ext}`;
    
    try {
        console.log(`Optimizing ${filePath}...`);
        
        let command;
        if (ext === '.glb') {
            // Optimize GLB file
            command = `npx gltf-pipeline -i "${filePath}" -o "${outputPath}" --draco.compressionLevel 7 --draco.quantizePositionBits 14 --draco.quantizeNormalBits 10 --draco.quantizeTexcoordBits 12`;
        } else {
            // Optimize GLTF file
            command = `npx gltf-pipeline -i "${filePath}" -o "${outputPath}" --draco.compressionLevel 7 --draco.quantizePositionBits 14 --draco.quantizeNormalBits 10 --draco.quantizeTexcoordBits 12`;
        }
        
        execSync(command, { stdio: 'pipe' });
        
        // Check if optimization was successful and file size was reduced
        const originalSize = statSync(filePath).size;
        const optimizedSize = statSync(outputPath).size;
        const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        
        if (optimizedSize < originalSize) {
            console.log(`✅ ${filePath}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
            
            // Replace original with optimized version
            execSync(`mv "${outputPath}" "${filePath}"`);
        } else {
            console.log(`⚠️  ${filePath}: No size reduction achieved, keeping original`);
            execSync(`rm "${outputPath}"`);
        }
        
    } catch (error) {
        console.error(`❌ Failed to optimize ${filePath}:`, error.message);
        // Clean up failed output file
        try {
            execSync(`rm "${outputPath}"`);
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
    }
}

// Main optimization function
function optimizeAssets() {
    console.log('🔧 Starting asset optimization...\n');
    
    if (!checkDependencies()) {
        process.exit(1);
    }
    
    const assetFiles = getAssetFiles(ASSETS_DIR);
    
    if (assetFiles.length === 0) {
        console.log('No GLB/GLTF files found to optimize.');
        return;
    }
    
    console.log(`Found ${assetFiles.length} assets to optimize:\n`);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const file of assetFiles) {
        const originalSize = statSync(file).size;
        totalOriginalSize += originalSize;
        
        optimizeFile(file);
        
        const finalSize = statSync(file).size;
        totalOptimizedSize += finalSize;
    }
    
    const totalReduction = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
    
    console.log(`\n📊 Optimization Summary:`);
    console.log(`Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total reduction: ${totalReduction}%`);
    console.log(`\n✅ Asset optimization complete!`);
}

// Run optimization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    optimizeAssets();
}

export { optimizeAssets };
