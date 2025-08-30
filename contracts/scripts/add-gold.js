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

    const address = "0xbda5747bfd65f08deb54cb465eb87d40e51b197e";
    const goldAmount = 10000; // 10000 gold
    const foodAmount = 1000; // 300 food
    const diamondAmount = 100; // 100 diamonds

    console.log(`Adding ${goldAmount} gold, ${foodAmount} food, and ${diamondAmount} diamonds to address ${address}...`);
    
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

    // Add diamonds
    const diamondTx = await gameStateWithOwner.testEarnDiamonds(address, diamondAmount);
    await diamondTx.wait();
    console.log("Diamonds added successfully!");
    
    // Verify the new balances
    const newGoldBalance = await gameState.getPlayerGold(address);
    const newFoodBalance = await gameState.getPlayerFood(address);
    const newDiamondBalance = await gameState.getPlayerDiamonds(address);
    console.log(`New gold balance: ${newGoldBalance}`);
    console.log(`New food balance: ${newFoodBalance}`);
    console.log(`New diamond balance: ${newDiamondBalance}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 