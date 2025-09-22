const { ethers } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Updating tactic prices...");

  // Get the TacticsNFT contract
  const TacticsNFT = await ethers.getContractFactory("TacticsNFT");
  const tacticsNFT = TacticsNFT.attach(addresses.tacticsNFTProxy);

  console.log("Connected to TacticsNFT at:", addresses.tacticsNFTProxy);

  // Define new pricing structure
  const newPricing = [
    // Tier 1 (Strongest Effects) - Premium Pricing
    { id: 1, name: "Iron Strike", goldCost: 300, diamondCost: 24 },
    { id: 2, name: "Guardian Wall", goldCost: 300, diamondCost: 24 },
    { id: 3, name: "Battle Rage", goldCost: 300, diamondCost: 24 },
    
    // Tier 2 (Medium Effects) - Standard Pricing
    { id: 4, name: "Cavalry Rush", goldCost: 200, diamondCost: 16 },
    { id: 5, name: "Defensive Circle", goldCost: 200, diamondCost: 16 },
    { id: 6, name: "Tactical Feint", goldCost: 200, diamondCost: 16 },
    
    // Tier 3 (Weakest Effects) - Entry Pricing
    { id: 7, name: "Swift Strike", goldCost: 100, diamondCost: 8 },
    { id: 8, name: "Shadow Guard", goldCost: 100, diamondCost: 8 },
    { id: 9, name: "Stealth Trap", goldCost: 100, diamondCost: 8 }
  ];

  // Update each tactic cost individually
  console.log("Updating tactic costs...");
  for (const tactic of newPricing) {
    console.log(`Updating ${tactic.name} (ID ${tactic.id}): ${tactic.goldCost} Gold + ${tactic.diamondCost} Diamonds`);
    const tx = await tacticsNFT.updateTacticCost(tactic.id, tactic.goldCost, tactic.diamondCost);
    await tx.wait();
    console.log(`✅ Updated - Transaction: ${tx.hash}`);
  }

  console.log("\n🎉 All tactic costs updated successfully!");

  // Verify the new prices
  console.log("\nVerifying new prices:");
  for (let i = 1; i <= 9; i++) {
    const cost = await tacticsNFT.getTacticCost(i);
    const tactic = await tacticsNFT.getTactic(i);
    console.log(`Tactic ${i} (${tactic.name}): ${cost.goldCost} Gold + ${cost.diamondCost} Diamonds`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
