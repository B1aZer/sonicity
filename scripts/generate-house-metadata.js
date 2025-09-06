import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, '../public/metadata/houses');
const MAX_TOKENS = 5000; // Maximum number of tokens for houses

// Ensure the houses directory exists
if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
}

// Base metadata template for houses
const baseMetadata = {
    name: "Sonicity House",
    description: "A residential building in the Sonicity metaverse where citizens live and work. Houses provide the foundation for urban development and generate Gold income through housing fees and citizen productivity.",
    image: "/images/houses/nft.png"
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

console.log('House metadata generation complete!'); 