import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Create a singleton GLTFLoader with DRACOLoader configured
let configuredLoader = null;

export function getConfiguredGLTFLoader() {
    if (!configuredLoader) {
        // Configure DRACOLoader for compressed GLB files
        const dracoLoader = new DRACOLoader();
        // Use CDN for Draco decoder, with fallback to local if needed
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setWorkerLimit(1); // Limit concurrent workers for better performance
        
        configuredLoader = new GLTFLoader();
        configuredLoader.setDRACOLoader(dracoLoader);
    }
    
    return configuredLoader;
}

// Export a default instance for convenience
export const gltfLoader = getConfiguredGLTFLoader();
