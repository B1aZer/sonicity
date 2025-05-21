const hre = require("hardhat");
const fs = require('fs');

async function main() {
    // Read deployed addresses
    const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    const ALTAR_ADDRESS = addresses.altarProxy;
    const SONICITY_NFT_ADDRESS = addresses.sonicityNFT;

    const [owner] = await hre.ethers.getSigners();
    console.log("Owner address:", owner.address);

    // Get the Altar contract
    const Altar = await hre.ethers.getContractFactory("Altar");
    const altar = await Altar.attach(ALTAR_ADDRESS);
    console.log("Altar address:", await altar.getAddress());

    // Get the SonicityNFT contract
    const SonicityNFT = await hre.ethers.getContractFactory("SonicityNFT");
    const nftContract = await SonicityNFT.attach(SONICITY_NFT_ADDRESS);
    console.log("SonicityNFT address:", await nftContract.getAddress());

    // Approve the collection
    console.log("Approving collection...");
    const tx = await altar.approveCollection(await nftContract.getAddress());
    await tx.wait();
    console.log("Collection approved!");

    // Verify the approval
    const isApproved = await altar.approvedCollections(await nftContract.getAddress());
    console.log("Collection approved status:", isApproved);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 