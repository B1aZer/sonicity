const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, donateGoldForTier, ensurePlayerGold } = require("./helpers");

describe("YieldStation", function () {
  let gameState;
  let gridBuildings;
  let altar;
  let sonicityNFT;
  let sonicityFarm;
  let sonicityDiamond;
  let sonicityRep;
  let sonicityYieldNFT;
  let sonicityArtProxy;
  let owner;
  let player1;
  let player2;
  let player3;
  let battleSystem;
  let districtBuildings;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

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
    sonicityRep = await SonicityRep.deploy();
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
      kind: "uups",
      initializer: "initialize",
    });
    await gameState.waitForDeployment();
    const gameStateAddress = await gameState.getAddress();

    // Deploy DistrictBuildings
    const DistrictBuildings = await ethers.getContractFactory("DistrictBuildings");
    districtBuildings = await upgrades.deployProxy(DistrictBuildings, [], {
      kind: "uups",
      initializer: "initialize",
    });
    await districtBuildings.waitForDeployment();
    const districtBuildingsAddress = await districtBuildings.getAddress();

    // Deploy GridBuildings
    const GridBuildings = await ethers.getContractFactory("GridBuildings");
    gridBuildings = await upgrades.deployProxy(GridBuildings, [], {
      kind: "uups",
      initializer: "initialize",
    });
    await gridBuildings.waitForDeployment();
    const gridBuildingsAddress = await gridBuildings.getAddress();

    // Deploy BattleSystem
    const BattleSystem = await ethers.getContractFactory("BattleSystem");
    battleSystem = await upgrades.deployProxy(BattleSystem, [], {
      kind: "uups",
      initializer: "initialize",
    });
    await battleSystem.waitForDeployment();
    const battleSystemAddress = await battleSystem.getAddress();

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [gameStateAddress, gridBuildingsAddress], {
      kind: "uups",
      initializer: "initialize",
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Set up contract interactions
    await gameState.setAltarAddress(altarAddress);
    await gameState.setGridBuildingsAddress(gridBuildingsAddress);
    await gameState.setDistrictBuildingsAddress(districtBuildingsAddress);
    await gameState.setBattleSystemAddress(battleSystemAddress);

    await gridBuildings.setAltarAddress(altarAddress);
    await gridBuildings.setGameStateAddress(gameStateAddress);
    await gridBuildings.setDistrictBuildingsAddress(districtBuildingsAddress);
    await gridBuildings.setBattleSystemAddress(battleSystemAddress);

    await districtBuildings.setGameStateAddress(gameStateAddress);

    await battleSystem.setGameStateAddress(gameStateAddress);
    await battleSystem.setDistrictBuildingsAddress(districtBuildingsAddress);
    await battleSystem.setGridBuildingsAddress(gridBuildingsAddress);

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

    // Initialize players
    await gameState.connect(player1).initializePlayer();
    await gameState.connect(player2).initializePlayer();
    await gameState.connect(player3).initializePlayer();
  });

  describe("YIELD_STATION Building Type", function () {
    it("should have YIELD_STATION building type configured", async function () {
      const config = await gridBuildings.buildingConfigs(GridBuildingType.YIELD_STATION);
      expect(config.name).to.equal("Yield Station");
      expect(config.tier).to.equal(1);
      expect(config.rechargeCost).to.equal(0); // Free recharge
      expect(config.productionDuration).to.equal(24 * 60 * 60); // 24 hours
    });
  });

  describe("Yield NFT Minting and Staking", function () {
    beforeEach(async function () {
      // Set up player1 to tier 1 so they can mint yield NFTs
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
    });

    it("should allow minting and staking yield NFTs", async function () {
      // Give player some REP
      await gameState.testEarnRep(player1.address, 50);
      
      // Mint yield NFT
      const tx = await altar.connect(player1).mintYieldNFT(50);
      const receipt = await tx.wait();
      
      // Check NFT was minted
      const balance = await sonicityYieldNFT.balanceOf(player1.address);
      expect(balance).to.equal(1);
      
      const tokenId = await sonicityYieldNFT.tokenOfOwnerByIndex(player1.address, 0);
      
      // Stake the yield NFT
      await sonicityYieldNFT.connect(player1).approve(altar.getAddress(), tokenId);
      await altar.connect(player1).stakeYieldNFT(tokenId);
      
      // Check that yield station was created
      const building = await gridBuildings.buildings(player1.address, 1); // Should be building ID 1 (after the house from donateGoldForTier)
      expect(building.buildingType).to.equal(GridBuildingType.YIELD_STATION);
      
      // Check yield station data stored in Altar
      const yieldData = await altar.yieldStationData(player1.address, 1);
      expect(yieldData.nftTokenId).to.equal(tokenId);
      expect(yieldData.repAmount).to.equal(50);
      expect(yieldData.nftTier).to.equal(2); // Silver tier (11-50 REP)
    });

    it("should calculate correct NFT tiers", async function () {
      const testCases = [
        { repAmount: 5, expectedTier: 1 },   // Bronze (1-10)
        { repAmount: 25, expectedTier: 2 },  // Silver (11-50)
        { repAmount: 75, expectedTier: 3 },  // Gold (51-100)
        { repAmount: 150, expectedTier: 4 }  // Legendary (101+)
      ];

      for (const testCase of testCases) {
        const calculatedTier = await gridBuildings.calculateNFTTier(testCase.repAmount);
        expect(calculatedTier).to.equal(testCase.expectedTier);
      }
    });
  });

  describe("Revenue Distribution", function () {
    it("should revert distribution with no balance", async function () {
      // Try to distribute with no fees
      await expect(
        gridBuildings.connect(owner).distributeRevenue()
      ).to.be.revertedWith("No balance to distribute");
    });

    it("should allow claiming SONIC revenue (when no balance)", async function () {
      // Test that claiming works (even if no actual distribution happened yet)
      await expect(
        gridBuildings.connect(player1).claimSonicRevenue()
      ).to.be.revertedWith("No SONIC to claim");
    });

    it("should have correct initial state", async function () {
      // Check initial state
      const totalPool = await gridBuildings.totalRevenuePool();
      expect(totalPool).to.equal(0);

      const lastDistributionTime = await gridBuildings.lastDistributionTime();
      expect(lastDistributionTime).to.equal(0);

      const claimable = await gridBuildings.getClaimableSonic(player1.address);
      expect(claimable).to.equal(0);
    });
  });

  describe("Free Yield Station Recharges", function () {
    beforeEach(async function () {
      // Set up player with yield station
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
      await gameState.testEarnRep(player1.address, 50);

      await altar.connect(player1).mintYieldNFT(50);
      const tokenId = await sonicityYieldNFT.tokenOfOwnerByIndex(player1.address, 0);
      await sonicityYieldNFT.connect(player1).approve(altar.getAddress(), tokenId);
      await altar.connect(player1).stakeYieldNFT(tokenId);
    });

    it("should allow free recharge of yield stations", async function () {
      // Recharge yield station with 0 value (building ID 1, after the house from donateGoldForTier)
      await expect(
        gridBuildings.connect(player1).rechargeBuilding(1, { value: 0 })
      ).to.not.be.reverted;

      // Check that building was recharged
      const building = await gridBuildings.buildings(player1.address, 1);
      expect(building.lastRechargeTime).to.be.gt(0);
    });

    it("should reject non-zero payment for yield station recharge", async function () {
      // Try to pay for yield station recharge
      await expect(
        gridBuildings.connect(player1).rechargeBuilding(1, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Incorrect fee amount");
    });
  });
}); 