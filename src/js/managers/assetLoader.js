import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';

// Asset mapping using the URLs provided in the environment
const assetMap = {
    HOUSE: { url: 'assets/house.glb' },
    ALTAR: { url: 'assets/altar.glb' },
    MINE: { url: 'assets/mine.glb' },
    CITY_HALL: { url: 'assets/cityhall.glb' },
    SHOP: { url: 'assets/shop.glb' },
    WORKSHOP: { url: 'assets/workshop.glb' }
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
        this.loadPromise = null; // Add a single promise for the entire loading process
    }

    async loadAssets() {
        // If already loading, return the existing promise
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Create a new loading promise
        this.loadPromise = (async () => {
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
                this.isLoadingComplete = true;
                console.log("AssetLoader: isLoadingComplete set to true.");
            } catch (error) {
                console.error("AssetLoader: An unexpected error occurred during Promise.all:", error);
                throw error; // Re-throw to handle it in the calling code
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
                        console.log(`AssetLoader: Successfully loaded texture ${key}`);
                        resolve(texture);
                    },
                    undefined,
                    error => {
                        console.warn(`AssetLoader: Could not load texture ${key} from ${path}. Using fallback material.`);
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
                    
                    // Log original material properties
                    console.log(`AssetLoader [${typeKey}]: Original material properties:`, {
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
                    console.log(`AssetLoader [${typeKey}]: Final material properties:`, {
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
        if (!this.loadPromise) {
            console.warn("AssetLoader: waitForLoad called but no assets are loading.");
            return;
        }

        try {
            await this.loadPromise;
        } catch (error) {
            console.error("AssetLoader: Error waiting for assets to load:", error);
            throw error; // Re-throw to handle it in the calling code
        }
    }
}