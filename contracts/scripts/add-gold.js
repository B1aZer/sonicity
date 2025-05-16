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

    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const amount = 100;

    console.log(`Adding ${amount} gold to address ${address}...`);
    
    const tx = await gameState.earnGold(amount);
    await tx.wait();

    console.log("Gold added successfully!");
    
    // Verify the new balance
    const newBalance = await gameState.getPlayerGold(address);
    console.log(`New gold balance: ${newBalance}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 