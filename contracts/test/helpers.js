const { ethers } = require("hardhat");

// Define building types enum to match the contract
const GridBuildingType = {
    HOUSE: 0,
    FARM: 1,
    DIAMOND_STATION: 2,
    REP_STATION: 3
};

// Logging configuration
const ENABLE_LOGGING = false;

// Helper function for logging
function log(message) {
    if (ENABLE_LOGGING) {
        console.log(message);
    }
}

// Helper to mint and stake an NFT, returning the building ID and tokenId
async function mintAndStakeNFT(player, altar, nftContract, buildingType) {
    const playerAddress = await player.getAddress();
    const altarAddress = await altar.getAddress();
    const nftAddress = await nftContract.getAddress();
    
    // Select mint value based on building type
    let mintValue;
    if (buildingType === GridBuildingType.HOUSE) {
        mintValue = ethers.parseEther("0.01"); // House NFT price
    } else if (buildingType === GridBuildingType.FARM) {
        mintValue = ethers.parseEther("0.015"); // Farm NFT price
    } else if (buildingType === GridBuildingType.DIAMOND_STATION) {
        mintValue = ethers.parseEther("0.02"); // Diamond Station NFT price
    } else {
        throw new Error("Unsupported building type");
    }

    // Mint NFT
    const mintTx = await nftContract.connect(player).mint(1, { value: mintValue });
    const mintReceipt = await mintTx.wait();
    
    // Get tokenId from Transfer event
    const transferEvent = mintReceipt.logs
        .map(log => {
            try { return nftContract.interface.parseLog(log); } catch { return null; }
        })
        .find(e => e && e.name === "Transfer");
    if (!transferEvent) throw new Error("Transfer event not found");
    const tokenId = transferEvent.args.tokenId;

    // Approve and stake
    await nftContract.connect(player).approve(altarAddress, tokenId);
    const stakeTx = await altar.connect(player).stake(tokenId, buildingType, nftAddress);
    const stakeReceipt = await stakeTx.wait();
    
    // Get the BuildingCreated event from the GridBuildings contract
    const gridBuildings = await ethers.getContractAt("GridBuildings", await altar.gridBuildings());
    const buildingCreatedTopic = gridBuildings.interface.getEvent("BuildingCreated").topicHash;
    const gridBuildingsAddress = await gridBuildings.getAddress();
    const buildingCreatedLog = stakeReceipt.logs.find(
        log => log.address === gridBuildingsAddress && log.topics[0] === buildingCreatedTopic
    );
    
    if (!buildingCreatedLog) {
        throw new Error("BuildingCreated event not found");
    }
    
    const buildingCreatedEvent = gridBuildings.interface.parseLog(buildingCreatedLog);
    const buildingId = Number(buildingCreatedEvent.args.buildingId);

    // Immediately recharge the building so production starts
    // console.log('Calling rechargeBuilding with value:', ethers.formatEther(ethers.parseEther("0.01")), 'SONIC');
    await gridBuildings.connect(player).rechargeBuilding(buildingId, { value: ethers.parseEther("0.01") });

    return {
        buildingId: buildingId,
        tokenId: tokenId,
        nftAddress: nftAddress
    };
}

// Helper to get building ID from BuildingDamaged event
async function getDamagedBuildingId(tx, gridBuildings) {
    const receipt = await tx.wait();
    const buildingDamagedEvent = receipt.logs
        .map(log => {
            try { return gridBuildings.interface.parseLog(log); } catch { return null; }
        })
        .find(e => e && e.name === "BuildingDamaged");
    
    if (!buildingDamagedEvent) throw new Error("BuildingDamaged event not found");
    return buildingDamagedEvent.args.buildingId;
}

// Helper to ensure player has enough gold and donate for tier upgrade
async function donateGoldForTier(player, gameState, gridBuildings, altar, sonicityNFT, amount) {
    const playerAddress = await player.getAddress();
    let gold = await gameState.getPlayerGold(playerAddress);
    
    // Calculate total buildings and slot limit
    let totalHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    let totalFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    let totalRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_STATION);
    let totalBuildings = totalHouses + totalFarms + totalRepStations;
    let playerTier = await gameState.getPlayerTier(playerAddress);
    let buildingSlotLimit = await gameState.buildingSlotsPerTier(playerTier);
    
    log(`Player (${playerAddress.slice(-6)}): gold: ${gold}, need: ${amount}. Total buildings: ${totalBuildings} / ${buildingSlotLimit} (${totalHouses}/${totalFarms}/${totalRepStations})`);
    
    // Track tokenIds for houses we create
    const houseTokenIds = [];
    
    // If we already have enough gold, skip to donation
    if (gold < BigInt(amount)) {
        // Get current houses
        const currentHouses = await gridBuildings.buildingCounts(playerAddress, 0); // 0 is HOUSE type

        // Create houses up to the limit of 9 if needed
        if (currentHouses < BigInt(9)) {
            log(`Player (${playerAddress.slice(-6)}) creating ${9 - Number(currentHouses)} houses`);
            for (let i = Number(currentHouses); i < 9; i++) {
                const { tokenId } = await mintAndStakeNFT(player, altar, sonicityNFT, GridBuildingType.HOUSE);
                houseTokenIds.push(tokenId);
            }
        }
        
        // Fast forward time and collect until we have enough gold
        while (gold < BigInt(amount)) {
            await ethers.provider.send("evm_increaseTime", [24 * 3600]); // 24 hours
            await ethers.provider.send("evm_mine");
            
            // Get all active buildings
            const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
            // Collect from all houses
            for (const buildingId of activeBuildings) {
                await gridBuildings.connect(player).collectResources(buildingId);
            }       
            gold = await gameState.getPlayerGold(playerAddress);
        }
    }
    
    // After collecting enough gold, remove all houses we created except one
    let housesRemoved = 0;
    for (const tokenId of houseTokenIds) {
        if (housesRemoved >= 8) break; // Keep one house
        try {
            await altar.connect(player).unstake(await sonicityNFT.getAddress(), tokenId);
            housesRemoved++;
        } catch (error) {
            log(`Failed to unstake token ${tokenId}: ${error.message}`);
        }
    }
    
    // Donate gold
    await gameState.connect(player).donateGold(amount);

    // Recalculate total buildings after donation
    totalHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    totalFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    totalRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_STATION);
    totalBuildings = totalHouses + totalFarms + totalRepStations;
    
    // Get updated player's tier and building slot limit
    playerTier = await gameState.getPlayerTier(playerAddress);
    buildingSlotLimit = await gameState.buildingSlotsPerTier(playerTier);
    log(`Player (${playerAddress.slice(-6)}) donated ${amount}: Total buildings: ${totalBuildings} / ${buildingSlotLimit} (${totalHouses}/${totalFarms}/${totalRepStations}). Removed ${housesRemoved} houses`);
}

// Generic helper to ensure player has at least the specified amount of a resource
async function ensurePlayerResource({
    player,
    gameState,
    gridBuildings,
    altar,
    nftContract,
    buildingType,
    getResource,
    resourceName,
    amount
}) {
    const playerAddress = await player.getAddress();
    let resource = await getResource(gameState, playerAddress);
    log(`--- ensurePlayerResource START [${resourceName}] ---`);
    log(`Player (${playerAddress.slice(-6)}): initial ${resourceName}: ${resource}, need: ${amount}`);
    let resourceBefore = resource;
    // Log current buildings
    let buildingsCount = await gridBuildings.buildingCounts(playerAddress, buildingType);
    log(`Player (${playerAddress.slice(-6)}): ${resourceName} buildings before: ${buildingsCount}`);
    // If we already have enough, return early
    if (resource >= amount) {
        log(`Player (${playerAddress.slice(-6)}) already has enough ${resourceName}: ${resource} >= ${amount}`);
        log(`--- ensurePlayerResource END (early) ---`);
        return;
    }
    // Remove all buildings of this type before starting (to ensure a clean state)
    const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
    let unstakedBefore = 0;
    for (const buildingId of activeBuildings) {
        const building = await gridBuildings.buildings(playerAddress, buildingId);
        if (BigInt(building.buildingType) === BigInt(buildingType)) {
            try {
                await altar.connect(player).unstake(await nftContract.getAddress(), building.tokenId);
                unstakedBefore++;
                log(`Unstaked ${resourceName} building (cleanup) with buildingId ${buildingId}, tokenId ${building.tokenId}`);
            } catch (e) {
                log(`Failed to unstake ${resourceName} building (cleanup) with buildingId ${buildingId}: ${e.message}`);
            }
        }
    }
    if (unstakedBefore > 0) log(`Unstaked ${unstakedBefore} ${resourceName} buildings for clean state`);
    // Now, loop until we have enough resource
    let totalMinted = 0;
    let totalCollected = 0n;
    let cycle = 0;
    while (resource < amount) {
        cycle++;
        // Mint and stake up to 9 buildings
        let buildingsToCreate = 9;
        let mintedTokenIds = [];
        for (let i = 0; i < buildingsToCreate; i++) {
            const { tokenId, buildingId } = await mintAndStakeNFT(player, altar, nftContract, buildingType);
            mintedTokenIds.push({ tokenId, buildingId });
            totalMinted++;
            log(`Cycle ${cycle}: Minted and staked ${resourceName} building #${i + 1} (tokenId: ${tokenId}, buildingId: ${buildingId})`);
        }
        // Fast forward 24 hours
        await ethers.provider.send("evm_increaseTime", [24 * 3600]);
        await ethers.provider.send("evm_mine");
        // Collect from all buildings
        let resourceBeforeCollect = await getResource(gameState, playerAddress);
        let resourceGainedThisCycle = 0n;
        for (const { buildingId } of mintedTokenIds) {
            await gridBuildings.connect(player).collectResources(buildingId);
        }
        let resourceAfterCollect = await getResource(gameState, playerAddress);
        resourceGainedThisCycle = resourceAfterCollect - resourceBeforeCollect;
        totalCollected += resourceGainedThisCycle;
        log(`Cycle ${cycle}: Collected from ${mintedTokenIds.length} ${resourceName} buildings, gained this cycle: ${resourceGainedThisCycle}, total now: ${resourceAfterCollect}`);
        // Unstake all buildings created in this cycle
        let unstaked = 0;
        for (const { tokenId, buildingId } of mintedTokenIds) {
            try {
                await altar.connect(player).unstake(await nftContract.getAddress(), tokenId);
                unstaked++;
                log(`Cycle ${cycle}: Unstaked ${resourceName} building (tokenId: ${tokenId}, buildingId: ${buildingId})`);
            } catch (e) {
                log(`Cycle ${cycle}: Failed to unstake ${resourceName} building (tokenId: ${tokenId}): ${e.message}`);
            }
        }
        log(`Cycle ${cycle}: Unstaked ${unstaked} ${resourceName} buildings`);
        // Update resource
        resource = await getResource(gameState, playerAddress);
        log(`Cycle ${cycle}: Player ${resourceName} after unstake: ${resource}`);
        if (resource >= amount) {
            log(`Cycle ${cycle}: Target reached! Player ${resourceName}: ${resource}, needed: ${amount}`);
            break;
        }
    }
    // Log final state
    buildingsCount = await gridBuildings.buildingCounts(playerAddress, buildingType);
    log(`Player (${playerAddress.slice(-6)}): ${resourceName} buildings after: ${buildingsCount}`);
    log(`Player (${playerAddress.slice(-6)}): ${resourceName} before: ${resourceBefore}, after: ${resource}`);
    log(`Player (${playerAddress.slice(-6)}): total minted: ${totalMinted}, total collected: ${totalCollected}`);
    log(`--- ensurePlayerResource END [${resourceName}] ---`);
}

// Thin wrappers for gold and food
async function ensurePlayerGold(player, gameState, gridBuildings, altar, sonicityNFT, amount) {
    return ensurePlayerResource({
        player,
        gameState,
        gridBuildings,
        altar,
        nftContract: sonicityNFT,
        buildingType: GridBuildingType.HOUSE,
        getResource: async (gameState, playerAddress) => await gameState.getPlayerGold(playerAddress),
        resourceName: 'gold',
        amount
    });
}

async function ensurePlayerFood(player, gameState, gridBuildings, altar, sonicityFarm, amount) {
    return ensurePlayerResource({
        player,
        gameState,
        gridBuildings,
        altar,
        nftContract: sonicityFarm,
        buildingType: GridBuildingType.FARM,
        getResource: async (gameState, playerAddress) => await gameState.getPlayerFood(playerAddress),
        resourceName: 'food',
        amount
    });
}

module.exports = {
    GridBuildingType,
    mintAndStakeNFT,
    getDamagedBuildingId,
    donateGoldForTier,
    ensurePlayerGold,
    ensurePlayerFood
}; 