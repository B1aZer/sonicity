const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Finding and registering players for matchmaking...");
    
    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
        throw new Error("deployed-addresses.json not found. Please deploy contracts first.");
    }
    
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    const gameStateProxy = addresses.gameStateProxy;
    const matchmakingSystemProxy = addresses.matchmakingSystemProxy;
    
    if (!gameStateProxy || !matchmakingSystemProxy) {
        throw new Error("Missing contract addresses in deployed-addresses.json");
    }
    
    console.log("📋 Contract addresses:");
    console.log(`   GameState: ${gameStateProxy}`);
    console.log(`   MatchmakingSystem: ${matchmakingSystemProxy}`);
    
    // Get contract instances
    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Using account: ${deployer.address}`);
    
    // Load contract ABIs
    const GameStateABI = require("../artifacts/contracts/GameState.sol/GameState.json").abi;
    const MatchmakingSystemABI = require("../artifacts/contracts/MatchmakingSystem.sol/MatchmakingSystem.json").abi;
    
    const gameState = new ethers.Contract(gameStateProxy, GameStateABI, deployer);
    const matchmakingSystem = new ethers.Contract(matchmakingSystemProxy, MatchmakingSystemABI, deployer);
    
    // Check if we're the owner
    const matchmakingOwner = await matchmakingSystem.owner();
    if (matchmakingOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error("❌ You are not the owner of MatchmakingSystem contract");
    }
    
    console.log("✅ You are the owner of MatchmakingSystem contract");
    
    // ============================================================================
    // FIND ALL PLAYERS BY QUERYING PLAYERREGISTERED EVENTS FROM GAMESTATE
    // ============================================================================
    
    console.log("\n🔍 Finding all players by querying PlayerRegistered events from GameState...");
    
    // Get the current block number
    const currentBlock = await deployer.provider.getBlockNumber();
    console.log(`   Current block: ${currentBlock}`);
    
    // Query PlayerRegistered events from GameState (when players START the game)
    const playerRegisteredFilter = gameState.filters.PlayerRegistered();
    
    // Query events from the last 10000 blocks (adjust as needed)
    const fromBlock = Math.max(0, currentBlock - 10000);
    console.log(`   Querying PlayerRegistered events from GameState from block ${fromBlock} to ${currentBlock}`);
    
    const allPlayers = new Set();
    
    try {
        const events = await gameState.queryFilter(playerRegisteredFilter, fromBlock, currentBlock);
        console.log(`   Found ${events.length} PlayerRegistered events from GameState`);
        
        for (const event of events) {
            if (event.args && event.args.player) {
                allPlayers.add(event.args.player);
                console.log(`   Found player: ${event.args.player} (total players: ${event.args.totalPlayers})`);
            }
        }
    } catch (error) {
        console.log(`   ⚠️  Error querying PlayerRegistered events from GameState: ${error.message}`);
    }
    
    // Also check for players who might have interacted with GameState but not yet registered
    // Query other GameState events to find players who have interacted but might not be registered
    console.log("\n🔍 Also checking other GameState events for unregistered players...");
    
    const gameStateEventFilters = [
        { name: 'CityJoined', filter: gameState.filters.CityJoined() },
        { name: 'BuildingSlotsUpdated', filter: gameState.filters.BuildingSlotsUpdated() },
        { name: 'GoldDonated', filter: gameState.filters.GoldDonated() }
    ];
    
    for (const { name, filter } of gameStateEventFilters) {
        try {
            const events = await gameState.queryFilter(filter, fromBlock, currentBlock);
            console.log(`   Found ${events.length} GameState events for ${name}`);
            
            for (const event of events) {
                if (event.args && event.args.player) {
                    allPlayers.add(event.args.player);
                }
            }
        } catch (error) {
            console.log(`   ⚠️  Error querying GameState events (${name}): ${error.message}`);
        }
    }
    
    const playerAddresses = Array.from(allPlayers);
    console.log(`\n📊 Found ${playerAddresses.length} unique player addresses`);
    
    if (playerAddresses.length === 0) {
        console.log("💡 No players found in recent events. You may need to:");
        console.log("   1. Increase the block range");
        console.log("   2. Check if players have actually interacted with the contracts");
        console.log("   3. Use the register-specific-players.js script with known addresses");
        return;
    }
    
    // ============================================================================
    // CHECK AND REGISTER PLAYERS
    // ============================================================================
    
    console.log("\n🔍 Checking player status and registering for matchmaking...");
    
    let registeredCount = 0;
    let tier1Count = 0;
    let alreadyRegisteredCount = 0;
    let notTier1Count = 0;
    let errorCount = 0;
    
    for (const address of playerAddresses) {
        try {
            console.log(`\n📊 Checking ${address}...`);
            
            // Check if player is already registered for matchmaking
            const isRegisteredForMatchmaking = await matchmakingSystem.isRegisteredForMatchmaking(address);
            
            if (isRegisteredForMatchmaking) {
                console.log(`   ✅ Already registered for matchmaking`);
                alreadyRegisteredCount++;
                continue;
            }
            
            // Check if player is registered in GameState
            const isRegisteredInGameState = await gameState.isRegisteredPlayer(address);
            
            if (!isRegisteredInGameState) {
                console.log(`   ⚠️  Not registered in GameState - skipping`);
                continue;
            }
            
            // Check player tier
            const playerState = await gameState.getPlayerState(address);
            const tier = playerState.tier;
            const gold = playerState.gold;
            const treasury = playerState.treasury;
            
            console.log(`   📈 Player stats:`);
            console.log(`      Tier: ${tier}`);
            console.log(`      Gold: ${ethers.formatEther(gold)}`);
            console.log(`      Treasury: ${ethers.formatEther(treasury)}`);
            
            if (tier >= 1) {
                console.log(`   🎯 Registering for matchmaking (Tier ${tier})...`);
                
                try {
                    const tx = await matchmakingSystem.registerForMatchmaking(address);
                    await tx.wait();
                    console.log(`   ✅ Successfully registered!`);
                    registeredCount++;
                    tier1Count++;
                } catch (error) {
                    console.log(`   ❌ Failed to register: ${error.message}`);
                    errorCount++;
                }
            } else {
                console.log(`   ⏳ Not yet tier 1 (Tier ${tier}) - skipping registration`);
                notTier1Count++;
            }
            
        } catch (error) {
            console.log(`   ❌ Error checking ${address}: ${error.message}`);
            errorCount++;
        }
    }
    
    // Final summary
    const finalRegisteredCount = await matchmakingSystem.registeredPlayers.length();
    
    console.log("\n📈 Summary:");
    console.log(`   Players found in events: ${playerAddresses.length}`);
    console.log(`   Already registered for matchmaking: ${alreadyRegisteredCount}`);
    console.log(`   Players at tier 1+: ${tier1Count}`);
    console.log(`   Newly registered: ${registeredCount}`);
    console.log(`   Not yet tier 1: ${notTier1Count}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total registered players: ${finalRegisteredCount}`);
    
    if (registeredCount > 0) {
        console.log("\n✅ Registration complete! Players can now use matchmaking.");
    } else {
        console.log("\n💡 No new registrations needed.");
        console.log("   Players will be automatically registered when they reach tier 1.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
