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

            expect(battleRecord.repPoints).to.be.gt(0);
            expect(battleRecord.gridBuildingsDamaged).to.be.gt(0);
        });

        it("should apply battle effects (district buildings damage)", async function () {
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
            console.log("should apply battle effects (district buildings damage)");
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

    describe("Battle Hang Issue", function () {
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

        it("should demonstrate battle hang - players locked forever if battle never resolved", async function () {
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



    describe("Battle Resolution with Heroes and Tactics", function () {
        // REMOVED: "Heroes & Tactics Integration" section - contained only basic functionality tests
        // These tests were redundant and didn't test meaningful gameplay scenarios:
        // - "should allow hero minting and deployment" - too basic
        // - "should allow tactics minting and deployment" - too basic  
        // - "should allow hero and tactics deployment in same battle" - too basic
        // - "should fail to deploy hero if not owned" - too basic
        // - "should fail to deploy tactics if not owned" - too basic
        // - "should maintain backward compatibility" - too basic
        // 
        // Replaced with "Real Gameplay Scenarios" that test actual strategic decisions.
    });

    describe("Real Gameplay Scenarios", function () {
        beforeEach(async function () {
            // Set up players with proper resources and buildings
            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;

            // Unlock buildings and register players for matchmaking
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 2000);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 2000);

            // Player1 setup - Aggressive player with infantry focus
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksCost);
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 2000);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 1000);
            await battleSystem.connect(player1).trainTroops(0, 20); // 20 infantry

            // Player2 setup - Defensive player with mixed troops
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 2000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 1000);
            await battleSystem.connect(player2).trainTroops(0, 10); // 10 infantry

            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);
        });

        it("should test competitive hero vs hero battle - WARRIOR vs STRATEGIST", async function () {
            // Scenario: Two players with different hero strategies compete
            
            // Player1: Aggressive WARRIOR strategy with infantry
            await gameState.testEarnGold(player1.address, 3000);
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnDiamonds(player1.address, 100);
            await heroNFT.connect(player1).mintHero(0); // WARRIOR

            // Player2: Strategic STRATEGIST with siege focus (but only infantry available)
            await gameState.testEarnGold(player2.address, 3000);
            await gameState.testEarnFood(player2.address, 2000);
            await gameState.testEarnDiamonds(player2.address, 100);
            await heroNFT.connect(player2).mintHero(1); // STRATEGIST

            // Build defense tower for player2 to have defense power
            const defenseTowerIndex = getBuildingTypeIndex("DEFENSE_TOWER");
            const defenseTowerConfig = await districtBuildings.districtBuildingConfigs(defenseTowerIndex);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, defenseTowerConfig.buildCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(defenseTowerIndex);

            // Start battle with hero - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattleWithHero(15, 0, 0, 0); // 15 infantry + WARRIOR hero

            // Deploy hero for defender
            await battleSystem.connect(player2).deployHeroToBattleByClass(1); // STRATEGIST

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers
            const player1BasePower = 15 * 10; // 15 infantry * 10 power
            const player1HeroBonus = 15 * 20; // 15 infantry * 20 bonus from WARRIOR
            const player1TotalPower = player1BasePower + player1HeroBonus;
            
            // Note: Defender power comes from defense tower, not troops
            const player2BasePower = 100; // Default defense tower power
            const player2HeroBonus = 0; // STRATEGIST doesn't boost defense tower
            const player2TotalPower = player2BasePower + player2HeroBonus;
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1TotalPower);
            expect(Number(battleRecord.defenderPower)).to.equal(player2TotalPower);
            expect(battleRecord.attackerWon).to.be.true; // WARRIOR should win against STRATEGIST with infantry
            
            console.log(`🏆 Competitive Battle Results:`);
            console.log(`  Player1 (WARRIOR + 15 infantry): ${player1TotalPower} power`);
            console.log(`  Player2 (STRATEGIST + defense tower): ${player2TotalPower} power`);
            console.log(`  Winner: ${battleRecord.attackerWon ? 'Player1 (WARRIOR)' : 'Player2 (STRATEGIST)'}`);
        });

        it("should test resource management - can player afford hero after training troops?", async function () {
            // Scenario: Player needs to manage resources carefully
            
            // Player1 starts with limited resources - need more for hero
            await gameState.testEarnGold(player1.address, 2500); // More gold for hero
            await gameState.testEarnFood(player1.address, 1500); // More food for hero
            await gameState.testEarnDiamonds(player1.address, 100); // More diamonds for hero

            // Train some troops first (costs resources)
            await battleSystem.connect(player1).trainTroops(0, 5); // 5 infantry = 500 gold, 250 food

            // Check if player can still afford hero
            const goldAfterTroops = await gameState.getPlayerGold(player1.address);
            const foodAfterTroops = await gameState.getPlayerFood(player1.address);
            const diamondsAfterTroops = await gameState.getPlayerDiamonds(player1.address);
            
            console.log(`💰 Resource Management Test:`);
            console.log(`  Gold after training troops: ${goldAfterTroops}`);
            console.log(`  Food after training troops: ${foodAfterTroops}`);
            console.log(`  Diamonds after training troops: ${diamondsAfterTroops}`);

            // Try to mint hero - should succeed with remaining resources
            await heroNFT.connect(player1).mintHero(0); // WARRIOR
            
            // Verify hero was minted
            const hasHero = await heroNFT.hasHero(player1.address, 0);
            expect(hasHero).to.be.true;
            
            console.log(`  ✅ Hero minted successfully with remaining resources`);
        });

        it("should test garrison deployment - defender can deploy troops during battle", async function () {
            // Scenario: Defender deploys troops to garrison after being attacked
            
            // Add more troops for testing (barracks already built in beforeEach)
            await gameState.testEarnGold(player1.address, 5000); // More gold for upgrades and training
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnGold(player2.address, 5000); // More gold for upgrades and training
            await gameState.testEarnFood(player2.address, 2000);

            // Upgrade barracks to level 3 to train all troop types
            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            
            // Upgrade to level 2 (for cavalry)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksConfig.upgradeCost);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksConfig.upgradeCost);
            await districtBuildings.connect(player2).upgradeDistrictBuilding(barracksIndex);
            
            // Upgrade to level 3 (for siege)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksConfig.upgradeCost) * BigInt(2));
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksConfig.upgradeCost) * BigInt(2));
            await districtBuildings.connect(player2).upgradeDistrictBuilding(barracksIndex);

            // Player1 trains additional troops for attack
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry (infantry already trained)

            // Player2 trains additional troops for defense
            await battleSystem.connect(player2).trainTroops(2, 3);  // 3 siege (infantry already trained)
            
            // Check current troop counts for Player2
            const player2InfantryBefore = await battleSystem.playerTroops(player2.address, 0);
            const player2CavalryBefore = await battleSystem.playerTroops(player2.address, 1);
            const player2SiegeBefore = await battleSystem.playerTroops(player2.address, 2);
            console.log(`Player2 troops before deployment: ${player2InfantryBefore} infantry, ${player2CavalryBefore} cavalry, ${player2SiegeBefore} siege`);

            // Player2 builds garrison
            const garrisonIndex = 9; // GARRISON = 9
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 300); // Garrison build cost
            await districtBuildings.connect(player2).buildDistrictBuilding(garrisonIndex);

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 5, 0); // 10 infantry, 5 cavalry

            // Check initial battle state
            const battleBeforeGarrison = await battleSystem.activeBattles(player1.address);
            const initialDefenderPower = battleBeforeGarrison.defenderPower;
            expect(initialDefenderPower).to.equal(0); // No defense tower, no garrison troops

            // Player2 deploys troops to garrison (defender action)
            await battleSystem.connect(player2).deployTroopsToGarrison(8, 0, 3); // 8 infantry, 0 cavalry, 3 siege

            // Check battle state after garrison deployment
            const battleAfterGarrison = await battleSystem.activeBattles(player1.address);
            const finalDefenderPower = battleAfterGarrison.defenderPower;
            
            // Debug: Check if the battle was updated for both players
            const battleAfterGarrisonPlayer2 = await battleSystem.activeBattles(player2.address);
            console.log(`Debug - Player1 battle defender power: ${finalDefenderPower}`);
            console.log(`Debug - Player2 battle defender power: ${battleAfterGarrisonPlayer2.defenderPower}`);
            
            // Calculate expected defender power
            const expectedDefenderPower = (8 * 10) + (0 * 15) + (3 * 20); // infantry + cavalry + siege
            expect(Number(finalDefenderPower)).to.equal(expectedDefenderPower);

            // Verify troops are locked (not available for other actions)
            const remainingInfantry = await battleSystem.playerTroops(player2.address, 0);
            const remainingCavalry = await battleSystem.playerTroops(player2.address, 1);
            const remainingSiege = await battleSystem.playerTroops(player2.address, 2);
            expect(remainingInfantry).to.equal(Number(player2InfantryBefore) - 8); // 8 infantry deployed
            expect(remainingCavalry).to.equal(0); // No cavalry deployed
            expect(remainingSiege).to.equal(0);   // All siege deployed

            // Try to deploy again - should fail
            await expect(
                battleSystem.connect(player2).deployTroopsToGarrison(1, 0, 0)
            ).to.be.revertedWith("Troops already deployed to garrison");

            console.log(`🏰 Garrison Deployment Test:`);
            console.log(`  Initial defender power: ${initialDefenderPower}`);
            console.log(`  Final defender power: ${finalDefenderPower}`);
            console.log(`  Expected power: ${expectedDefenderPower}`);
            console.log(`  ✅ Defender successfully deployed troops to garrison`);
        });

        it("should test combined garrison deployment - troops and hero in single transaction", async function () {
            // Scenario: Defender deploys troops and hero to garrison in single transaction
            
            // Add more troops for testing
            await gameState.testEarnGold(player1.address, 5000);
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnGold(player2.address, 5000);
            await gameState.testEarnFood(player2.address, 2000);

            // Upgrade barracks to level 3
            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            
            // Upgrade to level 2 (for cavalry)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksConfig.upgradeCost);
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksConfig.upgradeCost);
            await districtBuildings.connect(player2).upgradeDistrictBuilding(barracksIndex);
            
            // Upgrade to level 3 (for siege)
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksConfig.upgradeCost) * BigInt(2));
            await districtBuildings.connect(player1).upgradeDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, BigInt(barracksConfig.upgradeCost) * BigInt(2));
            await districtBuildings.connect(player2).upgradeDistrictBuilding(barracksIndex);

            // Train troops
            await battleSystem.connect(player1).trainTroops(1, 5);  // 5 cavalry
            await battleSystem.connect(player2).trainTroops(2, 3);  // 3 siege

            // Player2 builds garrison
            const garrisonIndex = 9; // GARRISON = 9
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 300);
            await districtBuildings.connect(player2).buildDistrictBuilding(garrisonIndex);

            // Mint hero for player2 (ensure enough resources)
            await gameState.testEarnGold(player2.address, 2000); // Extra gold for hero minting (WARRIOR costs 1500)
            await gameState.testEarnFood(player2.address, 1500); // Extra food for hero minting (WARRIOR costs 1000)
            await gameState.testEarnDiamonds(player2.address, 50); // Extra diamonds for hero minting (WARRIOR costs 40)
            await heroNFT.connect(player2).mintHero(0); // WARRIOR
            const mintedHeroId = await heroNFT.getHeroIdByClass(player2.address, 0);
            console.log(`Debug - Minted hero ID: ${mintedHeroId}`);
            
            // Debug: Check if hero is actually owned
            try {
                const heroOwner = await heroNFT.ownerOf(mintedHeroId);
                console.log(`Debug - Hero owner: ${heroOwner}`);
            } catch (error) {
                console.log(`Debug - Error getting hero owner: ${error.message}`);
            }
            
            // Debug: Check if hero is owned
            const hasHero = await heroNFT.hasHero(player2.address, 0);
            const heroId = await heroNFT.getHeroIdByClass(player2.address, 0);
            console.log(`Debug - Hero owned: ${hasHero}, Hero ID: ${heroId}`);

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 5, 0); // 10 infantry, 5 cavalry

            // Check initial battle state
            const battleBeforeGarrison = await battleSystem.activeBattles(player1.address);
            const initialDefenderPower = battleBeforeGarrison.defenderPower;
            expect(initialDefenderPower).to.equal(0);

            // Player2 deploys troops and hero to garrison in single transaction
            try {
                await battleSystem.connect(player2).deployToGarrison(8, 0, 3, 0); // 8 infantry, 0 cavalry, 3 siege, WARRIOR hero
                console.log(`Debug - BattleSystem deployment successful`);
            } catch (error) {
                console.log(`Debug - BattleSystem deployment failed: ${error.message}`);
            }

            // Check battle state after deployment
            const battleAfterGarrison = await battleSystem.activeBattles(player1.address);
            const finalDefenderPower = battleAfterGarrison.defenderPower;
            
            // Check that troops are deployed
            expect(battleAfterGarrison.defenderTroops.infantry).to.equal(8);
            expect(battleAfterGarrison.defenderTroops.cavalry).to.equal(0);
            expect(battleAfterGarrison.defenderTroops.siege).to.equal(3);
            
            // Check that hero is deployed
            const heroTacticsDeployment = await battleSystem.battleHeroTactics(player2.address);
            console.log(`Debug - Battle hero tactics - attackerHeroId: ${heroTacticsDeployment.attackerHeroId}, defenderHeroId: ${heroTacticsDeployment.defenderHeroId}`);
            expect(heroTacticsDeployment.defenderHeroId).to.be.gt(0);

            // Check that defender power increased (including hero bonus)
            // Base power: (8 infantry * 10) + (0 cavalry * 15) + (3 siege * 20) = 80 + 0 + 60 = 140
            // WARRIOR hero gives bonus to infantry: 8 infantry * hero bonus
            const expectedBasePower = (8 * 10) + (0 * 15) + (3 * 20); // 140
            expect(Number(finalDefenderPower)).to.be.gte(expectedBasePower);

            // Try to deploy again - should fail
            await expect(
                battleSystem.connect(player2).deployToGarrison(1, 0, 0, 255)
            ).to.be.revertedWith("Troops already deployed to garrison");

            console.log(`⚔️ Combined Garrison Deployment Test:`);
            console.log(`  Initial defender power: ${initialDefenderPower}`);
            console.log(`  Final defender power: ${finalDefenderPower}`);
            console.log(`  Hero deployed: ${heroTacticsDeployment.defenderHeroId}`);
            console.log(`  ✅ Defender successfully deployed troops and hero to garrison in single transaction`);
        });

        it("should test outpost warning system - defender gets warning when attacked", async function () {
            // Scenario: Defender with outpost gets warning when attacked
            
            // Player2 needs enough gold to unlock and build outpost
            await gameState.testEarnGold(player2.address, 1000); // More than unlock cost (600) + build cost (120)
            
            // Player2 builds outpost
            const outpostIndex = 5; // OUTPOST = 5 (tier 0 building)
            await districtBuildings.connect(player2).buildDistrictBuilding(outpostIndex);

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 0, 0); // 10 infantry

            // Check initial warning state
            const battleBeforeWarning = await battleSystem.activeBattles(player2.address);
            expect(battleBeforeWarning.outpostWarningShown).to.be.false; // Warning not shown yet

            // Player2 confirms the warning
            await battleSystem.connect(player2).confirmOutpostWarning();

            // Check warning state after confirmation
            const battleAfterWarning = await battleSystem.activeBattles(player2.address);
            expect(battleAfterWarning.outpostWarningShown).to.be.true; // Warning confirmed

            // Verify attacker's battle record is also updated
            const attackerBattle = await battleSystem.activeBattles(player1.address);
            expect(attackerBattle.outpostWarningShown).to.be.true; // Warning confirmed

            // Try to confirm again - should fail
            await expect(
                battleSystem.connect(player2).confirmOutpostWarning()
            ).to.be.revertedWith("Warning already confirmed");

            console.log(`🏰 Outpost Warning Test:`);
            console.log(`  Initial warning state: ${battleBeforeWarning.outpostWarningShown}`);
            console.log(`  Final warning state: ${battleAfterWarning.outpostWarningShown}`);
            console.log(`  ✅ Outpost warning system working correctly`);
        });

        it("should test outpost warning - no warning when defender has no outpost", async function () {
            // Scenario: Defender without outpost doesn't get warning
            
            // Player2 does NOT build outpost (no outpost)

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 0, 0); // 10 infantry

            // Check warning state - should be false (no outpost, so no warning)
            const battle = await battleSystem.activeBattles(player2.address);
            expect(battle.outpostWarningShown).to.be.false; // No outpost, no warning

            // Try to confirm warning - should fail (not the defender or no battle)
            await expect(
                battleSystem.connect(player1).confirmOutpostWarning()
            ).to.be.revertedWith("Not the defender");

            console.log(`🏰 No Outpost Warning Test:`);
            console.log(`  Warning state: ${battle.outpostWarningShown}`);
            console.log(`  ✅ No warning shown when defender has no outpost`);
        });
    });

    describe("Tactics Battle Scenarios", function () {
        beforeEach(async function () {
            // Set up players with proper resources and buildings
            const barracksIndex = getBuildingTypeIndex("BARRACKS");
            const barracksConfig = await districtBuildings.districtBuildingConfigs(barracksIndex);
            const barracksCost = barracksConfig.buildCost;

            // Unlock buildings and register players for matchmaking
            await donateGoldForTier(player1, gameState, gridBuildings, altar, sonicityNFT, 2000);
            await donateGoldForTier(player2, gameState, gridBuildings, altar, sonicityNFT, 2000);

            // Player1 setup - Attacker with infantry focus
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, barracksCost);
            await districtBuildings.connect(player1).buildDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 2000);
            await ensurePlayerFood(player1, gameState, gridBuildings, altar, sonicityFarm, 1000);
            await battleSystem.connect(player1).trainTroops(0, 20); // 20 infantry

            // Player2 setup - Defender with mixed troops and garrison
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, barracksCost);
            await districtBuildings.connect(player2).buildDistrictBuilding(barracksIndex);
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 2000);
            await ensurePlayerFood(player2, gameState, gridBuildings, altar, sonicityFarm, 1000);
            await battleSystem.connect(player2).trainTroops(0, 10); // 10 infantry

            // Build garrison for Player2 (defender)
            const garrisonIndex = 9; // GARRISON = 9
            await ensurePlayerGold(player2, gameState, gridBuildings, altar, sonicityNFT, 300); // Garrison build cost
            await districtBuildings.connect(player2).buildDistrictBuilding(garrisonIndex);

            // Set noOpponentFoundChance to 0 for testing
            await battleSystem.connect(owner).setNoOpponentFoundChance(0);
        });

        it("should test battle with no tactics deployed - pure troop vs troop", async function () {
            // Scenario: Both players have no tactics, pure troop power comparison
            
            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(15, 0, 0); // 15 infantry

            // Player2 deploys troops to garrison (no tactics)
            await battleSystem.connect(player2).deployToGarrison(10, 0, 0, 255); // 10 infantry, no hero

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers (no tactics, no heroes)
            const player1Power = 15 * 10; // 15 infantry * 10 power = 150
            const player2Power = 10 * 10; // 10 infantry * 10 power = 100
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1Power);
            expect(Number(battleRecord.defenderPower)).to.equal(player2Power);
            expect(battleRecord.attackerWon).to.be.true; // 150 vs 100 power
            
            console.log(`⚔️ No Tactics Battle:`);
            console.log(`  Player1 (15 infantry): ${player1Power} power`);
            console.log(`  Player2 (10 infantry): ${player2Power} power`);
            console.log(`  Winner: ${battleRecord.attackerWon ? 'Player1' : 'Player2'}`);
            console.log(`  ✅ Pure troop power comparison working correctly`);
        });

        it("should test battle with attacker tactics vs no defender tactics", async function () {
            // Scenario: Attacker has tactics, defender has none - tactics advantage
            
            // Player1 mints tactics
            await gameState.testEarnGold(player1.address, 3000);
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnDiamonds(player1.address, 100);
            await tacticsNFT.connect(player1).mintTactic(1); // Offensive Tactic
            await tacticsNFT.connect(player1).mintTactic(2); // Defensive Tactic

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(15, 0, 0); // 15 infantry

            // Player2 deploys troops to garrison (no tactics)
            await battleSystem.connect(player2).deployToGarrison(10, 0, 0, 255); // 10 infantry, no hero

            // Player1 deploys tactics during battle
            await battleSystem.connect(player1).deployTacticToBattle(1); // Offensive Tactic
            await battleSystem.connect(player1).deployTacticToBattle(2); // Defensive Tactic

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers with tactics bonuses
            const player1BasePower = 15 * 10; // 15 infantry * 10 power = 150
            const player1TacticBonus = 50 + 60; // Offensive + Defensive = 110
            const player1TotalPower = player1BasePower + player1TacticBonus;
            
            const player2Power = 10 * 10; // 10 infantry * 10 power = 100
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1TotalPower);
            expect(Number(battleRecord.defenderPower)).to.equal(player2Power);
            expect(battleRecord.attackerWon).to.be.true; // 260 vs 100 power
            
            console.log(`⚔️ Attacker Tactics vs No Defender Tactics:`);
            console.log(`  Player1 (15 infantry + 2 tactics): ${player1TotalPower} power`);
            console.log(`  Player2 (10 infantry): ${player2Power} power`);
            console.log(`  Winner: ${battleRecord.attackerWon ? 'Player1' : 'Player2'}`);
            console.log(`  ✅ Tactics power bonuses working correctly`);
        });

        it("should test battle with defender tactics vs no attacker tactics", async function () {
            // Scenario: Defender has tactics, attacker has none - defensive advantage
            
            // Player2 mints tactics
            await gameState.testEarnGold(player2.address, 3000);
            await gameState.testEarnFood(player2.address, 2000);
            await gameState.testEarnDiamonds(player2.address, 100);
            await tacticsNFT.connect(player2).mintTactic(3); // Defensive Tactic
            await tacticsNFT.connect(player2).mintTactic(4); // Counter Tactic

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(15, 0, 0); // 15 infantry

            // Player2 deploys troops to garrison
            await battleSystem.connect(player2).deployToGarrison(10, 0, 0, 255); // 10 infantry, no hero

            // Player2 deploys tactics during battle
            await battleSystem.connect(player2).deployTacticToBattle(3); // Defensive Tactic
            await battleSystem.connect(player2).deployTacticToBattle(4); // Counter Tactic

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers with tactics bonuses
            const player1Power = 15 * 10; // 15 infantry * 10 power = 150
            
            const player2BasePower = 10 * 10; // 10 infantry * 10 power = 100
            const player2TacticBonus = 40 + 45; // Defensive + Counter = 85
            const player2TotalPower = player2BasePower + player2TacticBonus;
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1Power);
            expect(Number(battleRecord.defenderPower)).to.equal(player2TotalPower);
            expect(battleRecord.attackerWon).to.be.false; // 150 vs 185 power (defender wins)
            
            console.log(`⚔️ Defender Tactics vs No Attacker Tactics:`);
            console.log(`  Player1 (15 infantry): ${player1Power} power`);
            console.log(`  Player2 (10 infantry + 2 tactics): ${player2TotalPower} power`);
            console.log(`  Winner: ${battleRecord.attackerWon ? 'Player1' : 'Player2'}`);
            console.log(`  ✅ Defensive tactics advantage working correctly`);
        });

        it("should test battle with unequal tactics deployment - 3 vs 1", async function () {
            // Scenario: Attacker deploys 3 tactics, defender deploys 1 - overwhelming advantage
            
            // Both players mint tactics
            await gameState.testEarnGold(player1.address, 5000);
            await gameState.testEarnFood(player1.address, 3000);
            await gameState.testEarnDiamonds(player1.address, 150);
            await tacticsNFT.connect(player1).mintTactic(1); // Offensive
            await tacticsNFT.connect(player1).mintTactic(2); // Defensive
            await tacticsNFT.connect(player1).mintTactic(5); // Counter

            await gameState.testEarnGold(player2.address, 2000);
            await gameState.testEarnFood(player2.address, 1500);
            await gameState.testEarnDiamonds(player2.address, 50);
            await tacticsNFT.connect(player2).mintTactic(3); // Defensive

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 0, 0); // 10 infantry

            // Player2 deploys troops to garrison
            await battleSystem.connect(player2).deployToGarrison(10, 0, 0, 255); // 10 infantry, no hero

            // Deploy tactics
            await battleSystem.connect(player1).deployTacticToBattle(1); // Offensive
            await battleSystem.connect(player1).deployTacticToBattle(2); // Defensive
            await battleSystem.connect(player1).deployTacticToBattle(5); // Counter
            await battleSystem.connect(player2).deployTacticToBattle(3); // Defensive

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers
            const player1BasePower = 10 * 10; // 10 infantry * 10 power = 100
            const player1TacticBonus = 50 + 60 + 55; // Offensive + Defensive + Counter = 165
            const player1TotalPower = player1BasePower + player1TacticBonus;
            
            const player2BasePower = 10 * 10; // 10 infantry * 10 power = 100
            const player2TacticBonus = 40; // Defensive = 40
            const player2TotalPower = player2BasePower + player2TacticBonus;
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1TotalPower);
            expect(Number(battleRecord.defenderPower)).to.equal(player2TotalPower);
            expect(battleRecord.attackerWon).to.be.true; // 265 vs 140 power
            
            console.log(`⚔️ Unequal Tactics (3 vs 1):`);
            console.log(`  Player1 (10 infantry + 3 tactics): ${player1TotalPower} power`);
            console.log(`  Player2 (10 infantry + 1 tactic): ${player2TotalPower} power`);
            console.log(`  Winner: ${battleRecord.attackerWon ? 'Player1' : 'Player2'}`);
            console.log(`  ✅ Tactics quantity advantage working correctly`);
        });

        it("should test battle with full tactics deployment - 3 vs 3", async function () {
            // Scenario: Both players deploy maximum 3 tactics - ultimate tactics battle
            
            // Both players mint full tactics
            await gameState.testEarnGold(player1.address, 8000);
            await gameState.testEarnFood(player1.address, 5000);
            await gameState.testEarnDiamonds(player1.address, 200);
            await tacticsNFT.connect(player1).mintTactic(1); // Offensive
            await tacticsNFT.connect(player1).mintTactic(2); // Defensive
            await tacticsNFT.connect(player1).mintTactic(5); // Counter

            await gameState.testEarnGold(player2.address, 8000);
            await gameState.testEarnFood(player2.address, 5000);
            await gameState.testEarnDiamonds(player2.address, 200);
            await tacticsNFT.connect(player2).mintTactic(3); // Defensive
            await tacticsNFT.connect(player2).mintTactic(4); // Counter
            await tacticsNFT.connect(player2).mintTactic(6); // Offensive

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 0, 0); // 10 infantry

            // Player2 deploys troops to garrison
            await battleSystem.connect(player2).deployToGarrison(10, 0, 0, 255); // 10 infantry, no hero

            // Deploy all tactics
            await battleSystem.connect(player1).deployTacticToBattle(1); // Offensive
            await battleSystem.connect(player1).deployTacticToBattle(2); // Defensive
            await battleSystem.connect(player1).deployTacticToBattle(5); // Counter
            await battleSystem.connect(player2).deployTacticToBattle(3); // Defensive
            await battleSystem.connect(player2).deployTacticToBattle(4); // Counter
            await battleSystem.connect(player2).deployTacticToBattle(6); // Offensive

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers
            const player1BasePower = 10 * 10; // 10 infantry * 10 power = 100
            const player1TacticBonus = 50 + 60 + 55; // Offensive + Defensive + Counter = 165
            const player1TotalPower = player1BasePower + player1TacticBonus;
            
            const player2BasePower = 10 * 10; // 10 infantry * 10 power = 100
            const player2TacticBonus = 40 + 45 + 35; // Defensive + Counter + Offensive = 120
            const player2TotalPower = player2BasePower + player2TacticBonus;
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1TotalPower);
            expect(Number(battleRecord.defenderPower)).to.equal(player2TotalPower);
            // Should be a close battle with attacker winning
            expect(battleRecord.attackerWon).to.be.true; // 265 vs 220 power
            
            console.log(`⚔️ Full Tactics Battle (3 vs 3):`);
            console.log(`  Player1 (10 infantry + 3 tactics): ${player1TotalPower} power`);
            console.log(`  Player2 (10 infantry + 3 tactics): ${player2TotalPower} power`);
            console.log(`  Winner: ${battleRecord.attackerWon ? 'Player1' : 'Player2'}`);
            console.log(`  ✅ Maximum tactics deployment working correctly`);
        });

        it("should test tactics deployment limits - cannot deploy more than 3", async function () {
            // Scenario: Player tries to deploy more than 3 tactics - should fail
            
            // Player1 mints 4 tactics
            await gameState.testEarnGold(player1.address, 10000);
            await gameState.testEarnFood(player1.address, 6000);
            await gameState.testEarnDiamonds(player1.address, 250);
            await tacticsNFT.connect(player1).mintTactic(1); // Offensive
            await tacticsNFT.connect(player1).mintTactic(2); // Defensive
            await tacticsNFT.connect(player1).mintTactic(5); // Counter
            await tacticsNFT.connect(player1).mintTactic(6); // Offensive

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(10, 0, 0); // 10 infantry

            // Player2 deploys troops to garrison
            await battleSystem.connect(player2).deployToGarrison(10, 0, 0, 255); // 10 infantry, no hero

            // Deploy 3 tactics successfully
            await battleSystem.connect(player1).deployTacticToBattle(1); // Offensive
            await battleSystem.connect(player1).deployTacticToBattle(2); // Defensive
            await battleSystem.connect(player1).deployTacticToBattle(5); // Counter

            // Try to deploy 4th tactic - should fail
            await expect(
                battleSystem.connect(player1).deployTacticToBattle(6)
            ).to.be.revertedWith("All attacker tactic slots are full");

            console.log(`⚔️ Tactics Deployment Limits:`);
            console.log(`  ✅ Successfully deployed 3 tactics`);
            console.log(`  ✅ Correctly prevented 4th tactic deployment`);
        });

        it("should test tactics power calculation accuracy", async function () {
            // Scenario: Verify that tactics power bonuses are calculated correctly
            
            // Player1 mints specific tactics with known power values
            await gameState.testEarnGold(player1.address, 3000);
            await gameState.testEarnFood(player1.address, 2000);
            await gameState.testEarnDiamonds(player1.address, 100);
            await tacticsNFT.connect(player1).mintTactic(1); // Offensive: +50 power
            await tacticsNFT.connect(player1).mintTactic(2); // Defensive: +60 power

            // Start battle - Player1 attacks Player2
            await ensurePlayerGold(player1, gameState, gridBuildings, altar, sonicityNFT, 100);
            await battleSystem.connect(player1).startSearch();
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.searchDuration()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).findRandomOpponent();
            await battleSystem.connect(player1).startBattle(5, 0, 0); // 5 infantry

            // Player2 deploys troops to garrison
            await battleSystem.connect(player2).deployToGarrison(5, 0, 0, 255); // 5 infantry, no hero

            // Deploy tactics
            await battleSystem.connect(player1).deployTacticToBattle(1); // Offensive: +50
            await battleSystem.connect(player1).deployTacticToBattle(2); // Defensive: +60

            // Fast forward and resolve
            await ethers.provider.send("evm_increaseTime", [Number(await battleSystem.BATTLE_DURATION()) + 1]);
            await ethers.provider.send("evm_mine");
            await battleSystem.connect(player1).resolveBattle(player1.address);

            // Verify battle outcome
            const latestBattleId = await battleSystem.getLatestBattleId();
            const battleRecord = await battleSystem.getBattleRecord(latestBattleId);
            
            // Calculate expected powers with exact values
            const player1BasePower = 5 * 10; // 5 infantry * 10 power = 50
            const player1TacticBonus = 50 + 60; // Offensive + Defensive = 110
            const player1TotalPower = player1BasePower + player1TacticBonus; // 50 + 110 = 160
            
            const player2Power = 5 * 10; // 5 infantry * 10 power = 50
            
            expect(Number(battleRecord.attackerPower)).to.equal(player1TotalPower);
            expect(Number(battleRecord.defenderPower)).to.equal(player2Power);
            expect(battleRecord.attackerWon).to.be.true; // 160 vs 50 power
            
            console.log(`⚔️ Tactics Power Calculation:`);
            console.log(`  Player1 base power: ${player1BasePower}`);
            console.log(`  Player1 tactic bonus: ${player1TacticBonus}`);
            console.log(`  Player1 total power: ${player1TotalPower}`);
            console.log(`  Player2 power: ${player2Power}`);
            console.log(`  ✅ Tactics power calculation accurate`);
        });
    });
}); 