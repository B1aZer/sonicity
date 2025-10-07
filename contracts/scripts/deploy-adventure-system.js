const { ethers, upgrades } = require("hardhat");
const fs = require('fs');

async function deployAdventureSystem(existingAddresses = {}) {
  console.log("Starting Adventure System deployment...");

  // Verify required addresses exist
  if (!existingAddresses.gameStateProxy) {
    throw new Error("GameState proxy address is required");
  }
  if (!existingAddresses.heroNFTProxy) {
    throw new Error("HeroNFT proxy address is required");
  }

  // Deploy RelicNFT
  console.log("Deploying RelicNFT...");
  const RelicNFT = await ethers.getContractFactory("RelicNFT");
  const relicNFT = await RelicNFT.deploy();
  console.log("Waiting for RelicNFT deployment...");
  await relicNFT.waitForDeployment();
  const relicNFTAddress = await relicNFT.getAddress();
  console.log("RelicNFT deployed to:", relicNFTAddress);

  // Set base URI for RelicNFT
  console.log("Setting base URI for RelicNFT...");
  const relicNFTContract = await ethers.getContractAt("RelicNFT", relicNFTAddress);
  await relicNFTContract.setBaseURI("https://sonicity.xyz/metadata/relics/");
  console.log("Base URI set for RelicNFT");

  // Deploy AdventureSystem implementation
  console.log("Deploying AdventureSystem implementation...");
  const AdventureSystem = await ethers.getContractFactory("AdventureSystem");
  const adventureSystemImpl = await AdventureSystem.deploy();
  console.log("Waiting for AdventureSystem implementation deployment...");
  await adventureSystemImpl.waitForDeployment();
  const adventureSystemImplAddress = await adventureSystemImpl.getAddress();
  console.log("AdventureSystem implementation deployed to:", adventureSystemImplAddress);

  // Deploy AdventureSystem proxy
  console.log("Deploying AdventureSystem proxy...");
  const adventureSystemProxy = await upgrades.deployProxy(AdventureSystem, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for AdventureSystem proxy deployment...");
  await adventureSystemProxy.waitForDeployment();
  const adventureSystemProxyAddress = await adventureSystemProxy.getAddress();
  console.log("AdventureSystem proxy deployed to:", adventureSystemProxyAddress);

  // Set up contract references in AdventureSystem
  console.log("\nSetting up AdventureSystem contract references...");
  
  console.log("Setting GameState address...");
  await adventureSystemProxy.setGameStateAddress(existingAddresses.gameStateProxy);
  
  console.log("Setting HeroNFT address...");
  await adventureSystemProxy.setHeroNFTAddress(existingAddresses.heroNFTProxy);
  
  console.log("Setting RelicNFT address...");
  await adventureSystemProxy.setRelicNFTAddress(relicNFTAddress);

  // Set AdventureSystem as authorized minter in RelicNFT
  console.log("\nAuthorizing AdventureSystem to mint RelicNFTs...");
  await relicNFTContract.setAdventureSystemAddress(adventureSystemProxyAddress);
  console.log("AdventureSystem authorized in RelicNFT");

  // Update GameState with AdventureSystem address
  console.log("\nUpdating GameState with AdventureSystem address...");
  const gameStateContract = await ethers.getContractAt("GameState", existingAddresses.gameStateProxy);
  await gameStateContract.setAdventureSystemAddress(adventureSystemProxyAddress);
  console.log("GameState updated with AdventureSystem address");

  console.log("\n✅ Adventure System deployment completed!");
  console.log("RelicNFT:", relicNFTAddress);
  console.log("AdventureSystem Implementation:", adventureSystemImplAddress);
  console.log("AdventureSystem Proxy:", adventureSystemProxyAddress);

  return {
    relicNFT: relicNFTAddress,
    adventureSystemImpl: adventureSystemImplAddress,
    adventureSystemProxy: adventureSystemProxyAddress
  };
}

// Main function for direct execution
async function main() {
  console.log("=".repeat(60));
  console.log("ADVENTURE SYSTEM DEPLOYMENT SCRIPT");
  console.log("=".repeat(60));

  // Read existing deployed addresses
  let existingAddresses = {};
  try {
    existingAddresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    console.log("✅ Loaded existing deployed addresses");
    console.log("   GameState Proxy:", existingAddresses.gameStateProxy);
    console.log("   HeroNFT Proxy:", existingAddresses.heroNFTProxy);
  } catch (error) {
    console.error("❌ Error: deployed-addresses.json not found or invalid");
    console.error("   Please deploy the main contracts first using: npx hardhat run scripts/deploy.js");
    process.exit(1);
  }

  // Verify required addresses
  if (!existingAddresses.gameStateProxy || !existingAddresses.heroNFTProxy) {
    console.error("❌ Error: Required contract addresses not found");
    console.error("   GameState and HeroNFT must be deployed first");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Starting deployment...\n");

  // Deploy Adventure System
  const newAddresses = await deployAdventureSystem(existingAddresses);

  // Update deployed-addresses.json
  const updatedAddresses = {
    ...existingAddresses,
    ...newAddresses,
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(updatedAddresses, null, 2)
  );
  console.log("\n✅ Addresses updated in deployed-addresses.json");

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\n📝 New Contracts Deployed:");
  console.log("   RelicNFT:              ", newAddresses.relicNFT);
  console.log("   AdventureSystem Impl:  ", newAddresses.adventureSystemImpl);
  console.log("   AdventureSystem Proxy: ", newAddresses.adventureSystemProxy);
  
  console.log("\n🔗 Contract Connections:");
  console.log("   ✅ AdventureSystem → GameState");
  console.log("   ✅ AdventureSystem → HeroNFT");
  console.log("   ✅ AdventureSystem → RelicNFT");
  console.log("   ✅ GameState → AdventureSystem");
  console.log("   ✅ RelicNFT → AdventureSystem");

  console.log("\n📋 Next Steps:");
  console.log("   1. Generate relic metadata: node scripts/generate-relic-metadata.js");
  console.log("   2. Upload relic images to /public/images/relics/");
  console.log("   3. Run tests: npx hardhat test test/AdventureSystem.test.js");
  console.log("   4. Update frontend with new contract addresses");
  console.log("   5. Verify contracts on block explorer");
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60) + "\n");
}

// Export the function for use in other scripts
module.exports = { deployAdventureSystem };

// Only run main if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

