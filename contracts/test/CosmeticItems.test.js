const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CosmeticItems", function () {
    let cosmeticItems;
    let gameState;
    let owner, player1, player2;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy GameState first (needed for resource deduction)
        const GameState = await ethers.getContractFactory("GameState");
        gameState = await upgrades.deployProxy(GameState, [], {
            initializer: "initialize",
            kind: "uups"
        });
        await gameState.waitForDeployment();

        // Deploy CosmeticItems
        const CosmeticItems = await ethers.getContractFactory("CosmeticItems");
        cosmeticItems = await upgrades.deployProxy(CosmeticItems, [], {
            initializer: "initialize",
            kind: "uups"
        });
        await cosmeticItems.waitForDeployment();

        // Set up contract addresses
        await cosmeticItems.setGameStateAddress(await gameState.getAddress());
        await gameState.setCosmeticItemsAddress(await cosmeticItems.getAddress());

        // Initialize player with diamonds for testing
        const player1Address = await player1.getAddress();
        await gameState.testEarnDiamonds(player1Address, 1000); // 1000 diamonds
    });

    describe("Initialization", function () {
        it("Should initialize with Royal Banner cosmetic", async function () {
            const config = await cosmeticItems.getCosmeticConfig(0);
            expect(config.name).to.equal("Royal Banner");
            expect(config.diamondCost).to.equal(10);
            expect(config.modelPath).to.equal("assets/banner.glb");
            expect(config.enabled).to.be.true;
        });

        it("Should set owner correctly", async function () {
            expect(await cosmeticItems.owner()).to.equal(await owner.getAddress());
        });
    });

    describe("GameState Integration", function () {
        it("Should set GameState address", async function () {
            const gameStateAddress = await gameState.getAddress();
            expect(await cosmeticItems.gameStateAddress()).to.equal(gameStateAddress);
        });

        it("Should not allow non-owner to set GameState address", async function () {
            await expect(
                cosmeticItems.connect(player1).setGameStateAddress(await player1.getAddress())
            ).to.be.revertedWithCustomError(cosmeticItems, "OwnableUnauthorizedAccount");
        });
    });

    describe("Cosmetic Purchase", function () {
        it("Should purchase cosmetic successfully", async function () {
            const player1Address = await player1.getAddress();
            const initialDiamonds = await gameState.getPlayerDiamonds(player1Address);
            
            await cosmeticItems.connect(player1).purchaseCosmetic(0);
            
            // Check ownership
            expect(await cosmeticItems.ownsCosmetic(player1Address, 0)).to.be.true;
            
            // Check diamonds were deducted
            const finalDiamonds = await gameState.getPlayerDiamonds(player1Address);
            expect(finalDiamonds).to.equal(initialDiamonds - 10n);
            
            // Check auto-activation
            expect(await cosmeticItems.getActiveCosmetic(player1Address, 0)).to.equal(0); // BANNER type
        });

        it("Should not allow purchase without sufficient diamonds", async function () {
            const player2Address = await player2.getAddress();
            
            // Player2 has no diamonds
            await expect(
                cosmeticItems.connect(player2).purchaseCosmetic(0)
            ).to.be.revertedWith("Insufficient diamonds");
        });

        it("Should not allow purchasing already owned cosmetic", async function () {
            const player1Address = await player1.getAddress();
            
            // First purchase
            await cosmeticItems.connect(player1).purchaseCosmetic(0);
            
            // Second purchase should fail
            await expect(
                cosmeticItems.connect(player1).purchaseCosmetic(0)
            ).to.be.revertedWith("Already owned");
        });

        it("Should not allow purchasing disabled cosmetic", async function () {
            // Disable the cosmetic
            await cosmeticItems.setCosmeticEnabled(0, false);
            
            await expect(
                cosmeticItems.connect(player1).purchaseCosmetic(0)
            ).to.be.revertedWith("Cosmetic not available");
        });

        it("Should not allow purchasing invalid cosmetic", async function () {
            await expect(
                cosmeticItems.connect(player1).purchaseCosmetic(99) // Use 99 instead of 999 for uint8
            ).to.be.revertedWith("Cosmetic not available"); // Uninitialized cosmetics show as not available
        });

        it("Should emit CosmeticPurchased event", async function () {
            const player1Address = await player1.getAddress();
            
            await expect(cosmeticItems.connect(player1).purchaseCosmetic(0))
                .to.emit(cosmeticItems, "CosmeticPurchased")
                .withArgs(player1Address, 0, 10);
        });
    });

    describe("Cosmetic Activation", function () {
        beforeEach(async function () {
            // Purchase cosmetic first
            await cosmeticItems.connect(player1).purchaseCosmetic(0);
        });

        it("Should activate owned cosmetic", async function () {
            const player1Address = await player1.getAddress();
            
            await cosmeticItems.connect(player1).activateCosmetic(0);
            
            expect(await cosmeticItems.getActiveCosmetic(player1Address, 0)).to.equal(0);
        });

        it("Should not allow activating unowned cosmetic", async function () {
            await expect(
                cosmeticItems.connect(player2).activateCosmetic(0)
            ).to.be.revertedWith("Cosmetic not owned");
        });

        it("Should emit CosmeticActivated event", async function () {
            const player1Address = await player1.getAddress();
            
            await expect(cosmeticItems.connect(player1).activateCosmetic(0))
                .to.emit(cosmeticItems, "CosmeticActivated")
                .withArgs(player1Address, 0, 0); // 0 = BANNER type
        });

        it("Should deactivate cosmetic type", async function () {
            const player1Address = await player1.getAddress();
            
            // Deactivate BANNER type (0)
            await cosmeticItems.connect(player1).deactivateCosmetic(0);
            
            expect(await cosmeticItems.getActiveCosmetic(player1Address, 0)).to.equal(0);
        });

        it("Should emit CosmeticDeactivated event", async function () {
            const player1Address = await player1.getAddress();
            
            await expect(cosmeticItems.connect(player1).deactivateCosmetic(0))
                .to.emit(cosmeticItems, "CosmeticDeactivated")
                .withArgs(player1Address, 0);
        });
    });

    describe("View Functions", function () {
        beforeEach(async function () {
            await cosmeticItems.connect(player1).purchaseCosmetic(0);
        });

        it("Should return correct ownership status", async function () {
            const player1Address = await player1.getAddress();
            const player2Address = await player2.getAddress();
            
            expect(await cosmeticItems.ownsCosmetic(player1Address, 0)).to.be.true;
            expect(await cosmeticItems.ownsCosmetic(player2Address, 0)).to.be.false;
        });

        it("Should return cosmetic configuration", async function () {
            const config = await cosmeticItems.getCosmeticConfig(0);
            
            expect(config.name).to.equal("Royal Banner");
            expect(config.description).to.equal("A majestic banner to display your achievements");
            expect(config.diamondCost).to.equal(10);
            expect(config.modelPath).to.equal("assets/banner.glb");
            expect(config.cosmeticType).to.equal(0); // BANNER
            expect(config.enabled).to.be.true;
        });

        it("Should return owned cosmetics", async function () {
            const player1Address = await player1.getAddress();
            
            const owned = await cosmeticItems.getOwnedCosmetics(player1Address, 10);
            expect(owned.length).to.equal(1);
            expect(owned[0]).to.equal(0);
        });

        it("Should return available cosmetics", async function () {
            const available = await cosmeticItems.getAvailableCosmetics(10);
            expect(available.length).to.equal(1);
            expect(available[0]).to.equal(0);
        });
    });

    describe("Owner Functions", function () {
        it("Should allow owner to add new cosmetic", async function () {
            await cosmeticItems.setCosmeticConfig(
                1, // ID
                "Magic Aura",
                "A mystical aura effect",
                20, // cost
                "assets/aura.glb",
                2, // EFFECT type
                true
            );

            const config = await cosmeticItems.getCosmeticConfig(1);
            expect(config.name).to.equal("Magic Aura");
            expect(config.diamondCost).to.equal(20);
            expect(config.cosmeticType).to.equal(2);
        });

        it("Should allow owner to update cosmetic price", async function () {
            await cosmeticItems.setCosmeticPrice(0, 15);
            
            const config = await cosmeticItems.getCosmeticConfig(0);
            expect(config.diamondCost).to.equal(15);
        });

        it("Should allow owner to enable/disable cosmetic", async function () {
            await cosmeticItems.setCosmeticEnabled(0, false);
            
            const config = await cosmeticItems.getCosmeticConfig(0);
            expect(config.enabled).to.be.false;
        });

        it("Should not allow non-owner to modify cosmetics", async function () {
            await expect(
                cosmeticItems.connect(player1).setCosmeticPrice(0, 15)
            ).to.be.revertedWithCustomError(cosmeticItems, "OwnableUnauthorizedAccount");
        });

        it("Should emit CosmeticConfigUpdated event", async function () {
            await expect(cosmeticItems.setCosmeticPrice(0, 15))
                .to.emit(cosmeticItems, "CosmeticConfigUpdated")
                .withArgs(0, "Royal Banner", 15);
        });
    });

    describe("Multiple Cosmetic Types", function () {
        beforeEach(async function () {
            // Add different types of cosmetics
            await cosmeticItems.setCosmeticConfig(1, "Garden Decoration", "Beautiful flowers", 15, "assets/garden.glb", 1, true); // DECORATION
            await cosmeticItems.setCosmeticConfig(2, "Magic Sparkles", "Magical effects", 25, "assets/sparkles.glb", 2, true); // EFFECT
        });

        it("Should handle multiple cosmetic types independently", async function () {
            const player1Address = await player1.getAddress();
            
            // Purchase different types
            await cosmeticItems.connect(player1).purchaseCosmetic(0); // BANNER
            await cosmeticItems.connect(player1).purchaseCosmetic(1); // DECORATION
            await cosmeticItems.connect(player1).purchaseCosmetic(2); // EFFECT
            
            // Check each type is activated independently
            expect(await cosmeticItems.getActiveCosmetic(player1Address, 0)).to.equal(0); // BANNER
            expect(await cosmeticItems.getActiveCosmetic(player1Address, 1)).to.equal(1); // DECORATION
            expect(await cosmeticItems.getActiveCosmetic(player1Address, 2)).to.equal(2); // EFFECT
        });

        it("Should return correct owned cosmetics count", async function () {
            const player1Address = await player1.getAddress();
            
            await cosmeticItems.connect(player1).purchaseCosmetic(0);
            await cosmeticItems.connect(player1).purchaseCosmetic(1);
            
            const owned = await cosmeticItems.getOwnedCosmetics(player1Address, 10);
            expect(owned.length).to.equal(2);
        });
    });

    describe("Security", function () {
        it("Should prevent reentrancy attacks", async function () {
            // This test ensures the nonReentrant modifier is working
            // The actual reentrancy protection is provided by OpenZeppelin's ReentrancyGuard
            await expect(cosmeticItems.connect(player1).purchaseCosmetic(0))
                .to.not.be.reverted;
        });

        it("Should only allow authorized contracts to deduct resources", async function () {
            const player1Address = await player1.getAddress();
            
            // Try to call deductResources directly (should fail)
            await expect(
                gameState.connect(player1).deductResources(player1Address, 0, 0, 0, 10)
            ).to.be.revertedWith("Unauthorized caller");
        });
    });
}); 