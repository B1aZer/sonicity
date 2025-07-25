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
            expect(svgContent).to.include("Sonicity Yield NFT");
            expect(svgContent).to.include(`REP: ${repStaked}`);
            expect(svgContent).to.include(`Minted: ${mintedAt}`);
            expect(svgContent).to.include("Listable: Yes");
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

            const repAttr1 = metadata1.attributes.find(attr => attr.trait_type === "REP Committed");
            const repAttr2 = metadata2.attributes.find(attr => attr.trait_type === "REP Committed");

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

            const listableAttr1 = metadata1.attributes.find(attr => attr.trait_type === "Listable");
            const listableAttr2 = metadata2.attributes.find(attr => attr.trait_type === "Listable");

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
            expect(metadata.attributes).to.have.length(3);

            // Check specific attributes
            const repAttr = metadata.attributes.find(attr => attr.trait_type === "REP Committed");
            const mintAttr = metadata.attributes.find(attr => attr.trait_type === "Minted");
            const listableAttr = metadata.attributes.find(attr => attr.trait_type === "Listable");

            expect(repAttr).to.exist;
            expect(mintAttr).to.exist;
            expect(listableAttr).to.exist;
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
    });
}); 