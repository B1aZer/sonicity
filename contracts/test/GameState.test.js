const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GameState", function () {
  let gameState;
  let owner;
  let player1;
  let player2;
  let sonicityNFT;
  let altar;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy SonicityNFT
    const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
    sonicityNFT = await SonicityNFT.deploy();

    // Deploy GameState
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [], { initializer: 'initialize' });

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [await sonicityNFT.getAddress(), await gameState.getAddress()], { initializer: 'initialize' });

    // Set altar address in GameState
    await gameState.setAltarAddress(await altar.getAddress());

    // Initialize players
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();
  });

  describe("Player State", function () {
    it("Should initialize player with correct default values", async function () {
      const player1Address = await player1.getAddress();
      const state = await gameState.playerState(player1Address);
      
      expect(state.gold).to.equal(0);
      expect(state.rep).to.equal(0);
      expect(state.buildingSlots).to.equal(9);
      expect(state.tier).to.equal(0);
      expect(state.treasury).to.equal(0);
    });

    it("Should not allow re-initialization of players", async function () {
      await expect(gameState.connect(player1).initializePlayer())
        .to.be.revertedWith("Player already initialized");
    });
  });

  describe("Gold Management", function () {
    it("Should allow players to earn and donate gold", async function () {
      await gameState.connect(player1).earnGold(1000);

      const initialGold = await gameState.getPlayerGold(await player1.getAddress());
      const initialTreasury = await gameState.getPlayerTreasury(await player1.getAddress());

      await gameState.connect(player1).donateGold(500);

      const finalGold = await gameState.getPlayerGold(await player1.getAddress());
      const finalTreasury = await gameState.getPlayerTreasury(await player1.getAddress());

      expect(finalGold).to.equal(initialGold - 500n);
      expect(finalTreasury).to.equal(initialTreasury + 500n);
    });

    it("Should not allow players to donate more gold than they have", async function () {
      await expect(gameState.connect(player1).donateGold(1000)).to.be.revertedWith("Insufficient Gold");
    });
  });

  describe("Reputation Points", function () {
    beforeEach(async function () {
      await gameState.connect(player1).earnGold(1000);
    });

    it("Should award rep points for gold donations", async function () {
      const player1Address = await player1.getAddress();
      
      // Initial rep points should be 0
      const initialRep = await gameState.getPlayerRep(player1Address);
      expect(initialRep).to.equal(0);

      // Donate 1000 gold (should get 10 rep points in tier 0)
      await gameState.connect(player1).donateGold(1000);
      
      const finalRep = await gameState.getPlayerRep(player1Address);
      expect(finalRep).to.equal(10); // 1% of 1000 = 10
    });

    it("Should apply tier multiplier to rep points", async function () {
      const player1Address = await player1.getAddress();
      
      // Set tier 2 requirement to 1000
      await gameState.connect(owner).setTierRequirement(2, 1000);
      // Donate 1000 gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);
      // Verify tier upgrade to tier 1
      const state = await gameState.playerState(player1Address);
      expect(state.tier).to.equal(1);
      // Donate 1000 gold to reach tier 2
      await gameState.connect(player1).earnGold(1000);
      await gameState.connect(player1).donateGold(1000);
      // Verify tier upgrade to tier 2
      const state2 = await gameState.playerState(player1Address);
      expect(state2.tier).to.equal(2);
      // Now test donation at tier 2
      await gameState.connect(player1).earnGold(1000);
      await gameState.connect(player1).donateGold(1000);
      const finalRep = await gameState.getPlayerRep(player1Address);
      // Should be 14 (1% of 1000 * 1.4)
      expect(finalRep).to.equal(36);
    });

    it("Should accumulate rep points from multiple donations", async function () {
      const player1Address = await player1.getAddress();
      
      // Make multiple donations
      await gameState.connect(player1).donateGold(500);
      await gameState.connect(player1).earnGold(500);
      await gameState.connect(player1).donateGold(500);
      
      const finalRep = await gameState.getPlayerRep(player1Address);
      expect(finalRep).to.equal(10); // 1% of 500 + 1% of 500 = 10
    });

    it("Should emit RepEarned event when donating gold", async function () {
      await expect(gameState.connect(player1).donateGold(1000))
        .to.emit(gameState, "RepEarned")
        .withArgs(await player1.getAddress(), 10); // 1% of 1000 = 10
    });
  });

  describe("Building Management", function () {
    beforeEach(async function () {
      // Player is already initialized with 9 slots in the main beforeEach
      // No need to stake NFT or use Altar
    });

    it("Should allow players to create buildings", async function () {
      const player1Address = await player1.getAddress();
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      // Check building counts
      const totalBuildings = await gameState.getTotalBuildings(player1Address);
      const houseCount = await gameState.getBuildingsByType(player1Address, "house");
      expect(totalBuildings).to.equal(1);
      expect(houseCount).to.equal(1);
    });

    it("Should not allow creating buildings without available slots", async function () {
      const player1Address = await player1.getAddress();
      // Fill all slots
      for (let i = 0; i < 9; i++) {
        await gameState.connect(player1).createBuilding("house");
      }
      // Try to create one more
      await expect(gameState.connect(player1).createBuilding("house")).to.be.revertedWith("Tier 0 grid is full (3x3)");
    });

    it("Should allow removing buildings", async function () {
      const player1Address = await player1.getAddress();
      // Create and then remove a house
      await gameState.connect(player1).createBuilding("house");
      await gameState.connect(player1).removeBuilding(0);
      // Check building counts
      const totalBuildings = await gameState.getTotalBuildings(player1Address);
      const houseCount = await gameState.getBuildingsByType(player1Address, "house");
      expect(totalBuildings).to.equal(0);
      expect(houseCount).to.equal(0);
    });

    it("Should not allow removing non-existent buildings", async function () {
      await expect(gameState.connect(player1).removeBuilding(0)).to.be.revertedWith("Building already removed or doesn't exist");
    });

    it("Should return correct building IDs", async function () {
      const player1Address = await player1.getAddress();
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");
      await gameState.connect(player1).createBuilding("house");
      // Get all building IDs
      const allIds = await gameState.getPlayerBuildingIds(player1Address);
      expect(allIds.length).to.equal(2);
      // Get house IDs
      const houseIds = await gameState.getBuildingIdsOfType(player1Address, "house");
      expect(houseIds.length).to.equal(2);
    });

    it("Should return correct building details", async function () {
      const player1Address = await player1.getAddress();
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      // Get building details
      const building = await gameState.getBuilding(player1Address, 0);
      expect(building.buildingType).to.equal("house");
      expect(building.level).to.equal(1);
      expect(building.active).to.be.true;
    });

    it("Should not return details for non-existent buildings", async function () {
      const player1Address = await player1.getAddress();
      await expect(gameState.getBuilding(player1Address, 0)).to.be.revertedWith("Building doesn't exist or is inactive");
    });
  });

  describe("Building Slots", function () {
    beforeEach(async function () {
      // Player is already initialized with 9 slots in the main beforeEach
      // No need to stake NFT or use Altar
    });

    it("Should start with 9 building slots", async function () {
      const player1Address = await player1.getAddress();
      const slots = await gameState.getBuildingSlots(player1Address);
      expect(slots).to.equal(9);
    });

    it("Should increase building slots when upgrading tiers", async function () {
      const player1Address = await player1.getAddress();
      
      // Give enough gold to reach tier 1
      await gameState.connect(player1).earnGold(2000);
      await gameState.connect(player1).donateGold(1000);
      
      // Check slots after tier 1
      let slots = await gameState.getBuildingSlots(player1Address);
      expect(slots).to.equal(12); // Set to 12 slots at tier 1
      
      // Give enough gold to reach tier 2
      await gameState.connect(player1).earnGold(2000);
      await gameState.connect(player1).donateGold(1500);
      
      // Check slots after tier 2
      slots = await gameState.getBuildingSlots(player1Address);
      expect(slots).to.equal(16); // Set to 16 slots at tier 2
      
      // Give enough gold to reach tier 3
      await gameState.connect(player1).earnGold(3000);
      await gameState.connect(player1).donateGold(2500);
      
      // Check slots after tier 3
      slots = await gameState.getBuildingSlots(player1Address);
      expect(slots).to.equal(20); // Set to 20 slots at tier 3
      
      // Give enough gold to reach tier 4
      await gameState.connect(player1).earnGold(6000);
      await gameState.connect(player1).donateGold(5000);
      
      // Check slots after tier 4
      slots = await gameState.getBuildingSlots(player1Address);
      expect(slots).to.equal(25); // Set to 25 slots at tier 4
    });

    it("Should allow players to create buildings", async function () {
      const player1Address = await player1.getAddress();
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      // Check building counts
      const totalBuildings = await gameState.getTotalBuildings(player1Address);
      const houseCount = await gameState.getBuildingsByType(player1Address, "house");
      expect(totalBuildings).to.equal(1);
      expect(houseCount).to.equal(1);
    });
  });
}); 