const { ethers } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Setting up Altar contract addresses on NFT contracts...");

  // Get contract factories
  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
  const SonicityRep = await ethers.getContractFactory("SonicityRep");

  // Set Altar contract address on SonicityNFT
  if (addresses.sonicityNFT) {
    console.log("Setting Altar address on SonicityNFT...");
    const sonicityNFT = SonicityNFT.attach(addresses.sonicityNFT);
    await sonicityNFT.setAltarContract(addresses.altarProxy);
    console.log("Altar address set on SonicityNFT");
  } else {
    console.log("SonicityNFT address not found in deployed-addresses.json");
  }

  // Set Altar contract address on SonicityFarm
  if (addresses.sonicityFarm) {
    console.log("Setting Altar address on SonicityFarm...");
    const sonicityFarm = SonicityFarm.attach(addresses.sonicityFarm);
    await sonicityFarm.setAltarContract(addresses.altarProxy);
    console.log("Altar address set on SonicityFarm");
  } else {
    console.log("SonicityFarm address not found in deployed-addresses.json");
  }

  // Set Altar contract address on SonicityDiamond
  if (addresses.sonicityDiamond) {
    console.log("Setting Altar address on SonicityDiamond...");
    const sonicityDiamond = SonicityDiamond.attach(addresses.sonicityDiamond);
    await sonicityDiamond.setAltarContract(addresses.altarProxy);
    console.log("Altar address set on SonicityDiamond");
  } else {
    console.log("SonicityDiamond address not found in deployed-addresses.json");
  }

  // Set Altar contract address on SonicityRep
  if (addresses.sonicityRep) {
    console.log("Setting Altar address on SonicityRep...");
    const sonicityRep = SonicityRep.attach(addresses.sonicityRep);
    await sonicityRep.setAltarContract(addresses.altarProxy);
    console.log("Altar address set on SonicityRep");
  } else {
    console.log("SonicityRep address not found in deployed-addresses.json");
  }

  // Approve collections in Altar if not already approved
  console.log("Approving NFT collections in Altar...");
  const Altar = await ethers.getContractFactory("Altar");
  const altar = Altar.attach(addresses.altarProxy);

  if (addresses.sonicityNFT) {
    const isApproved = await altar.approvedCollections(addresses.sonicityNFT);
    if (!isApproved) {
      await altar.approveCollection(addresses.sonicityNFT);
      console.log("SonicityNFT approved in Altar");
    } else {
      console.log("SonicityNFT already approved in Altar");
    }
  }

  if (addresses.sonicityFarm) {
    const isApproved = await altar.approvedCollections(addresses.sonicityFarm);
    if (!isApproved) {
      await altar.approveCollection(addresses.sonicityFarm);
      console.log("SonicityFarm approved in Altar");
    } else {
      console.log("SonicityFarm already approved in Altar");
    }
  }

  if (addresses.sonicityDiamond) {
    const isApproved = await altar.approvedCollections(addresses.sonicityDiamond);
    if (!isApproved) {
      await altar.approveCollection(addresses.sonicityDiamond);
      console.log("SonicityDiamond approved in Altar");
    } else {
      console.log("SonicityDiamond already approved in Altar");
    }
  }

  if (addresses.sonicityRep) {
    const isApproved = await altar.approvedCollections(addresses.sonicityRep);
    if (!isApproved) {
      await altar.approveCollection(addresses.sonicityRep);
      console.log("SonicityRep approved in Altar");
    } else {
      console.log("SonicityRep already approved in Altar");
    }
  }

  console.log("\nSetup completed!");
  console.log("All NFT contracts are now linked to the Altar contract");
  console.log("The mintAndStake function is now available for use");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 