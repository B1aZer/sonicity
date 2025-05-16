const hre = require("hardhat");

async function main() {
    const GameState = await hre.ethers.getContractFactory("GameState");
    const gameState = await GameState.attach("0xf5059a5D33d5853360D16C683c16e67980206f36"); // GameState proxy address

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