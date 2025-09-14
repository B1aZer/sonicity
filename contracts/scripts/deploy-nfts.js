const { ethers, upgrades } = require("hardhat");

async function deployNFTs(existingAddresses = {}) {
  console.log("Starting NFT contracts deployment...");

  // Deploy SonicityNFT
  console.log("Deploying SonicityNFT...");
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = await SonicityNFT.deploy();
  console.log("Waiting for SonicityNFT deployment...");
  await sonicityNFT.waitForDeployment();
  const sonicityNFTAddress = await sonicityNFT.getAddress();
  console.log("SonicityNFT deployed to:", sonicityNFTAddress);

  // Deploy SonicityFarm
  console.log("Deploying SonicityFarm...");
  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const sonicityFarm = await SonicityFarm.deploy();
  console.log("Waiting for SonicityFarm deployment...");
  await sonicityFarm.waitForDeployment();
  const sonicityFarmAddress = await sonicityFarm.getAddress();
  console.log("SonicityFarm deployed to:", sonicityFarmAddress);

  // Deploy SonicityDiamond NFT contract
  console.log("Deploying SonicityDiamond NFT contract...");
  const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
  const sonicityDiamond = await SonicityDiamond.deploy();
  await sonicityDiamond.waitForDeployment();
  const sonicityDiamondAddress = await sonicityDiamond.getAddress();
  console.log("SonicityDiamond deployed to:", sonicityDiamondAddress);

  // Deploy SonicityRep NFT contract
  console.log("Deploying SonicityRep NFT contract...");
  const SonicityRep = await ethers.getContractFactory("SonicityRep");
  const sonicityRep = await SonicityRep.deploy();
  await sonicityRep.waitForDeployment();
  const sonicityRepAddress = await sonicityRep.getAddress();
  console.log("SonicityRep deployed to:", sonicityRepAddress);

  // Deploy SonicityYieldNFT contract
  console.log("Deploying SonicityYieldNFT contract...");
  const SonicityYieldNFT = await ethers.getContractFactory("SonicityYieldNFT");
  const sonicityYieldNFT = await SonicityYieldNFT.deploy();
  await sonicityYieldNFT.waitForDeployment();
  const sonicityYieldNFTAddress = await sonicityYieldNFT.getAddress();
  console.log("SonicityYieldNFT deployed to:", sonicityYieldNFTAddress);

  // Deploy SonicityArtProxy contract
  console.log("Deploying SonicityArtProxy contract...");
  const SonicityArtProxy = await ethers.getContractFactory("SonicityArtProxy");
  const sonicityArtProxy = await SonicityArtProxy.deploy();
  await sonicityArtProxy.waitForDeployment();
  const sonicityArtProxyAddress = await sonicityArtProxy.getAddress();
  console.log("SonicityArtProxy deployed to:", sonicityArtProxyAddress);

  // Deploy HeroNFT implementation
  console.log("Deploying HeroNFT implementation...");
  const HeroNFT = await ethers.getContractFactory("HeroNFT");
  const heroNFTImpl = await HeroNFT.deploy();
  console.log("Waiting for HeroNFT implementation deployment...");
  await heroNFTImpl.waitForDeployment();
  const heroNFTImplAddress = await heroNFTImpl.getAddress();
  console.log("HeroNFT implementation deployed to:", heroNFTImplAddress);

  // Deploy TacticsNFT implementation
  console.log("Deploying TacticsNFT implementation...");
  const TacticsNFT = await ethers.getContractFactory("TacticsNFT");
  const tacticsNFTImpl = await TacticsNFT.deploy();
  console.log("Waiting for TacticsNFT implementation deployment...");
  await tacticsNFTImpl.waitForDeployment();
  const tacticsNFTImplAddress = await tacticsNFTImpl.getAddress();
  console.log("TacticsNFT implementation deployed to:", tacticsNFTImplAddress);

  // Deploy CosmeticItems implementation
  console.log("Deploying CosmeticItems implementation...");
  const CosmeticItemsImpl = await ethers.getContractFactory("CosmeticItems");
  const cosmeticItemsImpl = await CosmeticItemsImpl.deploy();
  console.log("Waiting for CosmeticItems implementation deployment...");
  await cosmeticItemsImpl.waitForDeployment();
  const cosmeticItemsImplAddress = await cosmeticItemsImpl.getAddress();
  console.log("CosmeticItems implementation deployed to:", cosmeticItemsImplAddress);

  // Deploy HeroNFT proxy
  console.log("Deploying HeroNFT proxy...");
  const heroNFTProxy = await upgrades.deployProxy(HeroNFT, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for HeroNFT proxy deployment...");
  await heroNFTProxy.waitForDeployment();
  const heroNFTProxyAddress = await heroNFTProxy.getAddress();
  console.log("HeroNFT proxy deployed to:", heroNFTProxyAddress);

  // Deploy TacticsNFT proxy
  console.log("Deploying TacticsNFT proxy...");
  const tacticsNFTProxy = await upgrades.deployProxy(TacticsNFT, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for TacticsNFT proxy deployment...");
  await tacticsNFTProxy.waitForDeployment();
  const tacticsNFTProxyAddress = await tacticsNFTProxy.getAddress();
  console.log("TacticsNFT proxy deployed to:", tacticsNFTProxyAddress);

  // Deploy CosmeticItems proxy
  console.log("Deploying CosmeticItems proxy...");
  const cosmeticItemsProxy = await upgrades.deployProxy(CosmeticItemsImpl, [], {
    kind: 'uups',
    initializer: 'initialize',
  });
  console.log("Waiting for CosmeticItems proxy deployment...");
  await cosmeticItemsProxy.waitForDeployment();
  const cosmeticItemsProxyAddress = await cosmeticItemsProxy.getAddress();
  console.log("CosmeticItems proxy deployed to:", cosmeticItemsProxyAddress);

  // Set up contract interactions if Altar is available
  if (existingAddresses.altarProxy) {
    console.log("Setting up NFT contract interactions with Altar...");
    
    // Set Altar contract address on all NFT contracts
    console.log("Setting Altar contract address on NFT contracts...");
    const sonicityNFTContract = await ethers.getContractAt("SonicityNFT", sonicityNFTAddress);
    await sonicityNFTContract.setAltarContract(existingAddresses.altarProxy);
    
    const sonicityFarmContract = await ethers.getContractAt("SonicityFarm", sonicityFarmAddress);
    await sonicityFarmContract.setAltarContract(existingAddresses.altarProxy);
    
    const sonicityDiamondContract = await ethers.getContractAt("SonicityDiamond", sonicityDiamondAddress);
    await sonicityDiamondContract.setAltarContract(existingAddresses.altarProxy);
    
    const sonicityRepContract = await ethers.getContractAt("SonicityRep", sonicityRepAddress);
    await sonicityRepContract.setAltarContract(existingAddresses.altarProxy);
    
    const sonicityYieldNFTContract = await ethers.getContractAt("SonicityYieldNFT", sonicityYieldNFTAddress);
    await sonicityYieldNFTContract.setAltarContract(existingAddresses.altarProxy);
    
    // Set Art Proxy address on Yield NFT
    await sonicityYieldNFTContract.setArtProxy(sonicityArtProxyAddress);
    
    // Approve NFT collections in Altar
    console.log("Approving NFT collections in Altar...");
    const altarContract = await ethers.getContractAt("Altar", existingAddresses.altarProxy);
    await altarContract.approveCollection(sonicityNFTAddress);
    await altarContract.approveCollection(sonicityFarmAddress);
    await altarContract.approveCollection(sonicityDiamondAddress);
    await altarContract.approveCollection(sonicityRepAddress);
    await altarContract.approveCollection(sonicityYieldNFTAddress);
    
    // Set Yield NFT address in Altar
    console.log("Setting Yield NFT address in Altar...");
    await altarContract.setYieldNFT(sonicityYieldNFTAddress);
  }

  console.log("\nNFT contracts deployment completed!");
  console.log("SonicityNFT:", sonicityNFTAddress);
  console.log("SonicityFarm:", sonicityFarmAddress);
  console.log("SonicityDiamond:", sonicityDiamondAddress);
  console.log("SonicityRep:", sonicityRepAddress);
  console.log("SonicityYieldNFT:", sonicityYieldNFTAddress);
  console.log("SonicityArtProxy:", sonicityArtProxyAddress);
  console.log("HeroNFT implementation:", heroNFTImplAddress);
  console.log("HeroNFT proxy:", heroNFTProxyAddress);
  console.log("TacticsNFT implementation:", tacticsNFTImplAddress);
  console.log("TacticsNFT proxy:", tacticsNFTProxyAddress);
  console.log("CosmeticItems implementation:", cosmeticItemsImplAddress);
  console.log("CosmeticItems proxy:", cosmeticItemsProxyAddress);

  return {
    sonicityNFT: sonicityNFTAddress,
    sonicityFarm: sonicityFarmAddress,
    sonicityDiamond: sonicityDiamondAddress,
    sonicityRep: sonicityRepAddress,
    sonicityYieldNFT: sonicityYieldNFTAddress,
    sonicityArtProxy: sonicityArtProxyAddress,
    heroNFTImpl: heroNFTImplAddress,
    heroNFTProxy: heroNFTProxyAddress,
    tacticsNFTImpl: tacticsNFTImplAddress,
    tacticsNFTProxy: tacticsNFTProxyAddress,
    cosmeticItemsImpl: cosmeticItemsImplAddress,
    cosmeticItemsProxy: cosmeticItemsProxyAddress
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
  }

  // Deploy NFTs
  const newAddresses = await deployNFTs(existingAddresses);

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
module.exports = { deployNFTs };

// Only run main if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
