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

// Helper to ensure player has at least the specified amount of gold (without donating)
async function ensurePlayerGold(player, gameState, gridBuildings, altar, sonicityNFT, amount) {
    const playerAddress = await player.getAddress();
    let gold = await gameState.getPlayerGold(playerAddress);
    
    // Calculate total buildings and slot limit
    const goldHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    const goldFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    const goldRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_STATION);
    const goldTotalBuildings = goldHouses + goldFarms + goldRepStations;
    const goldPlayerTier = await gameState.getPlayerTier(playerAddress);
    const goldBuildingSlotLimit = await gameState.buildingSlotsPerTier(goldPlayerTier);
    
    log(`Player (${playerAddress.slice(-6)}): gold: ${gold}, need: ${amount}. Total buildings: ${goldTotalBuildings} / ${goldBuildingSlotLimit} (${goldHouses}/${goldFarms}/${goldRepStations})`);
    
    // If we already have enough gold, return early
    if (gold >= amount) return;
    
    // Get current houses
    const currentHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    
    // Track tokenIds for houses we create
    const houseTokenIds = [];
    
    // Create houses up to the limit of 9 if needed
    if (currentHouses < 9) {
        for (let i = currentHouses; i < 9; i++) {
            const { tokenId } = await mintAndStakeNFT(player, altar, sonicityNFT, GridBuildingType.HOUSE);
            houseTokenIds.push(tokenId);
        }
    }
    
    // Fast forward time and collect until we have enough gold
    while (gold < amount) {
        await ethers.provider.send("evm_increaseTime", [1 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
        
        // Get all active buildings
        const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
        // Collect from all houses
        for (const buildingId of activeBuildings) {
            const building = await gridBuildings.buildings(playerAddress, buildingId);
            if (BigInt(building.buildingType) === BigInt(GridBuildingType.HOUSE)) {
                await gridBuildings.connect(player).collectResources(buildingId);
            }
        }
        
        const newGold = await gameState.getPlayerGold(playerAddress);
        if (newGold <= gold) {
            break; // No more gold being generated
        }
        gold = newGold;
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
    
    // Recalculate total buildings after unstaking
    const finalHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    const finalFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    const finalRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_STATION);
    const finalTotalBuildings = finalHouses + finalFarms + finalRepStations;
    log(`Player (${playerAddress.slice(-6)}) collected ${amount} gold: Total buildings: ${finalTotalBuildings} / ${goldBuildingSlotLimit} (${finalHouses}/${finalFarms}/${finalRepStations}). Removed ${housesRemoved} houses`);
}

// Helper to ensure player has at least the specified amount of food
async function ensurePlayerFood(player, gameState, gridBuildings, altar, sonicityFarm, amount) {
    const playerAddress = await player.getAddress();
    let food = await gameState.getPlayerFood(playerAddress);
    
    // Calculate total buildings and slot limit
    const foodHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    const foodFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    const foodRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_STATION);
    const foodTotalBuildings = foodHouses + foodFarms + foodRepStations;
    const foodPlayerTier = await gameState.getPlayerTier(playerAddress);
    const foodBuildingSlotLimit = await gameState.buildingSlotsPerTier(foodPlayerTier);
    
    log(`Player (${playerAddress.slice(-6)}): food: ${food}, need: ${amount}. Total buildings: ${foodTotalBuildings} / ${foodBuildingSlotLimit} (${foodHouses}/${foodFarms}/${foodRepStations})`);
    
    // If we already have enough food, return early
    if (food >= amount) return;
    
    // Get current farms
    const currentFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    
    // Track tokenIds for farms we create
    const farmTokenIds = [];
    
    // Create farms up to the limit of 9 if needed
    if (currentFarms < 9) {
        for (let i = currentFarms; i < 9; i++) {
            const { tokenId } = await mintAndStakeNFT(player, altar, sonicityFarm, GridBuildingType.FARM);
            farmTokenIds.push(tokenId);
        }
    }
    
    // Fast forward time and collect until we have enough food
    while (food < amount) {
        await ethers.provider.send("evm_increaseTime", [1 * 3600]); // 24 hours
        await ethers.provider.send("evm_mine");
        
        // Get all active buildings
        const activeBuildings = await gridBuildings.getActiveBuildings(playerAddress);
        // Collect from all farms
        for (const buildingId of activeBuildings) {
            const building = await gridBuildings.buildings(playerAddress, buildingId);
            if (BigInt(building.buildingType) === BigInt(GridBuildingType.FARM)) {
                await gridBuildings.connect(player).collectResources(buildingId);
            }
        }
        
        const newFood = await gameState.getPlayerFood(playerAddress);
        if (newFood <= food) {
            break; // No more food being generated
        }
        food = newFood;
    }
    
    // After collecting enough food, remove all farms we created except one
    let farmsRemoved = 0;
    for (const tokenId of farmTokenIds) {
        if (farmsRemoved >= 8) break; // Keep one farm
        try {
            await altar.connect(player).unstake(await sonicityFarm.getAddress(), tokenId);
            farmsRemoved++;
        } catch (error) {
            log(`Failed to unstake token ${tokenId}: ${error.message}`);
        }
    }
    
    // Recalculate total buildings after unstaking
    const finalHouses = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.HOUSE);
    const finalFarms = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.FARM);
    const finalRepStations = await gridBuildings.buildingCounts(playerAddress, GridBuildingType.REP_STATION);
    const finalTotalBuildings = finalHouses + finalFarms + finalRepStations;
    log(`Player (${playerAddress.slice(-6)}) collected ${amount} food: Total buildings: ${finalTotalBuildings} / ${foodBuildingSlotLimit} (${finalHouses}/${finalFarms}/${finalRepStations}). Removed ${farmsRemoved} farms`);
}

module.exports = {
    GridBuildingType,
    mintAndStakeNFT,
    getDamagedBuildingId,
    donateGoldForTier,
    ensurePlayerGold,
    ensurePlayerFood
}; 