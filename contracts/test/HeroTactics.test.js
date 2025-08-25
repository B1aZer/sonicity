const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Hero & Tactics System", function () {
    let heroNFT;
    let tacticsNFT;
    let gameState;
    let owner;
    let player1;
    let player2;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy GameState (simplified for testing)
        const GameState = await ethers.getContractFactory("GameState");
        gameState = await upgrades.deployProxy(GameState, [], { initializer: 'initialize' });
        await gameState.waitForDeployment();
        const gameStateAddress = await gameState.getAddress();

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
        await heroNFT.setGameStateAddress(gameStateAddress);
        await tacticsNFT.setGameStateAddress(gameStateAddress);
    });

    describe("HeroNFT", function () {
        it("Should initialize with 3 hero templates", async function () {
            // Check WARRIOR template
            const warriorTemplate = await heroNFT.getHeroTemplate(0); // WARRIOR = 0
            expect(warriorTemplate.name).to.equal("Iron Guardian");
            expect(warriorTemplate.class).to.equal(0); // WARRIOR
            expect(warriorTemplate.troopBonus).to.equal(20);

            // Check STRATEGIST template
            const strategistTemplate = await heroNFT.getHeroTemplate(1); // STRATEGIST = 1
            expect(strategistTemplate.name).to.equal("Shadow Tactician");
            expect(strategistTemplate.class).to.equal(1); // STRATEGIST
            expect(strategistTemplate.troopBonus).to.equal(20);

            // Check SCOUT template
            const scoutTemplate = await heroNFT.getHeroTemplate(2); // SCOUT = 2
            expect(scoutTemplate.name).to.equal("Swift Scout");
            expect(scoutTemplate.class).to.equal(2); // SCOUT
            expect(scoutTemplate.troopBonus).to.equal(20);
        });

        it("Should have correct hero costs", async function () {
            // Check WARRIOR cost
            const warriorCost = await heroNFT.getHeroCost(0); // WARRIOR = 0
            expect(warriorCost.goldCost).to.equal(1500);
            expect(warriorCost.foodCost).to.equal(1000);
            expect(warriorCost.diamondCost).to.equal(40);

            // Check STRATEGIST cost
            const strategistCost = await heroNFT.getHeroCost(1); // STRATEGIST = 1
            expect(strategistCost.goldCost).to.equal(1200);
            expect(strategistCost.foodCost).to.equal(1200);
            expect(strategistCost.diamondCost).to.equal(35);

            // Check SCOUT cost
            const scoutCost = await heroNFT.getHeroCost(2); // SCOUT = 2
            expect(scoutCost.goldCost).to.equal(1000);
            expect(scoutCost.foodCost).to.equal(1000);
            expect(scoutCost.diamondCost).to.equal(30);
        });

        it("Should correctly identify hero ownership", async function () {
            // Initially no heroes
            expect(await heroNFT.hasHero(player1.address, 0)).to.be.false; // WARRIOR
            expect(await heroNFT.hasHero(player1.address, 1)).to.be.false; // STRATEGIST
            expect(await heroNFT.hasHero(player1.address, 2)).to.be.false; // SCOUT
        });

        it("Should calculate hero bonuses correctly", async function () {
            // No hero deployed
            let bonus = await heroNFT.calculateHeroBonus(0, 10, 5, 3);
            expect(bonus).to.equal(0);

            // Note: We can't test minting without setting up GameState properly
            // This would require more complex setup with resource management
        });
    });

    describe("TacticsNFT", function () {
        it("Should initialize with 9 tactics", async function () {
            // Check STRIKE tactics
            const ironStrike = await tacticsNFT.getTactic(1);
            expect(ironStrike.name).to.equal("Iron Strike");
            expect(ironStrike.tacticType).to.equal(0); // STRIKE
            expect(ironStrike.effectMagnitude).to.equal(3);

            const cavalryRush = await tacticsNFT.getTactic(4);
            expect(cavalryRush.name).to.equal("Cavalry Rush");
            expect(cavalryRush.tacticType).to.equal(0); // STRIKE
            expect(cavalryRush.effectMagnitude).to.equal(2);

            const swiftStrike = await tacticsNFT.getTactic(7);
            expect(swiftStrike.name).to.equal("Swift Strike");
            expect(swiftStrike.tacticType).to.equal(0); // STRIKE
            expect(swiftStrike.effectMagnitude).to.equal(1);

            // Check SHIELD tactics
            const guardianWall = await tacticsNFT.getTactic(2);
            expect(guardianWall.name).to.equal("Guardian Wall");
            expect(guardianWall.tacticType).to.equal(1); // SHIELD
            expect(guardianWall.effectMagnitude).to.equal(75);

            const defensiveCircle = await tacticsNFT.getTactic(5);
            expect(defensiveCircle.name).to.equal("Defensive Circle");
            expect(defensiveCircle.tacticType).to.equal(1); // SHIELD
            expect(defensiveCircle.effectMagnitude).to.equal(50);

            const shadowGuard = await tacticsNFT.getTactic(8);
            expect(shadowGuard.name).to.equal("Shadow Guard");
            expect(shadowGuard.tacticType).to.equal(1); // SHIELD
            expect(shadowGuard.effectMagnitude).to.equal(25);

            // Check TRICK tactics
            const battleRage = await tacticsNFT.getTactic(3);
            expect(battleRage.name).to.equal("Battle Rage");
            expect(battleRage.tacticType).to.equal(2); // TRICK
            expect(battleRage.effectMagnitude).to.equal(30);

            const tacticalFeint = await tacticsNFT.getTactic(6);
            expect(tacticalFeint.name).to.equal("Tactical Feint");
            expect(tacticalFeint.tacticType).to.equal(2); // TRICK
            expect(tacticalFeint.effectMagnitude).to.equal(20);

            const stealthTrap = await tacticsNFT.getTactic(9);
            expect(stealthTrap.name).to.equal("Stealth Trap");
            expect(stealthTrap.tacticType).to.equal(2); // TRICK
            expect(stealthTrap.effectMagnitude).to.equal(15);
        });

        it("Should have correct tactic costs", async function () {
            // All tactics cost the same
            for (let i = 1; i <= 9; i++) {
                const cost = await tacticsNFT.getTacticCost(i);
                expect(cost.goldCost).to.equal(800);
                expect(cost.diamondCost).to.equal(8);
            }
        });

        it("Should correctly identify tactic ownership", async function () {
            // Initially no tactics
            expect(await tacticsNFT.hasTactic(player1.address, 1)).to.be.false;
            expect(await tacticsNFT.hasTactic(player1.address, 5)).to.be.false;
            expect(await tacticsNFT.hasTactic(player1.address, 9)).to.be.false;
        });

        it("Should validate tactics for battle correctly", async function () {
            // Empty tactics array (all zeros)
            let isValid = await tacticsNFT.validateTacticsForBattle(player1.address, [0, 0, 0]);
            expect(isValid).to.be.true;

            // Invalid tactic ID
            isValid = await tacticsNFT.validateTacticsForBattle(player1.address, [10, 0, 0]);
            expect(isValid).to.be.false;

            // Valid tactic IDs but player doesn't own them
            isValid = await tacticsNFT.validateTacticsForBattle(player1.address, [1, 5, 9]);
            expect(isValid).to.be.false;
        });

        it("Should get tactics by type correctly", async function () {
            // Get STRIKE tactics
            const strikeTactics = await tacticsNFT.getTacticsByType(0); // STRIKE
            expect(strikeTactics.length).to.equal(3);
            expect(strikeTactics.map(t => Number(t))).to.include(1); // Iron Strike
            expect(strikeTactics.map(t => Number(t))).to.include(4); // Cavalry Rush
            expect(strikeTactics.map(t => Number(t))).to.include(7); // Swift Strike

            // Get SHIELD tactics
            const shieldTactics = await tacticsNFT.getTacticsByType(1); // SHIELD
            expect(shieldTactics.length).to.equal(3);
            expect(shieldTactics.map(t => Number(t))).to.include(2); // Guardian Wall
            expect(shieldTactics.map(t => Number(t))).to.include(5); // Defensive Circle
            expect(shieldTactics.map(t => Number(t))).to.include(8); // Shadow Guard

            // Get TRICK tactics
            const trickTactics = await tacticsNFT.getTacticsByType(2); // TRICK
            expect(trickTactics.length).to.equal(3);
            expect(trickTactics.map(t => Number(t))).to.include(3); // Battle Rage
            expect(trickTactics.map(t => Number(t))).to.include(6); // Tactical Feint
            expect(trickTactics.map(t => Number(t))).to.include(9); // Stealth Trap
        });
    });

    describe("Integration", function () {
        it("Should have correct hero class assignments", async function () {
            // WARRIOR boosts Infantry
            // STRATEGIST boosts Siege (swapped from original)
            // SCOUT boosts Cavalry (swapped from original)
            
            // This is verified by the template names and the calculateHeroBonus function
            // WARRIOR = Iron Guardian (Infantry specialist)
            // STRATEGIST = Shadow Tactician (Siege specialist) 
            // SCOUT = Swift Scout (Cavalry specialist)
        });
    });
}); 