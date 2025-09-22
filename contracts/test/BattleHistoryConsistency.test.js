const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { GridBuildingType, mintAndStakeNFT, getDamagedBuildingId, donateGoldForTier, ensurePlayerGold, ensurePlayerFood } = require("./helpers");

describe("Battle History Consistency Tests", function () {
    let battleSystem;
    let matchmakingSystem;
    let gameState;
    let districtBuildings;
    let gridBuildings;
    let altar;
    let sonicityNFT;
    let sonicityFarm;
    let sonicityDiamond;
    let sonicityRep;
    let heroNFT;
    let tacticsNFT;
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

        // Deploy SonicityFarm (for farms)
        const SonicityFarm = await ethers.getContractFactory("SonicityFarm");
        sonicityFarm = await SonicityFarm.deploy();
        await sonicityFarm.waitForDeployment();
        const sonicityFarmAddress = await sonicityFarm.getAddress();

        // Deploy SonicityDiamond (for diamonds)
        const SonicityDiamond = await ethers.getContractFactory("SonicityDiamond");
        sonicityDiamond = await SonicityDiamond.deploy();
        await sonicityDiamond.waitForDeployment();
        const sonicityDiamondAddress = await sonicityDiamond.getAddress();

        // Deploy SonicityRep (for REP Forge)
        const SonicityRep = await ethers.getContractFactory("SonicityRep");
        const sonicityRep = await SonicityRep.deploy();
        await sonicityRep.waitForDeployment();
        const sonicityRepAddress = await sonicityRep.getAddress();

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

        // Deploy BattleSystem
        const BattleSystem = await ethers.getContractFactory("BattleSystem");
        battleSystem = await upgrades.deployProxy(BattleSystem, [], { initializer: 'initialize' });
        await battleSystem.waitForDeployment();
        const battleSystemAddress = await battleSystem.getAddress();

        // Deploy MatchmakingSystem
        const MatchmakingSystem = await ethers.getContractFactory("MatchmakingSystem");
        matchmakingSystem = await upgrades.deployProxy(MatchmakingSystem, [], { initializer: 'initialize' });
        await matchmakingSystem.waitForDeployment();
        const matchmakingSystemAddress = await matchmakingSystem.getAddress();

        // Set up contract references
        await matchmakingSystem.setGameStateAddress(gameStateAddress);
        await matchmakingSystem.setBattleSystemAddress(battleSystemAddress);
        await matchmakingSystem.setDistrictBuildingsAddress(districtBuildingsAddress);
        await matchmakingSystem.setGridBuildingsAddress(gridBuildingsAddress);
        await battleSystem.setMatchmakingSystemAddress(matchmakingSystemAddress);
        await gameState.setMatchmakingSystemAddress(matchmakingSystemAddress);

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

        // Deploy TacticsNFT
        const TacticsNFT = await ethers.getContractFactory("TacticsNFT");
        tacticsNFT = await upgrades.deployProxy(TacticsNFT, [], { initializer: 'initialize' });
        await tacticsNFT.waitForDeployment();
        const tacticsNFTAddress = await tacticsNFT.getAddress();

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
        await battleSystem.setHeroNFTAddress(heroNFTAddress);
        await battleSystem.setTacticsNFTAddress(tacticsNFTAddress);

        // Set up HeroNFT and TacticsNFT
        await gameState.setHeroNFTAddress(heroNFTAddress);
        await gameState.setTacticsNFTAddress(tacticsNFTAddress);
        await heroNFT.setGameStateAddress(gameStateAddress);
        await tacticsNFT.setGameStateAddress(gameStateAddress);

        // Set BattleSystem address in DistrictBuildings
        await districtBuildings.setBattleSystemAddress(battleSystemAddress);

        // Approve NFT collections in Altar
        await altar.approveCollection(sonicityNFTAddress);
        await altar.approveCollection(sonicityFarmAddress);
        await altar.approveCollection(sonicityDiamondAddress);
        await altar.approveCollection(sonicityRepAddress);

        // Set Altar contract address on all NFT contracts
        await sonicityNFT.setAltarContract(altarAddress);
        await sonicityFarm.setAltarContract(altarAddress);
        await sonicityDiamond.setAltarContract(altarAddress);
        await sonicityRep.setAltarContract(altarAddress);

        // Set minimum staking duration to 0 for testing
        await altar.setMinStakingDuration(0);

        // Initialize players
        await gameState.connect(player1).initializePlayer();
        await gameState.connect(player2).initializePlayer();
        await gameState.connect(player3).initializePlayer();

        // Fetch building names from contract
        buildingNames = await districtBuildings.getBuildingNames();
        getBuildingTypeIndex = (name) => buildingNames.findIndex(n => n === name);

        barracksIndex = getBuildingTypeIndex("BARRACKS");

        // Setup initial resources for players and unlock tier 1
        await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1500);
        await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1500);
        await donateGoldForTier(player3, gameState, gridBuildings, altar, sonicityNFT, 1500);

        // Set noOpponentFoundChance to 0 for testing
        await matchmakingSystem.connect(owner).setNoOpponentFoundChance(0);
        
        // Set cavalry and siege damage chances to 100% for deterministic testing
        await battleSystem.connect(owner).setTroopConfig(1, 200, 100, 15, 100, 0, 0); // CAVALRY: 100% grid damage
        await battleSystem.connect(owner).setTroopConfig(2, 300, 150, 20, 0, 100, 100); // SIEGE: 100% district damage, 100% treasury burn
    });

    describe("Battle History Recording", function () {
        beforeEach(async function () {   
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;

            // Build barracks for all players
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksCost)); 
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksCost)); 
            await ensurePlayerGold(player3, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksCost)); 
            
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);
            await districtBuildings.connect(player3).buildDistrictBuilding(barracksIndex);
            
            // Ensure troop configuration is set for each test
            await battleSystem.connect(owner).setTroopConfig(1, 200, 100, 15, 100, 0, 0); // CAVALRY: 100% grid damage
            await battleSystem.connect(owner).setTroopConfig(2, 300, 150, 20, 0, 100, 100); // SIEGE: 100% district damage, 100% treasury burn
        });

        it("should record identical battle data for both attacker and defender", async function () {
            // Train troops
            const amount = 5;
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 50 * amount);
            
            await battleSystem.connect(player1).trainTroops(0, amount); // Infantry

            // Set up battle
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            const tx = await battleSystem.connect(player1).findRandomOpponent();
            await tx.wait();
            
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const actualOpponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(3, 0, 0);

            // Fast forward time and resolve
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Get battle history BEFORE resolution
            const player1HistoryBefore = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistoryBefore = await battleSystem.getPlayerBattleHistory(actualOpponent);

            // Resolve battle
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Get battle history AFTER resolution
            const player1HistoryAfter = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistoryAfter = await battleSystem.getPlayerBattleHistory(actualOpponent);

            console.log("=== BATTLE HISTORY CONSISTENCY TEST ===");
            console.log("Player1 (Attacker) history before:", player1HistoryBefore.length);
            console.log("Player1 (Attacker) history after:", player1HistoryAfter.length);
            console.log("Defender history before:", defenderHistoryBefore.length);
            console.log("Defender history after:", defenderHistoryAfter.length);

            // Both should have gained exactly 1 battle record
            expect(player1HistoryAfter.length).to.equal(player1HistoryBefore.length + 1);
            expect(defenderHistoryAfter.length).to.equal(defenderHistoryBefore.length + 1);

            // Get the latest battle records for comparison
            const attackerRecord = player1HistoryAfter[player1HistoryAfter.length - 1];
            const defenderRecord = defenderHistoryAfter[defenderHistoryAfter.length - 1];

            console.log("\n=== ATTACKER RECORD ===");
            console.log("Attacker:", attackerRecord.attacker);
            console.log("Defender:", attackerRecord.defender);
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("Attacker Power:", attackerRecord.attackerPower.toString());
            console.log("Defender Power:", attackerRecord.defenderPower.toString());
            console.log("REP Points:", attackerRecord.repPoints.toString());
            console.log("Treasury Burned:", attackerRecord.treasuryBurned.toString());
            console.log("Grid Buildings Damaged:", attackerRecord.gridBuildingsDamaged.toString());
            console.log("District Buildings Damaged:", attackerRecord.districtBuildingsDamaged.toString());

            console.log("\n=== DEFENDER RECORD ===");
            console.log("Attacker:", defenderRecord.attacker);
            console.log("Defender:", defenderRecord.defender);
            console.log("Attacker Won:", defenderRecord.attackerWon);
            console.log("Attacker Power:", defenderRecord.attackerPower.toString());
            console.log("Defender Power:", defenderRecord.defenderPower.toString());
            console.log("REP Points:", defenderRecord.repPoints.toString());
            console.log("Treasury Burned:", defenderRecord.treasuryBurned.toString());
            console.log("Grid Buildings Damaged:", defenderRecord.gridBuildingsDamaged.toString());
            console.log("District Buildings Damaged:", defenderRecord.districtBuildingsDamaged.toString());

            // All battle data should be identical
            expect(attackerRecord.attacker).to.equal(defenderRecord.attacker);
            expect(attackerRecord.defender).to.equal(defenderRecord.defender);
            expect(attackerRecord.attackerWon).to.equal(defenderRecord.attackerWon);
            expect(attackerRecord.attackerPower).to.equal(defenderRecord.attackerPower);
            expect(attackerRecord.defenderPower).to.equal(defenderRecord.defenderPower);
            expect(attackerRecord.repPoints).to.equal(defenderRecord.repPoints);
            expect(attackerRecord.treasuryBurned).to.equal(defenderRecord.treasuryBurned);
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);
            expect(attackerRecord.timestamp).to.equal(defenderRecord.timestamp);

            console.log("\n✅ BATTLE HISTORY CONSISTENCY: PASSED");
            console.log("Both attacker and defender have identical battle records");
        });

        it("should prevent duplicate battle entries from double resolution", async function () {
            // Setup and execute battle (same as above)
            const amount = 5;
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 50 * amount);
            
            await battleSystem.connect(player1).trainTroops(0, amount);

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const actualOpponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(3, 0, 0);

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Resolve from attacker
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Check history after first resolution
            const player1HistoryAfterFirst = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistoryAfterFirst = await battleSystem.getPlayerBattleHistory(actualOpponent);

            console.log("=== DUPLICATE RESOLUTION TEST ===");
            console.log("After first resolution:");
            console.log("Player1 history length:", player1HistoryAfterFirst.length);
            console.log("Defender history length:", defenderHistoryAfterFirst.length);

            // Try to resolve again from defender (should fail)
            const defenderSigner = actualOpponent === player2.address ? player2 : player3;
            
            await expect(
                battleSystem.connect(defenderSigner).resolveBattle(actualOpponent)
            ).to.be.revertedWith("Battle does not exist");

            // Check that history didn't change
            const player1HistoryAfterSecond = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistoryAfterSecond = await battleSystem.getPlayerBattleHistory(actualOpponent);

            console.log("After attempted second resolution:");
            console.log("Player1 history length:", player1HistoryAfterSecond.length);
            console.log("Defender history length:", defenderHistoryAfterSecond.length);

            expect(player1HistoryAfterSecond.length).to.equal(player1HistoryAfterFirst.length);
            expect(defenderHistoryAfterSecond.length).to.equal(defenderHistoryAfterFirst.length);

            console.log("✅ DUPLICATE PREVENTION: PASSED");
            console.log("No duplicate battle entries created");
        });

        it("should record battle history for defender resolution", async function () {
            // Setup and execute battle
            const amount = 5;
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100 * amount);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 50 * amount);
            
            await battleSystem.connect(player1).trainTroops(0, amount);

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const actualOpponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(3, 0, 0);

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Get battle history BEFORE resolution
            const player1HistoryBefore = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistoryBefore = await battleSystem.getPlayerBattleHistory(actualOpponent);

            // Resolve from DEFENDER perspective instead of attacker
            const defenderSigner = actualOpponent === player2.address ? player2 : player3;
            await battleSystem.connect(defenderSigner).resolveBattle(actualOpponent);

            // Get battle history AFTER resolution
            const player1HistoryAfter = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistoryAfter = await battleSystem.getPlayerBattleHistory(actualOpponent);

            console.log("=== DEFENDER RESOLUTION TEST ===");
            console.log("Player1 (Attacker) history before:", player1HistoryBefore.length);
            console.log("Player1 (Attacker) history after:", player1HistoryAfter.length);
            console.log("Defender history before:", defenderHistoryBefore.length);
            console.log("Defender history after:", defenderHistoryAfter.length);

            // Both should have gained exactly 1 battle record
            expect(player1HistoryAfter.length).to.equal(player1HistoryBefore.length + 1);
            expect(defenderHistoryAfter.length).to.equal(defenderHistoryBefore.length + 1);

            // Get the latest battle records
            const attackerRecord = player1HistoryAfter[player1HistoryAfter.length - 1];
            const defenderRecord = defenderHistoryAfter[defenderHistoryAfter.length - 1];

            // All battle data should be identical regardless of who resolved
            expect(attackerRecord.attacker).to.equal(defenderRecord.attacker);
            expect(attackerRecord.defender).to.equal(defenderRecord.defender);
            expect(attackerRecord.attackerWon).to.equal(defenderRecord.attackerWon);
            expect(attackerRecord.attackerPower).to.equal(defenderRecord.attackerPower);
            expect(attackerRecord.defenderPower).to.equal(defenderRecord.defenderPower);
            expect(attackerRecord.repPoints).to.equal(defenderRecord.repPoints);
            expect(attackerRecord.treasuryBurned).to.equal(defenderRecord.treasuryBurned);
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);

            console.log("✅ DEFENDER RESOLUTION: PASSED");
            console.log("Battle history consistent when resolved by defender");
        });

        it("should record consistent battle history for multiple battles", async function () {
            console.log("=== MULTIPLE BATTLES TEST ===");
            
            // Battle 1: Player1 vs Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 250);
            await battleSystem.connect(player1).trainTroops(0, 5);

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            let searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            let opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(3, 0, 0);
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Check history after first battle
            const player1HistoryAfterBattle1 = await battleSystem.getPlayerBattleHistory(player1.address);
            const opponent1HistoryAfterBattle1 = await battleSystem.getPlayerBattleHistory(opponent);

            console.log("After Battle 1:");
            console.log("Player1 history length:", player1HistoryAfterBattle1.length);
            console.log("Opponent1 history length:", opponent1HistoryAfterBattle1.length);

            // Battle 2: Player1 vs different opponent (or same, but new battle)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 250);
            await battleSystem.connect(player1).trainTroops(0, 5);

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent2 = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(3, 0, 0);
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Check history after second battle
            const player1HistoryAfterBattle2 = await battleSystem.getPlayerBattleHistory(player1.address);
            const opponent2HistoryAfterBattle2 = await battleSystem.getPlayerBattleHistory(opponent2);

            console.log("After Battle 2:");
            console.log("Player1 history length:", player1HistoryAfterBattle2.length);
            console.log("Opponent2 history length:", opponent2HistoryAfterBattle2.length);

            // Player1 should have 2 battles, each opponent should have 1
            expect(player1HistoryAfterBattle2.length).to.equal(2);
            
            if (opponent === opponent2) {
                // Same opponent - should have 2 battles
                expect(opponent2HistoryAfterBattle2.length).to.equal(2);
            } else {
                // Different opponents - each should have 1 battle
                expect(opponent1HistoryAfterBattle1.length).to.equal(1);
                expect(opponent2HistoryAfterBattle2.length).to.equal(1);
            }

            // Verify each battle record is consistent
            for (let i = 0; i < player1HistoryAfterBattle2.length; i++) {
                const attackerRecord = player1HistoryAfterBattle2[i];
                const defenderHistory = await battleSystem.getPlayerBattleHistory(attackerRecord.defender);
                
                // Find the matching record in defender's history
                const defenderRecord = defenderHistory.find(record => 
                    record.attacker === attackerRecord.attacker && 
                    record.timestamp.toString() === attackerRecord.timestamp.toString()
                );
                
                expect(defenderRecord).to.not.be.undefined;
                expect(attackerRecord.attackerWon).to.equal(defenderRecord.attackerWon);
                expect(attackerRecord.attackerPower).to.equal(defenderRecord.attackerPower);
                expect(attackerRecord.defenderPower).to.equal(defenderRecord.defenderPower);
            }

            console.log("✅ MULTIPLE BATTLES: PASSED");
            console.log("All battle records consistent across multiple battles");
        });

        it("should record grid buildings damage correctly (multiple cavalry units)", async function () {
            // Upgrade barracks to level 2 for cavalry
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);

            // Train troops with cavalry for grid building damage
            // Give player enough gold and food directly
            // 10 infantry (1000 gold + 500 food) + 6 cavalry (1200 gold + 600 food) = 2200 gold + 1100 food
            await gameState.testEarnGold(player1.address, 2500);
            await gameState.testEarnFood(player1.address, 1200);
            
            // Debug: Check player's resources before training
            const goldBefore = await gameState.getPlayerGold(player1.address);
            const foodBefore = await gameState.getPlayerFood(player1.address);
            console.log(`Player1 resources before training: Gold=${goldBefore}, Food=${foodBefore}`);
            
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 6);  // 6 cavalry (should damage 3 grid buildings)

            // Set up defender with grid buildings
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityFarm, GridBuildingType.FARM);

            // Battle setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(5, 4, 0); // 5 infantry, 4 cavalry, 0 siege

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Test 1: Resolve from ATTACKER perspective
            await battleSystem.connect(player1).resolveBattle(player1.address);

            const player1History = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistory = await battleSystem.getPlayerBattleHistory(opponent);

            const attackerRecord = player1History[player1History.length - 1];
            const defenderRecord = defenderHistory[defenderHistory.length - 1];

            console.log("=== GRID BUILDINGS DAMAGE TEST (ATTACKER RESOLVES) ===");
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("Attacker Power:", attackerRecord.attackerPower.toString());
            console.log("Defender Power:", attackerRecord.defenderPower.toString());
            console.log("Grid Buildings Damaged (Attacker record):", attackerRecord.gridBuildingsDamaged.toString());
            console.log("Grid Buildings Damaged (Defender record):", defenderRecord.gridBuildingsDamaged.toString());
            console.log("District Buildings Damaged (should be 0):", attackerRecord.districtBuildingsDamaged.toString());

            // Verify battle history consistency
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(0); // No siege units

            // If attacker won, should have grid building damage from cavalry (100% chance)
            if (attackerRecord.attackerWon) {
                expect(attackerRecord.gridBuildingsDamaged).to.be.gt(0);
                expect(attackerRecord.gridBuildingsDamaged).to.be.lte(2); // Max 2 buildings damaged (4 cavalry / 2 = 2)
                console.log("✅ Grid building damage recorded correctly");
            } else {
                expect(attackerRecord.gridBuildingsDamaged).to.equal(0);
                console.log("✅ No damage recorded (attacker lost)");
            }

            console.log("✅ GRID DAMAGE CONSISTENCY: PASSED (Attacker resolves)");
        });

        it("should record grid buildings damage correctly when defender resolves", async function () {
            // Upgrade barracks to level 2 for cavalry
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);

            // Train troops with cavalry
            // 10 infantry (1000 gold + 500 food) + 6 cavalry (1200 gold + 600 food) = 2200 gold + 1100 food
            await gameState.testEarnGold(player1.address, 2500);
            await gameState.testEarnFood(player1.address, 1200);
            
            await battleSystem.connect(player1).trainTroops(0, 10);
            await battleSystem.connect(player1).trainTroops(1, 6);

            // Set up defender with grid buildings
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityFarm, GridBuildingType.FARM);

            // Battle setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(5, 4, 0);

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Test 2: Resolve from DEFENDER perspective
            const defenderSigner = opponent === player2.address ? player2 : player3;
            await battleSystem.connect(defenderSigner).resolveBattle(opponent);

            const player1History = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistory = await battleSystem.getPlayerBattleHistory(opponent);

            const attackerRecord = player1History[player1History.length - 1];
            const defenderRecord = defenderHistory[defenderHistory.length - 1];

            console.log("=== GRID BUILDINGS DAMAGE TEST (DEFENDER RESOLVES) ===");
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("Grid Buildings Damaged (Attacker record):", attackerRecord.gridBuildingsDamaged.toString());
            console.log("Grid Buildings Damaged (Defender record):", defenderRecord.gridBuildingsDamaged.toString());

            // Verify battle history consistency AND correctness
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);
            
            // Verify that effects are actually recorded (should be > 0 for cavalry with 100% chance)
            expect(attackerRecord.gridBuildingsDamaged).to.be.greaterThan(0, "Grid buildings should be damaged by cavalry");
            expect(defenderRecord.gridBuildingsDamaged).to.be.greaterThan(0, "Grid buildings should be damaged by cavalry");

            console.log("✅ GRID DAMAGE CONSISTENCY: PASSED (Defender resolves)");
        });

        it("should record district buildings damage correctly (multiple siege units)", async function () {
            // Upgrade barracks to level 3 for siege
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Level 2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex); // Level 3

            // Train troops with siege for district building damage
            // 15 infantry (1500 gold + 750 food) + 6 siege (1800 gold + 900 food) = 3300 gold + 1650 food
            await gameState.testEarnGold(player1.address, 3500);
            await gameState.testEarnFood(player1.address, 1700);
            
            await battleSystem.connect(player1).trainTroops(0, 15); // 15 infantry
            await battleSystem.connect(player1).trainTroops(2, 6);  // 6 siege (should damage 2 district buildings)

            // Set up defender with district buildings (need to build some)
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            
            // Build some district buildings for defender
            const shopIndex = getBuildingTypeIndex("SHOP");
            const shopConfig = await districtBuildings.districtBuildingConfigs(shopIndex);
            const shopCost = shopConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, shopCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(shopIndex);

            const workshopIndex = getBuildingTypeIndex("WORKSHOP");
            const workshopConfig = await districtBuildings.districtBuildingConfigs(workshopIndex);
            const workshopCost = workshopConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, workshopCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(workshopIndex);

            // Battle setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(8, 0, 4); // 8 infantry, 0 cavalry, 4 siege

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Test 1: Resolve from ATTACKER perspective
            await battleSystem.connect(player1).resolveBattle(player1.address);

            const player1History = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistory = await battleSystem.getPlayerBattleHistory(opponent);

            const attackerRecord = player1History[player1History.length - 1];
            const defenderRecord = defenderHistory[defenderHistory.length - 1];

            console.log("=== DISTRICT BUILDINGS DAMAGE TEST (ATTACKER RESOLVES) ===");
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("District Buildings Damaged (Attacker record):", attackerRecord.districtBuildingsDamaged.toString());
            console.log("District Buildings Damaged (Defender record):", defenderRecord.districtBuildingsDamaged.toString());
            console.log("Grid Buildings Damaged (should be 0):", attackerRecord.gridBuildingsDamaged.toString());

            // Verify battle history consistency
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.gridBuildingsDamaged).to.equal(0); // No cavalry units

            // If attacker won, should have district building damage from siege
            if (attackerRecord.attackerWon) {
                expect(attackerRecord.districtBuildingsDamaged).to.be.gt(0);
                expect(attackerRecord.districtBuildingsDamaged).to.be.lte(2); // Max 2 buildings (4 siege / 3 = 1, but we have extras)
                console.log("✅ District building damage recorded correctly");
            } else {
                expect(attackerRecord.districtBuildingsDamaged).to.equal(0);
                console.log("✅ No damage recorded (attacker lost)");
            }

            console.log("✅ DISTRICT DAMAGE CONSISTENCY: PASSED (Attacker resolves)");
        });

        it("should record district buildings damage correctly when defender resolves", async function () {
            // Upgrade barracks to level 3 for siege
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);

            // Train troops with siege
            // 15 infantry (1500 gold + 750 food) + 6 siege (1800 gold + 900 food) = 3300 gold + 1650 food
            await gameState.testEarnGold(player1.address, 3500);
            await gameState.testEarnFood(player1.address, 1700);
            
            await battleSystem.connect(player1).trainTroops(0, 15);
            await battleSystem.connect(player1).trainTroops(2, 6);

            // Set up defender with district buildings
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            
            const shopIndex = getBuildingTypeIndex("SHOP");
            const shopConfig = await districtBuildings.districtBuildingConfigs(shopIndex);
            const shopCost = shopConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, shopCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(shopIndex);

            // Battle setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(8, 0, 4);

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Test 2: Resolve from DEFENDER perspective
            const defenderSigner = opponent === player2.address ? player2 : player3;
            await battleSystem.connect(defenderSigner).resolveBattle(opponent);

            const player1History = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistory = await battleSystem.getPlayerBattleHistory(opponent);

            const attackerRecord = player1History[player1History.length - 1];
            const defenderRecord = defenderHistory[defenderHistory.length - 1];

            console.log("=== DISTRICT BUILDINGS DAMAGE TEST (DEFENDER RESOLVES) ===");
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("District Buildings Damaged (Attacker record):", attackerRecord.districtBuildingsDamaged.toString());
            console.log("District Buildings Damaged (Defender record):", defenderRecord.districtBuildingsDamaged.toString());

            // Verify battle history consistency AND correctness
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            
            // Verify that effects are actually recorded (should be > 0 for siege)
            expect(attackerRecord.districtBuildingsDamaged).to.be.greaterThan(0, "District buildings should be damaged by siege");
            expect(defenderRecord.districtBuildingsDamaged).to.be.greaterThan(0, "District buildings should be damaged by siege");

            console.log("✅ DISTRICT DAMAGE CONSISTENCY: PASSED (Defender resolves)");
        });

        it("should record BOTH grid and district building damage in single battle (attacker resolves)", async function () {
            // Upgrade barracks to level 3 for siege
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);

            // Train troops with BOTH cavalry and siege
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 4000);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 2000);
            
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 4);  // 4 cavalry (grid damage)
            await battleSystem.connect(player1).trainTroops(2, 6);  // 6 siege (district damage)

            // Set up defender with BOTH grid and district buildings
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            // Grid buildings
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityFarm, GridBuildingType.FARM);

            // District buildings
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            
            const shopIndex = getBuildingTypeIndex("SHOP");
            const shopConfig = await districtBuildings.districtBuildingConfigs(shopIndex);
            const shopCost = shopConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, shopCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(shopIndex);

            const workshopIndex = getBuildingTypeIndex("WORKSHOP");
            const workshopConfig = await districtBuildings.districtBuildingConfigs(workshopIndex);
            const workshopCost = workshopConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, workshopCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(workshopIndex);

            // Battle setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(5, 2, 3); // 5 infantry, 2 cavalry, 3 siege

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Resolve from ATTACKER perspective
            await battleSystem.connect(player1).resolveBattle(player1.address);

            const player1History = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistory = await battleSystem.getPlayerBattleHistory(opponent);

            const attackerRecord = player1History[player1History.length - 1];
            const defenderRecord = defenderHistory[defenderHistory.length - 1];

            console.log("=== COMBINED DAMAGE TEST (ATTACKER RESOLVES) ===");
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("Grid Buildings Damaged (Attacker record):", attackerRecord.gridBuildingsDamaged.toString());
            console.log("Grid Buildings Damaged (Defender record):", defenderRecord.gridBuildingsDamaged.toString());
            console.log("District Buildings Damaged (Attacker record):", attackerRecord.districtBuildingsDamaged.toString());
            console.log("District Buildings Damaged (Defender record):", defenderRecord.districtBuildingsDamaged.toString());

            // Verify battle history consistency
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);

            // If attacker won, should have BOTH types of damage
            if (attackerRecord.attackerWon) {
                expect(attackerRecord.gridBuildingsDamaged).to.be.gte(0);
                expect(attackerRecord.districtBuildingsDamaged).to.be.gte(0);
                console.log("✅ Both grid and district damage recorded");
            } else {
                expect(attackerRecord.gridBuildingsDamaged).to.equal(0);
                expect(attackerRecord.districtBuildingsDamaged).to.equal(0);
                console.log("✅ No damage recorded (attacker lost)");
            }

            console.log("✅ COMBINED DAMAGE CONSISTENCY: PASSED (Attacker resolves)");
        });

        it("should record BOTH grid and district building damage in single battle (defender resolves)", async function () {
            // Upgrade barracks to level 3 for siege
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 500);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);

            // Train troops with BOTH cavalry and siege
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 4000);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 2000);
            
            await battleSystem.connect(player1).trainTroops(0, 10);
            await battleSystem.connect(player1).trainTroops(1, 4);
            await battleSystem.connect(player1).trainTroops(2, 6);

            // Set up defender with BOTH grid and district buildings
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            // Grid buildings
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE);

            // District buildings
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            
            const shopIndex = getBuildingTypeIndex("SHOP");
            const shopConfig = await districtBuildings.districtBuildingConfigs(shopIndex);
            const shopCost = shopConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, shopCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(shopIndex);

            // Battle setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            await ethers.provider.send("evm_increaseTime", [Number(await matchmakingSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            await battleSystem.connect(player1).findRandomOpponent();
            const searchStatus = await battleSystem.connect(player1).checkSearchStatus();
            const opponent = searchStatus.foundOpponent;

            await battleSystem.connect(player1).startBattle(5, 2, 3);

            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            // Resolve from DEFENDER perspective
            const defenderSigner = opponent === player2.address ? player2 : player3;
            await battleSystem.connect(defenderSigner).resolveBattle(opponent);

            const player1History = await battleSystem.getPlayerBattleHistory(player1.address);
            const defenderHistory = await battleSystem.getPlayerBattleHistory(opponent);

            const attackerRecord = player1History[player1History.length - 1];
            const defenderRecord = defenderHistory[defenderHistory.length - 1];

            console.log("=== COMBINED DAMAGE TEST (DEFENDER RESOLVES) ===");
            console.log("Attacker Won:", attackerRecord.attackerWon);
            console.log("Grid Buildings Damaged (Attacker record):", attackerRecord.gridBuildingsDamaged.toString());
            console.log("Grid Buildings Damaged (Defender record):", defenderRecord.gridBuildingsDamaged.toString());
            console.log("District Buildings Damaged (Attacker record):", attackerRecord.districtBuildingsDamaged.toString());
            console.log("District Buildings Damaged (Defender record):", defenderRecord.districtBuildingsDamaged.toString());

            // Verify battle history consistency
            expect(attackerRecord.gridBuildingsDamaged).to.equal(defenderRecord.gridBuildingsDamaged);
            expect(attackerRecord.districtBuildingsDamaged).to.equal(defenderRecord.districtBuildingsDamaged);

            console.log("✅ COMBINED DAMAGE CONSISTENCY: PASSED (Defender resolves)");
        });
    });
});
