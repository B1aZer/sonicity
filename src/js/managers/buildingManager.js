import * as THREE from 'three';
import { BUILDING_TYPES } from '../utils/constants.js';

export class BuildingManager {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.models = {};
    }

    initModels(assetLoader) {
        // Initialize building models from asset loader
        Object.keys(BUILDING_TYPES).forEach(type => {
            const model = assetLoader.getModel(type);
            if (model) {
                this.models[type] = model;
            }
        });
    }

    placeBuilding(type, position) {
        if (!this.models[type]) {
            console.error(`No model found for building type: ${type}`);
            return null;
        }

        // Create a new building instance
        const building = {
            type: type,
            model: this.models[type].clone(),
            position: position,
            isFunctional: false
        };

        // Position the building
        building.model.position.copy(position);
        
        // Add to scene
        this.scene.add(building.model);
        
        // Add to buildings array
        this.buildings.push(building);
        
        return building;
    }

    removeBuilding(building) {
        // Remove from scene
        this.scene.remove(building.model);
        
        // Remove from buildings array
        const index = this.buildings.indexOf(building);
        if (index > -1) {
            this.buildings.splice(index, 1);
        }
    }

    clearAllBuildings() {
        // Remove all buildings from scene
        this.buildings.forEach(building => {
            this.scene.remove(building.model);
        });
        
        // Clear buildings array
        this.buildings = [];
    }

    update(delta) {
        // Update building animations or other time-based behaviors
        this.buildings.forEach(building => {
            // Add any building-specific updates here
        });
    }

    getBuildings() {
        return this.buildings;
    }
} 