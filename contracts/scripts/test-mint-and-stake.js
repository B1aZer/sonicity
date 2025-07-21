const { ethers } = require("hardhat");

async function main() {
  // Read deployed addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));

  console.log("Testing mintAndStake functionality...");

  // Get signers
  const [owner, player1] = await ethers.getSigners();

  // Get contract instances
  const Altar = await ethers.getContractFactory("Altar");
  const altar = Altar.attach(addresses.altarProxy);

  const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
  const sonicityNFT = SonicityNFT.attach(addresses.sonicityNFT);

  const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
  const sonicityFarm = SonicityFarm.attach(addresses.sonicityFarm);

  const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
  const sonicityDiamond = SonicityDiamond.attach(addresses.sonicityDiamond);

  console.log("Testing with player1:", await player1.getAddress());

  try {
    // Test 1: Mint and stake a house NFT
    console.log("\n1. Testing mintAndStake for SonicityNFT (House)...");
    const tokenId1 = 1;
    await altar.connect(player1).mintAndStake(addresses.sonicityNFT, tokenId1, 0); // 0 = HOUSE
    console.log("✓ Successfully minted and staked SonicityNFT token", tokenId1);

    // Check if NFT was minted to Altar contract
    const nftOwner1 = await sonicityNFT.ownerOf(tokenId1);
    console.log("NFT owner:", nftOwner1);
    console.log("Altar contract:", addresses.altarProxy);
    console.log("NFT is owned by Altar:", nftOwner1 === addresses.altarProxy);

    // Test 2: Mint and stake a farm NFT
    console.log("\n2. Testing mintAndStake for SonicityFarm (Farm)...");
    const tokenId2 = 1;
    await altar.connect(player1).mintAndStake(addresses.sonicityFarm, tokenId2, 1); // 1 = FARM
    console.log("✓ Successfully minted and staked SonicityFarm token", tokenId2);

    // Test 3: Mint and stake a diamond station NFT
    console.log("\n3. Testing mintAndStake for SonicityDiamond (Diamond Station)...");
    const tokenId3 = 1;
    await altar.connect(player1).mintAndStake(addresses.sonicityDiamond, tokenId3, 2); // 2 = REP_STATION
    console.log("✓ Successfully minted and staked SonicityDiamond token", tokenId3);

    // Test 4: Check stake data
    console.log("\n4. Checking stake data...");
    const stakeData1 = await altar.getStakeDataWithCollection(addresses.sonicityNFT, tokenId1);
    console.log("SonicityNFT stake data:", {
      tokenId: stakeData1.tokenId.toString(),
      owner: stakeData1.owner,
      isActive: stakeData1.isActive,
      buildingType: stakeData1.buildingType
    });

    const stakeData2 = await altar.getStakeDataWithCollection(addresses.sonicityFarm, tokenId2);
    console.log("SonicityFarm stake data:", {
      tokenId: stakeData2.tokenId.toString(),
      owner: stakeData2.owner,
      isActive: stakeData2.isActive,
      buildingType: stakeData2.buildingType
    });

    const stakeData3 = await altar.getStakeDataWithCollection(addresses.sonicityDiamond, tokenId3);
    console.log("SonicityDiamond stake data:", {
      tokenId: stakeData3.tokenId.toString(),
      owner: stakeData3.owner,
      isActive: stakeData3.isActive,
      buildingType: stakeData3.buildingType
    });

    // Test 5: Check user stakes by collection
    console.log("\n5. Checking user stakes by collection...");
    const userStakesNFT = await altar.getUserStakesByCollection(await player1.getAddress(), addresses.sonicityNFT);
    const userStakesFarm = await altar.getUserStakesByCollection(await player1.getAddress(), addresses.sonicityFarm);
    const userStakesDiamond = await altar.getUserStakesByCollection(await player1.getAddress(), addresses.sonicityDiamond);

    console.log("Player1 SonicityNFT stakes:", userStakesNFT.map(id => id.toString()));
    console.log("Player1 SonicityFarm stakes:", userStakesFarm.map(id => id.toString()));
    console.log("Player1 SonicityDiamond stakes:", userStakesDiamond.map(id => id.toString()));

    console.log("\n✅ All tests passed! The mintAndStake functionality is working correctly.");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 