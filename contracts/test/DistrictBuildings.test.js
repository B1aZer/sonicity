const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, donateGoldForTier, ensurePlayerGold } = require("./helpers");

describe("DistrictBuildings", function () {
  let districtBuildings;
  let gameState;
  let gridBuildings;
  let battleSystem;
  let owner;
  let player1;
  let altar;
  let sonicityNFT;

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

    // Deploy SonicityNFT (needed for minting/staking)
    const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
    sonicityNFT = await SonicityNFT.deploy();
    await sonicityNFT.waitForDeployment();
    const sonicityNFTAddress = await sonicityNFT.getAddress();

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [await gameState.getAddress(), await gridBuildings.getAddress()], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Set minimum staking duration to 0 for testing
    await altar.connect(owner).setMinStakingDuration(0);

    // Set Altar address in GridBuildings
    await gridBuildings.connect(owner).setAltarAddress(altarAddress);
    // Update GameState's altar address
    await gameState.connect(owner).setAltarAddress(altarAddress);
    // Set GridBuildings address in GameState
    await gameState.connect(owner).setGridBuildingsAddress(await gridBuildings.getAddress());
    // Approve NFT collection in Altar
    await altar.connect(owner).approveCollection(sonicityNFTAddress);

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
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);

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
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);

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
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);

      // Donate gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);
    });

    it("Should allow BattleSystem to damage a building", async function () {
      const player1Address = await player1.getAddress();
      
      // Build the defense tower first
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
      
      // Damage the defense tower through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Check if building is now damaged
      const isDamaged = await districtBuildings.isBuildingDamaged(player1Address, 3); // DEFENSE_TOWER
      expect(isDamaged).to.be.true;
    });

    it("Should not allow non-BattleSystem to damage a building", async function () {
      const player1Address = await player1.getAddress();
      
      // Build the defense tower first
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
      
      // Try to damage the defense tower as player1
      await expect(
        districtBuildings.connect(player1).damageBuildings(player1Address, 1)
      ).to.be.revertedWith("Only BattleSystem can call this function");
    });

    it("Should not allow damaging an already damaged building", async function () {
      const player1Address = await player1.getAddress();
      
      // Build the defense tower first
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
      
      // Damage the defense tower through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Verify the building is damaged
      const isDamaged = await districtBuildings.isBuildingDamaged(player1Address, 3); // DEFENSE_TOWER
      expect(isDamaged).to.be.true;

      // Try to damage it again through BattleSystem
      await expect(
        battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1)
      ).to.be.revertedWith("No buildings available to damage");
    });

    it("Should allow repairing a damaged building", async function () {
      const player1Address = await player1.getAddress();
      
      // Get initial gold balance
      const initialGold = await gameState.getPlayerGold(player1Address);
      
      // Build workshop first (required for repair)
      await districtBuildings.connect(player1).buildDistrictBuilding(1); // WORKSHOP
      
      // Build the defense tower
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
      
      // Damage the defense tower through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Verify building is damaged
      const isDamagedBefore = await districtBuildings.isBuildingDamaged(player1Address, 3); // DEFENSE_TOWER
      expect(isDamagedBefore).to.be.true;

      // Repair the building
      await districtBuildings.connect(player1).repairBuilding(3); // DEFENSE_TOWER

      // Verify building is repaired
      const isDamagedAfter = await districtBuildings.isBuildingDamaged(player1Address, 3); // DEFENSE_TOWER
      expect(isDamagedAfter).to.be.false;

      // Check gold was deducted
      const finalGold = await gameState.getPlayerGold(player1Address);
      // Workshop costs 150, defense tower costs 200, repair is half of 200 = 100
      const expectedGold = initialGold - 150n - 200n - 100n;
      expect(finalGold).to.equal(expectedGold);
    });

    it("Should not allow repairing an active building", async function () {
      const player1Address = await player1.getAddress();
      
      // Build the defense tower
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
      
      // Try to repair an undamaged building
      await expect(
        districtBuildings.connect(player1).repairBuilding(3) // DEFENSE_TOWER
      ).to.be.revertedWith("Building not damaged");
    });

    it("Should not allow repairing a non-built building", async function () {
      // Try to repair a building that hasn't been built
      await expect(
        districtBuildings.connect(player1).repairBuilding(3) // DEFENSE_TOWER
      ).to.be.revertedWith("Building not built");
    });

    it("Should not allow damaging tier 0 buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Build a tier 0 building (SHOP)
      await districtBuildings.connect(player1).buildDistrictBuilding(0);

      // Build a tier 1 building (DEFENSE_TOWER) to ensure we have a valid target
      await districtBuildings.connect(player1).buildDistrictBuilding(3);

      // Damage one building - it should damage the tier 1 building, not the tier 0
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      
      // Verify the tier 0 building (SHOP) is not damaged
      const isShopDamaged = await districtBuildings.isBuildingDamaged(player1Address, 0);
      expect(isShopDamaged).to.be.false;

      // Verify the tier 1 building (DEFENSE_TOWER) was damaged
      const isDefenseTowerDamaged = await districtBuildings.isBuildingDamaged(player1Address, 3);
      expect(isDefenseTowerDamaged).to.be.true;

      // Try to damage again - should revert since no valid targets remain
      await expect(
        battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1)
      ).to.be.revertedWith("No buildings available to damage");
    });

    it("Should damage buildings in reverse order (higher tier first)", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for all buildings
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 2000);
      
      // Donate gold to reach tier 2
      await gameState.connect(player1).donateGold(2500);
      
      // Build multiple buildings of different tiers
      await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER (tier 1)
      await districtBuildings.connect(player1).buildDistrictBuilding(4); // BARRACKS (tier 1)
      await districtBuildings.connect(player1).buildDistrictBuilding(7); // REP_STATION (tier 2)
      
      // Damage one building
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      
      // Check that the highest tier building (REP_STATION) was damaged
      const isRepStationDamaged = await districtBuildings.isBuildingDamaged(player1Address, 7);
      expect(isRepStationDamaged).to.be.true;
      
      // Check that lower tier buildings are not damaged
      const isDefenseTowerDamaged = await districtBuildings.isBuildingDamaged(player1Address, 3);
      const isBarracksDamaged = await districtBuildings.isBuildingDamaged(player1Address, 4);
      expect(isDefenseTowerDamaged).to.be.false;
      expect(isBarracksDamaged).to.be.false;
    });
  });
}); 