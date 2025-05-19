const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GridBuildings", function () {
  let gameState;
  let gridBuildings;
  let altar;
  let sonicityNFT;
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

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [sonicityNFTAddress, gameStateAddress, gridBuildingsAddress], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Set GameState address in GridBuildings
    await gridBuildings.connect(owner).setGameStateAddress(gameStateAddress);

    // Set Altar address in GridBuildings
    await gridBuildings.connect(owner).setAltarAddress(altarAddress);

    // Set Altar address in GameState
    await gameState.connect(owner).setAltarAddress(altarAddress);

    // Set GridBuildings address in GameState
    await gameState.connect(owner).setGridBuildingsAddress(gridBuildingsAddress);

    // Approve the NFT collection in GameState
    await gameState.connect(owner).approveCollection(sonicityNFTAddress);

    // Initialize players (they start at tier 0 by default)
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();
  });

  describe("Building Management", function () {
    it("Should allow players to create buildings through staking", async function () {
      const player1Address = await player1.getAddress();
      
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
      const initialBuildingCount = await gridBuildings.buildingCounts(player1Address, 0);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Check that a building was created
      const newBuildingCount = await gridBuildings.buildingCounts(player1Address, 0);
      expect(newBuildingCount).to.equal(initialBuildingCount + BigInt(1));

      // Check the building details
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.active).to.be.true;
      expect(building.buildingType).to.equal(0); // 0 is HOUSE type
    });

    it("Should allow removing buildings through unstaking", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(player1Address, 0);
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(tokenId);

      // Check that the building was removed
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.active).to.be.false;

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(player1Address, 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });

    it("Should allow upgrading buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Get building ID
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);

      // Fast forward time to collect enough gold for upgrade
      await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
      await ethers.provider.send("evm_mine");

      // Collect resources to get gold for upgrade
      await gridBuildings.connect(player1).collectResources(buildingId);

      // Get building config to check upgrade cost
      const config = await gridBuildings.buildingConfigs(0); // 0 is HOUSE type
      const upgradeCost = config.upgradeCost;

      // Verify player has enough gold
      const playerGold = await gameState.getPlayerGold(player1Address);
      expect(playerGold).to.be.gte(upgradeCost);

      // Upgrade the building
      await gridBuildings.connect(player1).upgradeBuilding(buildingId);

      // Check the building level
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.level).to.equal(2);
    });
  });

  describe("Resource Collection", function () {
    let buildingId;

    beforeEach(async function () {
      // Mint and stake an NFT to create a building
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Get building ID
      buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);
    });

    it("Should collect gold from a house building", async function () {
      const player1Address = await player1.getAddress();
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Get initial gold balance
      const initialGold = await gameState.getPlayerGold(player1Address);

      // Collect resources
      await gridBuildings.connect(player1).collectResources(buildingId);

      // Check gold balance increased
      const finalGold = await gameState.getPlayerGold(player1Address);
      expect(finalGold).to.be.gt(initialGold);
    });

    it("Should cap resource collection at 24 hours", async function () {
      const player1Address = await player1.getAddress();
      
      // Fast forward 48 hours
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");

      // Get initial gold balance
      const initialGold = await gameState.getPlayerGold(player1Address);

      // Collect resources
      await gridBuildings.connect(player1).collectResources(buildingId);

      // Check gold balance increased (should be capped at 24 hours worth)
      const finalGold = await gameState.getPlayerGold(player1Address);
      const expectedGold = initialGold + BigInt(10 * 24); // 10 gold per hour * 24 hours
      expect(finalGold).to.equal(expectedGold);
    });

    it("Should not allow collecting from inactive buildings", async function () {
      // Unstake the NFT to deactivate the building
      // Fast forward time to complete staking period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");
      await altar.connect(player1).unstake(1);

      // Try to collect resources
      await expect(
        gridBuildings.connect(player1).collectResources(buildingId)
      ).to.be.revertedWith("Building not active");
    });

    it("Should calculate correct claimable gold", async function () {
      const player1Address = await player1.getAddress();
      
      // Fast forward 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");

      // Calculate claimable gold
      const claimableGold = await gridBuildings.calculateClaimableGold(player1Address);
      expect(claimableGold).to.equal(BigInt(10 * 12)); // 10 gold per hour * 12 hours
    });

    it("Should emit ResourcesCollected event", async function () {
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Collect resources and check event
      await expect(gridBuildings.connect(player1).collectResources(buildingId))
        .to.emit(gridBuildings, "ResourcesCollected")
        .withArgs(await player1.getAddress(), buildingId, BigInt(10)); // 10 gold per hour
    });
  });
}); 