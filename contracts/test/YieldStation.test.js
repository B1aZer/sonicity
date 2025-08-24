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

  describe("Yield NFT Minting and Staking", function () {
    beforeEach(async function () {
      // Set up player1 to tier 4 so they can mint yield NFTs
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 10000);
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

  describe("Yield NFT Metadata and Images", function () {
    it("should generate correct token URI", async function () {
      // Give player REP and mint NFT
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 10000);
      await gameState.testEarnRep(player1.address, 50);
      await altar.connect(player1).mintYieldNFT(50);
      
      const tokenId = await sonicityYieldNFT.tokenOfOwnerByIndex(player1.address, 0);
      const tokenURI = await sonicityYieldNFT.tokenURI(tokenId);
      
      // Should return a valid JSON metadata URI
      expect(tokenURI).to.be.a('string');
      expect(tokenURI).to.include('data:application/json;base64,');
    });

    it("should generate different metadata for different REP amounts", async function () {
      // Give player REP and mint multiple NFTs with different REP amounts
      await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 10000);
      
      await gameState.testEarnRep(player1.address, 200); // Enough for multiple NFTs
      
      // Mint Bronze NFT (10 REP)
      await altar.connect(player1).mintYieldNFT(10);
      const bronzeTokenId = await sonicityYieldNFT.tokenOfOwnerByIndex(player1.address, 0);
      const bronzeURI = await sonicityYieldNFT.tokenURI(bronzeTokenId);
      
      // Mint Gold NFT (75 REP)
      await altar.connect(player1).mintYieldNFT(75);
      const goldTokenId = await sonicityYieldNFT.tokenOfOwnerByIndex(player1.address, 1);
      const goldURI = await sonicityYieldNFT.tokenURI(goldTokenId);
      
      // URIs should be different for different tiers
      expect(bronzeURI).to.not.equal(goldURI);
    });
  });
}); 