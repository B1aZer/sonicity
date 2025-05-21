const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// Define building types enum to match the contract
const GridBuildingType = {
    HOUSE: 0,
    FARM: 1,
    REP_STATION: 2
};

describe("GridBuildings", function () {
  let gameState;
  let gridBuildings;
  let altar;
  let sonicityNFT;
  let owner;
  let player1;
  let player2;
  let battleSystem;

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
    altar = await upgrades.deployProxy(Altar, [gameStateAddress, gridBuildingsAddress], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Deploy BattleSystem
    const BattleSystem = await ethers.getContractFactory("BattleSystem");
    battleSystem = await upgrades.deployProxy(BattleSystem, [], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await battleSystem.waitForDeployment();
    const battleSystemAddress = await battleSystem.getAddress();

    // Set up contract interactions
    await gridBuildings.connect(owner).setGameStateAddress(gameStateAddress);
    await gridBuildings.connect(owner).setAltarAddress(altarAddress);
    await gridBuildings.connect(owner).setBattleSystemAddress(battleSystemAddress);
    await gameState.connect(owner).setAltarAddress(altarAddress);
    await gameState.connect(owner).setGridBuildingsAddress(gridBuildingsAddress);
    await gameState.connect(owner).setBattleSystemAddress(battleSystemAddress);

    // Initialize players
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();
  });

  describe("Building Management", function () {
    it("Should allow players to create buildings through staking", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint an NFT to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Get initial building count
      const initialBuildingCount = await gridBuildings.buildingCounts(player1Address, 0);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId, 0, await sonicityNFT.getAddress());

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

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId, 0, await sonicityNFT.getAddress());

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(player1Address, 0);
      const buildingId = await altar.stakedBuilding(await sonicityNFT.getAddress(), tokenId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(await sonicityNFT.getAddress(), tokenId);

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

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId, 0, await sonicityNFT.getAddress());

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

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId, 0, await sonicityNFT.getAddress());

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
      await altar.connect(player1).unstake(await sonicityNFT.getAddress(), 1);

      // Try to collect resources
      await expect(
        gridBuildings.connect(player1).collectResources(buildingId)
      ).to.be.revertedWith("Building not active");
    });

    it("Should calculate correct claimable resources for a house", async function () {
      const player1Address = await player1.getAddress();
      
      // Fast forward 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");

      // Calculate claimable resources for the house
      const claimableResources = await gridBuildings.calculateClaimableResources(player1Address, buildingId);
      expect(claimableResources).to.equal(BigInt(10 * 12)); // 10 gold per hour * 12 hours
    });

    it("Should calculate correct total claimable resources for houses", async function () {
      const player1Address = await player1.getAddress();
      
      // Fast forward 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");

      // Calculate total claimable resources for houses
      const totalClaimableResources = await gridBuildings.calculateTotalClaimableResources(
        player1Address,
        GridBuildingType.HOUSE
      );
      expect(totalClaimableResources).to.equal(BigInt(10 * 12)); // 10 gold per hour * 12 hours
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

    describe("Farm Management", function () {
      let farmId;

      beforeEach(async function () {
        // Ensure player has enough gold for tier upgrade
        await ensurePlayerGold(player1, 1000);

        // Donate gold to reach tier 1
        await gameState.connect(player1).donateGold(1000);

        // Verify player is now tier 1
        const playerState = await gameState.playerState(await player1.getAddress());
        expect(playerState.tier).to.equal(1);

        // Create a farm
        await gridBuildings.connect(owner).createBuilding(await player1.getAddress(), GridBuildingType.FARM);
        
        // Get the farm building ID from the nextBuildingId
        const nextId = await gridBuildings.nextBuildingId(await player1.getAddress());
        farmId = Number(nextId) - 1;
        
        // Verify the farm was created correctly
        const farm = await gridBuildings.buildings(await player1.getAddress(), farmId);
        expect(farm.active).to.be.true;
        expect(farm.buildingType).to.equal(GridBuildingType.FARM);
      });

      it("Should collect food from a farm building", async function () {
        const player1Address = await player1.getAddress();
        
        // Fast forward 1 hour
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine");

        // Get initial food balance
        const initialFood = await gameState.getPlayerFood(player1Address);

        // Collect resources
        await gridBuildings.connect(player1).collectResources(farmId);

        // Check food balance increased
        const finalFood = await gameState.getPlayerFood(player1Address);
        expect(finalFood).to.be.gt(initialFood);
      });

      it("Should cap farm food collection at 24 hours", async function () {
        const player1Address = await player1.getAddress();
        
        // Fast forward 48 hours
        await ethers.provider.send("evm_increaseTime", [48 * 3600]);
        await ethers.provider.send("evm_mine");

        // Get initial food balance
        const initialFood = await gameState.getPlayerFood(player1Address);

        // Collect resources
        await gridBuildings.connect(player1).collectResources(farmId);

        // Check food balance increased (should be capped at 24 hours worth)
        const finalFood = await gameState.getPlayerFood(player1Address);
        const expectedFood = initialFood + BigInt(5 * 24); // 5 food per hour * 24 hours
        expect(finalFood).to.equal(expectedFood);
      });

      it("Should calculate correct claimable resources for a farm", async function () {
        const player1Address = await player1.getAddress();
        
        // Fast forward 12 hours
        await ethers.provider.send("evm_increaseTime", [12 * 3600]);
        await ethers.provider.send("evm_mine");

        // Calculate claimable resources for the farm
        const claimableResources = await gridBuildings.calculateClaimableResources(player1Address, farmId);
        expect(claimableResources).to.equal(BigInt(5 * 12)); // 5 food per hour * 12 hours
      });

      it("Should calculate correct total claimable resources for farms", async function () {
        const player1Address = await player1.getAddress();
        
        // Create a second farm
        await gridBuildings.connect(owner).createBuilding(await player1.getAddress(), GridBuildingType.FARM);
        
        // Fast forward 12 hours
        await ethers.provider.send("evm_increaseTime", [12 * 3600]);
        await ethers.provider.send("evm_mine");

        // Calculate total claimable resources for farms
        const totalClaimableResources = await gridBuildings.calculateTotalClaimableResources(
          player1Address,
          GridBuildingType.FARM
        );
        expect(totalClaimableResources).to.equal(BigInt(5 * 12 * 2)); // 5 food per hour * 12 hours * 2 farms
      });

      it("Should upgrade farm production rate", async function () {
        const player1Address = await player1.getAddress();
        
        // Fast forward time to collect enough gold for upgrade
        await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");

        // Collect resources to get gold for upgrade
        await gridBuildings.connect(player1).collectResources(buildingId); // Collect from house

        // Get building config to check upgrade cost
        const config = await gridBuildings.buildingConfigs(1); // 1 is FARM type
        const upgradeCost = config.upgradeCost;

        // Verify player has enough gold
        const playerGold = await gameState.getPlayerGold(player1Address);
        expect(playerGold).to.be.gte(upgradeCost);

        // Upgrade the farm
        await gridBuildings.connect(player1).upgradeBuilding(farmId);

        // Collect resources immediately after upgrade to reset lastCollectionTime
        await gridBuildings.connect(player1).collectResources(farmId);

        // Fast forward 1 hour
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine");

        // Get initial food balance
        const initialFood = await gameState.getPlayerFood(player1Address);

        // Collect resources
        await gridBuildings.connect(player1).collectResources(farmId);

        // Check food balance increased (should be 10 food - doubled production rate)
        const finalFood = await gameState.getPlayerFood(player1Address);
        expect(finalFood).to.equal(initialFood + BigInt(10));
      });
    });
  });

  describe("Building Damage and Repair", function () {
    let houseId;
    let farmId;

    beforeEach(async function () {
      // Create a house (tier 0)
      await gridBuildings.connect(owner).createBuilding(await player1.getAddress(), GridBuildingType.HOUSE);
      houseId = 0;

      // Ensure player has enough gold for tier upgrade
      await ensurePlayerGold(player1, 1000);

      // Donate gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);

      // Verify player is now tier 1
      const playerState = await gameState.playerState(await player1.getAddress());
      expect(playerState.tier).to.equal(1);

      // Create a farm (tier 1)
      await gridBuildings.connect(owner).createBuilding(await player1.getAddress(), GridBuildingType.FARM);
      farmId = 1;

      // Verify buildings are active and have correct types
      const house = await gridBuildings.buildings(await player1.getAddress(), houseId);
      const farm = await gridBuildings.buildings(await player1.getAddress(), farmId);
      expect(house.active).to.be.true;
      expect(house.buildingType).to.equal(GridBuildingType.HOUSE);
      expect(farm.active).to.be.true;
      expect(farm.buildingType).to.equal(GridBuildingType.FARM);
    });

    it("Should damage buildings starting from highest tier", async function () {
      const player1Address = await player1.getAddress();

      // Damage 1 building (call as BattleSystem)
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Debug: Log the state of all buildings for player1
      console.log("Building states after damage call:");
      for (let i = 0; i < 2; i++) {
        const building = await gridBuildings.buildings(player1Address, i);
        console.log(`Building ID ${i}: active=${building.active}, damaged=${building.damaged}, type=${building.buildingType}`);
      }

      // Check that the farm (tier 1) was damaged first
      const farm = await gridBuildings.buildings(player1Address, farmId);
      expect(farm.damaged).to.be.true;

      // Check that the house (tier 0) was not damaged
      const house = await gridBuildings.buildings(player1Address, houseId);
      expect(house.damaged).to.be.false;
    });

    it("Should damage tier 0 buildings when no higher tier buildings are available", async function () {
      const player1Address = await player1.getAddress();

      // First damage the farm
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Then damage another building
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Check that the house (tier 0) was damaged
      const house = await gridBuildings.buildings(player1Address, houseId);
      expect(house.damaged).to.be.true;
    });

    it("Should not allow damaging already damaged buildings", async function () {
      const player1Address = await player1.getAddress();

      // First damage the farm
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Try to damage it again
      await expect(
        gridBuildings.connect(owner).damageBuildings(player1Address, 1)
      ).to.be.revertedWith("No buildings available to damage");
    });

    it("Should allow repairing damaged buildings", async function () {
      const player1Address = await player1.getAddress();

      // Damage the farm
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, 100);

      // Repair the farm
      await gridBuildings.connect(player1).repairBuilding(farmId);

      // Check that the farm is no longer damaged
      const farm = await gridBuildings.buildings(player1Address, farmId);
      expect(farm.damaged).to.be.false;
    });

    it("Should not allow repairing undamaged buildings", async function () {
      await expect(
        gridBuildings.connect(player1).repairBuilding(farmId)
      ).to.be.revertedWith("Building not damaged");
    });

    it("Should not allow repairing inactive buildings", async function () {
      const player1Address = await player1.getAddress();

      // Damage the farm
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Deactivate the farm
      await gridBuildings.connect(owner).removeBuilding(player1Address, farmId);

      // Try to repair
      await expect(
        gridBuildings.connect(player1).repairBuilding(farmId)
      ).to.be.revertedWith("Building not built");
    });

    it("Should emit BuildingDamaged event", async function () {
      const player1Address = await player1.getAddress();

      await expect(gridBuildings.connect(owner).damageBuildings(player1Address, 1))
        .to.emit(gridBuildings, "BuildingDamaged")
        .withArgs(player1Address, farmId);
    });

    it("Should emit BuildingRepaired event", async function () {
      const player1Address = await player1.getAddress();

      // Damage the farm
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, 100);

      // Repair the farm
      await expect(gridBuildings.connect(player1).repairBuilding(farmId))
        .to.emit(gridBuildings, "BuildingRepaired")
        .withArgs(player1Address, farmId);
    });

    it("Should calculate correct repair cost based on building level", async function () {
      const player1Address = await player1.getAddress();

      // Upgrade the farm to level 2
      await ensurePlayerGold(player1, 300);
      await gridBuildings.connect(player1).upgradeBuilding(farmId);

      // Damage the farm
      await gridBuildings.connect(owner).damageBuildings(player1Address, 1);

      // Get building config
      const config = await gridBuildings.buildingConfigs(GridBuildingType.FARM);
      const expectedRepairCost = config.upgradeCost * BigInt(2) / BigInt(2); // Half of upgrade cost * level

      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, expectedRepairCost);

      // Repair the farm
      await gridBuildings.connect(player1).repairBuilding(farmId);

      // Check that the farm is no longer damaged
      const farm = await gridBuildings.buildings(player1Address, farmId);
      expect(farm.damaged).to.be.false;
    });
  });
}); 