import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import JSZip from 'https://esm.sh/jszip@3.10.1';

// Asset mapping using the URLs provided in the environment
const assetMap = {
    // Assuming the env variable names map directly to BUILDING_TYPES keys
    HOUSE: { url: '/src/assets/Home.zip' }, // Updated URL from env
    SHOP: { url: '/src/assets/Shop.zip' },
    POWER_PLANT: { url: '/src/assets/PowerPlant.zip' },
    WATER_TOWER: { url: '/src/assets/WaterPump.zip' } // Double-check this URL matches the WaterPump asset
};

export class AssetLoader {
    constructor() {
        this.fbxLoader = new FBXLoader();
        this.textureLoader = new TextureLoader();
        // REMOVED: this.jszip = new JSZip(); // DO NOT create a shared instance here
        this.loadedModels = {}; // Store loaded THREE.Group/Object3D keyed by type
        this.isLoadingComplete = false;
        this.loadingPromises = {}; // Store promises for individual loads
    }

    // Method to start loading all assets defined in assetMap
    async loadAssets() {
        console.log("AssetLoader: Starting asset loading...");
        this.isLoadingComplete = false;
        this.loadedModels = {}; // Clear previously loaded models on new load attempt
        this.loadingPromises = {}; // Reset promises

        const buildingTypes = Object.keys(assetMap);
        const allLoadPromises = [];

        for (const type of buildingTypes) {
            const assetInfo = assetMap[type];
            // Start loading but don't await here, store the promise
            const loadPromise = this.loadZippedModel(type, assetInfo.url)
                .then(model => {
                    if (model) {
                        this.loadedModels[type] = model;
                        console.log(`AssetLoader: Successfully loaded and stored model for ${type}`);
                    } else {
                         this.loadedModels[type] = null; // Explicitly mark as failed
                        console.warn(`AssetLoader: Failed to load model for ${type}, storing null.`);
                    }
                })
                .catch(error => {
                    console.error(`AssetLoader: Error in loadAssets for ${type}:`, error);
                    this.loadedModels[type] = null; // Ensure null is stored on error
                });

            this.loadingPromises[type] = loadPromise; // Store promise by type
            allLoadPromises.push(loadPromise); // Add to list for Promise.all
        }

        // Wait for all loading operations to settle (resolve or reject)
        try {
            await Promise.all(allLoadPromises);
            console.log("AssetLoader: All asset loading processes finished.");
        } catch (error) {
            // Although individual errors are caught above, Promise.all might still reject
            // This catch is less likely to be hit due to individual catches, but good for safety.
            console.error("AssetLoader: An unexpected error occurred during Promise.all:", error);
        } finally {
            this.isLoadingComplete = true; // Mark loading as complete regardless of individual failures
            console.log("AssetLoader: isLoadingComplete set to true.");
        }
    }

    // Method to load a single model and texture from a zip file
    async loadZippedModel(typeKey, zipUrl) {
        console.log(`AssetLoader [${typeKey}]: Fetching zip from ${zipUrl}...`);
        try {
            const response = await fetch(zipUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for ${zipUrl}`);
            }
            const zipBlob = await response.blob();
            // Create a NEW JSZip instance for THIS specific load operation
            const zip = await new JSZip().loadAsync(zipBlob);
            console.log(`AssetLoader [${typeKey}]: Zip loaded. Files found:`, Object.keys(zip.files)); // Log files in zip
            // --- Find and Load FBX Model ---
            let modelFile = zip.file("model.fbx"); // Case-sensitive! Use 'let' to allow reassignment.
            if (!modelFile) {
                // Attempt to find case-insensitive variations if standard name fails
                 const fbxFileKey = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.fbx'));
                 if (fbxFileKey) {
                     console.warn(`AssetLoader [${typeKey}]: Found FBX as '${fbxFileKey}'. Using that.`);
                     modelFile = zip.file(fbxFileKey);
                 } else {
                    throw new Error(`'model.fbx' (or any .fbx file) not found in zip for ${typeKey}. Files: ${Object.keys(zip.files)}`);
                 }
            }
            console.log(`AssetLoader [${typeKey}]: Found FBX file. Loading data...`);
            const modelData = await modelFile.async('arraybuffer');

            // --- Find and Load Texture ---
            // --- Find and Load Texture ---
            let textureFile = zip.file("texture.png"); // Case-sensitive!
            let texture = null;
            let textureUrl = null; // To revoke later
            if (!textureFile) {
                // Attempt case-insensitive search for texture
                const pngFileKey = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('.png'));
                if (pngFileKey) {
                    console.warn(`AssetLoader [${typeKey}]: Found texture as '${pngFileKey}'. Using that.`);
                    textureFile = zip.file(pngFileKey);
                }
             }
            if (textureFile) {
                console.log(`AssetLoader [${typeKey}]: Found texture file. Loading data...`);
                try {
                    const textureData = await textureFile.async('blob');
                    textureUrl = URL.createObjectURL(textureData);
                    texture = await this.textureLoader.loadAsync(textureUrl);
                    texture.encoding = THREE.sRGBEncoding; // Correct color space
                    texture.needsUpdate = true;
                    console.log(`AssetLoader [${typeKey}]: Texture loaded successfully.`);
                } catch (texError) {
                    console.error(`AssetLoader [${typeKey}]: Error loading 'texture.png':`, texError);
                    if (textureUrl) URL.revokeObjectURL(textureUrl); // Clean up URL if texture load failed
                    texture = null; // Ensure texture is null if loading fails
                    textureUrl = null;
                }
            } else {
                console.warn(`AssetLoader [${typeKey}]: 'texture.png' not found in zip.`);
            }

            // --- Parse FBX Model ---
            console.log(`AssetLoader [${typeKey}]: Parsing 'model.fbx'...`);
            let loadedModel = null;
            // Removed redundant outer try here
            // Separate try/catch specifically for the parse call
            console.log(`AssetLoader [${typeKey}]: --- Preparing to parse FBX data ---`);
            try {
                 loadedModel = this.fbxLoader.parse(modelData, '');
                 console.log(`AssetLoader [${typeKey}]: --- FBXLoader.parse completed ---. Result:`, loadedModel ? 'Model Object' : 'Null/Undefined');
            } catch (parseError) {
                 console.error(`AssetLoader [${typeKey}]: !!! CRITICAL ERROR during FBXLoader.parse call:`, parseError);
                 loadedModel = null; // Ensure loadedModel is null if parse fails
                 if (textureUrl) URL.revokeObjectURL(textureUrl); // Clean up texture URL if parsing fails here
                 // We will still throw error later if needed, but log this specific failure first.
            }
            // --- Detailed Log - Moved slightly lower ---
            if (loadedModel) {
                 console.log(`AssetLoader [${typeKey}]: Post-parse check. Model Name: ${loadedModel.name}, Children Count: ${loadedModel.children?.length}`);
                 // You could add more details here if needed
             } else {
                  console.error(`AssetLoader [${typeKey}]: Model is null/undefined after parse attempt.`);
                  // Optionally throw error here if a null model is unacceptable
                  // throw new Error(`Failed to parse model for ${typeKey}`);
                  // Currently, the outer catch will handle re-throwing if necessary
             }
             // --- End Detailed Log ---
            // This outer catch was primarily for fetch/zip errors, parse errors are now logged above.
            // We might still want to catch other potential errors between parse and return.
             // No, let's remove the outer try-catch that was wrapping the parse logic,
             // as the specific parse try-catch is now handling that part.
             // The main function try-catch handles fetch/zip errors.
             // --- Apply Texture ---
            if (loadedModel && texture) {
                 console.log(`AssetLoader [${typeKey}]: Applying texture to model materials...`);
                loadedModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const applyTexture = (mat) => {
                            if (mat.map === null) { // Only apply if no texture map exists yet
                                mat.map = texture;
                                mat.needsUpdate = true;
                            }
                        };
                        if (Array.isArray(child.material)) {
                            child.material.forEach(applyTexture);
                        } else {
                            applyTexture(child.material);
                        }
                    }
                });
                console.log(`AssetLoader [${typeKey}]: Texture application finished.`);
            } else if (loadedModel) {
                console.warn(`AssetLoader [${typeKey}]: No texture applied (not found or failed to load).`);
            }

            // Clean up the blob URL *after* the texture is successfully used or parsing fails
             if (textureUrl) {
                 // Delay revocation slightly to ensure Three.js has finished with it, though loadAsync should handle this.
                 // No bulletproof way without complex tracking, but usually safe after parsing+traverse.
                 setTimeout(() => URL.revokeObjectURL(textureUrl), 100);
             }

            console.log(`AssetLoader [${typeKey}]: Model processing complete. Returning model.`);
            return loadedModel; // Return the THREE.Group/Object3D

        } catch (error) {
            console.error(`AssetLoader: !!! Error processing ${typeKey} from ${zipUrl}:`, error);
            // Do not re-throw here, let the caller handle it based on the promise rejection
            return null; // Explicitly return null on failure within this function
        }
    }


    // Method to get a clone of a loaded model
    getModel(typeKey) {
        console.log(`AssetLoader: getModel - Called with typeKey: ${typeKey}`); // Log typeKey received
        if (!this.isLoadingComplete) {
             console.warn(`AssetLoader: Attempted to getModel(${typeKey}) before loading was complete.`);
             // Optionally, you could return a promise here that resolves when loading is done
             // For simplicity now, just return null. Caller needs to handle timing.
            return null;
        }

        const originalModel = this.loadedModels[typeKey];

        if (originalModel) {
            console.log(`AssetLoader: Cloning model for ${typeKey}. Original UUID: ${originalModel.uuid}`);
            // Use standard clone. Consider SkeletonUtils if complex animations/skinning are needed.
            const clonedModel = originalModel.clone();
            console.log(`AssetLoader: Clone created. Clone UUID: ${clonedModel.uuid}`);
            return clonedModel;
        } else {
            console.warn(`AssetLoader: Model for type ${typeKey} not found or failed to load.`);
            return null;
        }
    }

    // Optional: Method to wait for loading to complete if needed elsewhere
    async waitForLoad() {
         if (this.isLoadingComplete) {
            return Promise.resolve();
        }
        // Wait for all promises stored during loadAssets to settle
        const allPromises = Object.values(this.loadingPromises);
        return Promise.allSettled(allPromises).then(() => {
            console.log("AssetLoader: waitForLoad completed.");
            // The isLoadingComplete flag is set in loadAssets' finally block
        });
    }
}