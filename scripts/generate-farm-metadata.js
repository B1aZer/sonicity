import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, '../public/metadata/farms');
const MAX_TOKENS = 4000; // Maximum number of tokens for farms
const BASE_FILES = 6; // Number of base metadata files

// Ensure the farms directory exists
if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
}

// Base metadata template
const baseMetadata = {
    name: "Sonicity Farm",
    description: "A fertile plot of land where crops grow and food is produced. Provides Food income through its bountiful harvests.",
    image: "/images/farms/nft.png"
};

// Generate metadata files
for (let tokenId = 1; tokenId <= MAX_TOKENS; tokenId++) {
    // Create new metadata with the correct token ID
    const newMetadata = {
        ...baseMetadata,
        name: `${baseMetadata.name} #${tokenId}`
    };
    
    // Write the new metadata file
    const filePath = path.join(SOURCE_DIR, `${tokenId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newMetadata, null, 2));
    
    // Log progress every 500 files
    if (tokenId % 500 === 0) {
        console.log(`Generated metadata for token #${tokenId}`);
    }
}

console.log('Farm metadata generation complete!'); 