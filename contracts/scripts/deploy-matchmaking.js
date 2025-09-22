const { ethers, upgrades } = require("hardhat");

async function deployMatchmaking(existingAddresses = {}) {
  console.log("Starting MatchmakingSystem deployment...");

  // Deploy MatchmakingSystem implementation
  console.log("Deploying MatchmakingSystem implementation...");
  const MatchmakingSystem = await ethers.getContractFactory("MatchmakingSystem");
  const matchmakingSystemImpl = await MatchmakingSystem.deploy();
  console.log("Waiting for MatchmakingSystem implementation deployment...");
  await matchmakingSystemImpl.waitForDeployment();
  const matchmakingSystemImplAddress = await matchmakingSystemImpl.getAddress();
  console.log("MatchmakingSystem implementation deployed to:", matchmakingSystemImplAddress);

  // Deploy MatchmakingSystem proxy
  console.log("Deploying MatchmakingSystem proxy...");
  const matchmakingSystemProxy = await upgrades.deployProxy(MatchmakingSystem, [], {
    initializer: "initialize",
    kind: "uups"
  });
  console.log("Waiting for MatchmakingSystem proxy deployment...");
  await matchmakingSystemProxy.waitForDeployment();
  const matchmakingSystemProxyAddress = await matchmakingSystemProxy.getAddress();
  console.log("MatchmakingSystem proxy deployed to:", matchmakingSystemProxyAddress);

  // Set up contract interactions
  console.log("Setting up MatchmakingSystem contract interactions...");
  
  // Set GameState address in MatchmakingSystem
  console.log("Setting GameState address in MatchmakingSystem...");
  await matchmakingSystemProxy.setGameStateAddress(existingAddresses.gameStateProxy);
  
  // Set BattleSystem address in MatchmakingSystem
  console.log("Setting BattleSystem address in MatchmakingSystem...");
  await matchmakingSystemProxy.setBattleSystemAddress(existingAddresses.battleSystemProxy);
  
  // Set DistrictBuildings address in MatchmakingSystem
  console.log("Setting DistrictBuildings address in MatchmakingSystem...");
  await matchmakingSystemProxy.setDistrictBuildingsAddress(existingAddresses.districtBuildingsProxy);
  
  // Set GridBuildings address in MatchmakingSystem
  console.log("Setting GridBuildings address in MatchmakingSystem...");
  await matchmakingSystemProxy.setGridBuildingsAddress(existingAddresses.gridBuildingsProxy);
  
  // Set MatchmakingSystem address in GameState
  console.log("Setting MatchmakingSystem address in GameState...");
  const gameStateProxy = await ethers.getContractAt("GameState", existingAddresses.gameStateProxy);
  await gameStateProxy.setMatchmakingSystemAddress(matchmakingSystemProxyAddress);
  
  // Set MatchmakingSystem address in BattleSystem
  console.log("Setting MatchmakingSystem address in BattleSystem...");
  const battleSystemProxy = await ethers.getContractAt("BattleSystem", existingAddresses.battleSystemProxy);
  await battleSystemProxy.setMatchmakingSystemAddress(matchmakingSystemProxyAddress);

  console.log("MatchmakingSystem deployment and setup completed!");

  return {
    matchmakingSystemImpl: matchmakingSystemImplAddress,
    matchmakingSystemProxy: matchmakingSystemProxyAddress
  };
}

async function main() {
  console.log("Starting MatchmakingSystem deployment for existing contracts...");

  // Read deployed addresses
  const fs = require('fs');
  let addresses;
  try {
    addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    console.log("Loaded existing contract addresses from deployed-addresses.json");
  } catch (error) {
    console.error("Error reading deployed-addresses.json:", error.message);
    console.log("Please ensure you have deployed the main contracts first using deploy.js");
    process.exit(1);
  }

  // Deploy MatchmakingSystem
  const matchmakingAddresses = await deployMatchmaking(addresses);

  // Update addresses file
  const updatedAddresses = {
    ...addresses,
    ...matchmakingAddresses
  };

  fs.writeFileSync(
    'deployed-addresses.json',
    JSON.stringify(updatedAddresses, null, 2)
  );
  console.log("\nAddresses updated in deployed-addresses.json");

  console.log("\nMatchmakingSystem deployment completed!");
  console.log("Contract addresses:");
  console.log("MatchmakingSystem implementation:", matchmakingAddresses.matchmakingSystemImpl);
  console.log("MatchmakingSystem proxy:", matchmakingAddresses.matchmakingSystemProxy);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployMatchmaking };
