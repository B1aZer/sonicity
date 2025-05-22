const { ethers } = require("hardhat");

// Define building types enum to match the contract
const GridBuildingType = {
    HOUSE: 0,
    FARM: 1,
    REP_STATION: 2
};

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
    return {
        buildingId: Number(buildingCreatedEvent.args.buildingId),
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

module.exports = {
    GridBuildingType,
    mintAndStakeNFT,
    getDamagedBuildingId
}; 