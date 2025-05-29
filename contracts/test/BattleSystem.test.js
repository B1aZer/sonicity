const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, getDamagedBuildingId, donateGoldForTier, ensurePlayerGold, ensurePlayerFood } = require("./helpers");

describe("BattleSystem", function () {
    let battleSystem;
    let gameState;
    let districtBuildings;
    let gridBuildings;
    let altar;
    let sonicityNFT;
    let farmNFT;
    let owner;
    let player1;
    let player2;
    let player3;
    let buildingNames;
    let getBuildingTypeIndex;
    let barracksIndex;

    beforeEach(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        // Deploy SonicityNFT (for houses)
        const SonicityNFT = await ethers.getContractFactory("SonicityNFT");
        sonicityNFT = await SonicityNFT.deploy();
        await sonicityNFT.waitForDeployment();
        const sonicityNFTAddress = await sonicityNFT.getAddress();

        // Deploy FarmNFT (for farms)
        const FarmNFT = await ethers.getContractFactory("SonicityNFT");
        farmNFT = await FarmNFT.deploy();
        await farmNFT.waitForDeployment();
        const farmNFTAddress = await farmNFT.getAddress();

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

        // Set minimum staking duration to 0 for testing
        await altar.connect(owner).setMinStakingDuration(0);

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
        await gridBuildings.setBattleSystemAddress(battleSystemAddress);

        await districtBuildings.setGameStateAddress(gameStateAddress);
        await districtBuildings.setBattleSystemAddress(battleSystemAddress);

        await battleSystem.setGameStateAddress(gameStateAddress);
        await battleSystem.setDistrictBuildingsAddress(districtBuildingsAddress);
        await battleSystem.setGridBuildingsAddress(gridBuildingsAddress);

        // Approve NFT collections in Altar
        await altar.approveCollection(sonicityNFTAddress);
        await altar.approveCollection(farmNFTAddress);

        // Initialize players
        await gameState.connect(player1).initializePlayer();
        await gameState.connect(player2).initializePlayer();
        await gameState.connect(player3).initializePlayer();

        // Fetch building names from contract
        buildingNames = await districtBuildings.getBuildingNames();
        getBuildingTypeIndex = (name) => buildingNames.findIndex(n => n === name);

        barracksIndex = getBuildingTypeIndex("BARRACKS");

        // Setup initial resources for players and unlock tier 1
        await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1500); // 1000 for tier 1 + 500 for building

        // Now build the defense tower for each player
        const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
        await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);
        // await districtBuildings.connect(player2).buildDistrictBuilding(defenseTowerIndex); // Do not create defense tower for player2
        // await districtBuildings.connect(player3).buildDistrictBuilding(defenseTowerIndex); // DEFENSE_TOWER
    });

    describe("Troop Training", function () {
        beforeEach(async function () {    
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
        });

        it("should allow players to train infantry", async function () {
            const amount = 5;

            // Ensure each player has enough resources for training troops
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100 * amount); // 100 gold per infantry
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, 50 * amount);  // 50 food per infantry

            await battleSystem.connect(player1).trainTroops(0, amount); // 0 = INFANTRY
            
            const infantryCount = await battleSystem.playerTroops(player1.address, 0);
            expect(infantryCount).to.equal(amount);
        });

        it("should allow players to train cavalry", async function () {
            // Upgrade barracks to level 2 for cavalry
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500); // 500 gold for upgrade
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Upgrade BARRACKS to level 2

            const amount = 3;
            // Ensure resources for cavalry (200 gold, 100 food each)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 200 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, 100 * amount);
                     
            await battleSystem.connect(player1).trainTroops(1, amount); // 1 = CAVALRY
            
            const cavalryCount = await battleSystem.playerTroops(player1.address, 1);
            expect(cavalryCount).to.equal(amount);
        });

        it("should allow players to train siege units", async function () {
            // Upgrade barracks to level 3 for siege units
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1500); // 500/1000 gold for each upgrade
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Upgrade to level 2
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Upgrade to level 3

            const amount = 2;
            // Ensure resources for siege units (300 gold, 150 food each)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 300 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, 150 * amount);
                     
            await battleSystem.connect(player1).trainTroops(2, amount); // 2 = SIEGE
            
            const siegeCount = await battleSystem.playerTroops(player1.address, 2);
            expect(siegeCount).to.equal(amount);
        });

        it("should fail if player doesn't have enough resources", async function () {
            await expect(
                battleSystem.connect(player1).trainTroops(0, 1)
            ).to.be.revertedWith("Insufficient food");
        });
    });

    describe("Battle Mechanics", function () {
        beforeEach(async function () {
            // Calculate total resources needed
            const infantryCount = 10;
            const cavalryCount = 5;
            const siegeCount = 3;

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 2500); // 1500 gold for upgrade
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Upgrade BARRACKS to level 2
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);

            // Infantry: 100 gold, 50 food each
            // Cavalry: 200 gold, 100 food each
            // Siege: 300 gold, 150 food each
            const totalGoldNeeded = (infantryCount * 100) + (cavalryCount * 200) + (siegeCount * 300);
            const totalFoodNeeded = (infantryCount * 50) + (cavalryCount * 100) + (siegeCount * 150);

            // Ensure player has enough resources
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, totalGoldNeeded);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, totalFoodNeeded);

            // Log player's current resources
            const gold = await gameState.getPlayerGold(player1.address);
            const food = await gameState.getPlayerFood(player1.address);

            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, infantryCount); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, cavalryCount);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, siegeCount);  // 3 siege

            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);
        });

        it("should allow players to start a battle", async function () {
           
            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1100);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);

            // Register players for matchmaking by donating gold to reach tier 1
            await gameState.connect(player1).donateGold(1000); // This will register player1
            await gameState.connect(player2).donateGold(1000); // This will register player2

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            
            // Start battle with troop counts
            await battleSystem.connect(player1).startBattle(
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
            // Register player2 for matchmaking
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);

            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            await battleSystem.connect(player1).findRandomOpponent();
            
            await expect(
                battleSystem.connect(player1).startBattle(
                    20, // too many infantry
                    2,
                    1
                )
            ).to.be.revertedWith("Not enough infantry");
        });

        it("should fail if no valid opponent is found", async function () {
            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Register player1 for matchmaking
            // await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent - should return zero address since no other players are registered
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;
            expect(opponent).to.equal(ethers.ZeroAddress);
            
            // Try to start battle - should fail because no valid opponent was found
            await expect(
                battleSystem.connect(player1).startBattle(
                    5,
                    2,
                    1
                )
            ).to.be.revertedWith("No opponent found");
        });

        it("should not find any opponent when all other players are in battle", async function () {
            // Ensure players have enough gold
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);


            // Register players for matchmaking
            await gameState.connect(player1).donateGold(100);
            await gameState.connect(player2).donateGold(100);
  

            // Start first battle
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent for player1
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;
            expect(opponent).to.equal(player2.address); // Verify we found player2
            
            // Start first battle
            await battleSystem.connect(player1).startBattle(5, 2, 1);

            await donateGoldForTier(player3, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await gameState.connect(player3).donateGold(100);

            // Now player3 tries to find an opponent
            await battleSystem.connect(player3).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent for player3 - should return zero address since both player1 and player2 are in battle
            const tx3 = await battleSystem.connect(player3).findRandomOpponent();
            await tx3.wait();
            const searchStatus3 = await battleSystem.connect(player3).checkSearchStatus();
            const opponent3 = searchStatus3.foundOpponent;
            expect(opponent3).to.equal(ethers.ZeroAddress);
            
            // Verify that player3 cannot start a battle
            await expect(
                battleSystem.connect(player3).startBattle(5, 2, 1)
            ).to.be.revertedWith("No opponent found");
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
            // Register for matchmaking by donating gold to reach tier 1
            await gameState.connect(player1).donateGold(1000);
            
            const isRegistered = await battleSystem.isRegisteredForMatchmaking(player1.address);
            expect(isRegistered).to.equal(true);
        });

        it("should fail to register if player tier is too low", async function () {
            // Create a new player that will be at tier 0
            const [newPlayer] = await ethers.getSigners();
            await gameState.connect(newPlayer).initializePlayer();
            
            await expect(
                gameState.connect(newPlayer).donateGold(1000)
            ).to.be.revertedWith("Insufficient Gold");
        });

        it("should allow players to unregister from matchmaking", async function () {
            // Register for matchmaking by donating gold to reach tier 1
            await gameState.connect(player1).donateGold(1000);
            await battleSystem.connect(player1).unregisterFromMatchmaking();
            
            const isRegistered = await battleSystem.isRegisteredForMatchmaking(player1.address);
            expect(isRegistered).to.equal(false);
        });

        it("should return zero address based on noOpponentFoundChance", async function () {
            // Set noOpponentFoundChance to 100 to always return zero address
            await battleSystem.connect(owner).setNoOpponentFoundChance(100);

            // Start search first
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");

            // Should always return zero address due to 100% chance
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;
            expect(opponent).to.equal(ethers.ZeroAddress);
        });

        it("should demonstrate randomness with different probability settings", async function () {
            // Test with 50% chance of finding opponent
            await battleSystem.connect(owner).setNoOpponentFoundChance(50);
            
            const attempts = 100;
            let zeroAddressCount = 0;
            const foundOpponents = new Set();

            for (let i = 0; i < attempts; i++) {
                await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
                // Start search
                await battleSystem.connect(player1).startSearch();
                
                // Fast forward time
                await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
                await ethers.provider.send("evm_mine");
                
                // Find opponent
                const tx = await battleSystem.connect(player1).findRandomOpponent();
                await tx.wait();
                
                // Get opponent using checkSearchStatus
                const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
                const opponent = searchStatus.foundOpponent;
                
                if (opponent === ethers.ZeroAddress) {
                    zeroAddressCount++;
                } else {
                    foundOpponents.add(opponent);
                }

                await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
                await ethers.provider.send("evm_mine");
            }

            // With 50% chance, we should get roughly half zero addresses
            expect(zeroAddressCount).to.be.gt(attempts * 0.3); // At least 30% zero addresses
            expect(zeroAddressCount).to.be.lt(attempts * 0.7); // At most 70% zero addresses

            // When we got valid opponents, they should be either player2 or player3
            for (const opponent of foundOpponents) {
                expect([player2.address, player3.address]).to.include(opponent);
            }
        });
    });

    describe("Battle Resolution", function () {
        beforeEach(async function () {
            // Calculate total resources needed
            const infantryCount = 10;
            const cavalryCount = 5;
            const siegeCount = 3;

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 2500); // 1500 gold for upgrade
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Upgrade BARRACKS to level 2
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            
            // Infantry: 100 gold, 50 food each
            // Cavalry: 200 gold, 100 food each
            // Siege: 300 gold, 150 food each
            const totalGoldNeeded = (infantryCount * 100) + (cavalryCount * 200) + (siegeCount * 300);
            const totalFoodNeeded = (infantryCount * 50) + (cavalryCount * 100) + (siegeCount * 150);

            // Ensure player has enough resources
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, totalGoldNeeded);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, totalFoodNeeded);

            // Configure troop damage chances
            await battleSystem.connect(owner).setTroopConfig(
                0, // INFANTRY
                100, // goldCost
                50, // foodCost
                10, // power
                0, // gridDamageChance (20%)
                0, // districtDamageChance (10%)
                0   // treasuryBurnChance (5%)
            );

            await battleSystem.connect(owner).setTroopConfig(
                1, // CAVALRY
                200, // goldCost
                100, // foodCost
                15, // power
                100, // gridDamageChance (30%)
                0, // districtDamageChance (20%)
                0  // treasuryBurnChance (10%)
            );

            await battleSystem.connect(owner).setTroopConfig(
                2, // SIEGE
                300, // goldCost
                150, // foodCost
                20, // power
                0, // gridDamageChance (40%)
                100, // districtDamageChance (30%)
                100  // treasuryBurnChance (15%)
            );

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);

            await battleSystem.connect(owner).setNoOpponentFoundChance(0);

        });

        it("should fail to resolve battle before duration has passed", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle with troop counts
            await battleSystem.connect(player1).startBattle(
                5, // infantry
                2, // cavalry
                1  // siege
            );

            await expect(
                battleSystem.connect(player1).resolveBattle(player1.address)
            ).to.be.revertedWith("Battle duration not elapsed");
        });

        it("should apply battle effects (treasury burn, building damage)", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                5,
                2,
                1
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Resolve battle and capture debug events
            const resolveTx = await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);

            console.log("\nBattle Record in q:");
            console.log("should not apply battle effects (equal power)");
            console.log("----------------------------------------");
            console.log("Attacker:", battle.attacker);
            console.log("Defender:", battle.defender);
            console.log("Start Time:", new Date(Number(battle.startTime) * 1000).toISOString());
            console.log("Resolved:", battle.resolved);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battle.attackerPower.toString());
            console.log("  Defender Power:", battle.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battle.repPoints).to.be.gt(0);
            expect(battle.treasuryBurned).to.be.gt(0);
            expect(battle.gridBuildingsDamaged).to.be.gt(0);
            expect(battle.districtBuildingsDamaged).to.be.gt(0);
        });

        it("should apply battle effects (grid buildings damage)", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                0,
                2,
                0
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Resolve battle and capture debug events
            const resolveTx = await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);

            console.log("\nBattle Record in q:");
            console.log("should apply battle effects (grid buildings damage)");
            console.log("----------------------------------------");
            console.log("Attacker:", battle.attacker);
            console.log("Defender:", battle.defender);
            console.log("Start Time:", new Date(Number(battle.startTime) * 1000).toISOString());
            console.log("Resolved:", battle.resolved);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battle.attackerPower.toString());
            console.log("  Defender Power:", battle.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battle.repPoints).to.be.gt(0);
            expect(battle.treasuryBurned, "Treasury burn should be 0").to.be.eq(0);
            expect(battle.gridBuildingsDamaged, "Grid buildings damage should be greater than 0").to.be.gt(0);
            expect(battle.districtBuildingsDamaged, "District buildings damage should be equal to 0").to.be.eq(0);
        });

        it("should apply battle effects (district buildings damage)", async function () {

            await battleSystem.connect(owner).setTroopConfig(
                2, // SIEGE
                300, // goldCost
                150, // foodCost
                20, // power
                0, // gridDamageChance (40%)
                100, // districtDamageChance (30%)
                0  // treasuryBurnChance (15%)
            );

            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege
            

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                0,
                0,
                1
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Resolve battle and capture debug events
            const resolveTx = await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);

            console.log("\nBattle Record in q:");
            console.log("should not apply battle effects (equal power)");
            console.log("----------------------------------------");
            console.log("Attacker:", battle.attacker);
            console.log("Defender:", battle.defender);
            console.log("Start Time:", new Date(Number(battle.startTime) * 1000).toISOString());
            console.log("Resolved:", battle.resolved);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battle.attackerPower.toString());
            console.log("  Defender Power:", battle.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battle.repPoints).to.be.gt(0);
            expect(battle.treasuryBurned, "Treasury burn should be equal to 0").to.be.eq(0);
            expect(battle.gridBuildingsDamaged, "Grid buildings damage should be equal to 0").to.be.eq(0);
            expect(battle.districtBuildingsDamaged, "District buildings damage should be greater than 0").to.be.gt(0);
        });

        it("should apply battle effects (only rep points)", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            //await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex); // DEFENSE_TOWER

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                5,
                0,
                0
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Get initial state
            const initialTreasury = await gameState.getPlayerTreasury(player2.address);
            const initialGridBuildings = await gridBuildings.getActiveBuildings(player2.address);
            const initialDistrictBuildings = await districtBuildings.getBuiltDistrictBuildings(player2.address);
            const initialDistrictBuildingsPower = await districtBuildings.getDefenseTowerPower(player2.address);

            // Log detailed building information for player2
            console.log("\nPlayer2's Building State Before Battle:");
            console.log("----------------------------------------");
            
            // District Buildings
            console.log(`District Buildings: ${initialDistrictBuildings.length}`);
            const buildingTypeCount = await districtBuildings.getDistrictBuildingTypeCount();
            for (let i = 0; i < buildingTypeCount; i++) {
                const building = await districtBuildings.buildings(player2.address, i);
                if (building.active) {
                    const config = await districtBuildings.districtBuildingConfigs(i);
                    console.log(`  ${config.name}:`, {
                        level: building.level.toString(),
                        active: building.active,
                        damaged: building.damaged
                    });
                }
            }

            // Grid Buildings
            const activeBuildings = await gridBuildings.getActiveBuildings(player2.address);
            console.log(`\nGrid Buildings: ${activeBuildings.length} active`);
            for (let i = 0; i < activeBuildings.length; i++) {
                const buildingId = activeBuildings[i];
                const building = await gridBuildings.buildings(player2.address, buildingId);
                console.log(`  Building ${buildingId}:`, {
                    type: building.buildingType.toString(),
                    level: building.level.toString(),
                    damaged: building.damaged,
                    lastUpgradeTime: building.lastUpgradeTime.toString(),
                    lastCollectionTime: building.lastCollectionTime.toString()
                });
            }

            console.log("\nDefense Tower Power:", initialDistrictBuildingsPower.toString());
            console.log("----------------------------------------\n");

            // Resolve battle and capture debug events
            const resolveTx = await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);
            console.log("\nBattle Record:");
            console.log("should apply battle effects (treasury burn, building damage)");
            console.log("----------------------------------------");
            console.log("Attacker:", battle.attacker);
            console.log("Defender:", battle.defender);
            console.log("Start Time:", new Date(Number(battle.startTime) * 1000).toISOString());
            console.log("Resolved:", battle.resolved);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battle.attackerPower.toString());
            console.log("  Defender Power:", battle.defenderPower.toString());
            console.log("\nBattle Effects:");
            console.log("  Treasury Burned:", battle.treasuryBurned.toString());
            console.log("  Grid Buildings Damaged:", battle.gridBuildingsDamaged.toString());
            console.log("  District Buildings Damaged:", battle.districtBuildingsDamaged.toString());
            console.log("  REP Points Awarded:", battle.repPoints.toString());
            console.log("----------------------------------------\n");

            expect(battle.repPoints).to.be.gt(0);
            expect(battle.gridBuildingsDamaged).to.be.eq(0);
            expect(battle.districtBuildingsDamaged).to.be.eq(0);
        });

        it("should not apply battle effects (equal power)", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1750);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 700);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);
            await districtBuildings.connect(player2).buildDistrictBuilding(6); // COMMAND_CENTER

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                5,
                2,
                1
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 hours
            await ethers.provider.send("evm_mine");

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.resolved).to.equal(true);

            console.log("\nBattle Record:");
            console.log("should resolve battle after duration has passed for player2 without defense tower but with district buildings");
            console.log("----------------------------------------");
            console.log("Attacker:", battle.attacker);
            console.log("Defender:", battle.defender);
            console.log("Start Time:", new Date(Number(battle.startTime) * 1000).toISOString());
            console.log("Resolved:", battle.resolved);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battle.attackerPower.toString());
            console.log("  Defender Power:", battle.defenderPower.toString());
            console.log("\nBattle Effects:");
            console.log("  Treasury Burned:", battle.treasuryBurned.toString());
            console.log("  Grid Buildings Damaged:", battle.gridBuildingsDamaged.toString());
            console.log("  District Buildings Damaged:", battle.districtBuildingsDamaged.toString());
            console.log("  REP Points Awarded:", battle.repPoints.toString());
            console.log("----------------------------------------\n");

            expect(battle.treasuryBurned).to.be.eq(0);
            expect(battle.gridBuildingsDamaged).to.be.eq(0);
            expect(battle.districtBuildingsDamaged).to.be.eq(0);
        });

        it("should resolve battle after duration has passed for player2 without district buildings", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                5,
                2,
                1
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 hours
            await ethers.provider.send("evm_mine");

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.resolved).to.equal(true);
        });

        it("should resolve battle after duration has passed without grid buildings", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                5,
                2,
                1
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 hours
            await ethers.provider.send("evm_mine");

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.resolved).to.equal(true);
        });

        it("should record battle history after resolution", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Start search
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                5,
                2,
                1
            );

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            await battleSystem.connect(player1).resolveBattle(player1.address);
            
            const battleRecord = await battleSystem.battleHistory(0);
            expect(battleRecord.attacker).to.equal(player1.address);
            expect(battleRecord.defender).to.equal(player2.address);
        });
    });

    describe("Search functionality", function () {
        let searchCost;
        let searchDuration;

        beforeEach(async function () {
            // Get search parameters
            searchCost = await battleSystem.searchCost();
            searchDuration = await battleSystem.searchDuration();

            // Set up players with enough gold
            // Set player tiers
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await donateGoldForTier(player3, gameState, gridBuildings, altar, sonicityNFT, 1000);

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 100);
            await ensurePlayerGold(player3, gameState, gridBuildings, altar, sonicityNFT, 100);

            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);
        });

        it("Should start a search and deduct gold", async function () {
            const initialGold = await gameState.getPlayerGold(player1.address);
            
            await battleSystem.connect(player1).startSearch();
            
            const finalGold = await gameState.getPlayerGold(player1.address);
            expect(finalGold).to.equal(initialGold - searchCost);
            
            const search = await battleSystem.playerSearches(player1.address);
            expect(search.startTime).to.be.gt(0);
            expect(search.foundOpponent).to.equal(ethers.ZeroAddress);
        });

        it("Should not allow finding opponent before search duration", async function () {
            await battleSystem.connect(player1).startSearch();
            
            await expect(
                battleSystem.connect(player1).findRandomOpponent()
            ).to.be.revertedWith("Search not complete");
        });

        it("Should find opponent after search duration", async function () {
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;
            
            expect(opponent).to.not.equal(ethers.ZeroAddress);
            
            const search = await battleSystem.playerSearches(player1.address);
            expect(search.foundOpponent).to.equal(opponent);
        });

        it("Should not allow finding opponent twice", async function () {
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            await expect(
                battleSystem.connect(player1).findRandomOpponent()
            ).to.be.revertedWith("Already attempted to find opponent");
        });

        it("Should allow starting new search and reset found opponent", async function () {
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const firstOpponent = searchStatus.foundOpponent;
            
            // Start new search
            await battleSystem.connect(player1).startSearch();
            
            const search = await battleSystem.playerSearches(player1.address);
            expect(search.foundOpponent).to.equal(ethers.ZeroAddress);
            
            // Fast forward time again
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx2 = await battleSystem.connect(player1).findRandomOpponent();
            await tx2.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus2 = await battleSystem.connect(player1).checkSearchStatus();
            const secondOpponent = searchStatus2.foundOpponent;
            
            // Verify that both opponents are valid (either player2 or player3)
            expect([player2.address, player3.address]).to.include(firstOpponent);
            expect([player2.address, player3.address]).to.include(secondOpponent);
            
            // Note: We don't check if they're different because it's random
            // and we might get the same opponent twice
        });

        it("Should check search status correctly", async function () {
            await battleSystem.connect(player1).startSearch();
            
            let status = await battleSystem.connect(player1).checkSearchStatus();
            expect(status.completed).to.be.false;
            expect(status.timeRemaining).to.be.gt(0);
            expect(status.foundOpponent).to.equal(ethers.ZeroAddress);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            status = await battleSystem.connect(player1).checkSearchStatus();
            expect(status.completed).to.be.true;
            expect(status.timeRemaining).to.equal(0);
            expect(status.foundOpponent).to.equal(ethers.ZeroAddress);
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            status = await battleSystem.connect(player1).checkSearchStatus();
            expect(status.foundOpponent).to.not.equal(ethers.ZeroAddress);
        });

        it("Should not allow starting battle without found opponent", async function () {
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            await expect(
                battleSystem.connect(player1).startBattle(1, 1, 1)
            ).to.be.revertedWith("No opponent found");
        });

        it("Should not allow starting search while in battle", async function () {

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 250);
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);

            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            // Get opponent using checkSearchStatus
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;
            
            // Train some troops
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, 100);
            await battleSystem.connect(player1).trainTroops(0, 1); // Infantry
            
            await battleSystem.connect(player1).startBattle(1, 0, 0);
            
            await expect(
                battleSystem.connect(player1).startSearch()
            ).to.be.revertedWith("Already in a battle");
        });
    });
}); 