const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // Hardcoded values - modify these as needed
    const playerAddress = "0xBcd4042DE499D14e55001CcbB24a551F3b954096"; // Change this to the player address
    const repAmount = 100; // Change this to the amount of REP to grant

    console.log(`Granting ${repAmount} REP to player: ${playerAddress}`);
    console.log("Note: This script must be run with --network localhost");

    try {
        // Read deployed addresses from JSON file
        const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
        const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
        
        // Get the signer (should be the owner)
        const [owner] = await ethers.getSigners();
        console.log(`Using signer: ${owner.address}`);

        // Get the GameState contract
        const GameState = await ethers.getContractFactory("GameState");
        const gameStateAddress = deployedAddresses.gameStateProxy;
        console.log(`GameState contract address: ${gameStateAddress}`);
        
        const gameState = GameState.attach(gameStateAddress);

        // Get current REP balance
        const currentRep = await gameState.getPlayerRep(playerAddress);
        console.log(`Current REP balance: ${currentRep.toString()}`);

        // Grant REP (testEarnRep has its own access control)
        console.log("Granting REP...");
        const tx = await gameState.testEarnRep(playerAddress, repAmount);
        await tx.wait();

        // Get new REP balance
        const newRep = await gameState.getPlayerRep(playerAddress);
        console.log(`New REP balance: ${newRep.toString()}`);

        console.log("✅ REP granted successfully!");
        console.log(`Transaction hash: ${tx.hash}`);

    } catch (error) {
        console.error("❌ Error granting REP:", error.message);
        console.error("Make sure to run: npx hardhat run scripts/grant-rep.js --network localhost");
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 