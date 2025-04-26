import { BUILDING_TYPES } from '../utils/constants.js';

export class ResourceManager {
    constructor() {
        this.totalSupply = {
            electricity: 0,
            water: 0
        };
        this.totalDemand = {
            electricity: 0,
            water: 0
        };
    }

    addSupply(supply) {
        if (supply.electricity) this.totalSupply.electricity += supply.electricity;
        if (supply.water) this.totalSupply.water += supply.water;
    }

    removeSupply(supply) {
        // Important if buildings are removed later
        if (supply.electricity) this.totalSupply.electricity -= supply.electricity;
        if (supply.water) this.totalSupply.water -= supply.water;
        // Ensure non-negative values
        this.totalSupply.electricity = Math.max(0, this.totalSupply.electricity);
        this.totalSupply.water = Math.max(0, this.totalSupply.water);
    }

    addDemand(demand) {
        if (demand.electricity) this.totalDemand.electricity += demand.electricity;
        if (demand.water) this.totalDemand.water += demand.water;
    }

    removeDemand(demand) {
        // Important if buildings are removed later
        if (demand.electricity) this.totalDemand.electricity -= demand.electricity;
        if (demand.water) this.totalDemand.water -= demand.water;
        // Ensure non-negative values
        this.totalDemand.electricity = Math.max(0, this.totalDemand.electricity);
        this.totalDemand.water = Math.max(0, this.totalDemand.water);
    }

    checkGlobalSufficiency() {
        const hasEnoughPower = this.totalSupply.electricity >= this.totalDemand.electricity;
        const hasEnoughWater = this.totalSupply.water >= this.totalDemand.water;
        return { hasEnoughPower, hasEnoughWater };
    }

    getResources() {
        return {
            electricity: {
                supply: this.totalSupply.electricity,
                demand: this.totalDemand.electricity,
                balance: this.totalSupply.electricity - this.totalDemand.electricity
            },
            water: {
                supply: this.totalSupply.water,
                demand: this.totalDemand.water,
                balance: this.totalSupply.water - this.totalDemand.water
            }
        };
    }
    reset() {
        this.totalSupply = { electricity: 0, water: 0 };
        this.totalDemand = { electricity: 0, water: 0 };
        console.log("ResourceManager reset.");
    }
} 