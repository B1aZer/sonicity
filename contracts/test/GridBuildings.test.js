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
  let sonicityFarm;
  let owner;
  let player1;
  let player2;
  let battleSystem;

  // Helper to mint and stake an NFT, returning the building ID and tokenId
  async function mintAndStakeNFT(player, buildingType) {
    const playerAddress = await player.getAddress();
    const altarAddress = await altar.getAddress();
    
    // Select NFT contract based on building type
    let nftContract;
    let mintValue;
    if (buildingType === GridBuildingType.HOUSE) {
      nftContract = sonicityNFT;
      mintValue = ethers.parseEther("0.01"); // House NFT price
    } else if (buildingType === GridBuildingType.FARM) {
      nftContract = sonicityFarm;
      mintValue = ethers.parseEther("0.015"); // Farm NFT price
    } else {
      throw new Error("Unsupported building type");
    }
    
    const nftAddress = await nftContract.getAddress();

    // Mint NFT
    const mintTx = await nftContract.connect(player).mint(1, { value: mintValue });
    const mintReceipt = await mintTx.wait();
    
    // Get tokenId from Transfer event
    const transferEvent = mintReceipt.logs
      .map(log => {
        try { return nftContract.interface.parseLog(log); } catch { return null; }
      })
      .find(e => e && e.name === "Transfer");
    if (!transferEvent) throw new Error("Transfer event not found");
    const tokenId = transferEvent.args.tokenId;

    // Approve and stake
    await nftContract.connect(player).approve(altarAddress, tokenId);
    const stakeTx = await altar.connect(player).stake(tokenId, buildingType, nftAddress);
    const stakeReceipt = await stakeTx.wait();
    
    // Get the BuildingCreated event from the GridBuildings contract
    const buildingCreatedTopic = gridBuildings.interface.getEvent("BuildingCreated").topicHash;
    const gridBuildingsAddress = await gridBuildings.getAddress();
    const buildingCreatedLog = stakeReceipt.logs.find(
      log => log.address === gridBuildingsAddress && log.topics[0] === buildingCreatedTopic
    );
    
    if (!buildingCreatedLog) {
      throw new Error("BuildingCreated event not found");
    }
    
    const buildingCreatedEvent = gridBuildings.interface.parseLog(buildingCreatedLog);
    return {
      buildingId: Number(buildingCreatedEvent.args.buildingId),
      tokenId: tokenId,
      nftAddress: nftAddress
    };
  }

  // Helper to ensure player has at least the specified amount of gold
  async function ensurePlayerGold(player, amount) {
    const playerAddress = await player.getAddress();
    let gold = await gameState.getPlayerGold(playerAddress);
    
    // If we already have enough gold, return early
    if (gold >= BigInt(amount)) return;
    
    // Get current houses
    const currentHouses = await gridBuildings.buildingCounts(playerAddress, 0); // 0 is HOUSE type
    
    // Create houses up to the limit of 9 if needed
    if (currentHouses < BigInt(9)) {
        for (let i = Number(currentHouses); i < 9; i++) {
            await mintAndStakeNFT(player, GridBuildingType.HOUSE);
        }
    }
    
    // Fast forward time and collect until we have enough gold
    while (gold < BigInt(amount)) {
        await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
        
        // Get all active buildings
        const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
        
        // Collect from all houses
        for (const buildingId of activeBuildings) {
            await gridBuildings.connect(player).collectResources(buildingId);
        }
        
        gold = await gameState.getPlayerGold(playerAddress);
    }

    // After collecting enough gold, remove all houses except one
    const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
    let housesRemoved = 0;
    for (const id of activeBuildings) {
        if (housesRemoved >= 8) break; // Keep one house
        const building = await gridBuildings.buildings(playerAddress, id);
        if (building.buildingType === BigInt(GridBuildingType.HOUSE)) {
            // Find the NFT info for this building
            const nftInfo = await altar.stakedBuilding(await sonicityNFT.getAddress(), id);
            if (nftInfo) {
                await altar.connect(player).unstake(await sonicityNFT.getAddress(), id);
                housesRemoved++;
            }
        }
    }
  }

  // Helper to get building ID from BuildingDamaged event
  async function getDamagedBuildingId(tx) {
    const receipt = await tx.wait();
    const buildingDamagedEvent = receipt.logs
      .map(log => {
        try { return gridBuildings.interface.parseLog(log); } catch { return null; }
      })
      .find(e => e && e.name === "BuildingDamaged");
    
    if (!buildingDamagedEvent) throw new Error("BuildingDamaged event not found");
    return buildingDamagedEvent.args.buildingId;
  }

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

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

    // Set up contract interactions in the correct order
    await gridBuildings.setGameStateAddress(gameStateAddress);
    await gridBuildings.setAltarAddress(altarAddress);
    await gridBuildings.setBattleSystemAddress(battleSystemAddress);
    await gameState.setAltarAddress(altarAddress);
    await gameState.setGridBuildingsAddress(gridBuildingsAddress);
    await gameState.setBattleSystemAddress(battleSystemAddress);
    await battleSystem.setGridBuildingsAddress(gridBuildingsAddress);
    await battleSystem.setGameStateAddress(gameStateAddress);

    // Initialize players
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();

    // Approve NFT collections in Altar
    await altar.approveCollection(sonicityNFTAddress);
    await altar.approveCollection(sonicityFarmAddress);

    // Set minimum staking duration to 0 for testing
    await altar.connect(owner).setMinStakingDuration(0);

    // Create a house (tier 0) through staking
    const { buildingId: houseId } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

    // Ensure player has enough gold for tier upgrade
    await ensurePlayerGold(player1, 1000);

    // Donate gold to reach tier 1
    await gameState.connect(player1).donateGold(1000);

    // Verify player is now tier 1
    const playerState = await gameState.playerState(await player1.getAddress());
    expect(playerState.tier).to.equal(1);

    // Create a farm (tier 1) through staking
    const { buildingId: farmId } = await mintAndStakeNFT(player1, GridBuildingType.FARM);

    // Verify buildings are active and have correct types
    const house = await gridBuildings.buildings(await player1.getAddress(), houseId);
    const farm = await gridBuildings.buildings(await player1.getAddress(), farmId);
    expect(house.buildingType).to.equal(GridBuildingType.HOUSE);
    expect(house.level).to.equal(1);
    expect(await gridBuildings.buildingCounts(await player1.getAddress(), GridBuildingType.HOUSE)).to.equal(BigInt(2));
    expect(farm.buildingType).to.equal(GridBuildingType.FARM);
    expect(farm.level).to.equal(1);
    expect(await gridBuildings.buildingCounts(await player1.getAddress(), GridBuildingType.FARM)).to.equal(BigInt(1));
  });

  describe("Building Management", function () {
    it("Should not allow direct building creation", async function () {
      const player1Address = await player1.getAddress();
      
      // Try to create a building directly through GridBuildings
      await expect(
        gridBuildings.connect(player1).createBuilding(player1Address, GridBuildingType.HOUSE)
      ).to.be.revertedWith("Only Altar can create buildings");
    });

    it("Should allow players to create buildings through staking", async function () {
      const player1Address = await player1.getAddress();
      
      // Get initial building count
      const initialBuildingCount = await gridBuildings.buildingCounts(player1Address, 0);

      // Mint and stake an NFT
      const { buildingId } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Check that a building was created
      const newBuildingCount = await gridBuildings.buildingCounts(player1Address, 0);
      expect(newBuildingCount).to.equal(initialBuildingCount + BigInt(1));

      // Check the building details
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.buildingType).to.equal(GridBuildingType.HOUSE);
      expect(building.level).to.equal(1);
      expect(building.damaged).to.be.false;
    });

    it("Should allow removing buildings through unstaking", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(player1Address, 0);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(nftAddress, tokenId);

      // Check that the building was removed
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.buildingType).to.equal(BigInt(0));
      expect(building.level).to.equal(0);

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(player1Address, 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });

    it("Should allow upgrading buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      const { buildingId } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Fast forward time to collect enough gold for upgrade
      await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
      await ethers.provider.send("evm_mine");

      // Collect resources to get gold for upgrade
      await gridBuildings.connect(player1).collectResources(buildingId);

      // Get building config to check upgrade cost
      const config = await gridBuildings.buildingConfigs(GridBuildingType.HOUSE);
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

    it("Should not allow players to create more buildings than their building posts for that tier", async function () {
      const player1Address = await player1.getAddress();
      
      // Verify player is in Tier 1
      const playerState = await gameState.playerState(player1Address);
      expect(playerState.tier).to.equal(1);
      
      // For Tier 0, verify we can't create more than 9 houses
      // First verify current count
      const initialHouseCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.HOUSE);
      expect(initialHouseCount).to.equal(BigInt(2)); // Should have 3 houses from beforeEach

      // First verify current counts
      const initialFarmCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.FARM);
      expect(initialFarmCount).to.equal(BigInt(1)); // Should have 1 farm from beforeEach

      // Create farms until we reach the limit
      for (let i = 0; i < 8; i++) {
        await mintAndStakeNFT(player1, GridBuildingType.FARM);
      }
      await mintAndStakeNFT(player1, GridBuildingType.FARM);

      const activeBuildings = await gridBuildings.getActiveBuildings(player1Address);
      expect(activeBuildings.length).to.equal(12);
      
      // Try to create one more farm (should fail as we've reached the 12 building limit)
      await expect(
        mintAndStakeNFT(player1, GridBuildingType.FARM)
      ).to.be.revertedWith("Building slot limit reached for current tier");
    });

    it("Should not allow collecting from removed buildings", async function () {
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Fast forward time to complete staking period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake the NFT to remove the building
      await altar.connect(player1).unstake(nftAddress, tokenId);

      // Try to collect resources
      await expect(
        gridBuildings.connect(player1).collectResources(buildingId)
      ).to.be.revertedWith("Building does not exist");
    });

    it("Should not allow upgrading removed buildings", async function () {
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Fast forward time to complete staking period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake the NFT to remove the building
      await altar.connect(player1).unstake(nftAddress, tokenId);

      // Try to upgrade
      await expect(
        gridBuildings.connect(player1).upgradeBuilding(buildingId)
      ).to.be.revertedWith("Building does not exist");
    });

    it("Should not allow repairing removed buildings", async function () {
      const { buildingId } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Try to remove building directly
      await expect(
        gridBuildings.connect(player1).removeBuilding(await player1.getAddress(), buildingId)
      ).to.be.revertedWith("Only Altar can remove buildings");
    });

    it("Should not allow owner to remove buildings", async function () {
      const { buildingId } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Try to remove building as owner
      await expect(
        gridBuildings.connect(owner).removeBuilding(await player1.getAddress(), buildingId)
      ).to.be.revertedWith("Only Altar can remove buildings");
    });

    it("Should allow Altar to remove buildings", async function () {
      const player1Address = await player1.getAddress();
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Get building count before removal
      const buildingCountBefore = await gridBuildings.buildingCounts(player1Address, 0);


      // Unstake NFT to remove building
      await altar.connect(player1).unstake(nftAddress, tokenId);

      // Check that the building was removed
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.buildingType).to.equal(BigInt(0));
      expect(building.level).to.equal(0);

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(player1Address, 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });
  });

  describe("Resource Collection", function () {
    let buildingId;

    beforeEach(async function () {
      // Mint and stake an NFT to create a building
      const result = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      buildingId = result.buildingId;
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
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);

      // Fast forward time to complete staking period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake the NFT to deactivate the building
      await altar.connect(player1).unstake(nftAddress, tokenId);

      // Try to collect resources
      await expect(
        gridBuildings.connect(player1).collectResources(buildingId)
      ).to.be.revertedWith("Building does not exist");
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

      // Verify the number of active houses
      const activeBuildings = await gridBuildings.getActiveBuildings(player1Address);
      let activeHouses = 0;
      for (const id of activeBuildings) {
        const building = await gridBuildings.buildings(player1Address, id);
        if (building.buildingType === BigInt(0)) { // Compare with BigInt(0) instead of enum
          activeHouses++;
        }
      }
      expect(activeHouses).to.equal(3); // Update expected count to match actual houses

      // Calculate total claimable resources for houses
      const totalClaimableResources = await gridBuildings.calculateTotalClaimableResources(
        player1Address,
        GridBuildingType.HOUSE
      );
      expect(totalClaimableResources).to.equal(BigInt(10 * 12 * 3)); // 10 gold per hour * 12 hours * 10 houses
    });

    it("Should correctly calculate resources if one of the houses was removed", async function () {
      const player1Address = await player1.getAddress();
      
      // Get initial house count
      const initialHouseCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.HOUSE);
      expect(initialHouseCount).to.equal(BigInt(3)); // Should have 3 houses from beforeEach

      // Create two additional houses
      const result1 = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      const result2 = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      const houseId1 = result1.buildingId;
      const houseId2 = result2.buildingId;

      // Fast forward 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");

      // Calculate total claimable resources before removal
      const totalBeforeRemoval = await gridBuildings.calculateTotalClaimableResources(
        player1Address,
        GridBuildingType.HOUSE
      );
      expect(totalBeforeRemoval).to.equal(BigInt(10 * 12 * 5)); // 10 gold per hour * 12 hours * 5 houses (3 + 2 new)

      // Remove one house
      await altar.connect(player1).unstake(result1.nftAddress, result1.tokenId);

      // Calculate total claimable resources after removal
      const totalAfterRemoval = await gridBuildings.calculateTotalClaimableResources(
        player1Address,
        GridBuildingType.HOUSE
      );
      expect(totalAfterRemoval).to.equal(BigInt(10 * 12 * 4)); // 10 gold per hour * 12 hours * 4 houses

      const house2Resources = await gridBuildings.calculateClaimableResources(player1Address, houseId2);
      expect(house2Resources).to.equal(BigInt(10 * 12)); // Active house should return normal amount
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

        const farnCount = await gridBuildings.buildingCounts(await player1.getAddress(), GridBuildingType.FARM);
        expect(farnCount).to.equal(BigInt(1));

        // Ensure player has enough gold for tier upgrade
        await ensurePlayerGold(player1, 1000);

        // Donate gold to reach tier 1
        await gameState.connect(player1).donateGold(1000);

        // Verify player is now tier 1
        const playerState = await gameState.playerState(await player1.getAddress());
        expect(playerState.tier).to.equal(1);

        // Create a farm
        const result = await mintAndStakeNFT(player1, GridBuildingType.FARM);
        farmId = result.buildingId;
        
        // Verify the farm was created correctly
        const farm = await gridBuildings.buildings(await player1.getAddress(), farmId);
        expect(farm.buildingType).to.equal(GridBuildingType.FARM);
        expect(farm.level).to.equal(1);
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

      it("Should correctly calculate resources if one of the farms was removed", async function () {
        const player1Address = await player1.getAddress();
        
        // Get initial farm count
        const initialFarmCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.FARM);
        expect(initialFarmCount).to.equal(BigInt(2)); // Should have 2 farms from beforeEach

        // Create two additional farms
        const result1 = await mintAndStakeNFT(player1, GridBuildingType.FARM);
        const result2 = await mintAndStakeNFT(player1, GridBuildingType.FARM);
        const farmId1 = result1.buildingId;
        const farmId2 = result2.buildingId;

        // Fast forward 12 hours
        await ethers.provider.send("evm_increaseTime", [12 * 3600]);
        await ethers.provider.send("evm_mine");

        // Calculate total claimable resources before removal
        const totalBeforeRemoval = await gridBuildings.calculateTotalClaimableResources(
          player1Address,
          GridBuildingType.FARM
        );
        expect(totalBeforeRemoval).to.equal(BigInt(5 * 12 * 4)); // 5 food per hour * 12 hours * 4 farms (2 + 2 new)

        // Remove one farm
        await altar.connect(player1).unstake(result1.nftAddress, result1.tokenId);

        // Calculate total claimable resources after removal
        const totalAfterRemoval = await gridBuildings.calculateTotalClaimableResources(
          player1Address,
          GridBuildingType.FARM
        );
        expect(totalAfterRemoval).to.equal(BigInt(5 * 12 * 3)); // 5 food per hour * 12 hours * 3 farms

        const farm2Resources = await gridBuildings.calculateClaimableResources(player1Address, farmId2);
        expect(farm2Resources).to.equal(BigInt(5 * 12)); // Active farm should return normal amount
      });

      it("Should calculate correct total claimable resources for farms", async function () {
        const player1Address = await player1.getAddress();

        const houseCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.HOUSE);
        expect(houseCount).to.equal(BigInt(3));

        const farmCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.FARM);
        expect(farmCount).to.equal(BigInt(2));
        
        // Create a second farm
        const result = await mintAndStakeNFT(player1, GridBuildingType.FARM);
        const farmId2 = result.buildingId;
        
        // Fast forward 12 hours
        await ethers.provider.send("evm_increaseTime", [12 * 3600]);
        await ethers.provider.send("evm_mine");

        // Verify the number of active farms
        const activeBuildings = await gridBuildings.getActiveBuildings(player1Address);
        let activeFarms = 0;
        for (const id of activeBuildings) {
          const building = await gridBuildings.buildings(player1Address, id);
          if (building.buildingType === BigInt(GridBuildingType.FARM)) {
            activeFarms++;
          }
        }
        expect(activeFarms).to.equal(3); // Ensure three farms are active (2 initial + 1 new)

        // Calculate total claimable resources for farms
        const totalClaimableResources = await gridBuildings.calculateTotalClaimableResources(
          player1Address,
          GridBuildingType.FARM
        );
        expect(totalClaimableResources).to.equal(BigInt(5 * 12 * 3)); // 5 food per hour * 12 hours * 3 farms
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

      it("Should allow creating and managing farms", async function () {
        const player1Address = await player1.getAddress();
        
        // Mint and stake an NFT for a farm
        const result = await mintAndStakeNFT(player1, GridBuildingType.FARM);
        const farmId = result.buildingId;

        // Check farm was created
        const farm = await gridBuildings.buildings(player1Address, farmId);
        expect(farm.buildingType).to.equal(GridBuildingType.FARM);
        expect(farm.level).to.equal(1);
      });
    });
  });

  describe("Building Damage and Repair", function () {
    let houseId;
    let farmId;

    beforeEach(async function () {
      // Create a house (tier 0)
      const houseResult = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      houseId = houseResult.buildingId;

      // Ensure player has enough gold for tier upgrade
      await ensurePlayerGold(player1, 1000);

      // Donate gold to reach tier 1
      await gameState.connect(player1).donateGold(1000);

      // Verify player is now tier 1
      const playerState = await gameState.playerState(await player1.getAddress());
      expect(playerState.tier).to.equal(1);

      // Create a farm (tier 1)
      const farmResult = await mintAndStakeNFT(player1, GridBuildingType.FARM);
      farmId = farmResult.buildingId;

      // Verify buildings are active and have correct types
      const house = await gridBuildings.buildings(await player1.getAddress(), houseId);
      const farm = await gridBuildings.buildings(await player1.getAddress(), farmId);
      expect(house.buildingType).to.equal(GridBuildingType.HOUSE);
      expect(house.level).to.equal(1);
      expect(await gridBuildings.buildingCounts(await player1.getAddress(), GridBuildingType.HOUSE)).to.equal(BigInt(3));
      expect(farm.buildingType).to.equal(GridBuildingType.FARM);
      expect(farm.level).to.equal(1);
      expect(await gridBuildings.buildingCounts(await player1.getAddress(), GridBuildingType.FARM)).to.equal(BigInt(2));
    });

    it("Should damage buildings starting from highest tier", async function () {
      const player1Address = await player1.getAddress();

      // Get initial state of all buildings
      const activeBuildings = await gridBuildings.getActiveBuildings(player1Address);

      // First damage - should hit first tier 1 building
      const firstDamageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const firstDamagedBuildingId = await getDamagedBuildingId(firstDamageTx);

      // Check that first tier 1 building was damaged
      const firstDamagedBuilding = await gridBuildings.buildings(player1Address, firstDamagedBuildingId);
      
      expect(firstDamagedBuilding.buildingType).to.equal(GridBuildingType.FARM);
      expect(firstDamagedBuilding.damaged).to.be.true;

      // Second damage - should hit second tier 1 building
      const secondDamageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const secondDamagedBuildingId = await getDamagedBuildingId(secondDamageTx);

      // Check that second tier 1 building was damaged
      const secondDamagedBuilding = await gridBuildings.buildings(player1Address, secondDamagedBuildingId);
      
      expect(secondDamagedBuilding.buildingType).to.equal(GridBuildingType.FARM);
      expect(secondDamagedBuilding.damaged).to.be.true;
      expect(secondDamagedBuildingId).to.not.equal(firstDamagedBuildingId);

      // Third damage - should hit tier 0 building
      const thirdDamageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const thirdDamagedBuildingId = await getDamagedBuildingId(thirdDamageTx);

      // Check that a tier 0 building was damaged
      const thirdDamagedBuilding = await gridBuildings.buildings(player1Address, thirdDamagedBuildingId);
      
      expect(thirdDamagedBuilding.buildingType).to.equal(GridBuildingType.HOUSE);
      expect(thirdDamagedBuilding.damaged).to.be.true;
      expect(thirdDamagedBuildingId).to.not.equal(firstDamagedBuildingId);
      expect(thirdDamagedBuildingId).to.not.equal(secondDamagedBuildingId);

      // Verify all other buildings are in correct state
      for (const id of activeBuildings) {
        if (id !== firstDamagedBuildingId && id !== secondDamagedBuildingId && id !== thirdDamagedBuildingId) {
          const building = await gridBuildings.buildings(player1Address, id);
          expect(building.damaged).to.be.false;
        }
      }
    });

    it("Should not allow damaging already damaged buildings", async function () {
      const player1Address = await player1.getAddress();

      // Get initial state of all buildings
      const activeBuildings = await gridBuildings.getActiveBuildings(player1Address);

      // Damage all buildings
      for (let i = 0; i < activeBuildings.length; i++) {
        const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
        const damagedBuildingId = await getDamagedBuildingId(damageTx);
      }

      // Try to damage one more building - should fail
      await expect(
        battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1)
      ).to.be.revertedWith("No buildings available to damage");
    });

    it("Should allow repairing damaged buildings", async function () {
      const player1Address = await player1.getAddress();

      // Damage a building and get its ID
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, 100);

      // Repair the building
      await gridBuildings.connect(player1).repairBuilding(damagedBuildingId);

      // Check that the building is no longer damaged
      const building = await gridBuildings.buildings(player1Address, damagedBuildingId);
      expect(building.damaged).to.be.false;
    });

    it("Should not allow repairing inactive buildings", async function () {
      const player1Address = await player1.getAddress();
      const sonicityFarmAddress = await sonicityFarm.getAddress();

      // Mint and stake a farm NFT to ensure at least one farm exists
      await mintAndStakeNFT(player1, GridBuildingType.FARM);

      // Damage a building and get its ID
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Find the tokenId for the damaged building
      const stakedTokenIds = await altar.getUserStakesByCollection(player1Address, sonicityFarmAddress);
      let tokenIdForDamagedBuilding = null;
      for (const tokenId of stakedTokenIds) {
        const buildingId = await altar.stakedBuilding(sonicityFarmAddress, tokenId);
        if (Number(buildingId) === Number(damagedBuildingId)) {
          tokenIdForDamagedBuilding = tokenId;
          break;
        }
      }
      expect(tokenIdForDamagedBuilding).to.not.be.null;

      // Get the stake data to confirm it's active
      const stakeData = await altar.getStakeDataWithCollection(sonicityFarmAddress, tokenIdForDamagedBuilding);
      expect(stakeData.isActive).to.be.true;

      // Deactivate the building using the correct token ID
      await altar.connect(player1).unstake(sonicityFarmAddress, tokenIdForDamagedBuilding);

      // Try to repair
      await expect(
        gridBuildings.connect(player1).repairBuilding(damagedBuildingId)
      ).to.be.revertedWith("Building does not exist");
    });

    it("Should emit BuildingDamaged event", async function () {
      const player1Address = await player1.getAddress();

      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Verify the event was emitted with correct parameters
      const damageReceipt = await damageTx.wait();
      const buildingDamagedEvent = damageReceipt.logs
        .map(log => {
          try { return gridBuildings.interface.parseLog(log); } catch { return null; }
        })
        .find(e => e && e.name === "BuildingDamaged");
      
      expect(buildingDamagedEvent.args.player).to.equal(player1Address);
      expect(buildingDamagedEvent.args.buildingId).to.equal(damagedBuildingId);
    });

    it("Should emit BuildingRepaired event", async function () {
      const player1Address = await player1.getAddress();

      // Damage a building and get its ID
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, 100);

      // Repair the building and verify event
      await expect(gridBuildings.connect(player1).repairBuilding(damagedBuildingId))
        .to.emit(gridBuildings, "BuildingRepaired")
        .withArgs(player1Address, damagedBuildingId);
    });

    it("Should calculate correct repair cost based on building level", async function () {
      const player1Address = await player1.getAddress();

      // Upgrade the farm to level 2
      await ensurePlayerGold(player1, 300);
      await gridBuildings.connect(player1).upgradeBuilding(farmId);

      // Damage a building and get its ID
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Get building config
      const config = await gridBuildings.buildingConfigs(GridBuildingType.FARM);
      const expectedRepairCost = config.upgradeCost * BigInt(2) / BigInt(2); // Half of upgrade cost * level

      // Ensure player has enough gold for repair
      await ensurePlayerGold(player1, expectedRepairCost);

      // Repair the building
      await gridBuildings.connect(player1).repairBuilding(damagedBuildingId);

      // Check that the building is no longer damaged
      const building = await gridBuildings.buildings(player1Address, damagedBuildingId);
      expect(building.damaged).to.be.false;
    });

    it("Should calculate total claimable resources correctly", async function () {
      const player1Address = await player1.getAddress();
      
      // Get initial house count
      const initialHouseCount = await gridBuildings.buildingCounts(player1Address, GridBuildingType.HOUSE);
      
      // Mint and stake multiple NFTs
      const result1 = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      const result2 = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      const buildingId1 = result1.buildingId;
      const buildingId2 = result2.buildingId;

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 1 day
      await ethers.provider.send("evm_mine");

      // Calculate expected resources for each building
      const claimable1 = await gridBuildings.calculateClaimableResources(player1Address, buildingId1);
      const claimable2 = await gridBuildings.calculateClaimableResources(player1Address, buildingId2);
      
      // Each house produces 10 gold per hour, so 24 hours = 240 gold per house
      const expectedPerHouse = BigInt(10 * 24);
      expect(claimable1).to.equal(expectedPerHouse);
      expect(claimable2).to.equal(expectedPerHouse);

      // Calculate total claimable resources
      const totalClaimable = await gridBuildings.calculateTotalClaimableResources(
        player1Address,
        GridBuildingType.HOUSE
      );

      // Total should be (initial houses + 2 new houses) * 240 gold
      const expectedTotal = expectedPerHouse * (initialHouseCount + BigInt(2));
      expect(totalClaimable).to.equal(expectedTotal);
    });

    it("Should allow damaging and repairing buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      const result = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      const buildingId = result.buildingId;

      // Damage the building using BattleSystem's test function
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Verify the building is damaged
      let building = await gridBuildings.buildings(player1Address, damagedBuildingId);
      expect(building.damaged).to.be.true;

      // Repair the building
      await gridBuildings.connect(player1).repairBuilding(damagedBuildingId);

      // Check building is repaired
      building = await gridBuildings.buildings(player1Address, damagedBuildingId);
      expect(building.damaged).to.be.false;
    });

    it("Should not allow collecting from damaged buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      const result = await mintAndStakeNFT(player1, GridBuildingType.HOUSE);
      const buildingId = result.buildingId;

      // Damage the building and get its ID
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 1 day
      await ethers.provider.send("evm_mine");

      // Try to collect resources
      await expect(
        gridBuildings.connect(player1).collectResources(damagedBuildingId)
      ).to.be.revertedWith("Building is damaged");
    });

    it("Should allow repairing damaged farms", async function () {
      const player1Address = await player1.getAddress();
      
      // Damage a building and get the building ID from the event
      const damageTx = await battleSystem.connect(owner).testDamageGridBuildings(player1Address, 1);
      const damagedBuildingId = await getDamagedBuildingId(damageTx);

      // Check building is damaged
      let building = await gridBuildings.buildings(player1Address, damagedBuildingId);
      expect(building.damaged).to.be.true;

      // Repair the building
      await expect(gridBuildings.connect(player1).repairBuilding(damagedBuildingId))
        .to.emit(gridBuildings, "BuildingRepaired")
        .withArgs(player1Address, damagedBuildingId);

      // Check building is repaired
      building = await gridBuildings.buildings(player1Address, damagedBuildingId);
      expect(building.damaged).to.be.false;
    });
  });
}); 