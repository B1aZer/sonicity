const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, donateGoldForTier } = require("./helpers");

describe("Altar", function () {
  let sonicityNFT;
  let sonicityFarm;
  let gameState;
  let gridBuildings;
  let altar;
  let owner;
  let player1;
  let player2;
  let unapprovedCollection;

  beforeEach(async function () {
    [owner, player1, player2, unapprovedCollection] = await ethers.getSigners();

    // Deploy SonicityNFT
    const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
    sonicityNFT = await SonicityNFT.deploy();
    await sonicityNFT.waitForDeployment();
    const sonicityNFTAddress = await sonicityNFT.getAddress();

    // Deploy SonicityFarm
    const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
    sonicityFarm = await SonicityFarm.deploy();
    await sonicityFarm.waitForDeployment();
    const sonicityFarmAddress = await sonicityFarm.getAddress();

    // Deploy GameState
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await gameState.waitForDeployment();
    const gameStateAddress = await gameState.getAddress();

    // Deploy GridBuildings
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    gridBuildings = await upgrades.deployProxy(GridBuildings, [], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await gridBuildings.waitForDeployment();
    const gridBuildingsAddress = await gridBuildings.getAddress();

    // Set GameState address in GridBuildings
    await gridBuildings.connect(owner).setGameStateAddress(gameStateAddress);

    // Deploy Altar with the correct addresses
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [gameStateAddress, gridBuildingsAddress], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Set Altar address in GridBuildings
    await gridBuildings.connect(owner).setAltarAddress(altarAddress);

    // Update GameState's altar address
    await gameState.connect(owner).setAltarAddress(altarAddress);

    // Set GridBuildings address in GameState
    await gameState.connect(owner).setGridBuildingsAddress(gridBuildingsAddress);

    // Approve NFT collections in Altar
    await altar.connect(owner).approveCollection(sonicityNFTAddress);
    await altar.connect(owner).approveCollection(sonicityFarmAddress);

    // Initialize players (they start at tier 0 by default)
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();

    // Set minimum staking duration to 0 for testing
    await altar.connect(owner).setMinStakingDuration(0);
  });

  describe("Collection Management", function () {
    it("Should allow owner to approve and remove collections", async function () {
      await altar.approveCollection(await sonicityFarm.getAddress());
      expect(await altar.approvedCollections(await sonicityFarm.getAddress())).to.be.true;
      
      await altar.removeCollection(await sonicityFarm.getAddress());
      expect(await altar.approvedCollections(await sonicityFarm.getAddress())).to.be.false;
    });

    it("Should not allow non-owner to approve or remove collections", async function () {
      await expect(altar.connect(player1).approveCollection(await sonicityFarm.getAddress()))
        .to.be.revertedWithCustomError(altar, "OwnableUnauthorizedAccount");
      
      await expect(altar.connect(player1).removeCollection(await sonicityFarm.getAddress()))
        .to.be.revertedWithCustomError(altar, "OwnableUnauthorizedAccount");
    });
  });

  describe("NFT Staking", function () {
    it("Should allow players to stake NFTs from approved collections", async function () {
      // First stake a house (tier 0)
      const result1 = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);
      
      // Check stake data for house
      const stake1 = await altar.getStakeDataWithCollection(await sonicityNFT.getAddress(), result1.tokenId);
      expect(stake1.tokenId).to.equal(result1.tokenId);
      expect(stake1.collection).to.equal(await sonicityNFT.getAddress());

      // Upgrade player to tier 1 using helper
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
      const playerState = await gameState.playerState(await player1.getAddress());
      expect(playerState.tier).to.equal(1);

      // Now stake a farm (tier 1)
      const result2 = await mintAndStakeNFT(player1, altar, sonicityFarm, GridBuildingType.FARM);
      
      // Check stake data for farm
      const stake2 = await altar.getStakeDataWithCollection(await sonicityFarm.getAddress(), result2.tokenId);
      expect(stake2.tokenId).to.equal(result2.tokenId);
      expect(stake2.collection).to.equal(await sonicityFarm.getAddress());
    });

    it("Should not allow staking from unapproved collections", async function () {
      await expect(altar.connect(player1).stake(1, 0, unapprovedCollection.address))
        .to.be.revertedWith("Collection not approved");
    });

    it("Should not allow staking already staked NFTs", async function () {
      // Mint and stake an NFT
      const result = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);

      // Try to stake again
      await expect(altar.connect(player1).stake(result.tokenId, 0, await sonicityNFT.getAddress()))
        .to.be.revertedWith("Not the NFT owner");
    });

    it("Should allow unstaking after minimum duration", async function () {
      // Mint and stake an NFT
      const result = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(await player1.getAddress(), 0);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(result.nftAddress, result.tokenId);

      // Check stake data
      const stake = await altar.getStakeDataWithCollection(result.nftAddress, result.tokenId);
      expect(stake.isActive).to.be.false;

      // Check that the building was removed
      const building = await gridBuildings.buildings(await player1.getAddress(), result.buildingId);
      expect(building.buildingType).to.equal(BigInt(0));
      expect(building.level).to.equal(0);

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });

    it("Should track multiple staked NFTs from different collections", async function () {
      // First stake houses (tier 0)
      const result1 = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);
      const result2 = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);
      
      // Check stake data for houses
      const stake1 = await altar.getStakeDataWithCollection(result1.nftAddress, result1.tokenId);
      const stake2 = await altar.getStakeDataWithCollection(result2.nftAddress, result2.tokenId);
      
      expect(stake1.tokenId).to.equal(result1.tokenId);
      expect(stake1.collection).to.equal(result1.nftAddress);
      expect(stake2.tokenId).to.equal(result2.tokenId);
      expect(stake2.collection).to.equal(result2.nftAddress);

      // Upgrade player to tier 1 using helper
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
      const playerState = await gameState.playerState(await player1.getAddress());
      expect(playerState.tier).to.equal(1);

      // Now stake farms (tier 1)
      const result3 = await mintAndStakeNFT(player1, altar, sonicityFarm, GridBuildingType.FARM);
      const result4 = await mintAndStakeNFT(player1, altar, sonicityFarm, GridBuildingType.FARM);
      
      // Check stake data for farms
      const stake3 = await altar.getStakeDataWithCollection(result3.nftAddress, result3.tokenId);
      const stake4 = await altar.getStakeDataWithCollection(result4.nftAddress, result4.tokenId);
      
      expect(stake3.tokenId).to.equal(result3.tokenId);
      expect(stake3.collection).to.equal(result3.nftAddress);
      expect(stake4.tokenId).to.equal(result4.tokenId);
      expect(stake4.collection).to.equal(result4.nftAddress);
    });
  });
}); 