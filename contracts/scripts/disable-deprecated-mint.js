const { ethers } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Disabling deprecated mint functions on NFT contracts...");

  // Get contract factories
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
  const SonicityRep = await ethers.getContractFactory("SonicityRep");

  // Disable minting on SonicityNFT
  if (addresses.sonicityNFT) {
    console.log("Disabling minting on SonicityNFT...");
    const sonicityNFT = SonicityNFT.attach(addresses.sonicityNFT);
    await sonicityNFT.setMintActive(false);
    console.log("✓ Minting disabled on SonicityNFT");
  } else {
    console.log("SonicityNFT address not found in deployed-addresses.json");
  }

  // Disable minting on SonicityFarm
  if (addresses.sonicityFarm) {
    console.log("Disabling minting on SonicityFarm...");
    const sonicityFarm = SonicityFarm.attach(addresses.sonicityFarm);
    await sonicityFarm.setMintActive(false);
    console.log("✓ Minting disabled on SonicityFarm");
  } else {
    console.log("SonicityFarm address not found in deployed-addresses.json");
  }

  // Disable minting on SonicityDiamond
  if (addresses.sonicityDiamond) {
    console.log("Disabling minting on SonicityDiamond...");
    const sonicityDiamond = SonicityDiamond.attach(addresses.sonicityDiamond);
    await sonicityDiamond.setMintActive(false);
    console.log("Minting disabled on SonicityDiamond");
  } else {
    console.log("SonicityDiamond address not found in deployed-addresses.json");
  }

  // Disable minting on SonicityRep
  if (addresses.sonicityRep) {
    console.log("Disabling minting on SonicityRep...");
    const sonicityRep = SonicityRep.attach(addresses.sonicityRep);
    await sonicityRep.setMintActive(false);
    console.log("Minting disabled on SonicityRep");
  } else {
    console.log("SonicityRep address not found in deployed-addresses.json");
  }

  console.log("\n✅ Deprecated mint functions disabled!");
  console.log("Users can now only mint NFTs through the Altar contract using mintAndStake");
  console.log("The old mint functions are now disabled and will revert");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 