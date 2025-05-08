import * as THREE from 'three';
import { BUILDING_TYPES } from '../utils/constants.js';
import { AssetLoader } from './assetLoader.js'; // Not strictly needed here unless type hinting
import Logger from '../utils/logger.js';

export class BuildingManager {
    constructor(gridManager, resourceManager, initialMoney, assetLoader) {
        this.gridManager = gridManager;
        this.resourceManager = resourceManager;
        this.money = initialMoney;
        this.assetLoader = assetLoader;
        this.scene = null;
        this.buildings = new Map();
        this.updateTimer = 0;
        this.updateInterval = 0.5; // Update resource checks twice per second
    }

    setScene(scene, cellSize, assetLoader) {
        this.scene = scene;
        this.cellSize = cellSize;
        this.assetLoader = assetLoader;
    }

    placeBuilding(type, position) {
        try {
            // Convert world position to grid position
            const gridPos = this.gridManager.getGridPosition(position.x, position.z);
            
            // Check if position is valid and not occupied
            if (!this.gridManager.isValidPosition(gridPos.x, gridPos.z)) {
                Logger.warn('Invalid building position:', gridPos);
                return null;
            }
            
            if (this.gridManager.isCellOccupied(gridPos.x, gridPos.z)) {
                Logger.warn('Cell already occupied:', gridPos);
                return null;
            }

            // Create building mesh
            const building = this.createBuildingMesh(type);
            if (!building) {
                Logger.error('Failed to create building mesh for type:', type);
                return null;
            }

            // Position building
            const worldPos = this.gridManager.getWorldPosition(gridPos.x, gridPos.z);
            building.position.set(worldPos.x, 0, worldPos.z);
            
            // Add to scene
            this.scene.add(building);
            
            // Store building reference
            this.buildings.set(`${gridPos.x},${gridPos.z}`, {
                type,
                mesh: building,
                gridPosition: gridPos
            });
            
            // Mark cell as occupied
            this.gridManager.occupyCell(gridPos.x, gridPos.z, building);
            
            Logger.info('Building placed:', {
                type,
                position: gridPos,
                worldPosition: worldPos
            });
            
            return building;
        } catch (error) {
            Logger.error('Error placing building:', error);
            return null;
        }
    }

    removeBuilding(position) {
        try {
            const gridPos = this.gridManager.getGridPosition(position.x, position.z);
            const buildingKey = `${gridPos.x},${gridPos.z}`;
            const building = this.buildings.get(buildingKey);
            
            if (building) {
                // Remove from scene
                this.scene.remove(building.mesh);
                
                // Free the cell
                this.gridManager.freeCell(gridPos.x, gridPos.z);
                
                // Remove from buildings map
                this.buildings.delete(buildingKey);
                
                Logger.info('Building removed:', {
                    type: building.type,
                    position: gridPos
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            Logger.error('Error removing building:', error);
            return false;
        }
    }

    createBuildingMesh(type) {
        try {
            const model = this.assetLoader.getModel(type);
            if (!model) {
                Logger.error('Model not found for building type:', type);
                return null;
            }

            const building = model.clone();
            building.castShadow = true;
            building.receiveShadow = true;
            
            return building;
        } catch (error) {
            Logger.error('Error creating building mesh:', error);
            return null;
        }
    }

    getBuildingAt(position) {
        const gridPos = this.gridManager.getGridPosition(position.x, position.z);
        return this.buildings.get(`${gridPos.x},${gridPos.z}`);
    }

    getAllBuildings() {
        return Array.from(this.buildings.values());
    }

    update(deltaTime) {
        // This update function can be simplified or removed if Game.js handles all logic.
        // For now, let's keep it minimal, mainly for potential future uses.
        // The core functionality check and income generation will happen in Game.js.
        this.updateTimer += deltaTime;
        if (this.updateTimer >= this.updateInterval) {
             this.updateTimer = 0;
            // No periodic checks needed here anymore, Game.js handles functionality state
            // Game.js will call updateBuildingVisuals if functionality changes.
        }
    }
    // Removed checkBuildingResources method as Game.js now determines functionality.
    // Update visuals based SOLELY on the isFunctional flag set by Game.js
    updateBuildingVisuals(building) {
        // Only modify color/material if it's NOT a loaded model (or apply effects differently)
        if (!building.isUsingModel && building.mesh.material) {
            const targetColor = building.isFunctional ? building.originalColor : building.noResourceColor;
            building.mesh.material.color.copy(targetColor);
            building.mesh.material.transparent = false;
            building.mesh.material.opacity = 1.0;
            building.mesh.material.needsUpdate = true;
        } else if (building.isUsingModel) {
            // For models, maybe apply an overlay, tint, or transparency effect?
            // Example: Dimming the model slightly when not functional
            building.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                     // Clone material if not already done to avoid affecting other instances
                     if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material.clone();
                    }
                    if (building.isFunctional) {
                        // Restore original appearance (potentially copy properties back)
                        if(child.userData.clonedMaterial) {
                             child.material = child.userData.clonedMaterial; // Restore potentially cloned original
                             delete child.userData.clonedMaterial; // Clean up flag
                        }
                         child.material.opacity = child.userData.originalMaterial?.opacity ?? 1.0;
                         child.material.transparent = child.material.opacity < 1.0;
                         // If we tinted, restore color tint here
                    } else {
                         // Apply non-functional effect (e.g., lower opacity or desaturate)
                          if (!child.userData.clonedMaterial) {
                             child.material = child.material.clone(); // Clone before modifying
                             child.userData.clonedMaterial = child.material;
                         }
                         child.material.opacity = 0.5; // Make it semi-transparent
                         child.material.transparent = true;
                         // Could also apply a color tint: child.material.color.multiplyScalar(0.5);
                    }
                     child.material.needsUpdate = true;
                }
            });
        }
    }
}