const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("DistrictBuildings", function () {
  let districtBuildings;
  let gameState;
  let gridBuildings;
  let battleSystem;
  let owner;
  let player1;

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
    [owner, player1] = await ethers.getSigners();

    // Deploy GameState
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [], {
      kind: 'uups',
      initializer: 'initialize',
    });

    // Deploy GridBuildings
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    gridBuildings = await upgrades.deployProxy(GridBuildings, [], {
      kind: 'uups',
      initializer: 'initialize',
    });

    // Deploy DistrictBuildings
    const DistrictBuildings = await ethers.getContractFactory("DistrictBuildings");
    districtBuildings = await upgrades.deployProxy(DistrictBuildings, [], {
      kind: 'uups',
      initializer: 'initialize',
    });

    // Deploy mock BattleSystem
    const BattleSystem = await ethers.getContractFactory("BattleSystem");
    battleSystem = await upgrades.deployProxy(BattleSystem, [], {
      kind: 'uups',
      initializer: 'initialize',
    });

    // Set up contract interactions
    await districtBuildings.setGameStateAddress(await gameState.getAddress());
    await gameState.setDistrictBuildingsAddress(await districtBuildings.getAddress());
    await gameState.setGridBuildingsAddress(await gridBuildings.getAddress());
    await gameState.setBattleSystemAddress(await battleSystem.getAddress());
    await gridBuildings.setGameStateAddress(await gameState.getAddress());
    await battleSystem.setGameStateAddress(await gameState.getAddress());
    await battleSystem.setDistrictBuildingsAddress(await districtBuildings.getAddress());
    await districtBuildings.setBattleSystemAddress(await battleSystem.getAddress());

    // Initialize player
    await gameState.connect(player1).initializePlayer();
  });

  describe("Building Configuration", function () {
    it("Should have correct initial building configurations", async function () {
      const [buildingTypes, configs] = await districtBuildings.getAllDistrictBuildingConfigs();
      expect(configs.length).to.be.greaterThan(0);

      // Check shop configuration (first building)
      const shopConfig = configs[0];
      expect(shopConfig.name).to.equal("Shop");
      expect(shopConfig.buildCost).to.equal(100);
      expect(shopConfig.tier).to.equal(0);
    });

    it("Should return correct buildings by tier", async function () {
      const [buildingTypes, configs] = await districtBuildings.getDistrictBuildingsByTier(1);
      expect(configs.length).to.be.greaterThan(0);
      expect(configs[0].tier).to.equal(1);
    });
  });

  describe("Building Unlocking", function () {
    it("Should unlock buildings when tier requirement is met", async function () {
      // Ensure player has enough gold
      await ensurePlayerGold(player1, 1000);

      // Donate gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);

      // Check if defense tower is unlocked (first tier 1 building)
      const isDefenseTowerUnlocked = await districtBuildings.isDistrictBuildingUnlocked(
        await player1.getAddress(),
        3 // DEFENSE_TOWER
      );
      expect(isDefenseTowerUnlocked).to.be.true;

      // Check if barracks is not unlocked yet (requires more treasury)
      const isBarracksUnlocked = await districtBuildings.isDistrictBuildingUnlocked(
        await player1.getAddress(),
        4 // BARRACKS
      );
      expect(isBarracksUnlocked).to.be.false;
    });
  });

  describe("Building Construction", function () {
    beforeEach(async function () {
      // Ensure player has enough gold
      await ensurePlayerGold(player1, 1000);

      // Donate gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);
    });

    it("Should allow building construction when unlocked", async function () {
      const player1Address = await player1.getAddress();
      
      // Get initial gold balance
      const initialGold = await gameState.getPlayerGold(player1Address);
      
      // Build the defense tower
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER

      // Check if built
      const isBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, 3); // DEFENSE_TOWER
      expect(isBuilt).to.be.true;

      // Check if active
      const isActive = await districtBuildings.isDistrictBuildingActive(player1Address, 3); // DEFENSE_TOWER
      expect(isActive).to.be.true;

      // Check gold was deducted
      const finalGold = await gameState.getPlayerGold(player1Address);
      const expectedGold = initialGold - 200n; // Defense tower costs 200 gold
      expect(finalGold).to.equal(expectedGold);
    });

    it("Should not allow building construction when not unlocked", async function () {
      // Try to build barracks without unlocking it
      await expect(
        districtBuildings.connect(player1).buildDistrictBuilding(4) // BARRACKS
      ).to.be.revertedWith("Building not unlocked");
    });
  });

  describe("Building Damage and Repair", function () {
    beforeEach(async function () {
      // Ensure player has enough gold
      await ensurePlayerGold(player1, 1000);

      // Donate gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);
      
      // Build the defense tower
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
    });

    it("Should allow BattleSystem to damage a building", async function () {
      const player1Address = await player1.getAddress();
      
      // Damage the defense tower through BattleSystem
      await battleSystem.connect(owner).testDamageBuildings(player1Address, 1);

      // Check if building is now inactive
      const isActive = await districtBuildings.isDistrictBuildingActive(player1Address, 3); // DEFENSE_TOWER
      expect(isActive).to.be.false;
    });

    it("Should not allow non-BattleSystem to damage a building", async function () {
      const player1Address = await player1.getAddress();
      
      // Try to damage the defense tower as player1
      await expect(
        districtBuildings.connect(player1).damageBuildings(player1Address, 1)
      ).to.be.revertedWith("Only BattleSystem can call this function");
    });

    it("Should not allow damaging an already damaged building", async function () {
      const player1Address = await player1.getAddress();
      
      // Damage the defense tower through BattleSystem
      await battleSystem.connect(owner).testDamageBuildings(player1Address, 1);

      // Try to damage it again through BattleSystem
      await expect(
        battleSystem.connect(owner).testDamageBuildings(player1Address, 1)
      ).to.be.revertedWith("No buildings available to damage");
    });

    it("Should allow repairing a damaged building", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, 1000);
      
      // Build workshop first (required for repair)
      await districtBuildings.connect(player1).buildDistrictBuilding(1); // WORKSHOP
      
      // Damage the defense tower through BattleSystem
      await battleSystem.connect(owner).testDamageBuildings(player1Address, 1);

      // Repair the building
      await districtBuildings.connect(player1).repairBuilding(3); // DEFENSE_TOWER

      // Check if building is active again
      const isActive = await districtBuildings.isDistrictBuildingActive(player1Address, 3); // DEFENSE_TOWER
      expect(isActive).to.be.true;

      // Check repair cost was deducted (half of build cost)
      const goldBalance = await gameState.getPlayerGold(player1Address);
      const expectedGold = 1000n - 150n - 100n; // Initial gold - workshop cost - repair cost
      expect(goldBalance).to.equal(expectedGold);
    });

    it("Should not allow repairing an active building", async function () {
      await expect(
        districtBuildings.connect(player1).repairBuilding(2)
      ).to.be.revertedWith("Building not damaged");
    });

    it("Should not allow repairing a non-built building", async function () {
      await expect(
        districtBuildings.connect(player1).repairBuilding(3) // BARRACKS
      ).to.be.revertedWith("Building not built");
    });

    it("Should not allow damaging tier 0 buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Build a tier 0 building (SHOP)
      await districtBuildings.connect(player1).buildDistrictBuilding(0);
      
      // Try to damage it through BattleSystem
      await expect(
        battleSystem.connect(owner).testDamageBuildings(player1Address, 1)
      ).to.be.revertedWith("No buildings available to damage");
    });

    it("Should damage buildings in reverse order (higher tier first)", async function () {
      const player1Address = await player1.getAddress();
      
      // Build multiple buildings of different tiers
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER (tier 1)
      await districtBuildings.connect(player1).buildDistrictBuilding(4); // BARRACKS (tier 1)
      await districtBuildings.connect(player1).buildDistrictBuilding(5); // ARCHERY_RANGE (tier 2)
      
      // Damage one building
      await battleSystem.connect(owner).testDamageBuildings(player1Address, 1);
      
      // Check that the highest tier building (ARCHERY_RANGE) was damaged
      const isArcheryRangeActive = await districtBuildings.isDistrictBuildingActive(player1Address, 5);
      expect(isArcheryRangeActive).to.be.false;
      
      // Check that lower tier buildings are still active
      const isDefenseTowerActive = await districtBuildings.isDistrictBuildingActive(player1Address, 3);
      const isBarracksActive = await districtBuildings.isDistrictBuildingActive(player1Address, 4);
      expect(isDefenseTowerActive).to.be.true;
      expect(isBarracksActive).to.be.true;
    });
  });
}); 