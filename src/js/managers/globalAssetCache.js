import * as THREE from 'three';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BUILDINGS } from '../utils/constants.js';
import Logger from '../utils/logger.js';
import { getConfiguredGLTFLoader } from '../utils/gltfLoader.js';

// Global asset cache - singleton pattern
class GlobalAssetCache {
    constructor() {
        if (GlobalAssetCache.instance) {
            return GlobalAssetCache.instance;
        }
        
        // Use centralized GLTFLoader with DRACOLoader configured
        this.gltfLoader = getConfiguredGLTFLoader();
        this.textureLoader = new TextureLoader();
        
        // Global caches
        this.loadedTemplates = {}; // Store original templates
        this.loadedAnimations = {}; // Store animations
        this.textures = {}; // Store textures
        this.isLoadingComplete = false;
        this.loadingPromises = {};
        this.loadPromise = null;
        
        // Progress tracking
        this.progressCallbacks = [];
        this.totalAssets = 0;
        this.loadedAssets = 0;
        
        GlobalAssetCache.instance = this;
        Logger.info('GlobalAssetCache: Initialized');
    }
    
    // Add progress callback
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }
    
    updateProgress(loaded, total, status = '') {
        const progress = total > 0 ? (loaded / total) * 100 : 0;
        this.progressCallbacks.forEach(callback => callback(progress, loaded, total, status));
    }
    
    // Check if assets are already loaded
    isAssetsLoaded() {
        return this.isLoadingComplete;
    }
    
    // Get cached template
    getTemplate(typeKey) {
        return this.loadedTemplates[typeKey] || null;
    }
    
    // Get cached animations
    getAnimations(typeKey) {
        return this.loadedAnimations[typeKey] || [];
    }
    
    // Get cached texture
    getTexture(textureKey) {
        return this.textures[textureKey] || null;
    }
    
    // Load assets only if not already loaded
    async loadAssets() {
        // If already loaded, show instant completion
        if (this.isLoadingComplete) {
            Logger.info('GlobalAssetCache: Assets already loaded, using cache...');
            // Show instant completion for cached assets
            this.updateProgress(100, 100, 'Assets loaded from cache');
            return Promise.resolve();
        }
        
        // If already loading, return the existing promise
        if (this.loadPromise) {
            Logger.info('GlobalAssetCache: Assets already loading, waiting...');
            return this.loadPromise;
        }
        
        // Create a new loading promise
        this.loadPromise = (async () => {
            Logger.info("GlobalAssetCache: Starting asset loading...");
            this.isLoadingComplete = false;
            this.loadedAssets = 0;
            
            // Count total assets first
            const buildingTypes = Object.keys(BUILDINGS);
            let totalAssets = 0;
            
            for (const type of buildingTypes) {
                const buildingData = BUILDINGS[type];
                const assetInfo = buildingData.assets;
                
                if (assetInfo) {
                    totalAssets += Object.keys(assetInfo.levels).length;
                }
            }
            
            this.totalAssets = totalAssets;
            this.updateProgress(0, totalAssets, 'Loading textures...');
            
            // Load textures first
            try {
                await this.loadTextures();
                Logger.debug("GlobalAssetCache: Textures loaded successfully.");
            } catch (error) {
                Logger.error("GlobalAssetCache: Error loading textures:", error);
                // Continue loading models even if textures fail
            }
            
            this.updateProgress(0, totalAssets, 'Loading 3D models...');
            const allLoadPromises = [];
            
            for (const type of buildingTypes) {
                const buildingData = BUILDINGS[type];
                const assetInfo = buildingData.assets;
                
                // Skip buildings that don't have assets defined
                if (!assetInfo) {
                    Logger.debug(`GlobalAssetCache: Skipping ${type} - no assets defined`);
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
                                Logger.debug(`GlobalAssetCache: Successfully loaded and cached template for ${modelKey}`);
                            } else {
                                this.loadedTemplates[modelKey] = null;
                                this.loadedAnimations[modelKey] = [];
                                Logger.warn(`GlobalAssetCache: Failed to load model for ${modelKey}, storing null.`);
                            }
                            
                            this.loadedAssets++;
                            this.updateProgress(this.loadedAssets, totalAssets, `Loading ${modelKey}...`);
                        })
                        .catch(error => {
                            Logger.error(`GlobalAssetCache: Error loading ${modelKey}:`, error);
                            this.loadedTemplates[modelKey] = null;
                            this.loadedAnimations[modelKey] = [];
                            
                            this.loadedAssets++;
                            this.updateProgress(this.loadedAssets, totalAssets, `Failed to load ${modelKey}`);
                        });
                    
                    this.loadingPromises[modelKey] = loadPromise;
                    allLoadPromises.push(loadPromise);
                }
            }
            
            try {
                await Promise.all(allLoadPromises);
                this.updateProgress(totalAssets, totalAssets, 'Loading complete!');
                Logger.info("GlobalAssetCache: All asset loading processes finished.");
                this.isLoadingComplete = true;
                Logger.debug("GlobalAssetCache: isLoadingComplete set to true.");
            } catch (error) {
                Logger.error("GlobalAssetCache: An unexpected error occurred during Promise.all:", error);
                throw error;
            }
        })();
        
        return this.loadPromise;
    }
    
    async loadTextures() {
        const textureMap = {
            color: 'assets/rts_texture/proto_human_RTS_color.png',
            emission: 'assets/rts_texture/proto_human_RTS_emission.png',
            metal: 'assets/rts_texture/proto_human_RTS_metal.png',
            rough: 'assets/rts_texture/proto_human_RTS_rough.png'
        };
        
        const texturePromises = Object.entries(textureMap).map(async ([key, path]) => {
            try {
                const texture = await new Promise((resolve, reject) => {
                    this.textureLoader.load(path, resolve, undefined, reject);
                });
                
                texture.colorSpace = THREE.SRGBColorSpace;
                this.textures[key] = texture;
                Logger.debug(`GlobalAssetCache: Loaded texture: ${key}`);
            } catch (error) {
                Logger.error(`GlobalAssetCache: Failed to load texture ${key}:`, error);
                this.textures[key] = null;
            }
        });
        
        await Promise.all(texturePromises);
    }
    
    async loadGLTFModel(modelKey, url) {
        try {
            const gltf = await new Promise((resolve, reject) => {
                this.gltfLoader.load(url, resolve, undefined, reject);
            });
            
            const template = gltf.scene;
            const animations = gltf.animations || [];
            
            // Configure the template
            template.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.isSkinnedMesh) {
                    child.frustumCulled = false;
                }
            });
            
            return { template, animations };
        } catch (error) {
            Logger.error(`GlobalAssetCache: Failed to load GLTF model ${modelKey}:`, error);
            return { template: null, animations: [] };
        }
    }
    
    // Production-ready building spawning with SkeletonUtils.clone
    spawnBuilding(typeKey, position, options = {}) {
        const template = this.getTemplate(typeKey);
        
        if (!template) {
            Logger.error('GlobalAssetCache: No template found:', typeKey);
            return null;
        }
        
        Logger.debug('GlobalAssetCache: Spawning building with SkeletonUtils.clone:', typeKey);
        
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
                    o.frustumCulled = false;
                    o.castShadow = o.receiveShadow = true;
                    Logger.debug('GlobalAssetCache: Configured skinned mesh:', o.name);
                }
            });
            
            Logger.debug('GlobalAssetCache: Building spawned successfully with SkeletonUtils.clone');
            return building;
        } catch (error) {
            Logger.error('GlobalAssetCache: Error spawning building:', error);
            return null;
        }
    }
    
    // Get all loaded templates (for debugging)
    getAllTemplates() {
        return this.loadedTemplates;
    }
    
    // Get all loaded textures (for debugging)
    getAllTextures() {
        return this.textures;
    }
    
    // Clear cache (for testing)
    clearCache() {
        this.loadedTemplates = {};
        this.loadedAnimations = {};
        this.textures = {};
        this.isLoadingComplete = false;
        this.loadPromise = null;
        Logger.info('GlobalAssetCache: Cache cleared');
    }
}

// Export singleton instance
export const globalAssetCache = new GlobalAssetCache();
export default globalAssetCache;
