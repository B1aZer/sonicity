import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, '../public/metadata');
const MAX_TOKENS = 1000; // Maximum number of tokens
const BASE_FILES = 6; // Number of base metadata files

// Read the base metadata files
const baseMetadata = [];
for (let i = 1; i <= BASE_FILES; i++) {
    const filePath = path.join(SOURCE_DIR, `${i}.json`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    baseMetadata.push(content);
}

// Generate additional metadata files
for (let tokenId = BASE_FILES + 1; tokenId <= MAX_TOKENS; tokenId++) {
    // Calculate which base file to use (1-6)
    const baseIndex = ((tokenId - 1) % BASE_FILES);
    const baseContent = baseMetadata[baseIndex];
    
    // Create new metadata with the correct token ID
    const newMetadata = {
        ...baseContent,
        name: `${baseContent.name} #${tokenId}`
    };
    
    // Write the new metadata file
    const filePath = path.join(SOURCE_DIR, `${tokenId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newMetadata, null, 2));
    
    // Log progress every 100 files
    if (tokenId % 100 === 0) {
        console.log(`Generated metadata for token #${tokenId}`);
    }
}

console.log('Metadata generation complete!'); 