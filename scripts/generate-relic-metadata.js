import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = path.join(__dirname, '../public/metadata/relics');
const MAX_TOKENS = 500; // Maximum number of tokens for relics

// Ensure the relics directory exists
if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
}

// Rarity configuration with different images and descriptions
const rarityConfig = {
    1: { 
        name: "Common", 
        image: "/images/relics/common.png",
        description: "A weathered stone tablet discovered during your adventure. This simple clay artifact shows signs of age with its cracked surface and basic geometric patterns. Covered in dirt and moss, it bears the marks of countless centuries buried beneath the earth.",
        exampleName: "Ancient Stone Fragment"
    },
    2: { 
        name: "Uncommon", 
        image: "/images/relics/uncommon.png",
        description: "A bronze medallion from a forgotten era, this copper amulet displays intricate carved patterns and symbols. The oxidized green patina speaks to its age, while the detailed engravings reveal the skilled craftsmanship of ancient artisans.",
        exampleName: "Bronze Medallion"
    },
    3: { 
        name: "Rare", 
        image: "/images/relics/rare.png",
        description: "An ornate silver artifact that shimmers with an otherworldly light. This ceremonial relic features complex engravings and small gemstone inlays, showing minimal tarnish despite its age. The elegant curves and mystical aura suggest it once belonged to nobility or mystics.",
        exampleName: "Silver Chalice of the Ancients"
    },
    4: { 
        name: "Epic", 
        image: "/images/relics/epic.png",
        description: "A fragment of a golden royal treasure, adorned with precious gems and elaborate decorations. This artifact radiates power with its warm golden aura and pulsing magical light. The immense value and legendary craftsmanship suggest it belonged to kings or heroes of old.",
        exampleName: "Crown of the Forgotten King"
    },
    5: { 
        name: "Legendary", 
        image: "/images/relics/legendary.png",
        description: "A crystalline artifact of immense power, emanating cosmic energy and starlight. This divine relic features a translucent glowing core with floating runes orbiting around it. Rainbow prismatic effects and streams of magical energy mark this as a treasure of the gods themselves - a once-in-a-lifetime discovery.",
        exampleName: "Shard of Eternity"
    }
};

// Generate random rarity based on distribution
function generateRarity() {
    const random = Math.random() * 100;
    
    if (random < 1) return 5;        // 1% - Legendary
    if (random < 5) return 4;        // 4% - Epic
    if (random < 20) return 3;       // 15% - Rare
    if (random < 50) return 2;       // 30% - Uncommon
    return 1;                        // 50% - Common
}

// Base metadata template for relics
const createMetadata = (tokenId, rarity) => {
    const rarityInfo = rarityConfig[rarity];
    
    return {
        name: `Sonicity Relic #${tokenId}`,
        description: rarityInfo.description,
        image: rarityInfo.image,
        external_url: `https://sonicity.gg/relic/${tokenId}`,
        attributes: [
            {
                trait_type: "Rarity",
                value: rarityInfo.name
            },
            {
                trait_type: "Rarity Level",
                value: rarity
            },
            {
                trait_type: "Type",
                value: "Adventure Relic"
            },
            {
                trait_type: "Source",
                value: "Adventure Discovery"
            }
        ]
    };
};

// Generate metadata files
console.log('Generating relic metadata...');

for (let tokenId = 1; tokenId <= MAX_TOKENS; tokenId++) {
    // Generate random rarity for this token
    const rarity = generateRarity();
    
    // Create metadata
    const metadata = createMetadata(tokenId, rarity);
    
    // Write the metadata file
    const filePath = path.join(SOURCE_DIR, `${tokenId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    
    // Log progress every 50 files
    if (tokenId % 50 === 0) {
        console.log(`Generated metadata for token #${tokenId}`);
    }
}

console.log('\n✅ Relic metadata generation complete!');
console.log(`📁 Generated ${MAX_TOKENS} metadata files in ${SOURCE_DIR}`);
console.log('\n🎨 Rarity distribution (approximate):');
console.log('   - Common (1): ~50%');
console.log('   - Uncommon (2): ~30%');
console.log('   - Rare (3): ~15%');
console.log('   - Epic (4): ~4%');
console.log('   - Legendary (5): ~1%');
console.log('\n⚠️  Note: You need to create relic images at:');
console.log('   - /public/images/relics/common.png');
console.log('   - /public/images/relics/uncommon.png');
console.log('   - /public/images/relics/rare.png');
console.log('   - /public/images/relics/epic.png');
console.log('   - /public/images/relics/legendary.png');

