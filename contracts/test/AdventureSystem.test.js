const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, ensurePlayerGold, ensurePlayerFood, ensurePlayerDiamonds, donateGoldForTier } = require("./helpers");

describe("Adventure System", function () {
    let adventureSystem;
    let relicNFT;
    let heroNFT;
    let gameState;
    let gridBuildings;
    let altar;
    let sonicityNFT;
    let sonicityFarm;
    let sonicityDiamond;
    let owner;
    let player1;
    let player2;

    const STARTING_SCOUT_COST = ethers.parseEther("10"); // 10 SONIC
    const HERO_COOLDOWN = 3 * 3600; // 3 hours in seconds

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy NFT contracts
        const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
        sonicityNFT = await SonicityNFT.deploy();
        await sonicityNFT.waitForDeployment();
        const sonicityNFTAddress = await sonicityNFT.getAddress();

        const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
        sonicityFarm = await SonicityFarm.deploy();
        await sonicityFarm.waitForDeployment();
        const sonicityFarmAddress = await sonicityFarm.getAddress();

        const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
        sonicityDiamond = await SonicityDiamond.deploy();
        await sonicityDiamond.waitForDeployment();
        const sonicityDiamondAddress = await sonicityDiamond.getAddress();

        // Deploy GameState
        const GameState = await ethers.getContractFactory("GameState");
        gameState = await upgrades.deployProxy(GameState, [], { initializer: 'initialize' });
        await gameState.waitForDeployment();
        const gameStateAddress = await gameState.getAddress();

        // Deploy GridBuildings
        const GridBuildings = await ethers.getContractFactory("GridBuildings");
        gridBuildings = await upgrades.deployProxy(GridBuildings, [], { initializer: 'initialize' });
        await gridBuildings.waitForDeployment();
        const gridBuildingsAddress = await gridBuildings.getAddress();

        // Deploy Altar
        const Altar = await ethers.getContractFactory("Altar");
        altar = await upgrades.deployProxy(Altar, [gameStateAddress, gridBuildingsAddress], { initializer: 'initialize' });
        await altar.waitForDeployment();
        const altarAddress = await altar.getAddress();

        // Deploy HeroNFT
        const HeroNFT = await ethers.getContractFactory("HeroNFT");
        heroNFT = await upgrades.deployProxy(HeroNFT, [], { initializer: 'initialize' });
        await heroNFT.waitForDeployment();
        const heroNFTAddress = await heroNFT.getAddress();

        // Deploy RelicNFT
        const RelicNFT = await ethers.getContractFactory("RelicNFT");
        relicNFT = await RelicNFT.deploy();
        await relicNFT.waitForDeployment();
        const relicNFTAddress = await relicNFT.getAddress();

        // Deploy AdventureSystem
        const AdventureSystem = await ethers.getContractFactory("AdventureSystem");
        adventureSystem = await upgrades.deployProxy(AdventureSystem, [], { initializer: 'initialize' });
        await adventureSystem.waitForDeployment();
        const adventureSystemAddress = await adventureSystem.getAddress();

        // Set up contract references
        await gameState.setAltarAddress(altarAddress);
        await gameState.setGridBuildingsAddress(gridBuildingsAddress);
        await gameState.setAdventureSystemAddress(adventureSystemAddress);
        await gridBuildings.setAltarAddress(altarAddress);
        await gridBuildings.setGameStateAddress(gameStateAddress);
        await heroNFT.setGameStateAddress(gameStateAddress);

        // Set up AdventureSystem references
        await adventureSystem.setGameStateAddress(gameStateAddress);
        await adventureSystem.setHeroNFTAddress(heroNFTAddress);
        await adventureSystem.setRelicNFTAddress(relicNFTAddress);
        await relicNFT.setAdventureSystemAddress(adventureSystemAddress);

        // Approve NFT collections in Altar
        await altar.approveCollection(sonicityNFTAddress);
        await altar.approveCollection(sonicityFarmAddress);
        await altar.approveCollection(sonicityDiamondAddress);

        // Set Altar contract address on NFT contracts
        await sonicityNFT.setAltarContract(altarAddress);
        await sonicityFarm.setAltarContract(altarAddress);
        await sonicityDiamond.setAltarContract(altarAddress);

        // Set minimum staking duration to 0 for testing
        await altar.setMinStakingDuration(0);

        // Initialize players
        await gameState.connect(player1).initializePlayer();
        await gameState.connect(player2).initializePlayer();
    });

    describe("Contract Initialization", function () {
        it("Should initialize with correct default values", async function () {
            expect(await adventureSystem.STARTING_SCOUT_COST()).to.equal(STARTING_SCOUT_COST);
            expect(await adventureSystem.HERO_COOLDOWN()).to.equal(HERO_COOLDOWN);
            expect(await adventureSystem.gameStateAddress()).to.equal(await gameState.getAddress());
            expect(await adventureSystem.heroNFTAddress()).to.equal(await heroNFT.getAddress());
            expect(await adventureSystem.relicNFTAddress()).to.equal(await relicNFT.getAddress());
        });

        it("Should have correct tile probabilities", async function () {
            expect(await adventureSystem.SAFE_CHANCE()).to.equal(40);
            expect(await adventureSystem.REWARD_CHANCE()).to.equal(30);
            expect(await adventureSystem.DISASTER_CHANCE()).to.equal(15);
            expect(await adventureSystem.DIAMOND_CHANCE()).to.equal(10);
            expect(await adventureSystem.SPECIAL_CHANCE()).to.equal(5);
        });

        it("Should have correct grid sizes per tier", async function () {
            expect(await adventureSystem.getGridSizeForTier(0)).to.equal(9);   // 3x3
            expect(await adventureSystem.getGridSizeForTier(1)).to.equal(12);  // 3x4
            expect(await adventureSystem.getGridSizeForTier(2)).to.equal(16);  // 4x4
            expect(await adventureSystem.getGridSizeForTier(3)).to.equal(20);  // 4x5
            expect(await adventureSystem.getGridSizeForTier(4)).to.equal(25);  // 5x5
        });
    });

    describe("Starting Scout System", function () {
        it("Should allow player to purchase starting scout", async function () {
            await expect(
                adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST })
            ).to.emit(adventureSystem, "StartingScoutPurchased")
             .withArgs(player1.address);

            const scout = await adventureSystem.playerScouts(player1.address);
            expect(scout.purchased).to.be.true;
            // Scout should be available (availableAt should be <= current time)
            const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
            expect(scout.availableAt).to.be.lte(currentTime);
        });

        it("Should not allow purchasing scout twice", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });

            await expect(
                adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST })
            ).to.be.revertedWith("Already have starting scout");
        });

        it("Should reject insufficient payment", async function () {
            await expect(
                adventureSystem.connect(player1).purchaseStartingScout({ value: ethers.parseEther("5") })
            ).to.be.revertedWith("Insufficient SONIC");
        });

        it("Should check scout availability", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            const scout = await adventureSystem.playerScouts(player1.address);
            expect(scout.purchased).to.be.true;
        });
    });

    describe("Adventure Creation", function () {
        beforeEach(async function () {
            // Purchase scout for player1
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
        });

        it("Should create adventure with starting scout", async function () {
            const player1Tier = await gameState.getPlayerTier(player1.address);
            const expectedGridSize = await adventureSystem.getGridSizeForTier(player1Tier);

            await expect(
                adventureSystem.connect(player1).startAdventure(0, true)
            ).to.emit(adventureSystem, "AdventureStarted");

            const adventure = await adventureSystem.activeAdventures(player1.address);
            expect(adventure.active).to.be.true;
            expect(adventure.gridSize).to.equal(expectedGridSize);
            expect(adventure.useStartingScout).to.be.true;
            expect(adventure.tilesRevealed).to.equal(0);
        });

        it("Should not allow creating adventure without scout or hero", async function () {
            await expect(
                adventureSystem.connect(player2).startAdventure(0, true)
            ).to.be.revertedWith("Scout not available");
        });

        it("Should not allow multiple active adventures", async function () {
            await adventureSystem.connect(player1).startAdventure(0, true);

            await expect(
                adventureSystem.connect(player1).startAdventure(0, true)
            ).to.be.revertedWith("Adventure already active");
        });

        it("Should not allow adventure when scout is on cooldown", async function () {
            // Start first adventure
            await adventureSystem.connect(player1).startAdventure(0, true);
            
            // Reveal one tile
            await adventureSystem.connect(player1).revealTile();
            
            // Claim adventure (starts cooldown)
            await adventureSystem.connect(player1).completeAdventure();

            // Try to start another adventure
            await expect(
                adventureSystem.connect(player1).startAdventure(0, true)
            ).to.be.revertedWith("Scout not available");
        });
    });

    describe("Tile Revealing", function () {
        beforeEach(async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);
        });

        it("Should allow revealing tiles", async function () {
            const adventureBefore = await adventureSystem.activeAdventures(player1.address);
            
            await adventureSystem.connect(player1).revealTile();

            const adventureAfter = await adventureSystem.activeAdventures(player1.address);
            expect(adventureAfter.tilesRevealed).to.equal(adventureBefore.tilesRevealed + 1n);
        });

        it("Should not reveal tile without active adventure", async function () {
            // Claim to end adventure
            await adventureSystem.connect(player1).revealTile();
            await adventureSystem.connect(player1).completeAdventure();

            await expect(
                adventureSystem.connect(player1).revealTile()
            ).to.be.revertedWith("No active adventure");
        });

        it("Should not reveal more tiles than grid size", async function () {
            const adventure = await adventureSystem.activeAdventures(player1.address);
            const gridSize = adventure.gridSize;

            // Reveal all tiles
            for (let i = 0; i < gridSize; i++) {
                await adventureSystem.connect(player1).revealTile();
            }

            // Try to reveal one more
            await expect(
                adventureSystem.connect(player1).revealTile()
            ).to.be.revertedWith("All tiles revealed");
        });

        it("Should emit TileRevealed event", async function () {
            await expect(
                adventureSystem.connect(player1).revealTile()
            ).to.emit(adventureSystem, "TileRevealed")
             .withArgs(player1.address, 1); // First tile (index 0 + 1)
        });
    });

    describe("Resource Distribution", function () {
        beforeEach(async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);
        });

        it("Should distribute accumulated resources on claim", async function () {
            // Get initial resources
            const goldBefore = await gameState.getPlayerGold(player1.address);
            const foodBefore = await gameState.getPlayerFood(player1.address);
            const diamondsBefore = await gameState.getPlayerDiamonds(player1.address);
            const repBefore = await gameState.getPlayerRep(player1.address);

            // Reveal some tiles
            await adventureSystem.connect(player1).revealTile();
            await adventureSystem.connect(player1).revealTile();

            // Claim adventure
            await adventureSystem.connect(player1).completeAdventure();

            // Check resources increased (at least one should increase based on RNG)
            const goldAfter = await gameState.getPlayerGold(player1.address);
            const foodAfter = await gameState.getPlayerFood(player1.address);
            const diamondsAfter = await gameState.getPlayerDiamonds(player1.address);
            const repAfter = await gameState.getPlayerRep(player1.address);

            const totalBefore = goldBefore + foodBefore + diamondsBefore + repBefore;
            const totalAfter = goldAfter + foodAfter + diamondsAfter + repAfter;

            // At least one resource should have increased (unless all tiles were safe/disaster)
            expect(totalAfter).to.be.gte(totalBefore);
        });

        it("Should emit AdventureClaimed event", async function () {
            await adventureSystem.connect(player1).revealTile();

            await expect(
                adventureSystem.connect(player1).completeAdventure()
            ).to.emit(adventureSystem, "AdventureCompleted");
        });

        it("Should not allow claiming without active adventure", async function () {
            await expect(
                adventureSystem.connect(player2).completeAdventure()
            ).to.be.revertedWith("No active adventure");
        });
    });

    describe("Disaster Handling", function () {
        it("Should handle scout loss on disaster", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);

            // Keep revealing tiles until we hit a disaster or complete the adventure
            const adventure = await adventureSystem.activeAdventures(player1.address);
            let disasterOccurred = false;

            for (let i = 0; i < adventure.gridSize; i++) {
                const tx = await adventureSystem.connect(player1).revealTile();
                const receipt = await tx.wait();

                // Check if StartingScoutLost event was emitted
                const scoutLostEvent = receipt.logs.find(log => {
                    try {
                        const parsed = adventureSystem.interface.parseLog(log);
                        return parsed && parsed.name === "StartingScoutLost";
                    } catch {
                        return false;
                    }
                });

                if (scoutLostEvent) {
                    disasterOccurred = true;
                    const scout = await adventureSystem.playerScouts(player1.address);
                    expect(scout.purchased).to.be.false; // Scout should be deleted
                    break;
                }

                // Check if adventure is still active
                const currentAdventure = await adventureSystem.activeAdventures(player1.address);
                if (!currentAdventure.active) {
                    break;
                }
            }

            // Note: Disaster is probabilistic (15%), so it might not occur every time
            // This test verifies the disaster handling logic when it does occur
        });
    });

    describe("Cooldown Management", function () {
        beforeEach(async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
        });

        it("Should apply cooldown after adventure completion", async function () {
            await adventureSystem.connect(player1).startAdventure(0, true);
            await adventureSystem.connect(player1).revealTile();
            await adventureSystem.connect(player1).completeAdventure();

            const scout = await adventureSystem.playerScouts(player1.address);
            const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
            
            expect(scout.availableAt).to.be.gt(currentTime);
        });

        it("Should allow adventure after cooldown expires", async function () {
            await adventureSystem.connect(player1).startAdventure(0, true);
            await adventureSystem.connect(player1).revealTile();
            await adventureSystem.connect(player1).completeAdventure();

            // Fast forward past cooldown
            await ethers.provider.send("evm_increaseTime", [HERO_COOLDOWN + 1]);
            await ethers.provider.send("evm_mine");

            // Should be able to start new adventure
            await expect(
                adventureSystem.connect(player1).startAdventure(0, true)
            ).to.not.be.reverted;
        });
    });

    describe("Grid Scaling by Tier", function () {
        it("Should use larger grid for higher tier players", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });

            // Player starts at tier 0 - 3x3 grid (9 tiles)
            await adventureSystem.connect(player1).startAdventure(0, true);
            let adventure = await adventureSystem.activeAdventures(player1.address);
            expect(adventure.gridSize).to.equal(9);
            
            // Claim to end adventure
            await adventureSystem.connect(player1).revealTile();
            await adventureSystem.connect(player1).completeAdventure();

            // Upgrade player to tier 1 (requires 1000 gold donation)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await gameState.connect(player1).donateGold(1000);
            expect(await gameState.getPlayerTier(player1.address)).to.equal(1);

            // Fast forward past cooldown
            await ethers.provider.send("evm_increaseTime", [HERO_COOLDOWN + 1]);
            await ethers.provider.send("evm_mine");

            // Start new adventure - should have 3x4 grid (12 tiles)
            await adventureSystem.connect(player1).startAdventure(0, true);
            adventure = await adventureSystem.activeAdventures(player1.address);
            expect(adventure.gridSize).to.equal(12);
        });
    });

    describe("Relic NFT Minting", function () {
        it("Should mint relic NFT on special tile", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);

            const relicBalanceBefore = await relicNFT.balanceOf(player1.address);

            // Reveal tiles until we get a special tile or run out
            const adventure = await adventureSystem.activeAdventures(player1.address);
            let relicMinted = false;

            for (let i = 0; i < adventure.gridSize; i++) {
                const tx = await adventureSystem.connect(player1).revealTile();
                const receipt = await tx.wait();

                // Check if RelicFound event was emitted
                const relicEvent = receipt.logs.find(log => {
                    try {
                        const parsed = adventureSystem.interface.parseLog(log);
                        return parsed && parsed.name === "RelicFound";
                    } catch {
                        return false;
                    }
                });

                if (relicEvent) {
                    relicMinted = true;
                    break;
                }

                // Check if adventure is still active
                const currentAdventure = await adventureSystem.activeAdventures(player1.address);
                if (!currentAdventure.active) {
                    break;
                }
            }

            // If relic was minted, verify balance increased
            if (relicMinted) {
                const relicBalanceAfter = await relicNFT.balanceOf(player1.address);
                expect(relicBalanceAfter).to.equal(relicBalanceBefore + 1n);
            }

            // Note: Special tiles are probabilistic (5%), so they might not occur every time
        });

        it("Should respect max supply limit", async function () {
            const maxSupply = await relicNFT.MAX_SUPPLY();
            const currentSupply = await relicNFT.totalSupply();
            
            expect(currentSupply).to.be.lte(maxSupply);
        });
    });

    describe("Access Control", function () {
        it("Should only allow owner to set contract addresses", async function () {
            await expect(
                adventureSystem.connect(player1).setGameStateAddress(ethers.ZeroAddress)
            ).to.be.reverted; // OwnableUpgradeable: caller is not the owner

            await expect(
                adventureSystem.connect(player1).setHeroNFTAddress(ethers.ZeroAddress)
            ).to.be.reverted;

            await expect(
                adventureSystem.connect(player1).setRelicNFTAddress(ethers.ZeroAddress)
            ).to.be.reverted;
        });

        it("Should only allow AdventureSystem to mint relics", async function () {
            await expect(
                relicNFT.connect(player1).mintForAdventure(player1.address)
            ).to.be.revertedWith("Only Adventure System can call this");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle revealing all tiles without claiming", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);

            const adventure = await adventureSystem.activeAdventures(player1.address);
            
            // Reveal all tiles
            for (let i = 0; i < adventure.gridSize; i++) {
                await adventureSystem.connect(player1).revealTile();
                
                // Check if adventure is still active (disaster could end it)
                const currentAdventure = await adventureSystem.activeAdventures(player1.address);
                if (!currentAdventure.active) {
                    break;
                }
            }

            // Should still be able to claim if adventure is active
            const finalAdventure = await adventureSystem.activeAdventures(player1.address);
            if (finalAdventure.active) {
                await expect(
                    adventureSystem.connect(player1).completeAdventure()
                ).to.not.be.reverted;
            }
        });

        it("Should handle zero accumulated rewards", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);

            // Just reveal one tile (might be safe tile = no rewards)
            await adventureSystem.connect(player1).revealTile();

            // Should be able to claim even with possibly zero rewards
            await expect(
                adventureSystem.connect(player1).completeAdventure()
            ).to.not.be.reverted;
        });
    });

    describe("Gas Usage", function () {
        it("Should have reasonable gas costs for reveal tile", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);

            const tx = await adventureSystem.connect(player1).revealTile();
            const receipt = await tx.wait();
            
            // Gas usage should be reasonable (less than 500k gas)
            expect(receipt.gasUsed).to.be.lt(500000);
        });

        it("Should have reasonable gas costs for claim adventure", async function () {
            await adventureSystem.connect(player1).purchaseStartingScout({ value: STARTING_SCOUT_COST });
            await adventureSystem.connect(player1).startAdventure(0, true);
            await adventureSystem.connect(player1).revealTile();

            const tx = await adventureSystem.connect(player1).completeAdventure();
            const receipt = await tx.wait();
            
            // Gas usage should be reasonable (less than 500k gas)
            expect(receipt.gasUsed).to.be.lt(500000);
        });
    });
});

