const hre = require("hardhat");
const fs = require('fs');

async function main() {
    // Read deployed addresses
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const GAME_STATE_ADDRESS = addresses.gameStateProxy;
    const SONICITY_NFT_ADDRESS = addresses.sonicityNFT;

    const [owner] = await hre.ethers.getSigners();
    console.log("Owner address:", owner.address);

    // Get the GameState contract
    const GameState = await hre.ethers.getContractFactory("GameState");
    const gameState = await GameState.attach(GAME_STATE_ADDRESS);
    console.log("GameState address:", await gameState.getAddress());

    // Get the SonicityNFT contract
    const SonicityNFT = await hre.ethers.getContractFactory("SonicityNFT");
    const nftContract = await SonicityNFT.attach(SONICITY_NFT_ADDRESS);
    console.log("SonicityNFT address:", await nftContract.getAddress());

    // Approve the collection
    console.log("Approving collection...");
    const tx = await gameState.approveCollection(await nftContract.getAddress());
    await tx.wait();
    console.log("Collection approved!");

    // Verify the approval
    const isApproved = await gameState.approvedCollections(await nftContract.getAddress());
    console.log("Collection approved status:", isApproved);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 