const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // Read deployed addresses from JSON file
    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    // Connect to GameState contract
    const gameStateAddress = deployedAddresses.gameStateProxy;
    console.log(`GameState contract address: ${gameStateAddress}`);
    const GameState = await ethers.getContractFactory("GameState");
    const gameState = GameState.attach(gameStateAddress);

    // Get the owner's signer
    const [owner] = await ethers.getSigners();
    console.log(`Using owner address: ${owner.address}`);

    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const amount = ethers.parseEther("1000"); // 1000 gold

    console.log(`Adding ${ethers.formatEther(amount)} gold to address ${address}...`);
    
    // Connect gameState with owner's signer
    const gameStateWithOwner = gameState.connect(owner);
    const tx = await gameStateWithOwner.testEarnGold(address, amount);
    await tx.wait();

    console.log("Gold added successfully!");
    
    // Verify the new balance
    const newBalance = await gameState.getPlayerGold(address);
    console.log(`New gold balance: ${ethers.formatEther(newBalance)}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 