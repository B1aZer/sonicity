import { BUILDING_TYPES } from '../utils/constants.js';

export class ResourceManager {
    constructor() {
        // Only tracking money/gold now (removed utilities for simplification)
        this.money = 5000;
    }

    // Get current money value
    getMoney() {
        return this.money;
    }

    // Add money (e.g., from income)
    addMoney(amount) {
        this.money += amount;
    }

    // Remove money (e.g., for purchases)
    removeMoney(amount) {
        this.money -= amount;
        // Ensure non-negative values
        this.money = Math.max(0, this.money);
    }

    // Check if player can afford a cost
    canAfford(cost) {
        return this.money >= cost;
    }

    // For backwards compatibility - now just returns money in a format similar to before
    getResources() {
        return {
            money: this.money
        };
    }

    // For backwards compatibility - now no-ops
    addSupply(supply) {
        // No-op (removed for simplification)
    }

    // For backwards compatibility - now no-ops
    removeSupply(supply) {
        // No-op (removed for simplification)
    }

    // For backwards compatibility - now no-ops
    addDemand(demand) {
        // No-op (removed for simplification)
    }

    // For backwards compatibility - now no-ops
    removeDemand(demand) {
        // No-op (removed for simplification)
    }

    // For backwards compatibility - now always returns true
    checkGlobalSufficiency() {
        return { hasEnoughPower: true, hasEnoughWater: true };
    }

    // Reset resources
    reset() {
        this.money = 5000;
        console.log("ResourceManager reset.");
    }
} 