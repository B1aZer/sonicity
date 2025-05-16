const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("DistrictBuildings", function () {
  let districtBuildings;
  let gameState;
  let owner;
  let player1;

  beforeEach(async function () {
    [owner, player1] = await ethers.getSigners();

    // Deploy GameState
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [], {
      kind: 'uups',
      initializer: 'initialize',
    });

    // Deploy DistrictBuildings
    const DistrictBuildings = await ethers.getContractFactory("DistrictBuildings");
    districtBuildings = await upgrades.deployProxy(DistrictBuildings, [], {
      kind: 'uups',
      initializer: 'initialize',
    });

    // Set up contract interactions
    await districtBuildings.setGameStateAddress(await gameState.getAddress());
    await gameState.setDistrictBuildingsAddress(await districtBuildings.getAddress());

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
      // Give player1 enough gold and donate to reach tier 1
      await gameState.connect(player1).earnGold(2000);
      await gameState.connect(player1).donateGold(1000);

      // Check if defense tower is unlocked (first tier 1 building)
      const isDefenseTowerUnlocked = await districtBuildings.isDistrictBuildingUnlocked(
        await player1.getAddress(),
        2 // DEFENSE_TOWER
      );
      expect(isDefenseTowerUnlocked).to.be.true;
    });
  });

  describe("Building Construction", function () {
    beforeEach(async function () {
      // Give player1 enough gold and reach tier 1
      await gameState.connect(player1).earnGold(2000);
      await gameState.connect(player1).donateGold(1000);
    });

    it("Should allow building construction when unlocked", async function () {
      const player1Address = await player1.getAddress();
      
      // Build the defense tower
      await districtBuildings.connect(player1).buildDistrictBuilding(2); // DEFENSE_TOWER

      // Check if built
      const isBuilt = await districtBuildings.isDistrictBuildingBuilt(player1Address, 2); // DEFENSE_TOWER
      expect(isBuilt).to.be.true;

      // Check gold was deducted
      const goldBalance = await gameState.getPlayerGold(player1Address);
      expect(goldBalance).to.equal(800); // 2000 - 1000 (donation) - 200 (defense tower cost)
    });

    it("Should not allow building construction when not unlocked", async function () {
      await expect(
        districtBuildings.connect(player1).buildDistrictBuilding(3) // BARRACKS
      ).to.be.revertedWith("Building not unlocked");
    });
  });
}); 