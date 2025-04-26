const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy Lock contract
  const Lock = await hre.ethers.getContractFactory("Lock");
  const lock = await Lock.deploy();
  await lock.deployed();
  console.log("Lock deployed to:", lock.address);

  // Deploy SonicityNFT contract
  const SonicityNFT = await hre.ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = await SonicityNFT.deploy();
  await sonicityNFT.deployed();
  console.log("SonicityNFT deployed to:", sonicityNFT.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 