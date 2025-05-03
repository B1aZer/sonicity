import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';

// Asset mapping using the URLs provided in the environment
const assetMap = {
    HOUSE: { url: '/src/assets/house.glb' },
    ALTAR: { url: '/src/assets/altar.glb' },
    MINE: { url: '/src/assets/mine.glb' },
    CITY_HALL: { url: '/src/assets/cityhall.glb' }
};

export class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new TextureLoader();
        this.loadedModels = {};
        this.isLoadingComplete = false;
        this.loadingPromises = {};
    }

    async loadAssets() {
        console.log("AssetLoader: Starting asset loading...");
        this.isLoadingComplete = false;
        this.loadedModels = {};
        this.loadingPromises = {};

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

    async loadGLTFModel(typeKey, modelUrl) {
        console.log(`AssetLoader [${typeKey}]: Loading GLTF from ${modelUrl}...`);
        try {
            const gltf = await this.gltfLoader.loadAsync(modelUrl);
            const model = gltf.scene;
            
            // Apply any necessary transformations or material updates here
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
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