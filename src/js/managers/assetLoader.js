import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BUILDINGS } from '../utils/constants.js';
import Logger from '../utils/logger.js';

// Texture paths - using PNG format instead of TGA
const textureMap = {
    color: 'assets/rts_texture/proto_human_RTS_color.png',
    emission: 'assets/rts_texture/proto_human_RTS_emission.png',
    metal: 'assets/rts_texture/proto_human_RTS_metal.png',
    rough: 'assets/rts_texture/proto_human_RTS_rough.png'
};

export class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new TextureLoader();
        this.loadedTemplates = {}; // Store original templates
        this.loadedAnimations = {}; // Store animations
        this.isLoadingComplete = false;
        this.loadingPromises = {};
        this.textures = {};
        this.loadPromise = null;
    }

    async loadAssets() {
        // If already loading, return the existing promise
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Create a new loading promise
        this.loadPromise = (async () => {
            Logger.info("AssetLoader: Starting asset loading...");
            this.isLoadingComplete = false;
            this.loadedTemplates = {};
            this.loadedAnimations = {};
            this.loadingPromises = {};

            // Load textures first
            try {
                await this.loadTextures();
                Logger.debug("AssetLoader: Textures loaded successfully.");
            } catch (error) {
                Logger.error("AssetLoader: Error loading textures:", error);
                // Continue loading models even if textures fail
            }

            const buildingTypes = Object.keys(BUILDINGS);
            const allLoadPromises = [];

            for (const type of buildingTypes) {
                const buildingData = BUILDINGS[type];
                const assetInfo = buildingData.assets;
                
                // Skip buildings that don't have assets defined (models not yet implemented)
                if (!assetInfo) {
                    Logger.debug(`AssetLoader: Skipping ${type} - no assets defined (model not yet implemented)`);
                    continue;
                }
                
                // Load all levels for each building
                for (const [level, levelInfo] of Object.entries(assetInfo.levels)) {
                    const modelKey = `${type}_LVL${level}`;
                    const loadPromise = this.loadGLTFModel(modelKey, levelInfo.url)
                        .then(result => {
                            if (result && result.template) {
                                this.loadedTemplates[modelKey] = result.template;
                                this.loadedAnimations[modelKey] = result.animations;
                                Logger.debug(`AssetLoader: Successfully loaded and stored template for ${modelKey}`);
                            } else {
                                this.loadedTemplates[modelKey] = null;
                                this.loadedAnimations[modelKey] = [];
                                Logger.warn(`AssetLoader: Failed to load model for ${modelKey}, storing null.`);
                            }
                        })
                        .catch(error => {
                            Logger.error(`AssetLoader: Error in loadAssets for ${modelKey}:`, error);
                            this.loadedTemplates[modelKey] = null;
                            this.loadedAnimations[modelKey] = [];
                        });

                    this.loadingPromises[modelKey] = loadPromise;
                    allLoadPromises.push(loadPromise);
                }
            }

            try {
                await Promise.all(allLoadPromises);
                Logger.info("AssetLoader: All asset loading processes finished.");
                this.isLoadingComplete = true;
                Logger.debug("AssetLoader: isLoadingComplete set to true.");
            } catch (error) {
                Logger.error("AssetLoader: An unexpected error occurred during Promise.all:", error);
                throw error;
            }
        })();

        return this.loadPromise;
    }

    async loadTextures() {
        const texturePromises = [];
        
        for (const [key, path] of Object.entries(textureMap)) {
            const promise = new Promise((resolve, reject) => {
                this.textureLoader.load(
                    path,
                    texture => {
                        // Configure texture settings
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.needsUpdate = true;
                        this.textures[key] = texture;
                        Logger.debug(`AssetLoader: Successfully loaded texture ${key}`);
                        resolve(texture);
                    },
                    undefined,
                    error => {
                        Logger.warn(`AssetLoader: Could not load texture ${key} from ${path}. Using fallback material.`);
                        this.textures[key] = null;
                        resolve(null);
                    }
                );
            });
            texturePromises.push(promise);
        }
        
        return Promise.all(texturePromises);
    }

    async loadGLTFModel(typeKey, modelUrl) {
        Logger.debug(`AssetLoader [${typeKey}]: Loading GLTF from ${modelUrl}...`);
        try {
            const gltf = await this.gltfLoader.loadAsync(modelUrl, 
                // Progress callback
                (xhr) => {
                    Logger.debug(`AssetLoader [${typeKey}]: Loading progress: ${(xhr.loaded / xhr.total * 100)}%`);
                },
                // Error callback
                (error) => {
                    Logger.error(`AssetLoader [${typeKey}]: GLTFLoader error:`, error);
                }
            );

            if (!gltf || !gltf.scene) {
                Logger.error(`AssetLoader [${typeKey}]: Invalid GLTF data received`);
                return null;
            }

            const template = gltf.scene;
            const animations = gltf.animations || [];
            
            Logger.debug(`AssetLoader [${typeKey}]: Found ${animations.length} animations`);
            if (animations.length > 0) {
                animations.forEach((anim, index) => {
                    Logger.debug(`AssetLoader [${typeKey}]: Animation ${index}: ${anim.name}`);
                });
            }
            
            // Apply textures and material properties
            template.traverse((child) => {
                if (child.isMesh) {
                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Clone the material to prevent sharing across instances
                    child.material = child.material.clone();
                    
                    // Log original material properties
                    Logger.debug(`AssetLoader [${typeKey}]: Original material properties:`, {
                        type: child.material.type,
                        color: child.material.color.getHexString(),
                        map: !!child.material.map,
                        metalness: child.material.metalness,
                        roughness: child.material.roughness
                    });
                    
                    // Only apply textures if they're not already present
                    if (!child.material.map && this.textures.color) {
                        child.material.map = this.textures.color.clone();
                        child.material.map.colorSpace = THREE.SRGBColorSpace;
                        child.material.map.needsUpdate = true;
                    }
                    
                    if (!child.material.metalnessMap && this.textures.metal) {
                        child.material.metalnessMap = this.textures.metal.clone();
                        child.material.metalnessMap.colorSpace = THREE.SRGBColorSpace;
                        child.material.metalnessMap.needsUpdate = true;
                    }
                    
                    if (!child.material.roughnessMap && this.textures.rough) {
                        child.material.roughnessMap = this.textures.rough.clone();
                        child.material.roughnessMap.colorSpace = THREE.SRGBColorSpace;
                        child.material.roughnessMap.needsUpdate = true;
                    }
                    
                    // Ensure material needs update
                    child.material.needsUpdate = true;

                    // Log final material properties
                    Logger.debug(`AssetLoader [${typeKey}]: Final material properties:`, {
                        type: child.material.type,
                        color: child.material.color.getHexString(),
                        map: !!child.material.map,
                        metalness: child.material.metalness,
                        roughness: child.material.roughness,
                        mapColorSpace: child.material.map?.colorSpace,
                        metalnessMapColorSpace: child.material.metalnessMap?.colorSpace,
                        roughnessMapColorSpace: child.material.roughnessMap?.colorSpace
                    });
                }
                
                // Handle skinned meshes
                if (child.isSkinnedMesh) {
                    Logger.debug(`AssetLoader [${typeKey}]: Found skinned mesh: ${child.name}`);
                    
                    // Ensure skinned mesh is properly configured
                    child.frustumCulled = false;
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    child.material.needsUpdate = true;
                    
                    // Update the skeleton
                    if (child.skeleton) {
                        child.skeleton.update();
                        Logger.debug(`AssetLoader [${typeKey}]: Updated skeleton for ${child.name} with ${child.skeleton.bones.length} bones`);
                    }
                }
            });

            Logger.debug(`AssetLoader [${typeKey}]: Model loading complete.`);
            return { template, animations };

        } catch (error) {
            Logger.error(`AssetLoader: Error loading ${typeKey} from ${modelUrl}:`, error);
            return null;
        }
    }

    getTemplate(typeKey) {
        return this.loadedTemplates[typeKey] || null;
    }

    getAnimations(typeKey) {
        return this.loadedAnimations[typeKey] || [];
    }

    // Production-ready building spawning with SkeletonUtils.clone
    spawnBuilding(typeKey, position, options = {}) {
        const template = this.getTemplate(typeKey);
        const animations = this.getAnimations(typeKey);
        
        if (!template) {
            Logger.error('No template found:', typeKey);
            return null;
        }

        Logger.debug('🔍 Spawning building with SkeletonUtils.clone:', typeKey);
        
        try {
            // Use SkeletonUtils.clone for proper deep-cloning of skeleton/bones
            const building = SkeletonUtils.clone(template);
            building.name = `${typeKey}_${Date.now()}`;
            building.position.copy(position);
            building.castShadow = true;
            building.receiveShadow = true;

            // Apply options
            if (options.scale) {
                building.scale.setScalar(options.scale);
            }
            if (options.rotation) {
                building.rotation.copy(options.rotation);
            }

            // Configure skinned meshes
            building.traverse((o) => {
                if (o.isSkinnedMesh) {
                    o.frustumCulled = false;  // avoids bounding-box pop on animated poses
                    o.castShadow = o.receiveShadow = true;
                    Logger.debug('✅ Configured skinned mesh:', o.name);
                }
            });

            // Create animation mixer for this instance
            const mixer = new THREE.AnimationMixer(building);
            
            // Set up animation actions
            const actions = [];
            animations.forEach((anim, index) => {
                const action = mixer.clipAction(anim);
                actions.push(action);
                Logger.debug(`Created animation action: ${anim.name}`);
            });

            // Start the first animation if autoPlay is enabled
            if (actions.length > 0 && options.autoPlay !== false) {
                actions[0].play();
                Logger.debug(`Started animation: ${animations[0].name}`);
            }

            Logger.debug('✅ Building spawned successfully with SkeletonUtils.clone');
            return { building, mixer, actions };
        } catch (error) {
            Logger.error('Error spawning building:', error);
            return null;
        }
    }

    // Legacy method for backward compatibility
    getModel(typeKey) {
        const template = this.getTemplate(typeKey);
        if (!template) {
            Logger.warn(`AssetLoader: Template for ${typeKey} not found or failed to load.`);
            return null;
        }
        // Use SkeletonUtils.clone for proper skinned mesh handling
        return SkeletonUtils.clone(template);
    }

    async waitForLoad() {
        if (!this.loadPromise) {
            Logger.warn("AssetLoader: waitForLoad called but no assets are loading.");
            return;
        }

        try {
            await this.loadPromise;
        } catch (error) {
            Logger.error("AssetLoader: Error waiting for assets to load:", error);
            throw error; // Re-throw to handle it in the calling code
        }
    }

    // Get loading status
    getLoadingStatus() {
        return {
            loaded: Object.keys(this.loadedTemplates),
            loading: Object.keys(this.loadingPromises),
            total: Object.keys(this.loadedTemplates).length + Object.keys(this.loadingPromises).length
        };
    }
}