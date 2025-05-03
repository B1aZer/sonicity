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
    sonicityNFT = await SonicityNFT.deploy();
    await sonicityNFT.waitForDeployment();
    const sonicityNFTAddress = await sonicityNFT.getAddress();

    // Deploy GameState first with a temporary altar address
    const GameState = await ethers.getContractFactory("GameState");
    gameState = await upgrades.deployProxy(GameState, [ethers.ZeroAddress], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await gameState.waitForDeployment();
    const gameStateAddress = await gameState.getAddress();

    // Deploy Altar with the correct addresses
    const Altar = await ethers.getContractFactory("Altar");
    altar = await upgrades.deployProxy(Altar, [sonicityNFTAddress, gameStateAddress], {
      kind: 'uups',
      initializer: 'initialize',
    });
    await altar.waitForDeployment();
    const altarAddress = await altar.getAddress();

    // Update GameState's altar address
    await gameState.connect(owner).setAltarAddress(altarAddress);
  });

  describe("City Management", function () {
    it("Should allow players to join a city", async function () {
      await gameState.connect(player1).joinCity(1);
      const playerCity = await gameState.playerCity(await player1.getAddress());
      expect(playerCity).to.equal(1);
    });

    it("Should not allow players to join multiple cities", async function () {
      await gameState.connect(player1).joinCity(1);
      await expect(gameState.connect(player1).joinCity(2)).to.be.revertedWith("Already in a city");
    });
  });

  describe("Gold Management", function () {
    it("Should allow players to earn and donate gold", async function () {
      await gameState.connect(player1).joinCity(1);
      await gameState.connect(player1).earnGold(ethers.parseEther("100"));

      const initialGold = await gameState.getPlayerGold(await player1.getAddress());
      const initialTreasury = await gameState.getCityTreasury(1);

      await gameState.connect(player1).donateGold(ethers.parseEther("50"));

      const finalGold = await gameState.getPlayerGold(await player1.getAddress());
      const finalTreasury = await gameState.getCityTreasury(1);

      expect(finalGold).to.equal(initialGold - ethers.parseEther("50"));
      expect(finalTreasury).to.equal(initialTreasury + ethers.parseEther("50"));
    });

    it("Should not allow players to donate more gold than they have", async function () {
      await gameState.connect(player1).joinCity(1);
      await expect(gameState.connect(player1).donateGold(ethers.parseEther("100"))).to.be.revertedWith("Insufficient Gold");
    });
  });

  describe("Building Slots", function () {
    it("Should update building slots when called by Altar", async function () {
      await gameState.connect(player1).joinCity(1);
      const player1Address = await player1.getAddress();

      // Mint and stake an NFT to trigger building slots update
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Use static size of 5 for testing
      const expectedSlots = 5;

      // Check that slots were updated
      const slots = await gameState.getBuildingSlots(player1Address);
      expect(slots).to.equal(expectedSlots);
    });

    it("Should not allow non-Altar contracts to update building slots", async function () {
      await gameState.connect(player1).joinCity(1);
      const player1Address = await player1.getAddress();
      await expect(gameState.connect(player2).updateBuildingSlots(player1Address, 5)).to.be.revertedWith("Only Altar can update slots");
    });
  });

  describe("Building Requirements", function () {
    it("Should check building unlock requirements correctly", async function () {
      await gameState.connect(player1).joinCity(1);
      const player1Address = await player1.getAddress();
      await gameState.connect(player1).earnGold(ethers.parseEther("1000"));
      await gameState.connect(player1).donateGold(ethers.parseEther("1000"));
      const canUnlock = await gameState.connect(player1).canUnlockBuilding("Library");
      expect(canUnlock).to.be.true;
    });
  });
}); 