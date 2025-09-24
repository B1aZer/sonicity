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
  let sonicityFarm;
  let sonicityDiamond;
  let sonicityRep;
  let buildingNames;
  let getBuildingTypeIndex;

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

    // Deploy SonicityFarm
    const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
    sonicityFarm = await SonicityFarm.deploy();
    await sonicityFarm.waitForDeployment();
    const sonicityFarmAddress = await sonicityFarm.getAddress();

    // Deploy SonicityDiamond
    const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
    sonicityDiamond = await SonicityDiamond.deploy();
    await sonicityDiamond.waitForDeployment();
    const sonicityDiamondAddress = await sonicityDiamond.getAddress();

    // Deploy SonicityRep
    const SonicityRep = await ethers.getContractFactory("SonicityRep");
    const sonicityRep = await SonicityRep.deploy();
    await sonicityRep.waitForDeployment();
    const sonicityRepAddress = await sonicityRep.getAddress();

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [await gameState.getAddress(), await gridBuildings.getAddress()], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Set minimum staking duration to 0 for testing
    await altar.setMinStakingDuration(0);

    // Set Altar address in GridBuildings
    await gridBuildings.setAltarAddress(altarAddress);
    // Update GameState's altar address
    await gameState.setAltarAddress(altarAddress);
    // Set GridBuildings address in GameState
    await gameState.setGridBuildingsAddress(await gridBuildings.getAddress());
    // Approve NFT collection in Altar
    await altar.approveCollection(sonicityNFTAddress);
    await altar.approveCollection(sonicityFarmAddress);
    await altar.approveCollection(sonicityDiamondAddress);
    await altar.approveCollection(sonicityRepAddress);

    // Set Altar contract address on all NFT contracts
    await sonicityNFT.setAltarContract(altarAddress);
    await sonicityFarm.setAltarContract(altarAddress);
    await sonicityDiamond.setAltarContract(altarAddress);
    await sonicityRep.setAltarContract(altarAddress);

    // Set up contract interactions
    await districtBuildings.setGameStateAddress(await gameState.getAddress());
    await gameState.setDistrictBuildingsAddress(await districtBuildings.getAddress());
    await gameState.setGridBuildingsAddress(await gridBuildings.getAddress());
    await gameState.setBattleSystemAddress(await battleSystem.getAddress());

    await gridBuildings.setGameStateAddress(await gameState.getAddress());
    await gridBuildings.setDistrictBuildingsAddress(await districtBuildings.getAddress());
    await gridBuildings.setBattleSystemAddress(await battleSystem.getAddress());

    await battleSystem.setGameStateAddress(await gameState.getAddress());
    await battleSystem.setDistrictBuildingsAddress(await districtBuildings.getAddress());
    await battleSystem.setGridBuildingsAddress(await gridBuildings.getAddress());

    // Set BattleSystem address in DistrictBuildings
    await districtBuildings.setBattleSystemAddress(await battleSystem.getAddress());

    // Initialize players
    await gameState.connect(player1).initializePlayer();

    // Fetch building names from contract
    buildingNames = await districtBuildings.getBuildingNames();
    getBuildingTypeIndex = (name) => buildingNames.findIndex(n => n === name);
  });

  describe("Building Configuration", function () {
    it("Should have correct initial building configurations", async function () {
      const [buildingTypes, configs] = await districtBuildings.getAllDistrictBuildingConfigs();
      expect(configs.length).to.be.greaterThan(0);

      // Check shop configuration (first building)
      const shopIndex = getBuildingTypeIndex("SHOP");
      const shopConfig = configs[shopIndex];
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
      const defenseTowerIndex = getBuildingTypeIndex("BARRACKS");
      const isDefenseTowerUnlocked = await districtBuildings.isDistrictBuildingUnlocked(
        await player1.getAddress(),
        defenseTowerIndex
      );
      expect(isDefenseTowerUnlocked).to.be.true;

      // Check if barracks is not unlocked yet (requires more treasury)
      const barracksIndex = getBuildingTypeIndex("COMMAND_CENTER");
      const isBarracksUnlocked = await districtBuildings.isDistrictBuildingUnlocked(
        await player1.getAddress(),
        barracksIndex
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

    it("Should automatically construct shop for new players", async function () {
      const player1Address = await player1.getAddress();
      const shopIndex = getBuildingTypeIndex("SHOP");
      
      // Check if shop is automatically built and unlocked
      const isShopBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, shopIndex);
      const isShopUnlocked = await districtBuildings.isDistrictBuildingUnlocked(player1Address, shopIndex);
      
      expect(isShopBuilt).to.be.true;
      expect(isShopUnlocked).to.be.true;
      
      // Verify shop is active
      const shopBuilding = await districtBuildings.buildings(player1Address, shopIndex);
      expect(shopBuilding.active).to.be.true;
      expect(shopBuilding.level).to.equal(1);
      expect(shopBuilding.damaged).to.be.false;
      
      // Verify player has the required treasury (200 initial + 1000 donated = 1200)
      const playerState = await gameState.playerState(player1Address);
      expect(playerState.treasury).to.equal(1200);
    });

    it("Should allow building construction when unlocked", async function () {
      const player1Address = await player1.getAddress();
      const TOWER_COST = 200n;
      
      // Get initial gold balance
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, TOWER_COST);
      const initialGold = await gameState.getPlayerGold(player1Address);
      
      // Build the defense tower
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);

      // Check if built
      const isBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, defenseTowerIndex);
      expect(isBuilt).to.be.true;

      // Check if active
      const isActive = await districtBuildings.isDistrictBuildingActive(player1Address, defenseTowerIndex);
      expect(isActive).to.be.true;

      // Check gold was deducted
      const finalGold = await gameState.getPlayerGold(player1Address);
      const expectedGold = initialGold - TOWER_COST; // Defense tower costs 200 gold
      expect(finalGold).to.equal(expectedGold);
    });

    it("Should not allow building construction when not unlocked", async function () {
      // Try to build barracks without unlocking it (requires 1000 treasury)
      // Ensure player has enough gold
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1245);

      const scoutGuildIndex = getBuildingTypeIndex("SCOUT_GUILD");
      await expect(
        districtBuildings.connect(player1).buildDistrictBuilding(scoutGuildIndex)
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
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 250);
      
      // Build the barracks (tier 1) instead of defense tower (now tier 0)
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      
      // Damage the barracks through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Check if building is now damaged
      const isDamaged = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isDamaged).to.be.true;
    });

    it("Should not allow non-BattleSystem to damage a building", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 200);
      
      // Build the defense tower first
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);
      
      // Try to damage the defense tower as player1
      await expect(
        districtBuildings.connect(player1).damageBuildings(player1Address, 1)
      ).to.be.revertedWith("Only BattleSystem can call this function");
    });

    it("Should not allow damaging an already damaged building", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 250);
      
      // Build the barracks (tier 1) instead of defense tower (now tier 0)
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      
      // Damage the barracks through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Verify the building is damaged
      const isDamaged = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isDamaged).to.be.true;

      // Try to damage it again through BattleSystem
      const damageTx = await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      await damageTx.wait();
      const returnValue = await battleSystem.connect(owner).testDamageDistrictBuildings.staticCall(player1Address, 1);
      expect(returnValue).to.equal(0);
    });

    it("Should allow repairing a damaged building", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for both buildings and repair
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 525);
      
      // Get initial gold balance
      const initialGold = await gameState.getPlayerGold(player1Address);
      
      // Build workshop first (required for repair)
      const shopIndex = getBuildingTypeIndex("WORKSHOP");
      await districtBuildings.connect(player1).buildDistrictBuilding(shopIndex);
      
      // Build the barracks (tier 1) instead of defense tower (now tier 0)
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      
      // Damage the barracks through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Verify building is damaged
      const isDamagedBefore = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isDamagedBefore).to.be.true;

      // Repair the building
      await districtBuildings.connect(player1).repairBuilding(barracksIndex);

      // Verify building is repaired
      const isDamagedAfter = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isDamagedAfter).to.be.false;

      // Check gold was deducted
      const finalGold = await gameState.getPlayerGold(player1Address);
      // Workshop costs 150, barracks costs 250, repair is half of 250 = 125
      const expectedGold = initialGold - 150n - 250n - 125n;
      expect(finalGold).to.equal(expectedGold);
    });

    it("Should not allow repairing an active building", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 250);
      
      // Build the barracks (tier 1) instead of defense tower (now tier 0)
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      
      // Try to repair an undamaged building
      await expect(
        districtBuildings.connect(player1).repairBuilding(barracksIndex)
      ).to.be.revertedWith("Building not damaged");
    });

    it("Should not allow repairing a non-built building", async function () {
      // Try to repair a building that hasn't been built
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      await expect(
        districtBuildings.connect(player1).repairBuilding(defenseTowerIndex)
      ).to.be.revertedWith("Building not built");
    });

    it("Should not allow repairing without a workshop", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for barracks
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 250);
      
      // Build the barracks (tier 1) instead of defense tower (now tier 0)
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      
      // Damage the barracks through BattleSystem
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);

      // Verify building is damaged
      const isDamagedBefore = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isDamagedBefore).to.be.true;

      // Try to repair without having a workshop
      await expect(
        districtBuildings.connect(player1).repairBuilding(barracksIndex)
      ).to.be.revertedWith("Workshop required to repair");
    });

    it("Should not allow damaging tier 0 buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for both buildings
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 450);
      
      // Build a tier 0 building (DEFENSE_TOWER - now tier 0)
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);

      // Build a tier 1 building (BARRACKS) to ensure we have a valid target
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);

      // Damage one building - it should damage the tier 1 building, not the tier 0
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      
      // Verify the tier 0 building (DEFENSE_TOWER) is not damaged
      const isDefenseTowerDamaged = await districtBuildings.isBuildingDamaged(player1Address, defenseTowerIndex);
      expect(isDefenseTowerDamaged).to.be.false;

      // Verify the tier 1 building (BARRACKS) was damaged
      const isBarracksDamaged = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isBarracksDamaged).to.be.true;

      // Try to damage again - should return 0 since no valid targets remain
      const damageTx = await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      await damageTx.wait();
      const returnValue = await battleSystem.connect(owner).testDamageDistrictBuildings.staticCall(player1Address, 1);
      expect(returnValue).to.equal(0);
    });

    it("Should damage buildings in reverse order (higher tier first)", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for all buildings and donation
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 10000);
      
      // Donate gold to reach tier 3
      await gameState.connect(player1).donateGold(7000);
      
      // Build multiple buildings of different tiers
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      const arcanumIndex = getBuildingTypeIndex("ARCANUM_OF_NAMES");
      await districtBuildings.connect(player1).buildDistrictBuilding(arcanumIndex);
      
      // Damage one building
      await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      
      // Check that the highest tier building (ARCANUM_OF_NAMES) was damaged
      const isArcanumDamaged = await districtBuildings.isBuildingDamaged(player1Address, arcanumIndex);
      expect(isArcanumDamaged).to.be.true;
      
      // Check that lower tier buildings are not damaged
      const isDefenseTowerDamaged = await districtBuildings.isBuildingDamaged(player1Address, defenseTowerIndex);
      const isBarracksDamaged = await districtBuildings.isBuildingDamaged(player1Address, barracksIndex);
      expect(isDefenseTowerDamaged).to.be.false;
      expect(isBarracksDamaged).to.be.false;
    });

    it("Should not allow damaging already damaged buildings", async function () {
      const player1Address = await player1.getAddress();

      // Ensure player has enough gold for all buildings and donation
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 10000);
      
      // Donate gold to reach tier 3
      await gameState.connect(player1).donateGold(7000);

      // Build multiple buildings
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      const arcanumIndex = getBuildingTypeIndex("ARCANUM_OF_NAMES");
      await districtBuildings.connect(player1).buildDistrictBuilding(arcanumIndex);

      // Get built buildings
      const builtBuildings = await districtBuildings.getBuiltDistrictBuildings(player1Address);

      // Damage all buildings
      for (let i = 0; i < builtBuildings.length; i++) {
        await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      }

      // Try to damage one more building - should return 0
      const damageTx = await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, 1);
      await damageTx.wait();
      const returnValue = await battleSystem.connect(owner).testDamageDistrictBuildings.staticCall(player1Address, 1);
      expect(returnValue).to.equal(0);
    });

    it("Should not damage more buildings than specified", async function () {
      const player1Address = await player1.getAddress();
      
      // Ensure player has enough gold for all buildings and donation
      await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 4500);
      
      // Donate gold to reach tier 2 (to unlock all three buildings)
      await gameState.connect(player1).donateGold(2500);
      
      // Check if buildings are unlocked
      const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
      const barracksIndex = getBuildingTypeIndex("BARRACKS");
      const scoutGuildIndex = getBuildingTypeIndex("SCOUT_GUILD");
      
      const isDefenseTowerUnlocked = await districtBuildings.isDistrictBuildingUnlocked(player1Address, defenseTowerIndex);
      const isBarracksUnlocked = await districtBuildings.isDistrictBuildingUnlocked(player1Address, barracksIndex);
      const isScoutGuildUnlocked = await districtBuildings.isDistrictBuildingUnlocked(player1Address, scoutGuildIndex);
      
      // Build multiple buildings
      await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);
      await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
      await districtBuildings.connect(player1).buildDistrictBuilding(scoutGuildIndex);
      
      // Check if buildings are built
      const isDefenseTowerBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, defenseTowerIndex);
      const isBarracksBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, barracksIndex);
      const isScoutGuildBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, scoutGuildIndex);
      
      // Check if buildings are active
      const isDefenseTowerActive = await districtBuildings.isDistrictBuildingActive(player1Address, defenseTowerIndex);
      const isBarracksActive = await districtBuildings.isDistrictBuildingActive(player1Address, barracksIndex);
      const isScoutGuildActive = await districtBuildings.isDistrictBuildingActive(player1Address, scoutGuildIndex);
      
      // Check building tiers
      const [buildingTypes, configs] = await districtBuildings.getAllDistrictBuildingConfigs();
      const defenseTowerTier = configs[defenseTowerIndex].tier;
      const barracksTier = configs[barracksIndex].tier;
      const scoutGuildTier = configs[scoutGuildIndex].tier;
      
      // Check if buildings are already damaged before damage call
      // Check BattleSystem address
      const contractBattleSystemAddress = await districtBuildings.battleSystemAddress();
      const expectedBattleSystemAddress = await battleSystem.getAddress();
      // Check player address
      // Try to damage 2 buildings
      const damageAmount = 2;
      
      // First, use static call to see what the function would return
      const expectedReturnValue = await battleSystem.connect(owner).testDamageDistrictBuildings.staticCall(player1Address, damageAmount);
      
      // Now make the actual damage call
      const damageTx = await battleSystem.connect(owner).testDamageDistrictBuildings(player1Address, damageAmount);
      await damageTx.wait();
      
      // Verify exactly 2 buildings were damaged (BARRACKS and SCOUT_GUILD, DEFENSE_TOWER is tier 0 and protected)
      expect(expectedReturnValue).to.equal(2);
      
      // Count how many buildings are actually damaged
      let damagedCount = 0;
      const builtBuildings = await districtBuildings.getBuiltDistrictBuildings(player1Address);
      for (const buildingId of builtBuildings) {
        const isDamaged = await districtBuildings.isBuildingDamaged(player1Address, buildingId);
        if (isDamaged) {
          damagedCount++;
        }
      }
      
      // Verify exactly 2 buildings were damaged
      expect(damagedCount).to.equal(damageAmount);
    });
  });
}); 