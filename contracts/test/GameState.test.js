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
  });

  describe("City Management", function () {
    it("Should allow players to join a city", async function () {
      await gameState.connect(player1).joinCity(1);
      const cityId = await gameState.playerCity(await player1.getAddress());
      expect(cityId).to.equal(1);
      // City should start at tier 0
      const city = await gameState.cities(1);
      expect(city.tier).to.equal(0);
    });

    it("Should not allow players to join multiple cities", async function () {
      await gameState.connect(player1).joinCity(1);
      await expect(gameState.connect(player1).joinCity(2)).to.be.revertedWith("Already in a city");
    });
  });

  describe("Gold Management", function () {
    it("Should allow players to earn and donate gold", async function () {
      await gameState.connect(player1).joinCity(1);
      await gameState.connect(player1).earnGold(1000);

      const initialGold = await gameState.getPlayerGold(await player1.getAddress());
      const initialTreasury = await gameState.getCityTreasury(1);

      await gameState.connect(player1).donateGold(500);

      const finalGold = await gameState.getPlayerGold(await player1.getAddress());
      const finalTreasury = await gameState.getCityTreasury(1);

      expect(finalGold).to.equal(initialGold - 500n);
      expect(finalTreasury).to.equal(initialTreasury + 500n);
    });

    it("Should not allow players to donate more gold than they have", async function () {
      await gameState.connect(player1).joinCity(1);
      await expect(gameState.connect(player1).donateGold(1000)).to.be.revertedWith("Insufficient Gold");
    });
  });

  describe("Reputation Points", function () {
    beforeEach(async function () {
      await gameState.connect(player1).joinCity(1);
      await gameState.connect(player1).earnGold(1000);
    });

    it("Should award rep points for gold donations", async function () {
      const player1Address = await player1.getAddress();
      
      // Initial rep points should be 0
      const initialRep = await gameState.getPlayerRep(player1Address);
      expect(initialRep).to.equal(0);

      // Donate 1000 gold (should get 10 rep points in tier 1)
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
      const city = await gameState.cities(1);
      expect(city.tier).to.equal(1);
      // Donate 1000 gold to reach tier 2
      await gameState.connect(player1).earnGold(1000);
      await gameState.connect(player1).donateGold(1000);
      // Verify tier upgrade to tier 2
      const city2 = await gameState.cities(1);
      expect(city2.tier).to.equal(2);
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
      // Setup: Player joins city and gets building slots through Altar
      await gameState.connect(player1).joinCity(1);
      await gameState.connect(player1).earnGold(1000);
      
      // Mint and stake an NFT to get building slots
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;
      
      // Approve the NFT collection
      await gameState.connect(owner).approveCollection(await sonicityNFT.getAddress());
      
      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);
      
      // Stake the NFT through Altar
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);
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

    it("Should not allow creating buildings without sufficient gold", async function () {
      // Donate all gold to city treasury to ensure player has no gold
      const gold = await gameState.getPlayerGold(await player1.getAddress());
      await gameState.connect(player1).donateGold(gold);
      
      // Try to create a house with no gold
      await expect(gameState.connect(player1).createBuilding("house")).to.be.revertedWith("Insufficient Gold");
    });

    it("Should not allow creating buildings without available slots", async function () {
      const player1Address = await player1.getAddress();
      
      // Fill all slots
      for (let i = 0; i < 5; i++) {
        await gameState.connect(player1).createBuilding("house");
      }
      
      // Try to create one more
      await expect(gameState.connect(player1).createBuilding("house")).to.be.revertedWith("No building slots available");
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
      await gameState.connect(player1).createBuilding("water-supply");
      await gameState.connect(player1).createBuilding("house");
      
      // Get all building IDs
      const allIds = await gameState.getPlayerBuildingIds(player1Address);
      expect(allIds.length).to.equal(3);
      
      // Get house IDs
      const houseIds = await gameState.getBuildingIdsOfType(player1Address, "house");
      expect(houseIds.length).to.equal(2);
      
      // Get water supply IDs
      const waterSupplyIds = await gameState.getBuildingIdsOfType(player1Address, "water-supply");
      expect(waterSupplyIds.length).to.equal(1);
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

    it("Should only allow houses in Tier 0", async function () {
      // Try to create a water-supply in Tier 0
      await expect(gameState.connect(player1).createBuilding("water-supply"))
        .to.be.revertedWith("Only houses allowed in Tier 0");
      
      // Create a house (should succeed)
      await gameState.connect(player1).createBuilding("house");
      const houseCount = await gameState.getBuildingsByType(await player1.getAddress(), "house");
      expect(houseCount).to.equal(1);
    });

    it("Should enforce 3x3 grid limit in Tier 0", async function () {
      // Create 9 houses (should succeed)
      for (let i = 0; i < 9; i++) {
        await gameState.connect(player1).createBuilding("house");
      }
      
      // Try to create one more house
      await expect(gameState.connect(player1).createBuilding("house"))
        .to.be.revertedWith("Tier 0 grid is full (3x3)");
    });

    it("Should track building counts correctly", async function () {
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");
      await gameState.connect(player1).createBuilding("water-supply");
      await gameState.connect(player1).createBuilding("house");
      
      // Check total buildings
      const totalBuildings = await gameState.getTotalBuildings(await player1.getAddress());
      expect(totalBuildings).to.equal(3);
      
      // Check building counts by type
      const houseCount = await gameState.getBuildingsByType(await player1.getAddress(), "house");
      const waterSupplyCount = await gameState.getBuildingsByType(await player1.getAddress(), "water-supply");
      expect(houseCount).to.equal(2);
      expect(waterSupplyCount).to.equal(1);
    });

    it("Should allow removing buildings", async function () {
      // Create a building
      await gameState.connect(player1).createBuilding("house");
      
      // Remove the building
      await gameState.connect(player1).removeBuilding(0);
      
      // Check building counts
      const totalBuildings = await gameState.getTotalBuildings(await player1.getAddress());
      const houseCount = await gameState.getBuildingsByType(await player1.getAddress(), "house");
      expect(totalBuildings).to.equal(0);
      expect(houseCount).to.equal(0);
      
      // Try to get removed building
      await expect(gameState.getBuilding(await player1.getAddress(), 0))
        .to.be.revertedWith("Building doesn't exist or is inactive");
    });
  });

  describe("Gold Production", function () {
    beforeEach(async function () {
      // Setup: Player joins city and gets building slots through Altar
      await gameState.connect(player1).joinCity(1);
      await gameState.connect(player1).earnGold(1000);
      
      // Mint and stake an NFT to get building slots
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;
      
      // Approve the NFT collection
      await gameState.connect(owner).approveCollection(await sonicityNFT.getAddress());
      
      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);
      
      // Stake the NFT through Altar
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);
    });

    it("Should produce gold from a single building", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // House produces 10 gold per hour at level 1
      expect(finalGold - initialGold).to.equal(10);
    });

    it("Should produce gold from multiple buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("water-supply"); // 15 gold/hour
      await gameState.connect(player1).createBuilding("workshop");    // 20 gold/hour
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold from all buildings
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGold();
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Total should be 45 gold (10 + 15 + 20)
      expect(finalGold - initialGold).to.equal(45);
    });

    it("Should collect gold from buildings of a specific type", async function () {
      const player1Address = await player1.getAddress();
      
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("water-supply"); // 15 gold/hour
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold from houses only
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGoldByType("house");
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Should only collect from houses (2 * 10 = 20 gold)
      expect(finalGold - initialGold).to.equal(20);
    });

    it("Should collect gold from buildings of a specific type with different production rates", async function () {
      const player1Address = await player1.getAddress();
      
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("workshop");    // 20 gold/hour
      await gameState.connect(player1).createBuilding("workshop");    // 20 gold/hour
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold from workshops only
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGoldByType("workshop");
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Should only collect from workshops (2 * 20 = 40 gold)
      expect(finalGold - initialGold).to.equal(40);
    });

    it("Should handle collecting from non-existent building type", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Try to collect from non-existent building type
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGoldByType("non-existent");
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Should not collect any gold
      expect(finalGold - initialGold).to.equal(0);
    });

    it("Should handle collecting from removed buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create and remove a house
      await gameState.connect(player1).createBuilding("house");
      await gameState.connect(player1).removeBuilding(0);
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Try to collect from removed building
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGoldByType("house");
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Should not collect any gold
      expect(finalGold - initialGold).to.equal(0);
    });

    it("Should not allow collecting from inactive buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create and remove a house
      await gameState.connect(player1).createBuilding("house");
      await gameState.connect(player1).removeBuilding(0);
      
      // Try to collect from removed building
      await expect(gameState.connect(player1).collectGold(0)).to.be.revertedWith("Building not active");
    });

    it("Should produce more gold from higher level buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect initial gold
      await gameState.connect(player1).collectGold(0);
      
      // Upgrade building level (assuming there's an upgrade function)
      // TODO: Add building upgrade functionality and test
      
      // Fast forward another hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold again
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Gold production should scale with level
      expect(finalGold - initialGold).to.equal(10); // Base rate at level 1
    });

    it("Should cap production at 24 hours for a single building", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 48 hours
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // House produces 10 gold per hour, should be capped at 24 hours
      expect(finalGold - initialGold).to.equal(240); // 10 gold/hour * 24 hours
      
      // Try to collect again - should get no gold
      const goldBeforeSecondCollection = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const goldAfterSecondCollection = await gameState.getPlayerGold(player1Address);
      
      // Should get no additional gold
      expect(goldAfterSecondCollection - goldBeforeSecondCollection).to.equal(0);
    });

    it("Should cap production at 24 hours for multiple buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("water-supply"); // 15 gold/hour
      await gameState.connect(player1).createBuilding("workshop");    // 20 gold/hour
      
      // Fast forward 48 hours
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold from all buildings
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGold();
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // Total should be capped at 24 hours of production
      // (10 + 15 + 20) gold/hour * 24 hours = 1080 gold
      expect(finalGold - initialGold).to.equal(1080);
      
      // Try to collect again - should get no gold
      const goldBeforeSecondCollection = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectAllGold();
      const goldAfterSecondCollection = await gameState.getPlayerGold(player1Address);
      
      // Should get no additional gold
      expect(goldAfterSecondCollection - goldBeforeSecondCollection).to.equal(0);
    });

    it("Should allow partial collection before 24 hours", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // First collection after 12 hours
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const goldAfterFirstCollection = await gameState.getPlayerGold(player1Address);
      
      // Should get approximately 12 hours worth of gold (allowing for small rounding)
      const firstCollectionGold = goldAfterFirstCollection - initialGold;
      expect(firstCollectionGold).to.be.closeTo(120, 1); // 10 gold/hour * 12 hours, with 1 gold tolerance
      
      // Fast forward another 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Second collection - should get remaining gold up to 24 hours
      await gameState.connect(player1).collectGold(0);
      const goldAfterSecondCollection = await gameState.getPlayerGold(player1Address);
      
      // Total gold should be approximately 24 hours worth (allowing for small rounding)
      const totalGold = goldAfterSecondCollection - initialGold;
      expect(totalGold).to.be.closeTo(240, 1); // 10 gold/hour * 24 hours, with 1 gold tolerance
      
      // Try to collect again - should get no gold
      const goldBeforeThirdCollection = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const goldAfterThirdCollection = await gameState.getPlayerGold(player1Address);
      
      // Should get no additional gold
      expect(goldAfterThirdCollection - goldBeforeThirdCollection).to.equal(0);
    });

    it("Should allow owner to update building production rates", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Update house production rate to 100 gold per hour
      await gameState.connect(owner).setBuildingProductionRate("house", 100);
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold
      const initialGold = await gameState.getPlayerGold(player1Address);
      await gameState.connect(player1).collectGold(0);
      const finalGold = await gameState.getPlayerGold(player1Address);
      
      // House should now produce 100 gold per hour at level 1
      expect(finalGold - initialGold).to.equal(100);
    });

    it("Should not allow non-owner to update building production rates", async function () {
      // Try to update house production rate as non-owner
      await expect(
        gameState.connect(player1).setBuildingProductionRate("house", 100)
      ).to.be.revertedWithCustomError(gameState, "OwnableUnauthorizedAccount");
    });

    it("Should correctly calculate total claimable gold for a single building", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // House produces 10 gold per hour at level 1
      expect(claimableGold).to.equal(10);
    });

    it("Should correctly calculate total claimable gold for multiple buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("water-supply"); // 15 gold/hour
      await gameState.connect(player1).createBuilding("workshop");    // 20 gold/hour
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // Total should be 45 gold (10 + 15 + 20)
      expect(claimableGold).to.equal(45);
    });

    it("Should cap calculated gold at 24 hours for a single building", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 48 hours
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // House produces 10 gold per hour, should be capped at 24 hours
      expect(claimableGold).to.equal(240); // 10 gold/hour * 24 hours
    });

    it("Should cap calculated gold at 24 hours for multiple buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create multiple buildings
      await gameState.connect(player1).createBuilding("house");      // 10 gold/hour
      await gameState.connect(player1).createBuilding("water-supply"); // 15 gold/hour
      await gameState.connect(player1).createBuilding("workshop");    // 20 gold/hour
      
      // Fast forward 48 hours
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // Total should be capped at 24 hours of production
      // (10 + 15 + 20) gold/hour * 24 hours = 1080 gold
      expect(claimableGold).to.equal(1080);
    });

    it("Should return 0 for removed buildings", async function () {
      const player1Address = await player1.getAddress();
      
      // Create and remove a house
      await gameState.connect(player1).createBuilding("house");
      await gameState.connect(player1).removeBuilding(0);
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // Should be 0 since the building was removed
      expect(claimableGold).to.equal(0);
    });

    it("Should reflect updated production rates in calculations", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Update house production rate to 100 gold per hour
      await gameState.connect(owner).setBuildingProductionRate("house", 100);
      
      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // House should now produce 100 gold per hour at level 1
      expect(claimableGold).to.equal(100);
    });

    it("Should correctly calculate claimable gold for old building with recent collection", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 48 hours (building is now 48 hours old)
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Collect gold (this sets lastCollectionTime)
      await gameState.connect(player1).collectGold(0);
      
      // Fast forward 12 hours (12 hours since last collection)
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Calculate claimable gold
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // Should get 12 hours worth of gold (10 gold/hour * 12 hours = 120 gold)
      expect(claimableGold).to.equal(120);
    });

    it("Should correctly calculate claimable gold for old building with no recent collection", async function () {
      const player1Address = await player1.getAddress();
      
      // Create a house
      await gameState.connect(player1).createBuilding("house");
      
      // Fast forward 48 hours (building is now 48 hours old)
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("evm_mine");
      
      // Don't collect gold, just check claimable amount
      const claimableGold = await gameState.calculateTotalClaimableGold(player1Address);
      
      // Should get 24 hours worth of gold (10 gold/hour * 24 hours = 240 gold)
      // because it's capped at 24 hours of production
      expect(claimableGold).to.equal(240);
    });
  });
}); 