const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, donateGoldForTier } = require("./helpers");

describe("Altar", function () {
  let sonicityNFT;
  let sonicityFarm;
  let sonicityDiamond;
  let gameState;
  let gridBuildings;
  let altar;
  let owner;
  let player1;
  let player2;
  let unapprovedCollection;
  let sonicityYieldNFT;
  let sonicityArtProxy;

  beforeEach(async function () {
    [owner, player1, player2, unapprovedCollection] = await ethers.getSigners();

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

    // Deploy SonicityYieldNFT
    const SonicityYieldNFT = await ethers.getContractFactory("SonicityYieldNFT");
    sonicityYieldNFT = await SonicityYieldNFT.deploy();
    await sonicityYieldNFT.waitForDeployment();
    const sonicityYieldNFTAddress = await sonicityYieldNFT.getAddress();

    // Deploy SonicityArtProxy
    const SonicityArtProxy = await ethers.getContractFactory("SonicityArtProxy");
    sonicityArtProxy = await SonicityArtProxy.deploy();
    await sonicityArtProxy.waitForDeployment();
    const sonicityArtProxyAddress = await sonicityArtProxy.getAddress();

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

    // Set up contract interactions
    await gameState.setAltarAddress(altarAddress);
    await gameState.setGridBuildingsAddress(gridBuildingsAddress);
    await gridBuildings.setAltarAddress(altarAddress);
    await gridBuildings.setGameStateAddress(gameStateAddress);

    // Approve NFT collections in Altar
    await altar.approveCollection(sonicityNFTAddress);
    await altar.approveCollection(sonicityFarmAddress);
    await altar.approveCollection(sonicityDiamondAddress);
    await altar.approveCollection(sonicityRepAddress);
    await altar.approveCollection(sonicityYieldNFTAddress);

    // Set Altar contract address on all NFT contracts
    await sonicityNFT.setAltarContract(altarAddress);
    await sonicityFarm.setAltarContract(altarAddress);
    await sonicityDiamond.setAltarContract(altarAddress);
    await sonicityRep.setAltarContract(altarAddress);
    await sonicityYieldNFT.setAltarContract(altarAddress);

    // Set up yield NFT connections
    await sonicityYieldNFT.setArtProxy(sonicityArtProxyAddress);
    await altar.setYieldNFT(sonicityYieldNFTAddress);

    // Set minimum staking duration to 0 for testing
    await altar.setMinStakingDuration(0);
  });

  describe("Collection Management", function () {
    it("Should allow owner to approve and remove collections", async function () {
      await altar.approveCollection(await sonicityFarm.getAddress());
      expect(await altar.approvedCollections(await sonicityFarm.getAddress())).to.be.true;
      
      await altar.removeCollection(await sonicityFarm.getAddress());
      expect(await altar.approvedCollections(await sonicityFarm.getAddress())).to.be.false;
    });

    it("Should not allow non-owner to approve or remove collections", async function () {
      await expect(altar.connect(player1).approveCollection(await sonicityFarm.getAddress()))
        .to.be.revertedWithCustomError(altar, "OwnableUnauthorizedAccount");
      
      await expect(altar.connect(player1).removeCollection(await sonicityFarm.getAddress()))
        .to.be.revertedWithCustomError(altar, "OwnableUnauthorizedAccount");
    });
  });

  describe("NFT Staking", function () {
    it("Should allow players to stake NFTs from approved collections", async function () {
      // First stake a house (tier 0)
      const result1 = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);
      
      // Check stake data for house
      const stake1 = await altar.getStakeDataWithCollection(await sonicityNFT.getAddress(), result1.tokenId);
      expect(stake1.tokenId).to.equal(result1.tokenId);
      expect(stake1.collection).to.equal(await sonicityNFT.getAddress());

      // Upgrade player to tier 1 using helper
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
      const playerState = await gameState.playerState(await player1.getAddress());
      expect(playerState.tier).to.equal(1);

      // Now stake a farm (tier 1)
      const result2 = await mintAndStakeNFT(player1, altar, sonicityFarm, GridBuildingType.FARM);
      
      // Check stake data for farm
      const stake2 = await altar.getStakeDataWithCollection(await sonicityFarm.getAddress(), result2.tokenId);
      expect(stake2.tokenId).to.equal(result2.tokenId);
      expect(stake2.collection).to.equal(await sonicityFarm.getAddress());
    });

    it("Should not allow staking from unapproved collections", async function () {
      await expect(altar.connect(player1).stake(1, 0, unapprovedCollection.address))
        .to.be.revertedWith("Collection not approved");
    });

    it("Should not allow staking already staked NFTs", async function () {
      // Mint and stake an NFT
      const result = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);

      // Try to stake again
      await expect(altar.connect(player1).stake(result.tokenId, 0, await sonicityNFT.getAddress()))
        .to.be.revertedWith("Not the NFT owner");
    });

    it("Should allow unstaking after minimum duration", async function () {
      // Mint and stake an NFT
      const result = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);

      // Get building count before unstaking
      const buildingCountBefore = await gridBuildings.buildingCounts(await player1.getAddress(), 0);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(result.nftAddress, result.tokenId);

      // Check stake data
      const stake = await altar.getStakeDataWithCollection(result.nftAddress, result.tokenId);
      expect(stake.isActive).to.be.false;

      // Check that the building was removed
      const building = await gridBuildings.buildings(await player1.getAddress(), result.buildingId);
      expect(building.buildingType).to.equal(BigInt(0));
      expect(building.level).to.equal(0);

      // Check building count decreased
      const buildingCountAfter = await gridBuildings.buildingCounts(await player1.getAddress(), 0);
      expect(buildingCountAfter).to.equal(buildingCountBefore - BigInt(1));
    });

    it("Should track multiple staked NFTs from different collections", async function () {
      // First stake houses (tier 0)
      const result1 = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);
      const result2 = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);
      
      // Check stake data for houses
      const stake1 = await altar.getStakeDataWithCollection(result1.nftAddress, result1.tokenId);
      const stake2 = await altar.getStakeDataWithCollection(result2.nftAddress, result2.tokenId);
      
      expect(stake1.tokenId).to.equal(result1.tokenId);
      expect(stake1.collection).to.equal(result1.nftAddress);
      expect(stake2.tokenId).to.equal(result2.tokenId);
      expect(stake2.collection).to.equal(result2.nftAddress);

      // Upgrade player to tier 1 using helper
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
      const playerState = await gameState.playerState(await player1.getAddress());
      expect(playerState.tier).to.equal(1);

      // Now stake farms (tier 1)
      const result3 = await mintAndStakeNFT(player1, altar, sonicityFarm, GridBuildingType.FARM);
      const result4 = await mintAndStakeNFT(player1, altar, sonicityFarm, GridBuildingType.FARM);
      
      // Check stake data for farms
      const stake3 = await altar.getStakeDataWithCollection(result3.nftAddress, result3.tokenId);
      const stake4 = await altar.getStakeDataWithCollection(result4.nftAddress, result4.tokenId);
      
      expect(stake3.tokenId).to.equal(result3.tokenId);
      expect(stake3.collection).to.equal(result3.nftAddress);
      expect(stake4.tokenId).to.equal(result4.tokenId);
      expect(stake4.collection).to.equal(result4.nftAddress);
    });
  });

  describe("Building Data Preservation", function () {
    it("Should preserve building upgrades when unstaking and restore when re-staking", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);

      // Fast forward time to collect enough gold for upgrade
      await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
      await ethers.provider.send("evm_mine");

      // Collect resources to get gold for upgrade
      await gridBuildings.connect(player1).collectResources(buildingId);

      // Recharge building to unlock level 2
      await gridBuildings.connect(player1).rechargeBuilding(buildingId, { value: ethers.parseEther("0.01") });
      await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
      await ethers.provider.send("evm_mine");
      
      // Recharge 9 more times to reach 0.1 SONIC total and unlock level 2
      for (let i = 0; i < 9; i++) {
        await gridBuildings.connect(player1).rechargeBuilding(buildingId, { value: ethers.parseEther("0.01") });
        await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
      }

      // Get building config to check upgrade cost
      const config = await gridBuildings.buildingConfigs(GridBuildingType.HOUSE);
      const upgradeCost1 = config.upgradeCost; // Level 1 -> 2: 100 gold
      const upgradeCost2 = config.upgradeCost * 2n; // Level 2 -> 3: 200 gold

      // Verify player has enough gold for first upgrade
      const playerGold1 = await gameState.getPlayerGold(player1Address);
      expect(playerGold1).to.be.gte(upgradeCost1);

      // Upgrade the building to level 2
      await gridBuildings.connect(player1).upgradeBuilding(buildingId);

      // Recharge 90 more times to reach 1 SONIC total and unlock level 3
      for (let i = 0; i < 90; i++) {
        await gridBuildings.connect(player1).rechargeBuilding(buildingId, { value: ethers.parseEther("0.01") });
        await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
      }

      // Collect more resources for second upgrade
      await ethers.provider.send("evm_increaseTime", [24 * 3600]); // Another 24 hours
      await ethers.provider.send("evm_mine");
      await gridBuildings.connect(player1).collectResources(buildingId);

      // Verify player has enough gold for second upgrade
      const playerGold2 = await gameState.getPlayerGold(player1Address);
      expect(playerGold2).to.be.gte(upgradeCost2);

      // Upgrade the building to level 3
      await gridBuildings.connect(player1).upgradeBuilding(buildingId);

      // Verify building is at level 3
      const building = await gridBuildings.buildings(player1Address, buildingId);
      expect(building.level).to.equal(3);

      // Fast forward time to complete staking period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake the NFT
      await altar.connect(player1).unstake(nftAddress, tokenId);

      // Check that building data is preserved
      const hasPreservedData = await altar.hasPreservedBuildingData(nftAddress, tokenId);
      expect(hasPreservedData).to.be.true;

      // Get preserved building data
      const preservedData = await altar.getPreservedBuildingData(nftAddress, tokenId);
      expect(preservedData.buildingType).to.equal(GridBuildingType.HOUSE);
      expect(preservedData.level).to.equal(3);
      expect(preservedData.lastUpgradeTime).to.be.gt(0);

      // Verify building was removed from GridBuildings
      const removedBuilding = await gridBuildings.buildings(player1Address, buildingId);
      expect(removedBuilding.buildingType).to.equal(BigInt(0));
      expect(removedBuilding.level).to.equal(0);

      // Re-stake the NFT
      await sonicityNFT.connect(player1).approve(await altar.getAddress(), tokenId);
      await altar.connect(player1).stake(tokenId, GridBuildingType.HOUSE, nftAddress);

      // Get the new building ID
      const newBuildingId = await altar.stakedBuilding(nftAddress, tokenId);

      // Verify building was restored with preserved data
      const restoredBuilding = await gridBuildings.buildings(player1Address, newBuildingId);
      expect(restoredBuilding.buildingType).to.equal(GridBuildingType.HOUSE);
      expect(restoredBuilding.level).to.equal(3);
      expect(restoredBuilding.lastUpgradeTime).to.equal(preservedData.lastUpgradeTime);

      // Verify preserved data was cleared
      const hasPreservedDataAfterRestore = await altar.hasPreservedBuildingData(nftAddress, tokenId);
      expect(hasPreservedDataAfterRestore).to.be.false;
    });

    it("Should not preserve building data for new NFTs", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint a new NFT
      const mintTx = await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const mintReceipt = await mintTx.wait();
      
      // Get tokenId from Transfer event
      const transferEvent = mintReceipt.logs
        .map(log => {
          try { return sonicityNFT.interface.parseLog(log); } catch { return null; }
        })
        .find(e => e && e.name === "Transfer");
      const tokenId = transferEvent.args.tokenId;

      // Check that new NFT has no preserved data
      const hasPreservedData = await altar.hasPreservedBuildingData(await sonicityNFT.getAddress(), tokenId);
      expect(hasPreservedData).to.be.false;
    });

    it("Should emit correct events for building data preservation", async function () {
      const player1Address = await player1.getAddress();
      
      // Mint and stake an NFT
      const { buildingId, tokenId, nftAddress } = await mintAndStakeNFT(player1, altar, sonicityNFT, GridBuildingType.HOUSE);

      // Upgrade the building
      await ethers.provider.send("evm_increaseTime", [24 * 3600]);
      await ethers.provider.send("evm_mine");
      await gridBuildings.connect(player1).collectResources(buildingId);
      
      // Recharge building to unlock level 2
      await gridBuildings.connect(player1).rechargeBuilding(buildingId, { value: ethers.parseEther("0.01") });
      await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
      await ethers.provider.send("evm_mine");
      
      // Recharge 9 more times to reach 0.1 SONIC total and unlock level 2
      for (let i = 0; i < 9; i++) {
        await gridBuildings.connect(player1).rechargeBuilding(buildingId, { value: ethers.parseEther("0.01") });
        await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
      }
      
      await gridBuildings.connect(player1).upgradeBuilding(buildingId);

      // Fast forward time to complete staking period
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Unstake and check for BuildingDataPreserved event
      const unstakeTx = await altar.connect(player1).unstake(nftAddress, tokenId);
      const unstakeReceipt = await unstakeTx.wait();
      
      const buildingDataPreservedEvent = unstakeReceipt.logs.find(
        log => log.topics[0] === altar.interface.getEvent("BuildingDataPreserved").topicHash
      );
      expect(buildingDataPreservedEvent).to.not.be.undefined;

      // Re-stake and check for BuildingDataRestored event
      await sonicityNFT.connect(player1).approve(await altar.getAddress(), tokenId);
      const stakeTx = await altar.connect(player1).stake(tokenId, GridBuildingType.HOUSE, nftAddress);
      const stakeReceipt = await stakeTx.wait();
      
      const buildingDataRestoredEvent = stakeReceipt.logs.find(
        log => log.topics[0] === altar.interface.getEvent("BuildingDataRestored").topicHash
      );
      expect(buildingDataRestoredEvent).to.not.be.undefined;
    });
  });
}); 