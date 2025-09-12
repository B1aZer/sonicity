const { ethers, upgrades } = require("hardhat");

async function deployAltar(existingAddresses = {}) {
  console.log("Starting Altar deployment...");

  // Get required addresses
  const gameStateAddress = existingAddresses.gameStateProxy;
  const gridBuildingsAddress = existingAddresses.gridBuildingsProxy;
  
  if (!gameStateAddress || !gridBuildingsAddress) {
    throw new Error("Missing required addresses: gameStateProxy and gridBuildingsProxy");
  }

  console.log("Using GameState address:", gameStateAddress);
  console.log("Using GridBuildings address:", gridBuildingsAddress);

  // Deploy Altar implementation
  console.log("Deploying Altar implementation...");
  const Altar = await ethers.getContractFactory("Altar");
  const altarImpl = await Altar.deploy();
  console.log("Waiting for Altar implementation deployment...");
  await altarImpl.waitForDeployment();
  const altarImplAddress = await altarImpl.getAddress();
  console.log("Altar implementation deployed to:", altarImplAddress);

  // Deploy Altar proxy with initialization parameters
  console.log("Deploying Altar proxy...");
  const altarProxy = await upgrades.deployProxy(Altar, [gameStateAddress, gridBuildingsAddress], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for Altar proxy deployment...");
  await altarProxy.waitForDeployment();
  const altarProxyAddress = await altarProxy.getAddress();
  console.log("Altar proxy deployed to:", altarProxyAddress);

  // Set up contract interactions
  console.log("Setting up contract interactions...");

  // Set Altar address in GameState
  if (gameStateAddress) {
    console.log("Setting Altar address in GameState...");
    const gameState = await ethers.getContractAt("GameState", gameStateAddress);
    await gameState.setAltarAddress(altarProxyAddress);
  }

  // Set Altar address in GridBuildings
  if (gridBuildingsAddress) {
    console.log("Setting Altar address in GridBuildings...");
    const gridBuildings = await ethers.getContractAt("GridBuildings", gridBuildingsAddress);
    await gridBuildings.setAltarAddress(altarProxyAddress);
  }

  // Set BattleSystem address in GameState if it exists
  if (existingAddresses.battleSystemProxy) {
    console.log("Setting BattleSystem address in GameState...");
    const gameState = await ethers.getContractAt("GameState", gameStateAddress);
    await gameState.setBattleSystemAddress(existingAddresses.battleSystemProxy);
  }

  // Approve NFT collections if they exist
  if (existingAddresses.sonicityNFT) {
    console.log("Approving NFT collections in Altar...");
    await altarProxy.approveCollection(existingAddresses.sonicityNFT);
  }
  if (existingAddresses.sonicityFarm) {
    await altarProxy.approveCollection(existingAddresses.sonicityFarm);
  }
  if (existingAddresses.sonicityDiamond) {
    await altarProxy.approveCollection(existingAddresses.sonicityDiamond);
  }
  if (existingAddresses.sonicityRep) {
    await altarProxy.approveCollection(existingAddresses.sonicityRep);
  }
  if (existingAddresses.sonicityYieldNFT) {
    await altarProxy.approveCollection(existingAddresses.sonicityYieldNFT);
    // Set Yield NFT address in Altar
    console.log("Setting Yield NFT address in Altar...");
    await altarProxy.setYieldNFT(existingAddresses.sonicityYieldNFT);
  }

  // Set Altar contract address on all NFT contracts
  if (existingAddresses.sonicityNFT) {
    console.log("Setting Altar contract address on NFT contracts...");
    const sonicityNFT = await ethers.getContractAt("SonicityNFT", existingAddresses.sonicityNFT);
    await sonicityNFT.setAltarContract(altarProxyAddress);
  }
  if (existingAddresses.sonicityFarm) {
    const sonicityFarm = await ethers.getContractAt("SonicityFarm", existingAddresses.sonicityFarm);
    await sonicityFarm.setAltarContract(altarProxyAddress);
  }
  if (existingAddresses.sonicityDiamond) {
    const sonicityDiamond = await ethers.getContractAt("SonicityDiamond", existingAddresses.sonicityDiamond);
    await sonicityDiamond.setAltarContract(altarProxyAddress);
  }
  if (existingAddresses.sonicityRep) {
    const sonicityRep = await ethers.getContractAt("SonicityRep", existingAddresses.sonicityRep);
    await sonicityRep.setAltarContract(altarProxyAddress);
  }
  if (existingAddresses.sonicityYieldNFT) {
    const sonicityYieldNFT = await ethers.getContractAt("SonicityYieldNFT", existingAddresses.sonicityYieldNFT);
    await sonicityYieldNFT.setAltarContract(altarProxyAddress);
    
    // Set Art Proxy address if it exists
    if (existingAddresses.sonicityArtProxy) {
      await sonicityYieldNFT.setArtProxy(existingAddresses.sonicityArtProxy);
    }
  }

  console.log("\nAltar deployment completed!");
  console.log("Altar implementation:", altarImplAddress);
  console.log("Altar proxy:", altarProxyAddress);

  return {
    altarImpl: altarImplAddress,
    altarProxy: altarProxyAddress
  };
}

// If this script is run directly (not imported)
async function main() {
  // Read existing deployed addresses
  const fs = require('fs');
  let existingAddresses = {};
  try {
    existingAddresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    console.log("Loaded existing deployed addresses");
  } catch (error) {
    console.log("No existing deployed-addresses.json found");
    throw new Error("deployed-addresses.json required for Altar deployment");
  }

  // Deploy Altar
  const newAddresses = await deployAltar(existingAddresses);

  // Update addresses file
  const updatedAddresses = {
    ...existingAddresses,
    ...newAddresses,
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(updatedAddresses, null, 2)
  );
  console.log("\nAddresses updated in deployed-addresses.json");
}

// Export the function for use in other scripts
module.exports = { deployAltar };

// Only run main if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
