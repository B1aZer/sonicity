const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

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

    // Approve NFT collections in Altar
    await altar.connect(owner).approveCollection(sonicityNFTAddress);
    await altar.connect(owner).approveCollection(sonicityFarmAddress);

    // Approve the NFT collections in GameState
    await gameState.connect(owner).approveCollection(sonicityNFTAddress);
    await gameState.connect(owner).approveCollection(sonicityFarmAddress);

    // Initialize players (they start at tier 0 by default)
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();
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
      // Mint NFTs from both collections
      await sonicityNFT.mint(1, { value: ethers.parseEther("0.01") });
      await sonicityFarm.mint(1, { value: ethers.parseEther("0.015") });
      
      // Approve collections
      await altar.approveCollection(await sonicityNFT.getAddress());
      await altar.approveCollection(await sonicityFarm.getAddress());
      
      // Stake NFTs
      await sonicityNFT.approve(await altar.getAddress(), 1);
      await sonicityFarm.approve(await altar.getAddress(), 1);
      
      await altar.stake(1, 0, await sonicityNFT.getAddress());
      await altar.stake(1, 0, await sonicityFarm.getAddress());
      
      // Check stake data
      const stake1 = await altar.getStakeDataWithCollection(await sonicityNFT.getAddress(), 1);
      const stake2 = await altar.getStakeDataWithCollection(await sonicityFarm.getAddress(), 1);
      
      expect(stake1.tokenId).to.equal(1);
      expect(stake1.collection).to.equal(await sonicityNFT.getAddress());
      expect(stake2.tokenId).to.equal(1);
      expect(stake2.collection).to.equal(await sonicityFarm.getAddress());
    });

    it("Should not allow staking from unapproved collections", async function () {
      await expect(altar.connect(player1).stake(1, 0, unapprovedCollection.address))
        .to.be.revertedWith("Collection not approved");
    });

    it("Should not allow staking already staked NFTs", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 1, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, 1);
      await altar.connect(player1).stake(1, 0, await sonicityNFT.getAddress());

      // Try to stake again
      await expect(altar.connect(player1).stake(1, 0, await sonicityNFT.getAddress()))
        .to.be.revertedWith("Not the NFT owner");
    });

    it("Should allow unstaking after minimum duration", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 1, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, 1);
      await altar.connect(player1).stake(1, 0, await sonicityNFT.getAddress());

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), 1);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(await sonicityNFT.getAddress(), 1);

      // Check stake data
      const stake = await altar.getStakeDataWithCollection(await sonicityNFT.getAddress(), 1);
      expect(stake.isActive).to.be.false;

      // Check that the building was removed
      const building = await gridBuildings.buildings(await player1.getAddress(), buildingId);
      expect(building.active).to.be.false;

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });

    it("Should track multiple staked NFTs from different collections", async function () {
      // Mint NFTs from both collections
      await sonicityNFT.mint(2, { value: ethers.parseEther("0.02") });
      await sonicityFarm.mint(2, { value: ethers.parseEther("0.03") });
      
      // Approve collections
      await altar.approveCollection(await sonicityNFT.getAddress());
      await altar.approveCollection(await sonicityFarm.getAddress());
      
      // Approve and stake NFTs
      await sonicityNFT.approve(await altar.getAddress(), 1);
      await sonicityNFT.approve(await altar.getAddress(), 2);
      await sonicityFarm.approve(await altar.getAddress(), 1);
      await sonicityFarm.approve(await altar.getAddress(), 2);
      
      await altar.stake(1, 0, await sonicityNFT.getAddress());
      await altar.stake(2, 0, await sonicityNFT.getAddress());
      await altar.stake(1, 0, await sonicityFarm.getAddress());
      await altar.stake(2, 0, await sonicityFarm.getAddress());
      
      // Check stake data
      const stake1 = await altar.getStakeDataWithCollection(await sonicityNFT.getAddress(), 1);
      const stake2 = await altar.getStakeDataWithCollection(await sonicityNFT.getAddress(), 2);
      const stake3 = await altar.getStakeDataWithCollection(await sonicityFarm.getAddress(), 1);
      const stake4 = await altar.getStakeDataWithCollection(await sonicityFarm.getAddress(), 2);
      
      expect(stake1.tokenId).to.equal(1);
      expect(stake1.collection).to.equal(await sonicityNFT.getAddress());
      expect(stake2.tokenId).to.equal(2);
      expect(stake2.collection).to.equal(await sonicityNFT.getAddress());
      expect(stake3.tokenId).to.equal(1);
      expect(stake3.collection).to.equal(await sonicityFarm.getAddress());
      expect(stake4.tokenId).to.equal(2);
      expect(stake4.collection).to.equal(await sonicityFarm.getAddress());
    });
  });
}); 