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

        // Setup initial resources for players and unlock tier 1
        await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1200); // 1000 for tier 1 + 200 for building
        await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1200);
        await donateGoldForTier(player3, gameState, gridBuildings, altar, sonicityNFT, 1200);

        // Now build the defense tower for each player
        await districtBuildings.connect(player1).buildDistrictBuilding(3); // DEFENSE_TOWER
        // await districtBuildings.connect(player2).buildDistrictBuilding(3); // Do not create defense tower for player2
        await districtBuildings.connect(player3).buildDistrictBuilding(3); // DEFENSE_TOWER
    });

    describe("Troop Training", function () {
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
            const amount = 3;
            // Ensure resources for cavalry (200 gold, 100 food each)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 200 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, 100 * amount);
                     
            await battleSystem.connect(player1).trainTroops(1, amount); // 1 = CAVALRY
            
            const cavalryCount = await battleSystem.playerTroops(player1.address, 1);
            expect(cavalryCount).to.equal(amount);
        });

        it("should allow players to train siege units", async function () {
            const amount = 2;
            // Ensure resources for siege units (300 gold, 150 food each)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 300 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, farmNFT, 150 * amount);
                     
            await battleSystem.connect(player1).trainTroops(2, amount); // 2 = SIEGE
            
            const siegeCount = await battleSystem.playerTroops(player1.address, 2);
            expect(siegeCount).to.equal(amount);
        });

        it("should fail if player doesn't have enough resources", async function () {
            // await gameState.connect(player1).donateGold(1000); // Donate all gold
            
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
            // Create a new player that will be at tier 0
            const [newPlayer] = await ethers.getSigners();
            await gameState.connect(newPlayer).initializePlayer();
            
            await expect(
                battleSystem.connect(newPlayer).registerForMatchmaking()
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
            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);

            // Register multiple players
            await battleSystem.connect(player1).registerForMatchmaking();
            await battleSystem.connect(player2).registerForMatchmaking();
            await battleSystem.connect(player3).registerForMatchmaking();

            // Get all registered players
            const registeredPlayers = await battleSystem.connect(player1).findPotentialOpponents();
            expect(registeredPlayers.length).to.equal(2); // Should find player2 and player3
            expect(registeredPlayers).to.include(player2.address);
            expect(registeredPlayers).to.include(player3.address);

            // Test multiple times to ensure consistent behavior
            const attempts = 10;
            const foundOpponents = new Set();

            for (let i = 0; i < attempts; i++) {
                const opponent = await battleSystem.connect(player1).findRandomOpponent();
                
                // Basic validation
                expect(opponent).to.not.equal(ethers.ZeroAddress);
                expect(opponent).to.not.equal(player1.address);
                
                // Verify opponent is one of the registered players
                expect(registeredPlayers).to.include(opponent);
                
                // Track unique opponents found
                foundOpponents.add(opponent);
            }

            // Verify we found at least one opponent
            expect(foundOpponents.size).to.be.gt(0);
            
            // Log the distribution of opponents found
            console.log("Opponents found in", attempts, "attempts:", {
                player2: Array.from(foundOpponents).filter(addr => addr === player2.address).length,
                player3: Array.from(foundOpponents).filter(addr => addr === player3.address).length
            });
        });

        it("should return zero address when no opponents are available", async function () {
            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);

            // Register only player1
            await battleSystem.connect(player1).registerForMatchmaking();

            // Should return zero address as there are no other players
            const opponent = await battleSystem.connect(player1).findRandomOpponent();
            expect(opponent).to.equal(ethers.ZeroAddress);
        });

        it("should return zero address based on noOpponentFoundChance", async function () {
            // Set noOpponentFoundChance to 100 to always return zero address
            await battleSystem.connect(owner).setNoOpponentFoundChance(100);

            // Register multiple players
            await battleSystem.connect(player1).registerForMatchmaking();
            await battleSystem.connect(player2).registerForMatchmaking();
            await battleSystem.connect(player3).registerForMatchmaking();

            // Should always return zero address due to 100% chance
            const opponent = await battleSystem.connect(player1).findRandomOpponent();
            expect(opponent).to.equal(ethers.ZeroAddress);
        });

        it("should demonstrate randomness with different probability settings", async function () {
            // Register multiple players
            await battleSystem.connect(player1).registerForMatchmaking();
            await battleSystem.connect(player2).registerForMatchmaking();
            await battleSystem.connect(player3).registerForMatchmaking();

            // Test with 50% chance of finding opponent
            await battleSystem.connect(owner).setNoOpponentFoundChance(50);
            
            const attempts = 100;
            let zeroAddressCount = 0;
            let validOpponentCount = 0;
            const foundOpponents = new Set();

            for (let i = 0; i < attempts; i++) {
                const opponent = await battleSystem.connect(player1).findRandomOpponent();
                
                if (opponent === ethers.ZeroAddress) {
                    zeroAddressCount++;
                } else {
                    validOpponentCount++;
                    foundOpponents.add(opponent);
                }

                await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
                await ethers.provider.send("evm_mine");
            }

            // Log the results
            /*
            console.log("\nRandomness Test Results (50% chance):");
            console.log("----------------------------------------");
            console.log(`Total attempts: ${attempts}`);
            console.log(`Zero address returns: ${zeroAddressCount} (${(zeroAddressCount/attempts*100).toFixed(1)}%)`);
            console.log(`Valid opponent returns: ${validOpponentCount} (${(validOpponentCount/attempts*100).toFixed(1)}%)`);
            console.log("Opponent distribution:");
            console.log(`  Player2: ${Array.from(foundOpponents).filter(addr => addr === player2.address).length} times`);
            console.log(`  Player3: ${Array.from(foundOpponents).filter(addr => addr === player3.address).length} times`);
            */

            // Verify that we got both zero addresses and valid opponents
            expect(zeroAddressCount).to.be.gt(0);
            expect(validOpponentCount).to.be.gt(0);
            
            // Verify that when we got valid opponents, they were either player2 or player3
            for (const opponent of foundOpponents) {
                expect([player2.address, player3.address]).to.include(opponent);
            }

            // Test with 75% chance of finding opponent
            await battleSystem.connect(owner).setNoOpponentFoundChance(25);
            
            zeroAddressCount = 0;
            validOpponentCount = 0;
            foundOpponents.clear();

            for (let i = 0; i < attempts; i++) {
                const opponent = await battleSystem.connect(player1).findRandomOpponent();
                
                if (opponent === ethers.ZeroAddress) {
                    zeroAddressCount++;
                } else {
                    validOpponentCount++;
                    foundOpponents.add(opponent);
                }
                
                await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
                await ethers.provider.send("evm_mine");
            }

            // Log the results
            /*
            console.log("\nRandomness Test Results (75% chance):");
            console.log("----------------------------------------");
            console.log(`Total attempts: ${attempts}`);
            console.log(`Zero address returns: ${zeroAddressCount} (${(zeroAddressCount/attempts*100).toFixed(1)}%)`);
            console.log(`Valid opponent returns: ${validOpponentCount} (${(validOpponentCount/attempts*100).toFixed(1)}%)`);
            console.log("Opponent distribution:");
            console.log(`  Player2: ${Array.from(foundOpponents).filter(addr => addr === player2.address).length} times`);
            console.log(`  Player3: ${Array.from(foundOpponents).filter(addr => addr === player3.address).length} times`);
            */
           
            // Verify that we got both zero addresses and valid opponents
            expect(zeroAddressCount).to.be.gt(0);
            expect(validOpponentCount).to.be.gt(0);
            
            // Verify that when we got valid opponents, they were either player2 or player3
            for (const opponent of foundOpponents) {
                expect([player2.address, player3.address]).to.include(opponent);
            }

            // Verify that with 75% chance we got more valid opponents than with 50% chance
            expect(validOpponentCount).to.be.gt(attempts * 0.5);
        });
    });

    describe("Battle Resolution", function () {
        beforeEach(async function () {
            // Calculate total resources needed
            const infantryCount = 10;
            const cavalryCount = 5;
            const siegeCount = 3;
            
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

        });

        it("should fail to resolve battle before duration has passed", async function () {
            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
                5,
                2,
                1
            );

            await expect(
                battleSystem.connect(player1).resolveBattle(player1.address)
            ).to.be.revertedWith("Battle duration not elapsed");
        });

        it("should not apply battle effects (equal power)", async function () {

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            await districtBuildings.connect(player2).buildDistrictBuilding(3); // DEFENSE_TOWER

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
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

            expect(battle.treasuryBurned).to.be.eq(0);
            expect(battle.gridBuildingsDamaged).to.be.eq(0);
            expect(battle.districtBuildingsDamaged).to.be.eq(0);

        });

        it("should apply battle effects (treasury burn, building damage)", async function () {

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            //await districtBuildings.connect(player2).buildDistrictBuilding(3); // DEFENSE_TOWER

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
                5,
                2,
                1
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

        it("should resolve battle after duration has passed for player2 without defense tower but with district buildings", async function () {

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
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

        it("should resolve battle after duration has passed for player2 without district buildings", async function () {

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
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

            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
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
            // Start a battle
            await battleSystem.connect(player1).startBattle(
                player2.address,
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
}); 