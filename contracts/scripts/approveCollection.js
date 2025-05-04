const hre = require("hardhat");

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Owner address:", owner.address);

    // Get the GameState contract
    const GameState = await hre.ethers.getContractFactory("GameState");
    const gameState = await GameState.attach(process.env.GAME_STATE_ADDRESS);
    console.log("GameState address:", await gameState.getAddress());

    // Get the SonicityNFT contract
    const SonicityNFT = await hre.ethers.getContractFactory("SonicityNFT");
    const nftContract = await SonicityNFT.attach(process.env.SONICITY_NFT_ADDRESS);
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