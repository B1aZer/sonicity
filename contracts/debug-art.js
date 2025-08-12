const { ethers } = require("hardhat");

async function main() {
    const SonicityArtProxy = await ethers.getContractFactory("SonicityArtProxy");
    const artProxy = await SonicityArtProxy.deploy();
    
    const tokenId = 1;
    const repStaked = 20;
    const mintedAt = Math.floor(Date.now() / 1000);
    const isListable = true;

    const tokenURI = await artProxy.tokenURI(tokenId, repStaked, mintedAt, isListable);
    
    console.log("Token URI:", tokenURI);
    
    // Decode JSON
    const base64Data = tokenURI.replace("data:application/json;base64,", "");
    const decodedData = Buffer.from(base64Data, 'base64').toString();
    const metadata = JSON.parse(decodedData);
    
    console.log("\nMetadata:", JSON.stringify(metadata, null, 2));
    
    // Decode SVG
    const svgBase64 = metadata.image.replace("data:image/svg+xml;base64,", "");
    const svgContent = Buffer.from(svgBase64, 'base64').toString();
    
    console.log("\nSVG Content:", svgContent);
}

main().catch(console.error); 