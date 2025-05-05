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

    // Approve the NFT collection in GameState
    await gameState.connect(owner).approveCollection(sonicityNFTAddress);

    // Join city for testing
    await gameState.connect(player1).joinCity(1);
  });

  describe("NFT Staking", function () {
    it("Should allow players to stake NFTs", async function () {
      // Mint an NFT to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Check stake data
      const stake = await altar.getStakeData(tokenId);
      expect(stake.isActive).to.be.true;
      expect(stake.owner).to.equal(await player1.getAddress());
    });

    it("Should not allow staking already staked NFTs", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Try to stake again (should fail because we no longer own the NFT)
      await expect(altar.connect(player1).stake(tokenId)).to.be.revertedWith("Not the NFT owner");
    });

    it("Should not allow unstaking before minimum duration", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Try to unstake immediately
      await expect(altar.connect(player1).unstake(tokenId)).to.be.revertedWith("Staking period not completed");
    });

    it("Should allow unstaking after minimum duration", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata for the NFT
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
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

    it("Should not allow staking an NFT with 0 building slots", async function () {
      const tokenId = 1;
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      
      const metadata = {
        district: 1,
        buildingSlots: 0
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      
      await expect(altar.connect(player1).stake(tokenId))
        .to.be.revertedWith("NFT must have at least 1 building slot");
    });
  });

  describe("Building Slots", function () {
    it("Should update building slots based on land size from metadata", async function () {
      // Mint an NFT to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      // Set metadata with size 5
      const metadata = {
        district: 1,
        buildingSlots: 5
      };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      // Stake the NFT
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Check building slots
      const slots = await gameState.getBuildingSlots(await player1.getAddress());
      expect(slots).to.equal(metadata.buildingSlots);
    });

    it("Should accumulate building slots when staking multiple NFTs", async function () {
      // Mint two NFTs to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.02") });
      await sonicityNFT.connect(player1).mint(2, { value: ethers.parseEther("0.02") });
      
      // Set metadata for both NFTs
      const metadata1 = { district: 1, buildingSlots: 5 }; // Will map to 5 slots
      const metadata2 = { district: 1, buildingSlots: 3 }; // Will map to 3 slots
      
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 1, metadata1);
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 2, metadata2);

      // Stake both NFTs
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, 1);
      await sonicityNFT.connect(player1).approve(altarAddress, 2);
      
      await altar.connect(player1).stake(1);
      await altar.connect(player1).stake(2);

      // Check total building slots (5 + 3 = 8)
      const totalSlots = await gameState.getBuildingSlots(await player1.getAddress());
      expect(totalSlots).to.equal(8);
    });

    it("Should reduce building slots when unstaking NFTs", async function () {
      // Mint and stake an NFT
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.01") });
      const tokenId = 1;

      const metadata = { district: 1, buildingSlots: 5 };
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), tokenId, metadata);

      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, tokenId);
      await altar.connect(player1).stake(tokenId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake the NFT
      await altar.connect(player1).unstake(tokenId);

      // Check building slots are reduced to 0
      const slots = await gameState.getBuildingSlots(await player1.getAddress());
      expect(slots).to.equal(0);
    });

    it("Should handle building slots correctly when staking and unstaking multiple NFTs", async function () {
      // Mint three NFTs to player1
      await sonicityNFT.connect(player1).mint(1, { value: ethers.parseEther("0.03") });
      await sonicityNFT.connect(player1).mint(2, { value: ethers.parseEther("0.03") });
      await sonicityNFT.connect(player1).mint(3, { value: ethers.parseEther("0.03") });
      
      // Set metadata for all NFTs
      const metadata1 = { district: 1, buildingSlots: 5 }; // Will map to 5 slots
      const metadata2 = { district: 1, buildingSlots: 3 }; // Will map to 3 slots
      const metadata3 = { district: 1, buildingSlots: 4 }; // Will map to 4 slots
      
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 1, metadata1);
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 2, metadata2);
      await gameState.connect(owner).setNFTMetadata(await sonicityNFT.getAddress(), 3, metadata3);

      // Stake all NFTs
      const altarAddress = await altar.getAddress();
      await sonicityNFT.connect(player1).approve(altarAddress, 1);
      await sonicityNFT.connect(player1).approve(altarAddress, 2);
      await sonicityNFT.connect(player1).approve(altarAddress, 3);
      
      await altar.connect(player1).stake(1);
      await altar.connect(player1).stake(2);
      await altar.connect(player1).stake(3);

      // Check total building slots (5 + 3 + 4 = 12)
      let totalSlots = await gameState.getBuildingSlots(await player1.getAddress());
      expect(totalSlots).to.equal(12);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");

      // Unstake one NFT (remove 3 slots)
      await altar.connect(player1).unstake(2);

      // Check building slots are reduced correctly (5 + 4 = 9)
      totalSlots = await gameState.getBuildingSlots(await player1.getAddress());
      expect(totalSlots).to.equal(9);
    });
  });
}); 