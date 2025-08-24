const { ethers } = require("hardhat");

async function main() {
    // Get the current block timestamp
    const currentBlock = await ethers.provider.getBlock("latest");
    console.log("Current timestamp:", new Date(currentBlock.timestamp * 1000).toLocaleString());

    // Get the time to fast forward (in seconds)
    // Check if hours is provided as command line argument, otherwise use 24 hours
    const hours = process.argv[2] ? parseFloat(process.argv[2]) : 24;
    const secondsToAdd = hours * 60 * 60;

    console.log(`Fast forwarding ${hours} hours (${secondsToAdd} seconds)...`);

    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [secondsToAdd]);
    await ethers.provider.send("evm_mine"); // Mine a new block to apply the time change

    // Get the new block timestamp
    const newBlock = await ethers.provider.getBlock("latest");
    console.log("New timestamp:", new Date(newBlock.timestamp * 1000).toLocaleString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 