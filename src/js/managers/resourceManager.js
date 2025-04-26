import { BUILDING_TYPES } from '../utils/constants.js';

export class ResourceManager {
    constructor() {
        // Initialize resources
        this.resources = {
            money: 1000,
            electricity: 0,
            water: 0
        };
        
        // Resource generation rates
        this.generationRates = {
            electricity: 0,
            water: 0
        };
        
        // Resource consumption rates
        this.consumptionRates = {
            electricity: 0,
            water: 0
        };
    }
    
    // Get current resources
    getResources() {
        return { ...this.resources };
    }
    
    // Check if player can afford a cost
    canAfford(cost) {
        return this.resources.money >= cost;
    }
    
    // Deduct resources
    deductResources(cost) {
        if (this.canAfford(cost)) {
            this.resources.money -= cost;
            return true;
        }
        return false;
    }
    
    // Add resources
    addResources(resourceType, amount) {
        if (this.resources[resourceType] !== undefined) {
            this.resources[resourceType] += amount;
            return true;
        }
        return false;
    }
    
    // Update resource generation and consumption based on buildings
    update(buildings) {
        // Reset rates
        this.generationRates = {
            electricity: 0,
            water: 0
        };
        
        this.consumptionRates = {
            electricity: 0,
            water: 0
        };
        
        // Calculate rates based on buildings
        buildings.forEach(building => {
            const buildingType = building.type;
            const buildingData = BUILDING_TYPES[buildingType];
            
            if (!buildingData) return;
            
            // Add generation rates
            if (buildingData.generates) {
                if (buildingData.generates.electricity) {
                    this.generationRates.electricity += buildingData.generates.electricity;
                }
                if (buildingData.generates.water) {
                    this.generationRates.water += buildingData.generates.water;
                }
            }
            
            // Add consumption rates
            if (buildingData.consumes) {
                if (buildingData.consumes.electricity) {
                    this.consumptionRates.electricity += buildingData.consumes.electricity;
                }
                if (buildingData.consumes.water) {
                    this.consumptionRates.water += buildingData.consumes.water;
                }
            }
        });
        
        // Update resources based on rates
        this.resources.electricity += this.generationRates.electricity - this.consumptionRates.electricity;
        this.resources.water += this.generationRates.water - this.consumptionRates.water;
        
        // Ensure resources don't go below 0
        this.resources.electricity = Math.max(0, this.resources.electricity);
        this.resources.water = Math.max(0, this.resources.water);
        
        // Generate income from functional buildings
        this.generateIncome(buildings);
    }
    
    // Generate income from functional buildings
    generateIncome(buildings) {
        let income = 0;
        
        buildings.forEach(building => {
            if (building.isFunctional && BUILDING_TYPES[building.type].income) {
                income += BUILDING_TYPES[building.type].income;
            }
        });
        
        // Add income to money
        this.resources.money += income;
    }
    
    // Reset resources to initial values
    reset() {
        this.resources = {
            money: 1000,
            electricity: 0,
            water: 0
        };
        
        this.generationRates = {
            electricity: 0,
            water: 0
        };
        
        this.consumptionRates = {
            electricity: 0,
            water: 0
        };
    }
} 