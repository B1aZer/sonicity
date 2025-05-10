import * as THREE from 'three';
import { BUILDING_TYPES } from '../utils/constants.js';
import { AssetLoader } from './assetLoader.js';
import Logger from '../utils/logger.js';

export class BuildingManager {
    constructor(gridManager, gameStateContract, initialMoney, assetLoader) {
        this.gridManager = gridManager;
        this.gameStateContract = gameStateContract;
        this.money = initialMoney;
        this.assetLoader = assetLoader;
        this.scene = null;
        this.buildings = new Map();
        this.fixedBuildings = new Map();
        this.updateTimer = 0;
        this.updateInterval = 0.5;
        Logger.info('BuildingManager initialized', { initialMoney });
    }

    setScene(scene, cellSize, assetLoader) {
        this.scene = scene;
        this.cellSize = cellSize;
        this.assetLoader = assetLoader;
        Logger.debug('BuildingManager scene set', { cellSize });
    }

    placeBuilding(type, position) {
        try {
            Logger.debug('Attempting to place building', { type, position });
            
            // Convert world position to grid position
            const gridPos = this.gridManager.getGridPosition(position.x, position.z);
            
            // Check if position is valid and not occupied
            if (!this.gridManager.isValidPosition(gridPos.x, gridPos.z)) {
                Logger.warn('Invalid building position:', { type, gridPos });
                return null;
            }
            
            if (this.gridManager.isCellOccupied(gridPos.x, gridPos.z)) {
                Logger.warn('Cell already occupied:', { type, gridPos });
                return null;
            }

            // Create building mesh with full functionality
            const building = this.createBuildingMesh(type);
            if (!building) {
                Logger.error('Failed to create building mesh', { type });
                return null;
            }

            // Position building
            const worldPos = this.gridManager.getWorldPosition(gridPos.x, gridPos.z);
            building.position.set(worldPos.x, 0, worldPos.z);
            
            // Add subtle random rotation for houses to make them look more natural
            if (type === 'HOUSE') {
                const rotation = (Math.random() * 30 - 15) * (Math.PI / 180);
                building.rotation.y = rotation;
                Logger.debug('Applied random rotation to house', { rotation: rotation * (180 / Math.PI) });
            }
            
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
            
            Logger.info('Building placed successfully', {
                type,
                id: buildingObj.id,
                gridPosition: gridPos,
                worldPosition: worldPos
            });
            
            return buildingObj;
        } catch (error) {
            Logger.error('Error placing building:', { type, position, error: error.message });
            return null;
        }
    }

    createBuildingMesh(type) {
        try {
            Logger.debug('Creating building mesh', { type });
            const buildingData = BUILDING_TYPES[type];
            const model = this.assetLoader.getModel(type);
            
            if (model) {
                Logger.debug('Using 3D model for building', { type });
                const building = model.clone();
                building.castShadow = true;
                building.receiveShadow = true;
                
                // Set userData on the building and all its children
                const propertyName = `is${type.charAt(0) + type.slice(1).toLowerCase().replace('_', '')}`;
                building.userData[propertyName] = true;
                building.traverse((child) => {
                    if (child.isMesh) {
                        child.userData[propertyName] = true;
                    }
                });
                
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
                    Logger.debug('Added point light to building', { type });
                }
                
                return building;
            } else {
                Logger.debug('Using fallback cube geometry for building', { type });
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
                
                // Set userData on the fallback mesh
                const propertyName = `is${type.charAt(0) + type.slice(1).toLowerCase().replace('_', '')}`;
                building.userData[propertyName] = true;
                
                return building;
            }
        } catch (error) {
            Logger.error('Error creating building mesh:', { type, error: error.message });
            return null;
        }
    }

    placeFixedBuilding(type, position, rotation) {
        try {
            Logger.debug('Attempting to place fixed building', { type, position, rotation });
            
            // Create building mesh
            const building = this.createBuildingMesh(type);
            if (!building) {
                Logger.error('Failed to create fixed building mesh', { type });
                return null;
            }

            // Set position and rotation
            building.position.copy(position);
            building.rotation.y = rotation;
            
            // Add to scene
            this.scene.add(building);
            
            Logger.info('Fixed building placed successfully', {
                type,
                position,
                rotation
            });
            
            return building;
        } catch (error) {
            Logger.error('Error placing fixed building:', { type, position, rotation, error: error.message });
            return null;
        }
    }

    removeBuilding(position) {
        try {
            Logger.debug('Attempting to remove building', { position });
            const gridPos = this.gridManager.getGridPosition(position.x, position.z);
            const buildingKey = `${gridPos.x},${gridPos.z}`;
            const building = this.buildings.get(buildingKey);
            
            if (building) {
                // Remove from scene
                this.scene.remove(building.mesh);
                
                // Free the cell
                this.gridManager.freeCell(gridPos.x, gridPos.z);
                
                // Update contract state
                this.gameStateContract.removeBuilding(gridPos.x, gridPos.z);
                
                // Remove from buildings map
                this.buildings.delete(buildingKey);
                
                Logger.info('Building removed successfully', {
                    type: building.type,
                    id: building.id,
                    position: gridPos
                });
                
                return true;
            }
            
            Logger.warn('No building found at position', { position, gridPos });
            return false;
        } catch (error) {
            Logger.error('Error removing building:', { position, error: error.message });
            return false;
        }
    }

    removeFixedBuilding(position) {
        try {
            Logger.debug('Attempting to remove fixed building', { position });
            const buildingKey = `${position.x},${position.z}`;
            const building = this.fixedBuildings.get(buildingKey);
            
            if (building) {
                // Remove from scene
                this.scene.remove(building.mesh);
                
                // Remove from buildings map
                this.fixedBuildings.delete(buildingKey);
                
                Logger.info('Fixed building removed successfully', {
                    type: building.type,
                    position: position.toArray()
                });
                
                return true;
            }
            
            Logger.warn('No fixed building found at position', { position });
            return false;
        } catch (error) {
            Logger.error('Error removing fixed building:', { position, error: error.message });
            return false;
        }
    }

    getBuildingAt(position) {
        const gridPos = this.gridManager.getGridPosition(position.x, position.z);
        const building = this.buildings.get(`${gridPos.x},${gridPos.z}`);
        Logger.debug('Getting building at position', { position, gridPos, found: !!building });
        return building;
    }

    getAllBuildings() {
        const buildings = Array.from(this.buildings.values());
        Logger.debug('Getting all buildings', { count: buildings.length });
        return buildings;
    }

    updateBuildingVisuals(building) {
        Logger.debug('Updating building visuals', { 
            type: building.type,
            id: building.id,
            isFunctional: building.isFunctional
        });
        
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
            Logger.debug('BuildingManager update cycle completed', { 
                buildingCount: this.buildings.size,
                fixedBuildingCount: this.fixedBuildings.size
            });
        }
    }
}