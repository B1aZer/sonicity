const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // Read deployed addresses from JSON file
    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    
    // Connect to GridBuildings contract
    const gridBuildingsAddress = deployedAddresses.gridBuildingsProxy;
    console.log(`GridBuildings contract address: ${gridBuildingsAddress}`);
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    const gridBuildings = GridBuildings.attach(gridBuildingsAddress);

    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`Using address: ${signer.address}`);
    
    // Get signer's balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} SONIC`);

    // Hardcoded amount: 10 SONIC (as defined in the contract)
    const amountToAdd = ethers.parseEther("10.0");
    console.log(`Adding ${ethers.formatEther(amountToAdd)} SONIC to revenue pool...`);
    
    // Check current revenue pool
    const currentPool = await gridBuildings.getRevenuePool();
    console.log(`Current revenue pool: ${ethers.formatEther(currentPool)} SONIC`);
    
    // Connect gridBuildings with signer
    const gridBuildingsWithSigner = gridBuildings.connect(signer);
    
    try {
        // Add money to revenue pool (send 10 SONIC)
        const tx = await gridBuildingsWithSigner.addRevenuePool({ 
            value: ethers.parseEther("10"), // Send 10 SONIC
            gasLimit: 100000 // Set a reasonable gas limit
        });
        
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for transaction confirmation...");
        
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Check new revenue pool balance
        const newPool = await gridBuildings.getRevenuePool();
        console.log(`New revenue pool: ${ethers.formatEther(newPool)} SONIC`);
        console.log(`Increase: ${ethers.formatEther(newPool - currentPool)} SONIC`);
        
    } catch (error) {
        console.error("Error adding to revenue pool:", error.message);
        
        // Provide helpful error messages
        if (error.message.includes("Only available in test environment")) {
            console.error("❌ This function is only available in test environments (chainId 31337 or 1337)");
        } else if (error.message.includes("insufficient funds")) {
            console.error("❌ Insufficient funds. Check your SONIC balance");
        }
        
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main()
        .then(() => {
            console.log("✅ Successfully added funds to revenue pool!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

module.exports = main;
