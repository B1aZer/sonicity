const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    try {
        // Read the deployed addresses
        const deployedAddresses = JSON.parse(
            fs.readFileSync("./deployed-addresses.json", "utf8")
        );
        
        const gameStateAddress = deployedAddresses.gameStateProxy;
        if (!gameStateAddress) {
            throw new Error("GameState address not found in deployed-addresses.json");
        }

        console.log("Connecting to GameState contract at:", gameStateAddress);
        
        // Get the contract factory
        const GameState = await ethers.getContractFactory("GameState");
        
        // Attach to the deployed contract
        const gameState = await GameState.attach(gameStateAddress);
        
        // New production rate (in gold per hour)
        const newProductionRate = 10; // Adjust this value as needed
        
        console.log(`Updating house production rate to ${newProductionRate} gold per hour...`);
        
        // Update the production rate
        const tx = await gameState.setBuildingProductionRate("house", newProductionRate);
        await tx.wait();
        
        console.log("Successfully updated house production rate!");
        console.log("Transaction hash:", tx.hash);
        
    } catch (error) {
        console.error("Error updating house production rate:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });