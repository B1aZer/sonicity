const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SonicityArtProxy", function () {
    let artProxy;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Deploy ArtProxy
        const SonicityArtProxy = await ethers.getContractFactory("SonicityArtProxy");
        artProxy = await SonicityArtProxy.deploy();
    });

    describe("Dynamic SVG Generation", function () {
        it("Should generate valid SVG images", async function () {
            const tokenId = 1;
            const repStaked = 750;
            const mintedAt = Math.floor(Date.now() / 1000);
            const isListable = true;

            const tokenURI = await artProxy.tokenURI(tokenId, repStaked, mintedAt, isListable);
            
            // Should be base64 encoded JSON
            expect(tokenURI).to.include("data:application/json;base64,");
            
            // Decode and verify SVG content
            const base64Data = tokenURI.replace("data:application/json;base64,", "");
            const decodedData = Buffer.from(base64Data, 'base64').toString();
            const metadata = JSON.parse(decodedData);

            expect(metadata.image).to.include("data:image/svg+xml;base64,");
            
            // Decode SVG
            const svgBase64 = metadata.image.replace("data:image/svg+xml;base64,", "");
            const svgContent = Buffer.from(svgBase64, 'base64').toString();
            
            // Verify SVG contains expected content
            expect(svgContent).to.include("<svg");
            expect(svgContent).to.include("SONICITY YIELD NFT");
            expect(svgContent).to.include("REP STAKED");
            expect(svgContent).to.include(`${repStaked}`);
            expect(svgContent).to.include(`Block ${mintedAt}`);
            expect(svgContent).to.include("Status: Tradeable");
        });

        it("Should handle different REP amounts correctly", async function () {
            const tokenId = 1;
            const mintedAt = Math.floor(Date.now() / 1000);
            const isListable = false;

            const tokenURI1 = await artProxy.tokenURI(tokenId, 100, mintedAt, isListable);
            const tokenURI2 = await artProxy.tokenURI(tokenId, 1000, mintedAt, isListable);

            expect(tokenURI1).to.not.equal(tokenURI2);

            // Decode and verify different REP amounts
            const metadata1 = JSON.parse(
                Buffer.from(tokenURI1.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const metadata2 = JSON.parse(
                Buffer.from(tokenURI2.replace("data:application/json;base64,", ""), 'base64').toString()
            );

            const repAttr1 = metadata1.attributes.find(attr => attr.trait_type === "REP Staked");
            const repAttr2 = metadata2.attributes.find(attr => attr.trait_type === "REP Staked");

            expect(repAttr1.value).to.equal(100);
            expect(repAttr2.value).to.equal(1000);
        });

        it("Should handle different listable status correctly", async function () {
            const tokenId = 1;
            const repStaked = 500;
            const mintedAt = Math.floor(Date.now() / 1000);

            const tokenURI1 = await artProxy.tokenURI(tokenId, repStaked, mintedAt, true);
            const tokenURI2 = await artProxy.tokenURI(tokenId, repStaked, mintedAt, false);

            expect(tokenURI1).to.not.equal(tokenURI2);

            // Decode and verify different listable status
            const metadata1 = JSON.parse(
                Buffer.from(tokenURI1.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const metadata2 = JSON.parse(
                Buffer.from(tokenURI2.replace("data:application/json;base64,", ""), 'base64').toString()
            );

            const listableAttr1 = metadata1.attributes.find(attr => attr.trait_type === "Tradeable");
            const listableAttr2 = metadata2.attributes.find(attr => attr.trait_type === "Tradeable");

            expect(listableAttr1.value).to.equal("Yes");
            expect(listableAttr2.value).to.equal("No");
        });

        it("Should generate valid JSON metadata structure", async function () {
            const tokenId = 1;
            const repStaked = 300;
            const mintedAt = Math.floor(Date.now() / 1000);
            const isListable = true;

            const tokenURI = await artProxy.tokenURI(tokenId, repStaked, mintedAt, isListable);
            
            // Decode and verify JSON structure
            const base64Data = tokenURI.replace("data:application/json;base64,", "");
            const decodedData = Buffer.from(base64Data, 'base64').toString();
            const metadata = JSON.parse(decodedData);

            // Check required fields
            expect(metadata).to.have.property('name');
            expect(metadata).to.have.property('description');
            expect(metadata).to.have.property('attributes');
            expect(metadata).to.have.property('image');

            // Check attributes structure
            expect(metadata.attributes).to.be.an('array');
            expect(metadata.attributes).to.have.length(5); // Updated to 5 attributes

            // Check specific attributes
            const repAttr = metadata.attributes.find(attr => attr.trait_type === "REP Staked");
            const mintAttr = metadata.attributes.find(attr => attr.trait_type === "Minted");
            const listableAttr = metadata.attributes.find(attr => attr.trait_type === "Tradeable");
            const tierAttr = metadata.attributes.find(attr => attr.trait_type === "Prestige Tier");
            const rarityAttr = metadata.attributes.find(attr => attr.trait_type === "Rarity");

            expect(repAttr).to.exist;
            expect(mintAttr).to.exist;
            expect(listableAttr).to.exist;
            expect(tierAttr).to.exist;
            expect(rarityAttr).to.exist;
            expect(repAttr.value).to.equal(repStaked);
            expect(mintAttr.value).to.equal(mintedAt);
            expect(listableAttr.value).to.equal("Yes");
        });

        it("Should generate different metadata for different token IDs", async function () {
            const repStaked = 200;
            const mintedAt = Math.floor(Date.now() / 1000);
            const isListable = true;

            const tokenURI1 = await artProxy.tokenURI(1, repStaked, mintedAt, isListable);
            const tokenURI2 = await artProxy.tokenURI(2, repStaked, mintedAt, isListable);

            expect(tokenURI1).to.not.equal(tokenURI2);

            // Decode and verify different names
            const metadata1 = JSON.parse(
                Buffer.from(tokenURI1.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const metadata2 = JSON.parse(
                Buffer.from(tokenURI2.replace("data:application/json;base64,", ""), 'base64').toString()
            );

            expect(metadata1.name).to.equal("Sonicity Yield NFT #1");
            expect(metadata2.name).to.equal("Sonicity Yield NFT #2");
        });

        it("Should generate different tiers based on REP amount", async function () {
            const tokenId = 1;
            const mintedAt = Math.floor(Date.now() / 1000);
            const isListable = true;

            // Test Bronze tier (< 11 REP)
            const bronzeURI = await artProxy.tokenURI(tokenId, 5, mintedAt, isListable);
            const bronzeMetadata = JSON.parse(
                Buffer.from(bronzeURI.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const bronzeTierAttr = bronzeMetadata.attributes.find(attr => attr.trait_type === "Prestige Tier");
            const bronzeRarityAttr = bronzeMetadata.attributes.find(attr => attr.trait_type === "Rarity");
            expect(bronzeTierAttr.value).to.equal("Bronze");
            expect(bronzeRarityAttr.value).to.equal("Common");

            // Test Silver tier (11-50 REP)
            const silverURI = await artProxy.tokenURI(tokenId, 25, mintedAt, isListable);
            const silverMetadata = JSON.parse(
                Buffer.from(silverURI.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const silverTierAttr = silverMetadata.attributes.find(attr => attr.trait_type === "Prestige Tier");
            const silverRarityAttr = silverMetadata.attributes.find(attr => attr.trait_type === "Rarity");
            expect(silverTierAttr.value).to.equal("Silver");
            expect(silverRarityAttr.value).to.equal("Uncommon");

            // Test Gold tier (51-100 REP)
            const goldURI = await artProxy.tokenURI(tokenId, 75, mintedAt, isListable);
            const goldMetadata = JSON.parse(
                Buffer.from(goldURI.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const goldTierAttr = goldMetadata.attributes.find(attr => attr.trait_type === "Prestige Tier");
            const goldRarityAttr = goldMetadata.attributes.find(attr => attr.trait_type === "Rarity");
            expect(goldTierAttr.value).to.equal("Gold");
            expect(goldRarityAttr.value).to.equal("Rare");

            // Test Legendary tier (101+ REP)
            const legendaryURI = await artProxy.tokenURI(tokenId, 150, mintedAt, isListable);
            const legendaryMetadata = JSON.parse(
                Buffer.from(legendaryURI.replace("data:application/json;base64,", ""), 'base64').toString()
            );
            const legendaryTierAttr = legendaryMetadata.attributes.find(attr => attr.trait_type === "Prestige Tier");
            const legendaryRarityAttr = legendaryMetadata.attributes.find(attr => attr.trait_type === "Rarity");
            expect(legendaryTierAttr.value).to.equal("Legendary");
            expect(legendaryRarityAttr.value).to.equal("Ultra Rare");
        });
    });
}); 