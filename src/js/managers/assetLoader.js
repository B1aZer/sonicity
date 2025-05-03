import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';

// Asset mapping using the URLs provided in the environment
const assetMap = {
    HOUSE: { url: 'assets/house.glb' },
    ALTAR: { url: 'assets/altar.glb' },
    MINE: { url: 'assets/mine.glb' },
    CITY_HALL: { url: 'assets/cityhall.glb' }
};

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
        this.loadedModels = {};
        this.isLoadingComplete = false;
        this.loadingPromises = {};
        this.textures = {};
    }

    async loadAssets() {
        console.log("AssetLoader: Starting asset loading...");
        this.isLoadingComplete = false;
        this.loadedModels = {};
        this.loadingPromises = {};

        // Load textures first
        try {
            await this.loadTextures();
            console.log("AssetLoader: Textures loaded successfully.");
        } catch (error) {
            console.error("AssetLoader: Error loading textures:", error);
            // Continue loading models even if textures fail
        }

        const buildingTypes = Object.keys(assetMap);
        const allLoadPromises = [];

        for (const type of buildingTypes) {
            const assetInfo = assetMap[type];
            const loadPromise = this.loadGLTFModel(type, assetInfo.url)
                .then(model => {
                    if (model) {
                        this.loadedModels[type] = model;
                        console.log(`AssetLoader: Successfully loaded and stored model for ${type}`);
                    } else {
                        this.loadedModels[type] = null;
                        console.warn(`AssetLoader: Failed to load model for ${type}, storing null.`);
                    }
                })
                .catch(error => {
                    console.error(`AssetLoader: Error in loadAssets for ${type}:`, error);
                    this.loadedModels[type] = null;
                });

            this.loadingPromises[type] = loadPromise;
            allLoadPromises.push(loadPromise);
        }

        try {
            await Promise.all(allLoadPromises);
            console.log("AssetLoader: All asset loading processes finished.");
        } catch (error) {
            console.error("AssetLoader: An unexpected error occurred during Promise.all:", error);
        } finally {
            this.isLoadingComplete = true;
            console.log("AssetLoader: isLoadingComplete set to true.");
        }
    }

    async loadTextures() {
        const texturePromises = [];
        
        for (const [key, path] of Object.entries(textureMap)) {
            const promise = new Promise((resolve, reject) => {
                this.textureLoader.load(
                    path,
                    texture => {
                        this.textures[key] = texture;
                        console.log(`AssetLoader: Successfully loaded texture ${key}`);
                        resolve(texture);
                    },
                    undefined,
                    error => {
                        console.warn(`AssetLoader: Could not load texture ${key} from ${path}. Using fallback material.`);
                        // Instead of rejecting, resolve with null to allow the game to continue
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
        console.log(`AssetLoader [${typeKey}]: Loading GLTF from ${modelUrl}...`);
        try {
            const gltf = await this.gltfLoader.loadAsync(modelUrl, 
                // Progress callback
                (xhr) => {
                    console.log(`AssetLoader [${typeKey}]: Loading progress: ${(xhr.loaded / xhr.total * 100)}%`);
                },
                // Error callback
                (error) => {
                    console.error(`AssetLoader [${typeKey}]: GLTFLoader error:`, error);
                }
            );

            if (!gltf || !gltf.scene) {
                console.error(`AssetLoader [${typeKey}]: Invalid GLTF data received`);
                return null;
            }

            const model = gltf.scene;
            
            // Apply textures and material properties
            model.traverse((child) => {
                if (child.isMesh) {
                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Clone the material to prevent sharing across instances
                    child.material = child.material.clone();
                    
                    // Apply textures if available
                    if (this.textures.color) {
                        child.material.map = this.textures.color.clone();
                        child.material.map.needsUpdate = true;
                    }
                    
                    if (this.textures.emission) {
                        child.material.emissiveMap = this.textures.emission.clone();
                        child.material.emissive = new THREE.Color(0xffffff);
                        child.material.emissiveIntensity = 0.5;
                        child.material.emissiveMap.needsUpdate = true;
                    }
                    
                    if (this.textures.metal) {
                        child.material.metalnessMap = this.textures.metal.clone();
                        child.material.metalness = 0.7;
                        child.material.metalnessMap.needsUpdate = true;
                    }
                    
                    if (this.textures.rough) {
                        child.material.roughnessMap = this.textures.rough.clone();
                        child.material.roughness = 0.4;
                        child.material.roughnessMap.needsUpdate = true;
                    }
                    
                    // Set fallback material properties if textures failed to load
                    if (!this.textures.color) {
                        child.material.color = new THREE.Color(0x808080);
                    }
                    if (!this.textures.metal) {
                        child.material.metalness = 0.5;
                    }
                    if (!this.textures.rough) {
                        child.material.roughness = 0.6;
                    }
                    
                    // Ensure material parameters are suitable for PBR
                    child.material.envMapIntensity = 1.0;
                    child.material.needsUpdate = true;
                }
            });

            console.log(`AssetLoader [${typeKey}]: Model loading complete.`);
            return model;

        } catch (error) {
            console.error(`AssetLoader: Error loading ${typeKey} from ${modelUrl}:`, error);
            return null;
        }
    }

    getModel(typeKey) {
        if (!this.loadedModels[typeKey]) {
            console.warn(`AssetLoader: Model for ${typeKey} not found or failed to load.`);
            return null;
        }
        // Clone the model to allow multiple instances
        return this.loadedModels[typeKey].clone();
    }

    async waitForLoad() {
        if (this.isLoadingComplete) return;
        
        const promises = Object.values(this.loadingPromises);
        if (promises.length === 0) {
            console.warn("AssetLoader: waitForLoad called but no assets are loading.");
            return;
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            console.error("AssetLoader: Error waiting for assets to load:", error);
        }
    }
}