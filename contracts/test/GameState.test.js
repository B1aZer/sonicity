const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GameState", function () {
  let sonicityNFT;
  let gameState;
  let altar;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy SonicityNFT
    const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
    sonicityNFT = await upgrades.deployProxy(SonicityNFT, [], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await sonicityNFT.deployed();

    // Initialize SonicityNFT
    await sonicityNFT.initialize();

    // Deploy GameState
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await gameState.deployed();

    // Deploy Altar
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.deployed();

    // Initialize contracts
    await altar.initialize(sonicityNFT.address, gameState.address);
    await gameState.initialize(altar.address);
  });

  describe("City Management", function () {
    it("Should allow players to join a city", async function () {
      await gameState.connect(player1).joinCity(1);
      expect(await gameState.playerCity(player1.address)).to.equal(1);
    });

    it("Should not allow players to join multiple cities", async function () {
      await gameState.connect(player1).joinCity(1);
      await expect(gameState.connect(player1).joinCity(2)).to.be.revertedWith("Already in a city");
    });
  });

  describe("Gold Management", function () {
    it("Should allow players to earn and donate gold", async function () {
      await gameState.connect(player1).joinCity(1);
      
      // Earn gold
      await gameState.connect(player1).earnGold(1000);
      expect(await gameState.getPlayerGold(player1.address)).to.equal(1000);
      
      // Donate gold
      await gameState.connect(player1).donateGold(500);
      expect(await gameState.getPlayerGold(player1.address)).to.equal(500);
      expect(await gameState.getCityTreasury(1)).to.equal(500);
    });

    it("Should not allow players to donate more gold than they have", async function () {
      await gameState.connect(player1).joinCity(1);
      await gameState.connect(player1).earnGold(100);
      await expect(gameState.connect(player1).donateGold(200)).to.be.revertedWith("Insufficient Gold");
    });
  });

  describe("Building Slots", function () {
    it("Should update building slots when called by Altar", async function () {
      await gameState.connect(player1).joinCity(1);
      
      // Altar updates slots
      await gameState.connect(altar.address).updateBuildingSlots(player1.address, 5);
      expect(await gameState.getBuildingSlots(player1.address)).to.equal(5);
      expect(await gameState.getMaxBuildingSlots(player1.address)).to.equal(5);
    });

    it("Should not allow non-Altar contracts to update building slots", async function () {
      await gameState.connect(player1).joinCity(1);
      await expect(gameState.connect(player1).updateBuildingSlots(player1.address, 5))
        .to.be.revertedWith("Only Altar can update slots");
    });
  });

  describe("Building Requirements", function () {
    it("Should check building unlock requirements correctly", async function () {
      await gameState.connect(player1).joinCity(1);
      
      // Set up treasury
      await gameState.connect(player1).earnGold(1000);
      await gameState.connect(player1).donateGold(1000);
      
      // Check if building can be unlocked
      expect(await gameState.canUnlockBuilding("Library")).to.be.true;
    });
  });
}); 