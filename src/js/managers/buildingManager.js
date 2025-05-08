import * as THREE from 'three';
import { BUILDING_TYPES } from '../utils/constants.js';
import { AssetLoader } from './assetLoader.js';
import Logger from '../utils/logger.js';

export class BuildingManager {
    constructor(gridManager, resourceManager, initialMoney, assetLoader) {
        this.gridManager = gridManager;
        this.resourceManager = resourceManager;
        this.money = initialMoney;
        this.assetLoader = assetLoader;
        this.scene = null;
        this.buildings = new Map();
        this.fixedBuildings = new Map();
        this.updateTimer = 0;
        this.updateInterval = 0.5;
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

            // Create building mesh with full functionality
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
            
            // Create building object with all necessary data
            const buildingData = BUILDING_TYPES[type];
            const buildingObj = {
                id: THREE.MathUtils.generateUUID(),
                type,
                mesh: building,
                position: building.position.clone(),
                data: buildingData,
                isUsingModel: true,
                isFunctional: true,
                gridPosition: gridPos,
                originalColor: new THREE.Color(buildingData.color),
                noResourceColor: new THREE.Color(0x555555)
            };
            
            // Store building reference
            this.buildings.set(`${gridPos.x},${gridPos.z}`, buildingObj);
            
            // Mark cell as occupied
            this.gridManager.occupyCell(gridPos.x, gridPos.z, building);
            
            // Register resource supply/demand
            if (buildingData.generates) {
                this.resourceManager.addSupply(buildingData.generates);
            }
            if (buildingData.consumes) {
                this.resourceManager.addDemand(buildingData.consumes);
            }
            
            Logger.info('Building placed:', {
                type,
                position: gridPos,
                worldPosition: worldPos
            });
            
            return buildingObj;
        } catch (error) {
            Logger.error('Error placing building:', error);
            return null;
        }
    }

    createBuildingMesh(type) {
        try {
            const buildingData = BUILDING_TYPES[type];
            const model = this.assetLoader.getModel(type);
            
            if (model) {
                const building = model.clone();
                building.castShadow = true;
                building.receiveShadow = true;
                
                // Scale and position the model
                const box = new THREE.Box3().setFromObject(building);
                const modelSize = new THREE.Vector3();
                box.getSize(modelSize);
                
                const targetSize = buildingData.size;
                const scale = targetSize.x / Math.max(modelSize.x, modelSize.z);
                building.scale.set(scale, scale, scale);
                
                // Add point light for important buildings
                if (['ALTAR', 'CITY_HALL', 'MINE'].includes(type)) {
                    const pointLight = new THREE.PointLight(0xffffff, 0.7, 4);
                    pointLight.position.set(0, 1, 0);
                    building.add(pointLight);
                }
                
                return building;
            } else {
                // Fallback to cube geometry
                const geometry = new THREE.BoxGeometry(
                    buildingData.size.x,
                    buildingData.size.y,
                    buildingData.size.z
                );
                const material = new THREE.MeshStandardMaterial({
                    color: buildingData.color,
                    metalness: 0.5,
                    roughness: 0.6
                });
                const building = new THREE.Mesh(geometry, material);
                building.castShadow = true;
                building.receiveShadow = true;
                return building;
            }
        } catch (error) {
            Logger.error('Error creating building mesh:', error);
            return null;
        }
    }

    placeFixedBuilding(type, position, rotation = 0) {
        try {
            const building = this.createBuildingMesh(type);
            if (!building) {
                Logger.error('Failed to create building mesh for type:', type);
                return null;
            }

            // Position and rotate building
            building.position.copy(position);
            building.rotation.y = rotation;
            
            // Add to scene
            this.scene.add(building);
            
            // Create building object
            const buildingData = BUILDING_TYPES[type];
            const buildingObj = {
                id: THREE.MathUtils.generateUUID(),
                type,
                mesh: building,
                position: position.clone(),
                rotation,
                data: buildingData,
                isUsingModel: true,
                isFunctional: true,
                originalColor: new THREE.Color(buildingData.color),
                noResourceColor: new THREE.Color(0x555555)
            };
            
            // Store building reference
            const buildingKey = `${position.x},${position.z}`;
            this.fixedBuildings.set(buildingKey, buildingObj);
            
            Logger.info('Fixed building placed:', {
                type,
                position: position.toArray(),
                rotation
            });
            
            return buildingObj;
        } catch (error) {
            Logger.error('Error placing fixed building:', error);
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
                
                // Remove resource supply/demand
                if (building.data.generates) {
                    this.resourceManager.removeSupply(building.data.generates);
                }
                if (building.data.consumes) {
                    this.resourceManager.removeDemand(building.data.consumes);
                }
                
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

    removeFixedBuilding(position) {
        try {
            const buildingKey = `${position.x},${position.z}`;
            const building = this.fixedBuildings.get(buildingKey);
            
            if (building) {
                // Remove from scene
                this.scene.remove(building.mesh);
                
                // Remove from buildings map
                this.fixedBuildings.delete(buildingKey);
                
                Logger.info('Fixed building removed:', {
                    type: building.type,
                    position: position.toArray()
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            Logger.error('Error removing fixed building:', error);
            return false;
        }
    }

    getBuildingAt(position) {
        const gridPos = this.gridManager.getGridPosition(position.x, position.z);
        return this.buildings.get(`${gridPos.x},${gridPos.z}`);
    }

    getAllBuildings() {
        return Array.from(this.buildings.values());
    }

    updateBuildingVisuals(building) {
        if (!building.isUsingModel && building.mesh.material) {
            const targetColor = building.isFunctional ? building.originalColor : building.noResourceColor;
            building.mesh.material.color.copy(targetColor);
            building.mesh.material.transparent = false;
            building.mesh.material.opacity = 1.0;
            building.mesh.material.needsUpdate = true;
        } else if (building.isUsingModel) {
            building.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material.clone();
                    }
                    if (building.isFunctional) {
                        if (child.userData.clonedMaterial) {
                            child.material = child.userData.clonedMaterial;
                            delete child.userData.clonedMaterial;
                        }
                        child.material.opacity = child.userData.originalMaterial?.opacity ?? 1.0;
                        child.material.transparent = child.material.opacity < 1.0;
                    } else {
                        if (!child.userData.clonedMaterial) {
                            child.material = child.material.clone();
                            child.userData.clonedMaterial = child.material;
                        }
                        child.material.opacity = 0.5;
                        child.material.transparent = true;
                    }
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    update(deltaTime) {
        this.updateTimer += deltaTime;
        if (this.updateTimer >= this.updateInterval) {
            this.updateTimer = 0;
        }
    }
}