const { ethers } = require("hardhat");

// Define building types enum to match the contract
const GridBuildingType = {
    HOUSE: 0,
    FARM: 1,
    DIAMOND_STATION: 2,
    REP_FORGE: 3,
    YIELD_STATION: 4
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
    
    // Get the next token ID to mint
    const totalSupply = await nftContract.totalSupply();
    const tokenId = totalSupply + 1n; // Use BigInt literal
    
    log(`mintAndStakeNFT: Creating building type ${buildingType} for player ${playerAddress.slice(-6)}, tokenId: ${tokenId}`);
    
    // Use the new mintAndStake function
    const mintAndStakeTx = await altar.connect(player).mintAndStake(nftAddress, tokenId, buildingType);
    const mintAndStakeReceipt = await mintAndStakeTx.wait();
    
    // Get the BuildingCreated event from the GridBuildings contract
    const gridBuildings = await ethers.getContractAt("GridBuildings", await altar.gridBuildings());
    const buildingCreatedTopic = gridBuildings.interface.getEvent("BuildingCreated").topicHash;
    const gridBuildingsAddress = await gridBuildings.getAddress();
    const buildingCreatedLog = mintAndStakeReceipt.logs.find(
        log => log.address === gridBuildingsAddress && log.topics[0] === buildingCreatedTopic
    );
    
    if (!buildingCreatedLog) {
        throw new Error("BuildingCreated event not found");
    }
    
    const buildingCreatedEvent = gridBuildings.interface.parseLog(buildingCreatedLog);
    const buildingId = Number(buildingCreatedEvent.args.buildingId);

    log(`mintAndStakeNFT: Created building ${buildingId} of type ${buildingType} for player ${playerAddress.slice(-6)}`);

    // Immediately recharge the building so production starts
    // Get the custom recharge cost for this building type
    const rechargeCost = await gridBuildings.getBuildingRechargeCost(buildingType);
    // console.log('Calling rechargeBuilding with value:', ethers.formatEther(rechargeCost), 'SONIC');
    await gridBuildings.connect(player).rechargeBuilding(buildingId, { value: rechargeCost });

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
    const initialGold = await gameState.getPlayerGold(playerAddress);
    
    log(`Player (${playerAddress.slice(-6)}): initial gold: ${initialGold}, donating: ${amount}`);
    
    // Use ensurePlayerResource to get the required gold
    await ensurePlayerResource({
        player,
        gameState,
        gridBuildings,
        altar,
        nftContract: sonicityNFT,
        buildingType: GridBuildingType.HOUSE,
        getResource: async (gameState, playerAddress) => await gameState.getPlayerGold(playerAddress),
        resourceName: 'gold',
        amount: BigInt(amount)
    });
    
    // Donate gold
    await gameState.connect(player).donateGold(amount);

    // Restore the player's gold to the initial amount using testDeductResources
    const currentGold = await gameState.getPlayerGold(playerAddress);
    if (currentGold !== initialGold) {
        if (currentGold > initialGold) {
            // Player has more gold than initial - deduct the excess
            const excessGold = currentGold - initialGold;
            await gameState.testDeductResources(playerAddress, excessGold, 0, 0);
            log(`Player (${playerAddress.slice(-6)}) deducted ${excessGold} gold to restore to initial amount: ${initialGold}`);
        } else {
            // Player has less gold than initial - add more
            const neededGold = initialGold - currentGold;
            await gameState.testEarnGold(playerAddress, neededGold);
            log(`Player (${playerAddress.slice(-6)}) added ${neededGold} gold to restore to initial amount: ${initialGold}`);
        }
    }

    // Recalculate total buildings after donation
    let totalHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    let totalFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    let totalRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_FORGE);
    let totalBuildings = totalHouses + totalFarms + totalRepStations;
    
    // Get updated player's tier and building slot limit
    let playerTier = await gameState.getPlayerTier(playerAddress);
    let buildingSlotLimit = await gameState.buildingSlotsPerTier(playerTier);
    
    const finalGold = await gameState.getPlayerGold(playerAddress);
    const treasury = await gameState.getPlayerTreasury(playerAddress);
    const tier = await gameState.getPlayerTier(playerAddress);
    log(`Player (${playerAddress.slice(-6)}) donated ${amount}: Total buildings: ${totalBuildings} / ${buildingSlotLimit} (${totalHouses}/${totalFarms}/${totalRepStations})`);
    log(`Player (${playerAddress.slice(-6)}) final state: gold: ${finalGold}, treasury: ${treasury}, tier: ${tier}`);
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
    // Ensure amount is BigInt
    const amountBigInt = BigInt(amount);
    log(`--- ensurePlayerResource START [${resourceName}] ---`);
    log(`Player (${playerAddress.slice(-6)}): initial ${resourceName}: ${resource}, need: ${amountBigInt}`);
    let resourceBefore = resource;
    
    // If we already have enough, return early
    if (resource >= amountBigInt) {
        log(`Player (${playerAddress.slice(-6)}) already has enough ${resourceName}: ${resource} >= ${amountBigInt}`);
        log(`--- ensurePlayerResource END (early) ---`);
        return;
    }
    
    // Get all active buildings of this type
    const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
    const buildingsOfType = [];
    
    for (const buildingId of activeBuildings) {
        const building = await gridBuildings.buildings(playerAddress, buildingId);
        if (BigInt(building.buildingType) === BigInt(buildingType)) {
            buildingsOfType.push(buildingId);
        }
    }
    
    log(`Player (${playerAddress.slice(-6)}): found ${buildingsOfType.length} existing ${resourceName} buildings`);
    
    // Track buildings we create
    const createdBuildings = [];
    
    // If we don't have any buildings of this type, create one
    if (buildingsOfType.length === 0) {
        log(`Player (${playerAddress.slice(-6)}): no ${resourceName} buildings found, creating one`);
        const { buildingId, tokenId } = await mintAndStakeNFT(player, altar, nftContract, buildingType);
        buildingsOfType.push(buildingId);
        createdBuildings.push({ buildingId, tokenId });
        log(`Player (${playerAddress.slice(-6)}): created ${resourceName} building ${buildingId} (token ${tokenId})`);
    }
    
    // Now loop until we have enough resource by recharging and fast-forwarding
    let cycle = 0;
    while (resource < amountBigInt) {
        cycle++;
        log(`Cycle ${cycle}: Player ${resourceName}: ${resource}, need: ${amountBigInt}`);
        
        // Recharge all buildings of this type
        for (const buildingId of buildingsOfType) {
            const rechargeCost = await gridBuildings.getBuildingRechargeCost(buildingType);
            await gridBuildings.connect(player).rechargeBuilding(buildingId, { value: rechargeCost });
            log(`Cycle ${cycle}: Recharged ${resourceName} building ${buildingId} with ${ethers.formatEther(rechargeCost)} SONIC`);
        }
        
        // Fast forward 24 hours
        await ethers.provider.send("evm_increaseTime", [24 * 3600]);
        await ethers.provider.send("evm_mine");
        
        // Collect from all buildings of this type
        let resourceBeforeCollect = await getResource(gameState, playerAddress);
        for (const buildingId of buildingsOfType) {
            await gridBuildings.connect(player).collectResources(buildingId);
        }
        let resourceAfterCollect = await getResource(gameState, playerAddress);
        let resourceGainedThisCycle = resourceAfterCollect - resourceBeforeCollect;
        
        log(`Cycle ${cycle}: Collected from ${buildingsOfType.length} ${resourceName} buildings, gained: ${resourceGainedThisCycle}, total now: ${resourceAfterCollect}`);
        
        // Update resource
        resource = await getResource(gameState, playerAddress);
        
        if (resource >= amountBigInt) {
            log(`Cycle ${cycle}: Target reached! Player ${resourceName}: ${resource}, needed: ${amountBigInt}`);
            break;
        }
    }
    
    // If we have more than needed, use testDeductResources to reduce to exact amount
    if (resource > amountBigInt) {
        const excess = resource - amountBigInt;
        if (resourceName === 'gold') {
            await gameState.testDeductResources(playerAddress, excess, 0, 0);
            log(`Player (${playerAddress.slice(-6)}): deducted ${excess} excess ${resourceName} to reach exact amount: ${amountBigInt}`);
        } else if (resourceName === 'food') {
            await gameState.testDeductResources(playerAddress, 0, excess, 0);
            log(`Player (${playerAddress.slice(-6)}): deducted ${excess} excess ${resourceName} to reach exact amount: ${amountBigInt}`);
        }
        resource = amountBigInt;
    }
    
    // Clean up all buildings we created
    for (const { buildingId, tokenId } of createdBuildings) {
        try {
            log(`Player (${playerAddress.slice(-6)}): attempting to clean up ${resourceName} building ${buildingId} (token ${tokenId})`);
            await altar.connect(player).unstake(await nftContract.getAddress(), tokenId);
            log(`Player (${playerAddress.slice(-6)}): cleaned up ${resourceName} building ${buildingId} (token ${tokenId})`);
        } catch (error) {
            log(`Failed to unstake token ${tokenId}: ${error.message}`);
        }
    }
    
    // Log final state
    const finalBuildingsCount = await gridBuildings.buildingCounts(playerAddress, buildingType);
    log(`Player (${playerAddress.slice(-6)}): ${resourceName} buildings after: ${finalBuildingsCount}`);
    log(`Player (${playerAddress.slice(-6)}): ${resourceName} before: ${resourceBefore}, after: ${resource}`);
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