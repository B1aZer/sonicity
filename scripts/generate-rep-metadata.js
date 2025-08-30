import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, '../public/metadata/rep');
const MAX_TOKENS = 1000; // Maximum number of tokens for rep stations
const BASE_FILES = 6; // Number of base metadata files

// Ensure the rep directory exists
if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
}

// Base metadata template
const baseMetadata = {
    name: "Sonicity REP Station",
    description: "A reputation processing facility that generates and manages reputation points. Provides REP income through community engagement and trust building.",
    image: "/images/rep/nft.png"
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
    
    // Log progress every 100 files
    if (tokenId % 100 === 0) {
        console.log(`Generated metadata for token #${tokenId}`);
    }
}

console.log('REP Station metadata generation complete!'); 