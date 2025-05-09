const { ethers, upgrades } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Starting upgrades...");

  // Upgrade GameState
  console.log("Upgrading GameState...");
  const GameState = await ethers.getContractFactory("GameState");
  const gameStateProxy = await upgrades.upgradeProxy(addresses.gameStateProxy, GameState);
  await gameStateProxy.waitForDeployment();
  console.log("GameState upgraded to:", await gameStateProxy.getAddress());

  // Upgrade Altar
  console.log("Upgrading Altar...");
  const Altar = await ethers.getContractFactory("Altar");
  const altarProxy = await upgrades.upgradeProxy(addresses.altarProxy, Altar);
  await altarProxy.waitForDeployment();
  console.log("Altar upgraded to:", await altarProxy.getAddress());

  // Update addresses file
  const newAddresses = {
    ...addresses,
    gameStateProxy: await gameStateProxy.getAddress(),
    altarProxy: await altarProxy.getAddress(),
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(newAddresses, null, 2)
  );
  console.log("\nAddresses updated in deployed-addresses.json");

  console.log("\nUpgrades completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 