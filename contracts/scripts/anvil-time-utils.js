const { ethers } = require("hardhat");

async function getCurrentTime() {
    const block = await ethers.provider.getBlock("latest");
    console.log("🕐 Current time info:");
    console.log(`   Block: ${block.number.toString()}`);
    console.log(`   Time: ${new Date(block.timestamp * 1000).toLocaleString()}`);
}

async function fastForward(hours = 24) {
    console.log("🕐 Current time info:");
    const before = await ethers.provider.getBlock("latest");
    console.log(`   Block: ${before.number.toString()}`);
    console.log(`   Time: ${new Date(before.timestamp * 1000).toLocaleString()}`);
    
    const secondsToAdd = hours * 60 * 60;
    console.log(`\n⏩ Fast forwarding ${hours} hours (${secondsToAdd} seconds)...`);
    
    await ethers.provider.send("evm_increaseTime", [secondsToAdd]);
    await ethers.provider.send("evm_mine");
    
    console.log("\n🕐 New time info:");
    const after = await ethers.provider.getBlock("latest");
    console.log(`   Block: ${after.number.toString()}`);
    console.log(`   Time: ${new Date(after.timestamp * 1000).toLocaleString()}`);
    
    const actualIncrease = after.timestamp - before.timestamp;
    console.log(`\n✅ Time increased by ${actualIncrease/3600} hours`);
}

async function main() {
    const command = process.argv[2];
    const hours = process.argv[3] ? parseFloat(process.argv[3]) : 24;
    
    if (command === 'forward' || command === 'ff') {
        await fastForward(hours);
    } else {
        await getCurrentTime();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 