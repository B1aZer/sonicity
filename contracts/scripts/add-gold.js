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

    const address = "0xBcd4042DE499D14e55001CcbB24a551F3b954096";
    const goldAmount = 1000; // 1000 gold
    const foodAmount = 30; // 500 food

    console.log(`Adding ${goldAmount} gold and ${foodAmount} food to address ${address}...`);
    
    // Connect gameState with owner's signer
    const gameStateWithOwner = gameState.connect(owner);
    
    // Add gold
    const goldTx = await gameStateWithOwner.testEarnGold(address, goldAmount);
    await goldTx.wait();
    console.log("Gold added successfully!");

    // Add food
    const foodTx = await gameStateWithOwner.testEarnFood(address, foodAmount);
    await foodTx.wait();
    console.log("Food added successfully!");
    
    // Verify the new balances
    const newGoldBalance = await gameState.getPlayerGold(address);
    const newFoodBalance = await gameState.getPlayerFood(address);
    console.log(`New gold balance: ${newGoldBalance}`);
    console.log(`New food balance: ${newFoodBalance}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 