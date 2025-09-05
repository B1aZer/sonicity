import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { COSMETIC_METADATA, COSMETIC_TYPES } from '../utils/constants.js';
import Logger from '../utils/logger.js';

export class CosmeticManager {
    constructor(scene, cosmeticItemsContract) {
        this.scene = scene;
        this.cosmeticItemsContract = cosmeticItemsContract;
        this.gltfLoader = new GLTFLoader();
        
        // Track loaded cosmetic models and instances
        this.cosmeticModels = new Map(); // cosmeticId -> template model
        this.playerCosmetics = new Map(); // playerAddress -> Set of cosmetic instances
        
        Logger.info('CosmeticManager initialized');
    }

    /**
     * Load cosmetic model template for a specific cosmetic ID
     */
    async loadCosmeticModel(cosmeticId) {
        try {
            // Get cosmetic config from contract
            const config = await this.cosmeticItemsContract.getCosmeticConfig(cosmeticId);
            const metadata = COSMETIC_METADATA[cosmeticId] || {};
            
            const modelPath = config.modelPath || metadata.modelPath;
            if (!modelPath) {
                Logger.warn(`No model path found for cosmetic ${cosmeticId}`);
                return null;
            }

            Logger.info(`Loading cosmetic model: ${modelPath}`);
            
            const gltf = await new Promise((resolve, reject) => {
                this.gltfLoader.load(
                    modelPath,
                    resolve,
                    undefined,
                    reject
                );
            });

            // Store the template model
            this.cosmeticModels.set(cosmeticId, gltf.scene);
            Logger.info(`Cosmetic model loaded successfully: ${config.name}`);
            
            return gltf.scene;
        } catch (error) {
            Logger.error(`Error loading cosmetic model ${cosmeticId}:`, error);
            return null;
        }
    }

    /**
     * Create an instance of a cosmetic for a player
     */
    createCosmeticInstance(cosmeticId, playerAddress) {
        const template = this.cosmeticModels.get(cosmeticId);
        if (!template) {
            Logger.error(`No template found for cosmetic ${cosmeticId}`);
            return null;
        }

        try {
            // Clone the model using SkeletonUtils for proper skeleton/bone handling
            const cosmetic = SkeletonUtils.clone(template);
            cosmetic.name = `cosmetic_${cosmeticId}_${playerAddress}_${Date.now()}`;
            
            // Get cosmetic metadata for positioning
            const metadata = COSMETIC_METADATA[cosmeticId] || {};
            const cosmeticType = metadata.type || COSMETIC_TYPES.BANNER;
            
            // Position the cosmetic from metadata (with fallbacks)
            const position = metadata.position || { x: 0, y: 0, z: 0 };
            const rotation = metadata.rotation || { x: 0, y: 0, z: 0 };
            const size = metadata.size || new THREE.Vector3(1, 1, 1);
            
            cosmetic.position.set(position.x, position.y, position.z);
            cosmetic.rotation.set(rotation.x, rotation.y, rotation.z);
            cosmetic.scale.set(size.x, size.y, size.z);
            
            // Configure shadows and rendering
            cosmetic.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.isSkinnedMesh) {
                    child.frustumCulled = false;
                }
            });
            
            // Store metadata
            cosmetic.userData = {
                isCosmetic: true,
                cosmeticId: cosmeticId,
                playerAddress: playerAddress,
                cosmeticType: cosmeticType
            };
            
            Logger.info(`Created cosmetic instance: ${cosmetic.name}`);
            return cosmetic;
        } catch (error) {
            Logger.error(`Error creating cosmetic instance for ${cosmeticId}:`, error);
            return null;
        }
    }

    /**
     * Load and display all cosmetics owned by a player
     * Similar to how BuildingManager loads buildings from contract data
     */
    async loadPlayerCosmetics(playerAddress) {
        try {
            Logger.info(`Loading cosmetics for player: ${playerAddress}`);
            
            // Remove existing cosmetics for this player first
            this.removePlayerCosmetics(playerAddress);
            
            // Get all available cosmetic IDs from contract
            // Note: Limited to 10 to avoid gas limit issues with large loops in contract
            const availableIds = await this.cosmeticItemsContract.getAvailableCosmetics(10);
            const playerCosmeticInstances = new Set();
            
            for (const cosmeticId of availableIds) {
                // Check if player owns this cosmetic (like BuildingManager checks ownership)
                const isOwned = await this.cosmeticItemsContract.ownsCosmetic(playerAddress, cosmeticId);
                
                if (isOwned) {
                    Logger.info(`Player owns cosmetic ${cosmeticId}, placing in scene...`);
                    
                    // Place cosmetic in scene (like BuildingManager.placeBuilding())
                    const cosmeticInstance = await this.placeCosmeticFromContract(cosmeticId, playerAddress);
                    if (cosmeticInstance) {
                        playerCosmeticInstances.add(cosmeticInstance);
                    }
                }
            }
            
            // Store player's cosmetic instances
            this.playerCosmetics.set(playerAddress, playerCosmeticInstances);
            
            Logger.info(`Loaded ${playerCosmeticInstances.size} cosmetics for player ${playerAddress}`);
            
        } catch (error) {
            Logger.error(`Error loading player cosmetics for ${playerAddress}:`, error);
        }
    }

    /**
     * Place a cosmetic in the scene based on contract data and constants
     * Similar to BuildingManager.placeBuilding()
     */
    async placeCosmeticFromContract(cosmeticId, playerAddress) {
        try {
            // Get cosmetic config from contract (like getting building level)
            const contractConfig = await this.cosmeticItemsContract.getCosmeticConfig(cosmeticId);
            
            // Get positioning data from constants (like BUILDINGS or PROPS)
            const metadata = COSMETIC_METADATA[cosmeticId] || {};
            
            // Load model if not already loaded (like AssetLoader.getTemplate())
            if (!this.cosmeticModels.has(cosmeticId)) {
                await this.loadCosmeticModel(cosmeticId);
            }
            
            // Create and position cosmetic instance (like AssetLoader.spawnBuilding())
            const cosmetic = this.createCosmeticInstance(cosmeticId, playerAddress);
            if (cosmetic) {
                this.scene.add(cosmetic);
                Logger.info(`Placed cosmetic ${contractConfig.name} at position (${metadata.position?.x}, ${metadata.position?.y}, ${metadata.position?.z})`);
                return cosmetic;
            }
            
            return null;
        } catch (error) {
            Logger.error(`Error placing cosmetic ${cosmeticId}:`, error);
            return null;
        }
    }

    /**
     * Remove all cosmetics for a specific player
     */
    removePlayerCosmetics(playerAddress) {
        const playerCosmeticInstances = this.playerCosmetics.get(playerAddress);
        if (playerCosmeticInstances) {
            for (const cosmetic of playerCosmeticInstances) {
                this.scene.remove(cosmetic);
                // Dispose of materials and geometries to free memory
                cosmetic.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            this.playerCosmetics.delete(playerAddress);
            Logger.info(`Removed cosmetics for player ${playerAddress}`);
        }
    }

    /**
     * Get all cosmetics in the scene
     */
    getAllCosmetics() {
        const allCosmetics = [];
        for (const playerCosmeticInstances of this.playerCosmetics.values()) {
            allCosmetics.push(...playerCosmeticInstances);
        }
        return allCosmetics;
    }

    /**
     * Cleanup - remove all cosmetics and dispose resources
     */
    dispose() {
        // Remove all player cosmetics
        for (const playerAddress of this.playerCosmetics.keys()) {
            this.removePlayerCosmetics(playerAddress);
        }
        
        // Dispose model templates
        for (const model of this.cosmeticModels.values()) {
            model.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        this.cosmeticModels.clear();
        this.playerCosmetics.clear();
        
        Logger.info('CosmeticManager disposed');
    }
}