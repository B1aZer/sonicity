import * as THREE from 'three';
import { BUILDINGS } from '../utils/constants.js';
import Logger from '../utils/logger.js';
import { AnimationManager } from './animationManager.js';

export class BuildingManager {
    constructor(gridManager, gameStateContract, initialMoney, assetLoader, gridBuildingsContract = null, districtBuildingsContract = null) {
        this.gridManager = gridManager;
        this.gameStateContract = gameStateContract;
        this.districtBuildingsContract = districtBuildingsContract;
        this.gridBuildingsContract = gridBuildingsContract;
        this.money = initialMoney;
        this.assetLoader = assetLoader;
        this.animationManager = new AnimationManager();
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

    /**
     * Gets the terrain height at a given world position
     * @param {number} x - World X coordinate
     * @param {number} z - World Z coordinate
     * @returns {number} Terrain height at the position
     */
    getTerrainHeightAt(x, z) {
        // Find the ground plane in the scene
        let groundPlane = null;
        this.scene.traverse((child) => {
            if (child.name === "groundPlane" && child.isMesh) {
                groundPlane = child;
            }
        });

        if (!groundPlane || !groundPlane.geometry) {
            return 0; // Fallback height
        }

        // Create a raycaster to find terrain height
        const raycaster = new THREE.Raycaster();
        const rayStart = new THREE.Vector3(x, 100, z); // Start high above
        const rayEnd = new THREE.Vector3(x, -100, z);  // End below terrain
        raycaster.set(rayStart, rayEnd.sub(rayStart).normalize());

        const intersects = raycaster.intersectObject(groundPlane);
        if (intersects.length > 0) {
            return intersects[0].point.y; // Return exact terrain height
        }

        return 0; // Fallback height
    }

    async placeBuilding(type, position) {
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

            // Get building level from appropriate contract
            let level = 1;  // Default level is 1
            const buildingData = BUILDINGS[type];
            if (buildingData.isGridBuilding && this.gridBuildingsContract) {
                try {
                    // TODO: For now, we'll use level 1 since we can't get the building ID from grid position
                    Logger.debug('Using default level 1 for grid building', { type, gridPos });
                } catch (error) {
                    Logger.warn('Failed to get building level from grid contract, using default level 1', { type, error: error.message });
                }
            } else if (this.districtBuildingsContract) {
                try {
                    level = await this.districtBuildingsContract.getBuildingLevel(type);
                    Logger.debug('Got building level from district contract', { type, level });
                } catch (error) {
                    Logger.warn('Failed to get building level from district contract, using default level 1', { type, error: error.message });
                }
            }

            Logger.debug('Creating building mesh with level', { type, level });
            // Create building mesh with full functionality
            const building = this.createBuildingMesh(type, Number(level));
            if (!building) {
                Logger.error('Failed to create building mesh', { type, level });
                return null;
            }

            // Position the building at the world position with terrain height
            const worldPos = this.gridManager.getWorldPosition(gridPos.x, gridPos.z);
            const terrainHeight = this.getTerrainHeightAt(worldPos.x, worldPos.z);
            building.position.set(worldPos.x, terrainHeight, worldPos.z);
            
            // Add subtle random rotation for houses to make them look more natural
            if (type === 'HOUSE') {
                const rotation = (Math.random() * 30 - 15) * (Math.PI / 180);
                building.rotation.y = rotation;
                Logger.debug('Applied random rotation to house', { rotation: rotation * (180 / Math.PI) });
            }
            
            // Add to scene
            this.scene.add(building);
            
            // Create building object with all necessary data
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
                noResourceColor: new THREE.Color(0x555555),
                level: Number(level)
            };
            
            // Set up animations if available
            const modelKey = `${type}_LVL${level}`;
            const animations = this.assetLoader.getAnimations(modelKey);
            if (animations && animations.length > 0) {
                Logger.debug('Setting up animations for building', { type, level, animationCount: animations.length });
                
                // Use AnimationManager to handle all animation setup
                this.animationManager.setupBuildingAnimations(
                    buildingObj.id, 
                    building, 
                    modelKey, 
                    animations, 
                    { autoPlay: true }
                );
            }
            
            // Store building reference
            this.buildings.set(`${gridPos.x},${gridPos.z}`, buildingObj);
            
            // Mark cell as occupied
            this.gridManager.occupyCell(gridPos.x, gridPos.z, building);
            
            Logger.info('Building placed successfully', {
                type,
                id: buildingObj.id,
                gridPosition: gridPos,
                worldPosition: worldPos,
                level: Number(level)
            });
            
            return buildingObj;
        } catch (error) {
            Logger.error('Error placing building:', { type, position, error: error.message });
            return null;
        }
    }

    createBuildingMesh(type, level = 1) {
        try {
            Logger.debug('Creating building mesh', { type, level });
            const buildingData = BUILDINGS[type];
            const modelKey = `${type}_LVL${level}`;
            
            // Use the new spawnBuilding method for proper skinned mesh handling
            const result = this.assetLoader.spawnBuilding(modelKey, new THREE.Vector3(0, 0, 0));
            
            if (result) {
                Logger.debug('Using 3D model for building', { type, level, modelKey });
                const building = result;
                building.castShadow = true;
                building.receiveShadow = true;
                
                // Set userData on the building and all its children
                const propertyName = `is${type.charAt(0) + type.slice(1).toLowerCase().replaceAll('_', '')}`;
                building.userData[propertyName] = true;
                building.userData.level = level;
                building.traverse((child) => {
                    if (child.isMesh) {
                        child.userData[propertyName] = true;
                        child.userData.level = level;
                    }
                });
                
                // Scale and position the model
                const box = new THREE.Box3().setFromObject(building);
                const modelSize = new THREE.Vector3();
                box.getSize(modelSize);
                
                const targetSize = buildingData.size;
                const scale = targetSize.x / Math.max(modelSize.x, modelSize.z);
                building.scale.set(scale, scale, scale);
                
                // Center the model on the ground
                const center = new THREE.Vector3();
                box.getCenter(center);
                building.position.y = -center.y * scale;
                
                // Add point light for important buildings
                if (['ALTAR', 'CITY_HALL', 'MINE'].includes(type)) {
                    const pointLight = new THREE.PointLight(0xffffff, 0.7, 4);
                    pointLight.position.set(0, 1, 0);
                    building.add(pointLight);
                    Logger.debug('Added point light to building', { type });
                }
                
                return building;
            } else {
                Logger.debug('Using fallback cube geometry for building', { type, level });
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
                const propertyName = `is${type.charAt(0) + type.slice(1).toLowerCase().replaceAll('_', '')}`;
                building.userData[propertyName] = true;
                building.userData.level = level;
                
                return building;
            }
        } catch (error) {
            Logger.error('Error creating building mesh:', { type, level, error: error.message });
            return null;
        }
    }

    async placeFixedBuilding(type, position, rotation, level = 1) {
        try {
            Logger.debug('Attempting to place fixed building', { type, position, rotation, level });
            
            // Create building mesh with specified level
            const building = this.createBuildingMesh(type, level);
            if (!building) {
                Logger.error('Failed to create fixed building mesh', { type, level });
                return null;
            }

            // Set position and rotation
            building.position.copy(position);
            building.rotation.y = rotation;
            
            // Add to scene
            this.scene.add(building);
            
            // Set up animations if available (same as grid buildings)
            const modelKey = `${type}_LVL${level}`;
            const animations = this.assetLoader.getAnimations(modelKey);
            if (animations && animations.length > 0) {
                Logger.debug('Setting up animations for fixed building', { type, level, animationCount: animations.length });
                
                // Generate a unique ID for the fixed building
                const buildingId = `fixed_${type}_${Date.now()}`;
                
                // Use AnimationManager to handle all animation setup
                this.animationManager.setupBuildingAnimations(
                    buildingId, 
                    building, 
                    modelKey, 
                    animations, 
                    { autoPlay: true }
                );
            }
            
            Logger.info('Fixed building placed successfully', {
                type,
                position,
                rotation,
                level
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
                // Clean up animations using AnimationManager
                this.animationManager.cleanupBuildingAnimations(building.id);
                
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

    // Animation control methods - delegate to AnimationManager
    toggleBuildingAnimation(buildingId) {
        return this.animationManager.toggleBuildingAnimation(buildingId);
    }

    getAnimationStatus(buildingId) {
        return this.animationManager.getAnimationStatus(buildingId);
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
        
        // Update all animation mixers via AnimationManager
        this.animationManager.update(deltaTime);
        
        if (this.updateTimer >= this.updateInterval) {
            this.updateTimer = 0;
            // Add any periodic updates here if needed
        }
    }

    async upgradeBuilding(buildingKey) {
        try {
            const building = this.buildings.get(buildingKey);
            if (!building) {
                Logger.warn('Building not found for upgrade', { buildingKey });
                return false;
            }

            // Get current level from district contract
            const currentLevel = await this.districtBuildingsContract.getBuildingLevel(building.type);
            const newLevel = Number(currentLevel) + 1;

            // Create new mesh for upgraded building
            const newMesh = this.createBuildingMesh(building.type, newLevel);
            if (!newMesh) {
                Logger.error('Failed to create upgraded building mesh', { type: building.type, level: newLevel });
                return false;
            }

            // Copy position and rotation from old mesh
            newMesh.position.copy(building.mesh.position);
            newMesh.rotation.copy(building.mesh.rotation);

            // Remove old mesh and add new one
            this.scene.remove(building.mesh);
            this.scene.add(newMesh);

            // Update building object
            building.mesh = newMesh;
            building.userData.level = newLevel;

            Logger.info('Building upgraded successfully', {
                type: building.type,
                oldLevel: currentLevel,
                newLevel: newLevel
            });

            return true;
        } catch (error) {
            Logger.error('Error upgrading building:', { buildingKey, error: error.message });
            return false;
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        Logger.info('BuildingManager: Starting disposal');
        
        // Clean up animations via AnimationManager
        this.animationManager.dispose();
        
        // Remove all buildings from scene
        if (this.scene) {
            this.buildings.forEach(building => {
                if (building.mesh) {
                    this.scene.remove(building.mesh);
                    // Dispose of geometry and materials
                    if (building.mesh.geometry) {
                        building.mesh.geometry.dispose();
                    }
                    if (building.mesh.material) {
                        if (Array.isArray(building.mesh.material)) {
                            building.mesh.material.forEach(material => material.dispose());
                        } else {
                            building.mesh.material.dispose();
                        }
                    }
                }
            });
            
            this.fixedBuildings.forEach(building => {
                if (building.mesh) {
                    this.scene.remove(building.mesh);
                    // Dispose of geometry and materials
                    if (building.mesh.geometry) {
                        building.mesh.geometry.dispose();
                    }
                    if (building.mesh.material) {
                        if (Array.isArray(building.mesh.material)) {
                            building.mesh.material.forEach(material => material.dispose());
                        } else {
                            building.mesh.material.dispose();
                        }
                    }
                }
            });
        }
        
        // Clear collections
        this.buildings.clear();
        this.fixedBuildings.clear();
        
        // Clear references
        this.scene = null;
        this.assetLoader = null;
        this.gridManager = null;
        this.gameStateContract = null;
        this.districtBuildingsContract = null;
        this.gridBuildingsContract = null;
        
        Logger.info('BuildingManager: Disposal completed');
    }
}