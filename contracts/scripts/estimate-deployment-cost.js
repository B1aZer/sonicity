const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🔍 Estimating deployment costs for all Sonicity contracts...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Get current gas price
  const gasPrice = await deployer.provider.getFeeData();
  console.log("Current gas price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");
  console.log("Max fee per gas:", ethers.formatUnits(gasPrice.maxFeePerGas, "gwei"), "gwei");
  console.log("Max priority fee:", ethers.formatUnits(gasPrice.maxPriorityFeePerGas, "gwei"), "gwei\n");

  let totalGasEstimate = 0n;
  let totalCostETH = 0n;
  const estimations = [];

  // Helper function to estimate deployment cost
  async function estimateContract(contractName, constructorArgs = [], isUpgradeable = false) {
    try {
      console.log(`📋 Estimating ${contractName}...`);
      const ContractFactory = await ethers.getContractFactory(contractName);
      
      let gasEstimate;
      if (isUpgradeable) {
        // For upgradeable contracts, estimate proxy + implementation
        const deployTx = await ContractFactory.getDeployTransaction(...constructorArgs);
        gasEstimate = await deployer.estimateGas(deployTx);
        // Add proxy deployment cost (roughly 200k gas)
        gasEstimate += 200000n;
      } else {
        const deployTx = await ContractFactory.getDeployTransaction(...constructorArgs);
        gasEstimate = await deployer.estimateGas(deployTx);
      }
      
      const costETH = gasEstimate * gasPrice.gasPrice;
      const costUSD = costETH * 3500n / 1000n; // Assuming $3500 ETH (adjust as needed)
      
      totalGasEstimate += gasEstimate;
      totalCostETH += costETH;
      
      const estimation = {
        contract: contractName,
        gasEstimate: gasEstimate.toString(),
        costETH: ethers.formatEther(costETH),
        costUSD: ethers.formatEther(costUSD),
        upgradeable: isUpgradeable
      };
      
      estimations.push(estimation);
      
      console.log(`  ⛽ Gas: ${gasEstimate.toLocaleString()}`);
      console.log(`  💰 Cost: ${ethers.formatEther(costETH)} ETH (~$${ethers.formatEther(costUSD)})`);
      console.log("");
      
      return estimation;
    } catch (error) {
      console.log(`  ❌ Error estimating ${contractName}:`, error.message);
      return null;
    }
  }

  // Estimate each contract
  console.log("=".repeat(60));
  console.log("CONTRACT DEPLOYMENT ESTIMATIONS");
  console.log("=".repeat(60));

  // NFT Contracts
  await estimateContract("SonicityNFT");
  await estimateContract("SonicityFarm");
  await estimateContract("SonicityDiamond");
  await estimateContract("SonicityRep");
  await estimateContract("SonicityYieldNFT");
  await estimateContract("HeroNFT");
  await estimateContract("TacticsNFT");
  await estimateContract("CosmeticItems");

  // Core Contracts
  await estimateContract("SonicityArtProxy");
  await estimateContract("Altar");
  
  // Upgradeable Contracts
  await estimateContract("GameState", [], true);
  await estimateContract("DistrictBuildings", [], true);
  await estimateContract("GridBuildings", [], true);
  await estimateContract("BattleSystem", [], true);

  // Summary
  console.log("=".repeat(60));
  console.log("📊 DEPLOYMENT COST SUMMARY");
  console.log("=".repeat(60));
  
  console.log(`Total Gas Estimate: ${totalGasEstimate.toLocaleString()}`);
  console.log(`Total Cost: ${ethers.formatEther(totalCostETH)} ETH`);
  console.log(`Total Cost USD: ~$${ethers.formatEther(totalCostETH * 3500n / 1000n)} (assuming $3500 ETH)`);
  
  // Network-specific estimates
  console.log("\n💡 NETWORK COST ESTIMATES:");
  console.log("=".repeat(50));
  
  // Sonic Mainnet (realistic estimate with 64 gwei)
  const sonicGasPrice = ethers.parseUnits("64", "gwei"); // Real Sonic average gas price
  const sonicCost = totalGasEstimate * sonicGasPrice;
  const sonicTokenPrice = 0.015; // Approximate SONIC token price in USD
  const sonicCostUSD = parseFloat(ethers.formatEther(sonicCost)) * sonicTokenPrice;
  console.log(`🟦 Sonic Mainnet (64 gwei):`);
  console.log(`   Cost: ${ethers.formatEther(sonicCost)} SONIC (~$${sonicCostUSD.toFixed(2)})`);
  console.log(`   SONIC Token Price: ~$${sonicTokenPrice}`);
  
  // Ethereum Mainnet
  const ethMainnetGasPrice = ethers.parseUnits("30", "gwei");
  const ethCost = totalGasEstimate * ethMainnetGasPrice;
  console.log(`🟨 Ethereum Mainnet (30 gwei):`);
  console.log(`   Cost: ${ethers.formatEther(ethCost)} ETH (~$${ethers.formatEther(ethCost * 3500n / 1000n)})`);
  
  // Polygon
  const polygonGasPrice = ethers.parseUnits("50", "gwei");
  const polygonCost = totalGasEstimate * polygonGasPrice;
  console.log(`🟣 Polygon (50 gwei):`);
  console.log(`   Cost: ${ethers.formatEther(polygonCost)} MATIC (~$${ethers.formatEther(polygonCost * 800n / 1000n)})`);
  
  console.log("\n📋 DETAILED BREAKDOWN:");
  console.log("=".repeat(40));
  estimations.forEach(est => {
    if (est) {
      console.log(`${est.contract}: ${est.gasEstimate} gas (${est.costETH} ETH)`);
    }
  });
  
  console.log("\n✅ Estimation complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
