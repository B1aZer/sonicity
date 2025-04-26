const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy SonicityNFT contract
  const SonicityNFT = await hre.ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = await SonicityNFT.deploy();
  await sonicityNFT.waitForDeployment();
  console.log("SonicityNFT deployed to:", await sonicityNFT.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 