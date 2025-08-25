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
    let sonicityFarm;
    let sonicityDiamond;
    let sonicityRep;
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

        // Deploy Altar
        const Altar = await ethers.getContractFactory("Altar");
        altar = await upgrades.deployProxy(Altar, [gameStateAddress, gridBuildingsAddress], { initializer: 'initialize' });
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
        await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1500); // 1000 for tier 1 + 500 for building  
        // Now build the defense tower for each player
        const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
        const defenseTowerConfig = await districtBuildings.districtBuildingConfigs(defenseTowerIndex);
        const defenseTowerCost = defenseTowerConfig.buildCost;
        await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, defenseTowerCost, battleSystem); 
        await districtBuildings.connect(player1).buildDistrictBuilding(defenseTowerIndex);
        // await districtBuildings.connect(player2).buildDistrictBuilding(defenseTowerIndex); // Do not create defense tower for player2
        // await districtBuildings.connect(player3).buildDistrictBuilding(defenseTowerIndex); // DEFENSE_TOWER
    });

    describe("Troop Training", function () {
        beforeEach(async function () {   

            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksCost), battleSystem); 
    
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
        });

        it("should allow players to train infantry", async function () {
            const amount = 5;

            // Ensure each player has enough resources for training troops
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100 * amount); // 100 gold per infantry
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 50 * amount);  // 50 food per infantry

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
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 100 * amount);
                     
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
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 150 * amount);
                     
            await battleSystem.connect(player1).trainTroops(2, amount); // 2 = SIEGE
            
            const siegeCount = await battleSystem.playerTroops(player1.address, 2);
            expect(siegeCount).to.equal(amount);
        });

        it("should fail if player doesn't have enough resources", async function () {
            // Ensure player has enough gold and food for training 1 infantry (100 gold, 50 food)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 50);
            
            // Now deduct the food so the player doesn't have enough
            await gameState.testDeductResources(player1.address, 0, 50, 0, 0);
            
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
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, totalFoodNeeded);

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
            // Ensure players have enough gold (need more than 100 since startSearch costs 100)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 200);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);


            // Register players for matchmaking
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
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
            await ensurePlayerGold(player3, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
            await gameState.connect(player3).donateGold(100);

            // Ensure player3 has enough gold for search
            await ensurePlayerGold(player3, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);

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

        it("Should not allow starting battle with 0 deployed troops", async function () {
            // Set up players with enough gold
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
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

            // Try to start battle with 0 troops
            await expect(
                battleSystem.connect(player1).startBattle(0, 0, 0)
            ).to.be.revertedWith("Must deploy at least one troop");
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
            // Ensure player has enough gold before donating
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000, battleSystem);
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
            // Ensure player has enough gold before donating
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000, battleSystem);
            // Register for matchmaking by donating gold to reach tier 1
            await gameState.connect(player1).donateGold(1000);
            await battleSystem.connect(player1).unregisterFromMatchmaking();
            
            const isRegistered = await battleSystem.isRegisteredForMatchmaking(player1.address);
            expect(isRegistered).to.equal(false);
        });

        it("should return zero address based on noOpponentFoundChance", async function () {
            // Set noOpponentFoundChance to 100 to always return zero address
            await battleSystem.connect(owner).setNoOpponentFoundChance(100);

            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);

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
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, totalFoodNeeded);

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
            
            // Ensure player2 has enough gold to build barracks
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);

            // Ensure player2 has some grid buildings and treasury for damage
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000, battleSystem);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            // Build some grid buildings for player2
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE); // House
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE); // Another house
            await mintAndStakeNFT(player2, altar, sonicityFarm, GridBuildingType.FARM); // Farm

            // Add some treasury for player2
            await gameState.testEarnGold(player2.address, 500);

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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should apply battle effects (treasury burn, building damage)");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("\nBattle Effects:");
            console.log("  Treasury Burned:", battleRecord.treasuryBurned.toString());
            console.log("  Grid Buildings Damaged:", battleRecord.gridBuildingsDamaged.toString());
            console.log("  District Buildings Damaged:", battleRecord.districtBuildingsDamaged.toString());
            console.log("  REP Points Awarded:", battleRecord.repPoints.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.repPoints).to.be.gt(0);
            expect(battleRecord.treasuryBurned).to.be.gt(0);
            expect(battleRecord.gridBuildingsDamaged).to.be.gt(0);
            expect(battleRecord.districtBuildingsDamaged).to.be.gt(0);
        });

        it("should apply battle effects (grid buildings damage)", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1400);
            // Ensure player2 has enough gold for barracks
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);

            // Ensure player2 has some grid buildings for damage
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000, battleSystem);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            // Build some grid buildings for player2
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE); // House
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE); // Another house
            await mintAndStakeNFT(player2, altar, sonicityFarm, GridBuildingType.FARM); // Farm

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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should apply battle effects (grid buildings damage)");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.repPoints, "Rep points should be greater than 0").to.be.gt(0);
            expect(battleRecord.treasuryBurned, "Treasury burn should be 0").to.be.eq(0);
            expect(battleRecord.gridBuildingsDamaged, "Grid buildings damage should be greater than 0").to.be.gt(0);
            expect(battleRecord.districtBuildingsDamaged, "District buildings damage should be equal to 0").to.be.eq(0);
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
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);
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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should not apply battle effects (equal power)");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.repPoints, "Rep points should be greater than 0").to.be.gt(0);
            expect(battleRecord.treasuryBurned, "Treasury burn should be equal to 0").to.be.eq(0);
            expect(battleRecord.gridBuildingsDamaged, "Grid buildings damage should be equal to 0").to.be.eq(0);
            expect(battleRecord.districtBuildingsDamaged, "District buildings damage should be greater than 0").to.be.gt(0);
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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should apply battle effects (only rep points)");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.repPoints).to.be.gt(0);
            expect(battleRecord.gridBuildingsDamaged).to.be.eq(0);
            expect(battleRecord.districtBuildingsDamaged).to.be.eq(0);
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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should resolve battle after duration has passed for player2 without defense tower but with district buildings");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("\nBattle Effects:");
            console.log("  Treasury Burned:", battleRecord.treasuryBurned.toString());
            console.log("  Grid Buildings Damaged:", battleRecord.gridBuildingsDamaged.toString());
            console.log("  District Buildings Damaged:", battleRecord.districtBuildingsDamaged.toString());
            console.log("  REP Points Awarded:", battleRecord.repPoints.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.treasuryBurned).to.be.eq(0);
            expect(battleRecord.gridBuildingsDamaged).to.be.eq(0);
            expect(battleRecord.districtBuildingsDamaged).to.be.eq(0);
        });

        it("should resolve battle after duration has passed for player2 without district buildings", async function () {
            // Train troops for player1
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 infantry
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player1).trainTroops(2, 3);  // 3 siege

            // Ensure player2 has some grid buildings for damage
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000, battleSystem);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            
            // Build some grid buildings for player2
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE); // House
            await mintAndStakeNFT(player2, altar, sonicityNFT, GridBuildingType.HOUSE); // Another house
            await mintAndStakeNFT(player2, altar, sonicityFarm, GridBuildingType.FARM); // Farm

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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should resolve battle after duration has passed for player2 without district buildings");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("\nBattle Effects:");
            console.log("  Treasury Burned:", battleRecord.treasuryBurned.toString());
            console.log("  Grid Buildings Damaged:", battleRecord.gridBuildingsDamaged.toString());
            console.log("  District Buildings Damaged:", battleRecord.districtBuildingsDamaged.toString());
            console.log("  REP Points Awarded:", battleRecord.repPoints.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.repPoints).to.be.gt(0);
            expect(battleRecord.gridBuildingsDamaged).to.be.gt(0);
            expect(battleRecord.districtBuildingsDamaged).to.be.eq(0);
        });

        /* TODO: hard to test
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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should resolve battle after duration has passed without grid buildings");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("\nBattle Effects:");
            console.log("  Treasury Burned:", battleRecord.treasuryBurned.toString());
            console.log("  Grid Buildings Damaged:", battleRecord.gridBuildingsDamaged.toString());
            console.log("  District Buildings Damaged:", battleRecord.districtBuildingsDamaged.toString());
            console.log("  REP Points Awarded:", battleRecord.repPoints.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.treasuryBurned).to.be.gt(0);
            expect(battleRecord.gridBuildingsDamaged).to.be.eq(0);
            expect(battleRecord.districtBuildingsDamaged).to.be.gt(0);
        });
        */

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
            
            // Get the latest battle record from history instead of activeBattles
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);

            console.log("\nBattle Record:");
            console.log("should record battle history after resolution");
            console.log("----------------------------------------");
            console.log("Attacker:", battleRecord.attacker);
            console.log("Defender:", battleRecord.defender);
            console.log("Start Time:", new Date(Number(battleRecord.timestamp) * 1000).toISOString());
            console.log("Attacker Won:", battleRecord.attackerWon);
            console.log("\nPower Levels:");
            console.log("  Attacker Power:", battleRecord.attackerPower.toString());
            console.log("  Defender Power:", battleRecord.defenderPower.toString());
            console.log("----------------------------------------\n");

            expect(battleRecord.repPoints).to.be.gt(0);
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
            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 200, battleSystem);
            
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
            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
            
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
            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
            
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [Number(searchDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            await expect(
                battleSystem.connect(player1).startBattle(1, 1, 1)
            ).to.be.revertedWith("No opponent found");
        });

        it("Should not allow starting search while in battle", async function () {

            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);

            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);

            // Ensure player has enough gold for search
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
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
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 100);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
            await battleSystem.connect(player1).trainTroops(0, 1); // Infantry
            
            await battleSystem.connect(player1).startBattle(1, 0, 0);
            
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100, battleSystem);
            await expect(
                battleSystem.connect(player1).startSearch()
            ).to.be.revertedWith("Already in a battle");
        });
    });

    describe("Battle Limbo Issue", function () {
        beforeEach(async function () {
            // Set up players with troops
            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;

            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);

            // Train troops for player1
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 50);
            await battleSystem.connect(player1).trainTroops(0, 1); // 1 Infantry

            // Set up tier 1 for both players
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);

            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);
        });

        it("should demonstrate battle limbo - players locked forever if battle never resolved", async function () {
            // Start a battle
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            
            // Fast forward search time
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Find opponent and start battle
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(1, 0, 0);

            // Verify battle exists and is not resolved
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.startTime).to.be.gt(0);
            expect(battle.resolved).to.be.false;

            // Fast forward 48+ hours (battle should be resolvable but not auto-resolved)
            await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]); // 48 hours + 1 second
            await ethers.provider.send("evm_mine");

            // Verify battle still exists and is not resolved
            const battleAfter48h = await battleSystem.activeBattles(player1.address);
            expect(battleAfter48h.startTime).to.be.gt(0);
            expect(battleAfter48h.resolved).to.be.false;

            console.log("🔧 TESTING AUTO-RESOLVE FIX:");
            console.log("- Battle started 48+ hours ago");
            console.log("- Battle never resolved by anyone");
            console.log("- Auto-resolve should clear expired battles");

            // 🔧 FIX: Players should now be able to start new searches after 48 hours
            // Auto-resolve should clear the expired battle
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            
            // Debug: Check battle state before attempting startSearch
            const battleBeforeSearch = await battleSystem.activeBattles(player1.address);
            const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
            console.log("Battle state before startSearch:");
            console.log("- startTime:", battleBeforeSearch.startTime.toString());
            console.log("- resolved:", battleBeforeSearch.resolved);
            console.log("- time since start:", currentTime - Number(battleBeforeSearch.startTime));
            
            await battleSystem.connect(player1).startSearch(); // This should now succeed!
            
            // Debug: Check if battle was cleared after startSearch
            const battleAfterSearch = await battleSystem.activeBattles(player1.address);
            console.log("Battle state after startSearch:");
            console.log("- startTime:", battleAfterSearch.startTime.toString());
            console.log("- resolved:", battleAfterSearch.resolved);
            console.log("- Battle cleared:", battleAfterSearch.startTime.toString() === "0" ? "YES" : "NO");

            console.log("✅ BUG FIXED: Players can now start new battles after auto-resolve!");
        });
    });

    describe("Heroes & Tactics Integration", function () {
        let heroNFT, tacticsNFT;

        beforeEach(async function () {
            // Deploy HeroNFT and TacticsNFT
            const HeroNFT = await ethers.getContractFactory("HeroNFT");
            heroNFT = await upgrades.deployProxy(HeroNFT, [], { initializer: 'initialize' });
            await heroNFT.waitForDeployment();
            const heroNFTAddress = await heroNFT.getAddress();

            const TacticsNFT = await ethers.getContractFactory("TacticsNFT");
            tacticsNFT = await upgrades.deployProxy(TacticsNFT, [], { initializer: 'initialize' });
            await tacticsNFT.waitForDeployment();
            const tacticsNFTAddress = await tacticsNFT.getAddress();

            // Set up contract addresses
            await gameState.setHeroNFTAddress(heroNFTAddress);
            await gameState.setTacticsNFTAddress(tacticsNFTAddress);
            await heroNFT.setGameStateAddress(await gameState.getAddress());
            await tacticsNFT.setGameStateAddress(await gameState.getAddress());
            await battleSystem.setHeroNFTAddress(heroNFTAddress);
            await battleSystem.setTacticsNFTAddress(tacticsNFTAddress);

            // Set up players with barracks and troops
            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;

            // Unlock buildings and register players for matchmaking first
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 1500); // 1000 for tier 1 + 500 for building
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 1500); // 1000 for tier 1 + 500 for building

            // Player1 setup
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 500);
            await battleSystem.connect(player1).trainTroops(0, 10); // 10 Infantry

            // Player2 setup
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksCost, battleSystem);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 1000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 500);
            await battleSystem.connect(player2).trainTroops(0, 10); // 10 Infantry

            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);
        });

        it("should allow hero minting and deployment", async function () {
            // Give player1 resources for hero minting
            await gameState.testEarnGold(player1.address, 2000);
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnDiamonds(player1.address, 100);

            // Check resources before minting
            const gold = await gameState.getPlayerGold(player1.address);
            const food = await gameState.getPlayerFood(player1.address);
            const diamonds = await gameState.getPlayerDiamonds(player1.address);
            console.log(`Player1 resources - Gold: ${gold}, Food: ${food}, Diamonds: ${diamonds}`);

            // Player1 mints a WARRIOR hero
            await heroNFT.connect(player1).mintHero(0); // WARRIOR = 0
            console.log(`Hero minted successfully`);
            const hasHero = await heroNFT.hasHero(player1.address, 0);
            console.log(`Has hero: ${hasHero}`);
            expect(hasHero).to.be.true;

            // Check what hero ID was actually minted
            const tokenIdCounter = await heroNFT.getTokenIdCounter();
            console.log(`Token ID counter: ${tokenIdCounter}`);
            const deployedHero = await heroNFT.getDeployedHero(player1.address);
            console.log(`Currently deployed hero: ${deployedHero}`);

            // Start a battle
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0);

            // Deploy hero in HeroNFT contract first
            await heroNFT.connect(player1).deployHero(0);
            
            // Then track deployment in BattleSystem
            await battleSystem.connect(player1).deployHeroToBattle(0);

            // Verify hero is deployed
            const deployment = await battleSystem.battleHeroTactics(player1.address);
            expect(deployment.attackerHeroId).to.equal(0);
        });

        it("should allow tactics minting and deployment", async function () {
            // Give player1 resources for tactics minting
            await gameState.testEarnGold(player1.address, 2000);
            await gameState.testEarnDiamonds(player1.address, 100);

            // Player1 mints tactics
            await tacticsNFT.connect(player1).mintTactic(1); // STRIKE
            await tacticsNFT.connect(player1).mintTactic(2); // SHIELD
            expect(await tacticsNFT.hasTactic(player1.address, 1)).to.be.true;
            expect(await tacticsNFT.hasTactic(player1.address, 2)).to.be.true;

            // Start a battle
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0);

            // Deploy tactics to battle
            await battleSystem.connect(player1).deployTacticsToBattle([1, 2, 0]);

            // Verify tactics are deployed
            const deployment = await battleSystem.battleHeroTactics(player1.address);
            console.log(`Deployment:`, deployment);
            console.log(`Deployment type:`, typeof deployment);
            console.log(`Deployment keys:`, Object.keys(deployment));
            console.log(`attackerTactics:`, deployment.attackerTactics);
            console.log(`Field 0:`, deployment[0]);
            console.log(`Field 1:`, deployment[1]);
            console.log(`Field 2:`, deployment[2]);
            console.log(`Field 3:`, deployment[3]);
            console.log(`Field 4:`, deployment[4]);
            console.log(`Field 5:`, deployment[5]);
            console.log(`Field 6:`, deployment[6]);
            console.log(`Field 7:`, deployment[7]);
            // Verify tactics are deployed correctly
            expect(deployment[0]).to.equal(0); // attackerHeroId should be 0
            expect(deployment[1]).to.equal(0); // defenderHeroId should be 0
            expect(deployment[2]).to.equal(1); // attackerTactic1 should be 1
            expect(deployment[3]).to.equal(2); // attackerTactic2 should be 2
            expect(deployment[4]).to.equal(0); // attackerTactic3 should be 0
        });

        it("should allow hero and tactics deployment in same battle", async function () {
            // Give player1 resources for hero and tactics
            await gameState.testEarnGold(player1.address, 4000);
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnDiamonds(player1.address, 200);

            // Player1 mints hero and tactics
            await heroNFT.connect(player1).mintHero(0); // WARRIOR = 0
            await tacticsNFT.connect(player1).mintTactic(1); // STRIKE
            await tacticsNFT.connect(player1).mintTactic(2); // SHIELD

            // Start a battle
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0);

            // Deploy hero in HeroNFT contract first
            await heroNFT.connect(player1).deployHero(0);
            
            // Then track deployment in BattleSystem
            await battleSystem.connect(player1).deployHeroToBattle(0);

            // Deploy tactics
            await battleSystem.connect(player1).deployTacticsToBattle([1, 2, 0]);

            // Verify both hero and tactics are deployed
            const deployment = await battleSystem.battleHeroTactics(player1.address);
            expect(deployment[0]).to.equal(0); // attackerHeroId should be 0
            expect(deployment[2]).to.equal(1); // attackerTactic1 should be 1
            expect(deployment[3]).to.equal(2); // attackerTactic2 should be 2
            expect(deployment[4]).to.equal(0); // attackerTactic3 should be 0
        });

        it("should fail to deploy hero if not owned", async function () {
            // Start a battle without minting hero
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0);

            // Try to deploy hero that player doesn't own
            await expect(
                battleSystem.connect(player1).deployHeroToBattle(1)
            ).to.be.revertedWith("Not your hero or hero doesn't exist");
        });

        it("should fail to deploy tactics if not owned", async function () {
            // Start a battle without minting tactics
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0);

            // Try to deploy tactics that player doesn't own
            await expect(
                battleSystem.connect(player1).deployTacticsToBattle([1, 0, 0])
            ).to.be.revertedWith("Invalid tactics or not owned");
        });

        it("should maintain backward compatibility - battles without heroes/tactics work normally", async function () {
            // Start a battle without deploying any heroes or tactics
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0);

            // Verify battle was created normally
            const battle = await battleSystem.activeBattles(player1.address);
            expect(battle.attacker).to.equal(player1.address);
            expect(battle.defender).to.equal(player2.address);
            expect(battle.resolved).to.be.false;

            // Verify no hero/tactics deployed
            const deployment = await battleSystem.battleHeroTactics(player1.address);
            expect(deployment[0]).to.equal(0); // attackerHeroId should be 0
            expect(deployment[2]).to.equal(0); // attackerTactic1 should be 0
            expect(deployment[3]).to.equal(0); // attackerTactic2 should be 0
            expect(deployment[4]).to.equal(0); // attackerTactic3 should be 0
        });
    });
}); 