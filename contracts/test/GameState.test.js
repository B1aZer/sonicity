const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GameState", function () {
  let gameState;
  let owner;
  let player1;
  let player2;
  let sonicityNFT;
  let altar;
  let gridBuildings;

  // Helper to ensure player has at least the specified amount of gold
  async function ensurePlayerGold(player, amount) {
    const playerAddress = await player.getAddress();
    let gold = await gameState.getPlayerGold(playerAddress);
    
    // If we already have enough gold, return early
    if (gold >= amount) return;
    
    // Get current houses
    const currentHouses = await gridBuildings.buildingCounts(playerAddress, 0); // 0 is HOUSE type
    
    // Create houses up to the limit of 9 if needed
    if (currentHouses < 9) {
        for (let i = currentHouses; i < 9; i++) {
            await gridBuildings.connect(owner).createBuilding(playerAddress, 0);
        }
    }
    
    // Fast forward time and collect until we have enough gold
    while (gold < amount) {
        await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
        
        // Collect from all houses
        for (let i = 0; i < 9; i++) {
            await gridBuildings.connect(player).collectResources(i);
        }
        
        gold = await gameState.getPlayerGold(playerAddress);
    }
  }

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy SonicityNFT
    const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
    sonicityNFT = await SonicityNFT.deploy();
    await sonicityNFT.waitForDeployment();
    const sonicityNFTAddress = await sonicityNFT.getAddress();

    // Deploy GameState
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [], { initializer: 'initialize' });
    await gameState.waitForDeployment();
    const gameStateAddress = await gameState.getAddress();

    // Deploy GridBuildings
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    gridBuildings = await upgrades.deployProxy(GridBuildings, [], { initializer: 'initialize' });
    await gridBuildings.waitForDeployment();
    const gridBuildingsAddress = await gridBuildings.getAddress();

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [
      gameStateAddress,
      gridBuildingsAddress
    ], { initializer: 'initialize' });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Set altar address in GameState
    await gameState.setAltarAddress(altarAddress);

    // Set GridBuildings address in GameState
    await gameState.setGridBuildingsAddress(gridBuildingsAddress);

    // Set GameState address in GridBuildings
    await gridBuildings.setGameStateAddress(gameStateAddress);

    // Set Altar address in GridBuildings
    await gridBuildings.setAltarAddress(altarAddress);

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
      await ensurePlayerGold(player1, 1000);
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
      await ensurePlayerGold(player1, 1000);
    });

    it("Should award rep points for gold donations", async function () {
      const player1Address = await player1.getAddress();
      const initialRep = await gameState.getPlayerRep(player1Address);
      expect(initialRep).to.equal(0);
      await gameState.connect(player1).donateGold(1000);
      const finalRep = await gameState.getPlayerRep(player1Address);
      expect(finalRep).to.equal(10); // 1% of 1000 = 10
    });

    it("Should apply tier multiplier to rep points", async function () {
      const player1Address = await player1.getAddress();
      
      // First donation to reach tier 1
      await ensurePlayerGold(player1, 1000);
      await gameState.connect(player1).donateGold(1000);
      const state = await gameState.playerState(player1Address);
      expect(state.tier).to.equal(1);
      
      // Second donation to reach tier 2
      await ensurePlayerGold(player1, 2000);
      await gameState.connect(player1).donateGold(1500); // Donate 1500 to reach 2500 total
      const state2 = await gameState.playerState(player1Address);
      expect(state2.tier).to.equal(2);
      
      // Third donation with tier 2 multiplier
      await ensurePlayerGold(player1, 3000);
      await gameState.connect(player1).donateGold(1000);
      const finalRep = await gameState.getPlayerRep(player1Address);
      
      // Calculate expected rep:
      // First donation (1000): 10 rep (1% of 1000, no multiplier at tier 0)
      // Second donation (1500): 18 rep (1% of 1500 with tier 1 multiplier = 15 * (100 + 20) / 100)
      // Third donation (1000): 14 rep (1% of 1000 with tier 2 multiplier = 10 * (100 + 40) / 100)
      // Total: 10 + 18 + 14 = 42 rep
      expect(finalRep).to.equal(42);
    });

    it("Should accumulate rep points from multiple donations", async function () {
      const player1Address = await player1.getAddress();
      await gameState.connect(player1).donateGold(500);
      await ensurePlayerGold(player1, 500);
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

  describe("Tier Management", function () {
    it("Should upgrade tier when rep threshold is reached", async function () {
      const player1Address = await player1.getAddress();
      await gameState.connect(owner).setTierRequirement(1, 1000);
      await ensurePlayerGold(player1, 1000);
      await gameState.connect(player1).donateGold(1000);
      const state = await gameState.playerState(player1Address);
      expect(state.tier).to.equal(1);
    });

    it("Should not downgrade tier when rep falls below threshold", async function () {
      const player1Address = await player1.getAddress();
      await gameState.connect(owner).setTierRequirement(1, 1000);
      await ensurePlayerGold(player1, 1000);
      await gameState.connect(player1).donateGold(1000);
      let state = await gameState.playerState(player1Address);
      expect(state.tier).to.equal(1);
      await gameState.connect(owner).setTierRequirement(1, 2000);
      state = await gameState.playerState(player1Address);
      expect(state.tier).to.equal(1);
    });

    it("Should upgrade multiple tiers when donating enough gold at once", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for the test
      await ensurePlayerGold(player1, 4000);
      
      // Get initial state
      const initialState = await gameState.playerState(player1Address);
      expect(initialState.tier).to.equal(0);
      expect(initialState.buildingSlots).to.equal(9);
      
      // Donate 4000 gold
      await gameState.connect(player1).donateGold(4000);
      
      // Check final state
      const finalState = await gameState.playerState(player1Address);
      expect(finalState.tier).to.equal(2); // Should be tier 2 (meets 1000 and 2500 requirements)
      expect(finalState.buildingSlots).to.equal(16); // Tier 2 gives 16 slots
      expect(finalState.treasury).to.equal(4000);
      
      // Verify tier requirements
      const tier1Req = await gameState.tierRequirements(1);
      const tier2Req = await gameState.tierRequirements(2);
      const tier3Req = await gameState.tierRequirements(3);
      
      expect(tier1Req).to.equal(1000);
      expect(tier2Req).to.equal(2500);
      expect(tier3Req).to.equal(5000);
      
      // Verify we didn't reach tier 3
      expect(finalState.tier).to.be.below(3);
    });
  });
}); 