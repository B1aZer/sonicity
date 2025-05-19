const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Altar", function () {
  let sonicityNFT;
  let gameState;
  let gridBuildings;
  let altar;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy SonicityNFT
    const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
    sonicityNFT = await SonicityNFT.deploy();
    await sonicityNFT.waitForDeployment();
    const sonicityNFTAddress = await sonicityNFT.getAddress();

    // Deploy GameState first with a temporary altar address
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
    altar = await upgrades.deployProxy(Altar, [sonicityNFTAddress, gameStateAddress, gridBuildingsAddress], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Update GameState's altar address
    await gameState.connect(owner).setAltarAddress(altarAddress);

    // Approve the NFT collection in GameState
    await gameState.connect(owner).approveCollection(sonicityNFTAddress);

    // Initialize players (they start at tier 0 by default)
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();
  });

  describe("NFT Staking", function () {
    it("Should allow players to stake NFTs and create buildings", async function () {
      // Mint an NFT to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      // Get initial building count
      const initialBuildingCount = await gridBuildings.buildingCounts(await player1.getAddress(), 0); // 0 is HOUSE type

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Check stake data
      const stake = await altar.getStakeData(tokenId);
      expect(stake.isActive).to.be.true;
      expect(stake.owner).to.equal(await player1.getAddress());
      expect(stake.tokenId).to.equal(tokenId);

      // Check that a building was created
      const newBuildingCount = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      expect(newBuildingCount).to.equal(initialBuildingCount + BigInt(1));

      // Check the building details
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);
      const building = await gridBuildings.buildings(await player1.getAddress(), buildingId);
      expect(building.active).to.be.true;
      expect(building.buildingType).to.equal(0); // 0 is HOUSE type
    });

    it("Should not allow staking already staked NFTs", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Try to stake again (should fail because we no longer own the NFT)
      await expect(altar.connect(player1).stake(tokenId)).to.be.revertedWith("Not the NFT owner");
    });

    it("Should not allow unstaking before minimum duration", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Try to unstake immediately
      await expect(altar.connect(player1).unstake(tokenId)).to.be.revertedWith("Staking period not completed");
    });

    it("Should allow unstaking after minimum duration and remove building", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(tokenId);

      // Check stake data
      const stake = await altar.getStakeData(tokenId);
      expect(stake.isActive).to.be.false;

      // Check that the building was removed
      const building = await gridBuildings.buildings(await player1.getAddress(), buildingId);
      expect(building.active).to.be.false;

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });

    it("Should not allow staking an NFT with 0 building slots", async function () {
      const tokenId = 1;
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      
      const metadata = {
        district: 1,
        buildingSlots: 0
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      
      await expect(altar.connect(player1).stake(tokenId))
        .to.be.revertedWith("NFT must have at least 1 building slot");
    });

    it("Should track multiple staked NFTs and their buildings", async function () {
      // Mint three NFTs to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.03") });
      await sonicityNFT.connect(player1).mint(2, { value: ethers.parseEther("0.03") });
      await sonicityNFT.connect(player1).mint(3, { value: ethers.parseEther("0.03") });
      
      // Set metadata for all NFTs
      const metadata = { district: 1, buildingSlots: 5 };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 1, metadata);
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 2, metadata);
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 3, metadata);

      // Get initial building count
      const initialBuildingCount = await gridBuildings.buildingCounts(await player1.getAddress(), 0);

      // Stake all NFTs
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, 1);
      await sonicityNFT.connect(player1).approve(altarAddress, 2);
      await sonicityNFT.connect(player1).approve(altarAddress, 3);
      
      await altar.connect(player1).stake(1);
      await altar.connect(player1).stake(2);
      await altar.connect(player1).stake(3);

      // Check user's staked NFTs
      const stakedNFTs = await altar.getUserStakes(await player1.getAddress());
      expect(stakedNFTs.length).to.equal(3);
      expect(stakedNFTs).to.include(BigInt(1));
      expect(stakedNFTs).to.include(BigInt(2));
      expect(stakedNFTs).to.include(BigInt(3));

      // Check that buildings were created
      const newBuildingCount = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      expect(newBuildingCount).to.equal(initialBuildingCount + BigInt(3));

      // Check each building
      for (let i = 1; i <= 3; i++) {
        const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), i);
        const building = await gridBuildings.buildings(await player1.getAddress(), buildingId);
        expect(building.active).to.be.true;
        expect(building.buildingType).to.equal(0); // 0 is HOUSE type
      }
    });
  });
}); 