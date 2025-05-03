const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Altar", function () {
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

    // Join city for testing
    await gameState.connect(player1).joinCity(1);
  });

  describe("NFT Staking", function () {
    it("Should allow players to stake NFTs", async function () {
      // Mint an NFT to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.utils.parseEther("0.01") });
      const tokenId = 1;

      // Stake the NFT
      await sonicityNFT.connect(player1).approve(altar.address, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Check stake data
      const stake = await altar.getStakeData(tokenId);
      expect(stake.isActive).to.be.true;
      expect(stake.owner).to.equal(player1.address);
    });

    it("Should not allow staking already staked NFTs", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.utils.parseEther("0.01") });
      const tokenId = 1;
      await sonicityNFT.connect(player1).approve(altar.address, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Try to stake again
      await expect(altar.connect(player1).stake(tokenId)).to.be.revertedWith("NFT already staked");
    });

    it("Should not allow unstaking before minimum duration", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.utils.parseEther("0.01") });
      const tokenId = 1;
      await sonicityNFT.connect(player1).approve(altar.address, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Try to unstake immediately
      await expect(altar.connect(player1).unstake(tokenId)).to.be.revertedWith("Staking period not completed");
    });

    it("Should allow unstaking after minimum duration", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.utils.parseEther("0.01") });
      const tokenId = 1;
      await sonicityNFT.connect(player1).approve(altar.address, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake
      await altar.connect(player1).unstake(tokenId);

      // Check stake data
      const stake = await altar.getStakeData(tokenId);
      expect(stake.isActive).to.be.false;
    });
  });

  describe("Building Slots", function () {
    it("Should update building slots based on land size", async function () {
      // Mint an NFT to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.utils.parseEther("0.01") });
      const tokenId = 1;

      // Get land plot data
      const plot = await sonicityNFT.getLandPlot(tokenId);
      const expectedSlots = plot.size; // Slots equal to land size

      // Stake the NFT
      await sonicityNFT.connect(player1).approve(altar.address, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Check building slots
      const slots = await gameState.getBuildingSlots(player1.address);
      expect(slots).to.equal(expectedSlots);
    });
  });
}); 