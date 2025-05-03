const { run } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Starting verification...");

  // Verify SonicityNFT
  console.log("Verifying SonicityNFT...");
  await run("verify:verify", {
    address: addresses.sonicityNFT,
    constructorArguments: [],
  });
  console.log("SonicityNFT verified");

  // Verify GameState implementation
  console.log("Verifying GameState implementation...");
  await run("verify:verify", {
    address: addresses.gameStateImpl,
    constructorArguments: [],
  });
  console.log("GameState implementation verified");

  // Verify Altar implementation
  console.log("Verifying Altar implementation...");
  await run("verify:verify", {
    address: addresses.altarImpl,
    constructorArguments: [],
  });
  console.log("Altar implementation verified");

  console.log("\nAll contracts verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 