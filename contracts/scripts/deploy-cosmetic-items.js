const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🎨 Deploying CosmeticItems contract...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    try {
        // Deploy CosmeticItems contract
        const CosmeticItems = await ethers.getContractFactory("CosmeticItems");
        const cosmeticItems = await upgrades.deployProxy(CosmeticItems, [], {
            initializer: "initialize",
            kind: "uups"
        });
        
        await cosmeticItems.waitForDeployment();
        const cosmeticItemsAddress = await cosmeticItems.getAddress();
        
        console.log("✅ CosmeticItems deployed to:", cosmeticItemsAddress);
        
        // Get GameState contract address (assuming it's already deployed)
        // You may need to update this address based on your deployment
        const GAME_STATE_ADDRESS = process.env.GAME_STATE_ADDRESS || "0x158d291D8b47F056751cfF47d1eEcd19FDF9B6f8";
        
        // Set up contract addresses
        console.log("🔗 Setting up contract addresses...");
        
        // Set GameState address in CosmeticItems
        await cosmeticItems.setGameStateAddress(GAME_STATE_ADDRESS);
        console.log("✅ GameState address set in CosmeticItems");
        
        // Connect to GameState to add CosmeticItems as authorized caller
        const gameState = await ethers.getContractAt("GameState", GAME_STATE_ADDRESS);
        await gameState.setCosmeticItemsAddress(cosmeticItemsAddress);
        console.log("✅ CosmeticItems address set in GameState");
        
        // Verify initial cosmetic setup
        const bannerConfig = await cosmeticItems.getCosmeticConfig(0);
        console.log("🏴 Initial Banner Cosmetic:");
        console.log("  Name:", bannerConfig.name);
        console.log("  Cost:", bannerConfig.diamondCost.toString(), "diamonds");
        console.log("  Model:", bannerConfig.modelPath);
        console.log("  Enabled:", bannerConfig.enabled);
        
        console.log("\n🎉 CosmeticItems deployment completed successfully!");
        console.log("📋 Contract addresses:");
        console.log("  CosmeticItems:", cosmeticItemsAddress);
        console.log("  GameState:", GAME_STATE_ADDRESS);
        
        console.log("\n📝 Next steps:");
        console.log("1. Update frontend constants with new contract address");
        console.log("2. Add contract to address update script");
        console.log("3. Test purchasing cosmetics on frontend");
        
        // Save deployment info
        const deploymentInfo = {
            network: (await ethers.provider.getNetwork()).name,
            contractAddress: cosmeticItemsAddress,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            blockNumber: await ethers.provider.getBlockNumber()
        };
        
        console.log("\n💾 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
        
        return {
            cosmeticItems: cosmeticItemsAddress,
            gameState: GAME_STATE_ADDRESS
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Handle both direct execution and module export
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main; 