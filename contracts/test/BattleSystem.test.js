const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, getDamagedBuildingId, donateGoldForTier, ensurePlayerGold } = require("./helpers");

describe("BattleSystem", function () {
    let battleSystem;
    let gameState;
    let districtBuildings;
    let gridBuildings;
    let altar;
    let sonicityNFT;
    let owner;
    let player1;
    let player2;
    let player3;

    beforeEach(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        // Deploy SonicityNFT
        const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
        sonicityNFT = await SonicityNFT.deploy();
        await sonicityNFT.waitForDeployment();
        const sonicityNFTAddress = await sonicityNFT.getAddress();

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

        // Deploy DistrictBuildings
        const DistrictBuildings = await ethers.getContractFactory("DistrictBuildings");
        districtBuildings = await upgrades.deployProxy(DistrictBuildings, [], { initializer: 'initialize' });
        await districtBuildings.waitForDeployment();
        const districtBuildingsAddress = await districtBuildings.getAddress();

        // Deploy Altar
        const Altar = await ethers.getContractFactory("Altar");
        altar = await upgrades.deployProxy(Altar, [
            gameStateAddress,
            gridBuildingsAddress
        ], { initializer: 'initialize' });
        await altar.waitForDeployment();
        const altarAddress = await altar.getAddress();

        // Deploy BattleSystem
        const BattleSystem = await ethers.getContractFactory("BattleSystem");
        battleSystem = await upgrades.deployProxy(BattleSystem, [], { initializer: 'initialize' });
        await battleSystem.waitForDeployment();
        const battleSystemAddress = await battleSystem.getAddress();

        // Set up contract references
        await gameState.setAltarAddress(altarAddress);
        await gameState.setGridBuildingsAddress(gridBuildingsAddress);
        await gameState.setBattleSystemAddress(battleSystemAddress);
        await gameState.setDistrictBuildingsAddress(districtBuildingsAddress);

        await gridBuildings.setGameStateAddress(gameStateAddress);
        await gridBuildings.setAltarAddress(altarAddress);

        await districtBuildings.setGameStateAddress(gameStateAddress);
        await districtBuildings.setBattleSystemAddress(battleSystemAddress);

        await battleSystem.setGameStateAddress(gameStateAddress);
        await battleSystem.setDistrictBuildingsAddress(districtBuildingsAddress);
        await battleSystem.setGridBuildingsAddress(gridBuildingsAddress);

        // Approve NFT collection in Altar
        await altar.approveCollection(sonicityNFTAddress);

        // Initialize players
        await gameState.connect(player1).initializePlayer();
        await gameState.connect(player2).initializePlayer();
        await gameState.connect(player3).initializePlayer();

        // Setup initial resources for players
        await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
        await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
        await ensurePlayerGold(player3, gameState, gridBuildings, altar, sonicityNFT, 1000);

        // Setup defense towers for players
        await districtBuildings.connect(player1).buildDefenseTower();
        await districtBuildings.connect(player2).buildDefenseTower();
        await districtBuildings.connect(player3).buildDefenseTower();
    });

    describe("Troop Training", function () {
        it("should allow players to train infantry", async function () {
            const amount = 5;
            await battleSystem.connect(player1).trainTroops(0, amount); // 0 = INFANTRY
            
            const infantryCount = await battleSystem.playerTroops(player1.address, 0);
            expect(infantryCount).to.equal(amount);
        });

        it("should allow players to train cavalry", async function () {
            const amount = 3;
            await battleSystem.connect(player1).trainTroops(1, amount); // 1 = CAVALRY
            
            const cavalryCount = await battleSystem.playerTroops(player1.address, 1);
            expect(cavalryCount).to.equal(amount);
        });

        it("should allow players to train siege units", async function () {
            const amount = 2;
            await battleSystem.connect(player1).trainTroops(2, amount); // 2 = SIEGE
            
            const siegeCount = await battleSystem.playerTroops(player1.address, 2);
            expect(siegeCount).to.equal(amount);
        });

        it("should fail if player doesn't have enough resources", async function () {
            await gameState.connect(player1).donateGold(1000); // Donate all gold
            
            await expect(
                battleSystem.connect(player1).trainTroops(0, 1)
            ).to.be.revertedWith("Failed to deduct resources");
        });
    });

    describe("Battle Mechanics", function () {
        beforeEach(async function () {
            // Train some troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege
        });

        it("should allow players to start a battle", async function () {
            await battleSystem.connect(player1).startBattle(
                player2.address,
                5, // infantry
                2, // cavalry
                1  // siege
            );

            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.attacker).to.equal(player1.address);
            expect(battle.defender).to.equal(player2.address);
            expect(battle.resolved).to.equal(false);
        });

        it("should fail if attacker doesn't have enough troops", async function () {
            await expect(
                battleSystem.connect(player1).startBattle(
                    player2.address,
                    20, // too many infantry
                    2,
                    1
                )
            ).to.be.revertedWith("Not enough infantry");
        });

        it("should fail if trying to attack yourself", async function () {
            await expect(
                battleSystem.connect(player1).startBattle(
                    player1.address,
                    5,
                    2,
                    1
                )
            ).to.be.revertedWith("Cannot attack yourself");
        });

        it("should fail if defender is already in a battle", async function () {
            // Start first battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
                5,
                2,
                1
            );

            // Try to start second battle with same defender
            await expect(
                battleSystem.connect(player3).startBattle(
                    player2.address,
                    5,
                    2,
                    1
                )
            ).to.be.revertedWith("Defender already in a battle");
        });
    });

    describe("Matchmaking", function () {
        beforeEach(async function () {
            // Upgrade players to tier 1
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await donateGoldForTier(player3, gameState, gridBuildings, altar, sonicityNFT, 1000);
        });

        it("should allow players to register for matchmaking", async function () {
            await battleSystem.connect(player1).registerForMatchmaking();
            
            const isRegistered = await battleSystem.isRegisteredForMatchmaking(player1.address);
            expect(isRegistered).to.equal(true);
        });

        it("should fail to register if player tier is too low", async function () {
            // Reset player tier to 0
            await gameState.connect(owner).setPlayerTier(player1.address, 0);
            
            await expect(
                battleSystem.connect(player1).registerForMatchmaking()
            ).to.be.revertedWith("Must be tier 1 or higher to register");
        });

        it("should allow players to unregister from matchmaking", async function () {
            await battleSystem.connect(player1).registerForMatchmaking();
            await battleSystem.connect(player1).unregisterFromMatchmaking();
            
            const isRegistered = await battleSystem.isRegisteredForMatchmaking(player1.address);
            expect(isRegistered).to.equal(false);
        });

        it("should find potential opponents", async function () {
            // Register multiple players
            await battleSystem.connect(player1).registerForMatchmaking();
            await battleSystem.connect(player2).registerForMatchmaking();
            await battleSystem.connect(player3).registerForMatchmaking();

            const opponents = await battleSystem.connect(player1).findPotentialOpponents();
            expect(opponents.length).to.equal(2); // Should find player2 and player3
        });

        it("should find a random opponent", async function () {
            // Register multiple players
            await battleSystem.connect(player1).registerForMatchmaking();
            await battleSystem.connect(player2).registerForMatchmaking();
            await battleSystem.connect(player3).registerForMatchmaking();

            const opponent = await battleSystem.connect(player1).findRandomOpponent();
            expect(opponent).to.not.equal(ethers.constants.AddressZero);
            expect(opponent).to.not.equal(player1.address);
        });
    });

    describe("Battle Resolution", function () {
        beforeEach(async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10);
            await battleSystem.connect(player1).trainTroops(1, 5);
            await battleSystem.connect(player1).trainTroops(2, 3);

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
                5,
                2,
                1
            );
        });

        it("should fail to resolve battle before duration has passed", async function () {
            await expect(
                battleSystem.connect(player1).resolveBattle(player1.address)
            ).to.be.revertedWith("Battle duration not elapsed");
        });

        it("should resolve battle after duration has passed", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 hours
            await ethers.provider.send("evm_mine");

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.resolved).to.equal(true);
        });

        it("should record battle history after resolution", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battleRecord = await battleSystem.battleHistory(0);
            expect(battleRecord.attacker).to.equal(player1.address);
            expect(battleRecord.defender).to.equal(player2.address);
        });

        it("should apply battle effects (treasury burn, building damage)", async function () {
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Get initial state
            const initialTreasury = await gameState.getPlayerTreasury(player2.address);
            const initialGridBuildings = await gridBuildings.buildingCounts(player2.address, GridBuildingType.HOUSE);
            const initialDistrictBuildings = await districtBuildings.getDefenseTowerLevel(player2.address);

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.treasuryBurned).to.be.gt(0);
            expect(battle.gridBuildingsDamaged).to.be.gt(0);
            expect(battle.districtBuildingsDamaged).to.be.gt(0);

            // Verify effects were applied
            const finalTreasury = await gameState.getPlayerTreasury(player2.address);
            expect(finalTreasury).to.be.lt(initialTreasury);

            const finalGridBuildings = await gridBuildings.buildingCounts(player2.address, GridBuildingType.HOUSE);
            expect(finalGridBuildings).to.be.lt(initialGridBuildings);

            const finalDistrictBuildings = await districtBuildings.getDefenseTowerLevel(player2.address);
            expect(finalDistrictBuildings).to.be.lt(initialDistrictBuildings);
        });
    });
}); 