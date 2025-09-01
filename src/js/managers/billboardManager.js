import * as THREE from 'three';
import Logger from '../utils/logger.js';

export class BillboardManager {
    constructor(scene) {
        this.scene = scene;
        this.billboards = new Map();
        this.textureLoader = new THREE.TextureLoader();
    }

    /**
     * Creates a billboard at the exact position from Blender
     * @param {Object} config - Billboard configuration
     * @param {string} config.name - Unique name for the billboard
     * @param {string} config.imagePath - Path to the image file
     * @param {Object} config.position - Position from Blender {x, y, z}
     * @param {Object} config.rotation - Rotation from Blender {x, y, z} in radians
     * @param {Object} config.scale - Scale from Blender {x, y, z}
     * @param {number} config.size - Size of the billboard (default: 1)
     * @param {boolean} config.alwaysFaceCamera - Whether to always face camera (default: true)
     * @param {boolean} config.castShadow - Whether to cast shadows (default: false)
     * @param {boolean} config.receiveShadow - Whether to receive shadows (default: false)
     * @param {boolean} config.blur - Whether to apply blur effect for distant objects (default: false)
     * @returns {Promise<THREE.Sprite|THREE.Mesh>} The created billboard
     */
    async createBillboard(config) {
        try {
            Logger.info('BillboardManager: Creating billboard:', config.name);
            
            // Load the texture
            let texture = await this.loadTexture(config.imagePath);
            
            // Apply blur effect for distant mountains if requested
            if (config.blur && texture.image) {
                // Create a canvas to apply blur
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = texture.image.width;
                canvas.height = texture.image.height;
                
                // Apply blur effect using canvas filters - reduced from 2px to 1px for subtle effect
                ctx.filter = 'blur(1px)'; // More subtle blur (was 2px)
                ctx.drawImage(texture.image, 0, 0);
                
                // Create new texture from blurred canvas
                const blurredTexture = new THREE.CanvasTexture(canvas);
                blurredTexture.colorSpace = THREE.SRGBColorSpace;
                texture = blurredTexture;
                
                Logger.info('BillboardManager: Applied subtle blur effect to mountain texture');
            }
            
            let billboard;
            
            if (config.alwaysFaceCamera !== false) {
                // Create a sprite that always faces the camera
                const spriteMaterial = new THREE.SpriteMaterial({ 
                    map: texture,
                    transparent: true,
                    alphaTest: 0.5
                });
                
                billboard = new THREE.Sprite(spriteMaterial);
                
                // Set size - maintain aspect ratio for sprites
                const size = config.size || 1;
                if (texture.image) {
                    const aspectRatio = texture.image.width / texture.image.height;
                    billboard.scale.set(size * aspectRatio, size, size);
                } else {
                    billboard.scale.set(size, size, size);
                }
                
            } else {
                // Create a plane that can be rotated but doesn't face camera
                // Use the image's natural aspect ratio for the plane geometry
                let geometry;
                if (texture.image) {
                    const aspectRatio = texture.image.width / texture.image.height;
                    geometry = new THREE.PlaneGeometry(aspectRatio, 1);
                } else {
                    geometry = new THREE.PlaneGeometry(1, 1);
                }
                
                const material = new THREE.MeshBasicMaterial({ 
                    map: texture,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide
                });
                
                billboard = new THREE.Mesh(geometry, material);
                
                // Set size - maintain aspect ratio for planes
                const size = config.size || 1;
                billboard.scale.set(size, size, size);
            }
            
            // Apply exact Blender positioning
            billboard.position.set(
                config.position.x || 0,
                config.position.y || 0,
                config.position.z || 0
            );
            
            // Apply exact Blender rotation (convert to radians if needed)
            const rotation = {
                x: typeof config.rotation?.x === 'number' ? config.rotation.x : 0,
                y: typeof config.rotation?.y === 'number' ? config.rotation.y : 0,
                z: typeof config.rotation?.z === 'number' ? config.rotation.z : 0
            };
            
            billboard.rotation.set(rotation.x, rotation.y, rotation.z);
            
            // Apply exact Blender scale
            if (config.scale) {
                billboard.scale.multiply(new THREE.Vector3(
                    config.scale.x || 1,
                    config.scale.y || 1,
                    config.scale.z || 1
                ));
            }
            
            // Set shadow properties
            billboard.castShadow = config.castShadow || false;
            billboard.receiveShadow = config.receiveShadow || false;
            
            // Store metadata
            billboard.userData = {
                isBillboard: true,
                name: config.name,
                imagePath: config.imagePath,
                originalConfig: config,
                isBlurred: config.blur || false
            };
            
            // Add to scene
            this.scene.add(billboard);
            
            // Store reference
            this.billboards.set(config.name, billboard);
            
            Logger.info('BillboardManager: Billboard created successfully:', {
                name: config.name,
                position: billboard.position,
                rotation: {
                    x: (billboard.rotation.x * 180 / Math.PI).toFixed(2) + '°',
                    y: (billboard.rotation.y * 180 / Math.PI).toFixed(2) + '°',
                    z: (billboard.rotation.z * 180 / Math.PI).toFixed(2) + '°'
                },
                scale: billboard.scale,
                aspectRatio: texture.image ? (texture.image.width / texture.image.height).toFixed(2) : 'unknown',
                blurApplied: config.blur || false
            });
            
            return billboard;
            
        } catch (error) {
            Logger.error('BillboardManager: Error creating billboard:', error);
            throw error;
        }
    }

    /**
     * Loads a texture with error handling
     * @param {string} imagePath - Path to the image
     * @returns {Promise<THREE.Texture>} The loaded texture
     */
    loadTexture(imagePath) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                imagePath,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    resolve(texture);
                },
                undefined,
                (error) => {
                    Logger.error('BillboardManager: Error loading texture:', error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Creates multiple billboards from a configuration array
     * @param {Array} billboardConfigs - Array of billboard configurations
     * @returns {Promise<Array>} Array of created billboards
     */
    async createBillboards(billboardConfigs) {
        const billboards = [];
        
        for (const config of billboardConfigs) {
            try {
                const billboard = await this.createBillboard(config);
                billboards.push(billboard);
            } catch (error) {
                Logger.error('BillboardManager: Error creating billboard from config:', config, error);
            }
        }
        
        return billboards;
    }

    /**
     * Updates billboard to always face camera (for non-sprite billboards)
     * @param {THREE.Camera} camera - The camera to face
     */
    updateBillboardsToFaceCamera(camera) {
        this.billboards.forEach((billboard, name) => {
            if (billboard.userData.originalConfig?.alwaysFaceCamera === false) {
                // For non-sprite billboards, make them face the camera
                billboard.lookAt(camera.position);
            }
        });
    }

    /**
     * Gets a billboard by name
     * @param {string} name - The billboard name
     * @returns {THREE.Sprite|THREE.Mesh|null} The billboard or null if not found
     */
    getBillboard(name) {
        return this.billboards.get(name) || null;
    }

    /**
     * Removes a billboard by name
     * @param {string} name - The billboard name
     */
    removeBillboard(name) {
        const billboard = this.billboards.get(name);
        if (billboard) {
            this.scene.remove(billboard);
            this.billboards.delete(name);
            
            // Dispose of resources
            if (billboard.material) {
                billboard.material.dispose();
            }
            if (billboard.geometry) {
                billboard.geometry.dispose();
            }
            
            Logger.info('BillboardManager: Removed billboard:', name);
        }
    }

    /**
     * Removes all billboards
     */
    removeAllBillboards() {
        this.billboards.forEach((billboard, name) => {
            this.removeBillboard(name);
        });
    }

    /**
     * Updates billboard properties
     * @param {string} name - The billboard name
     * @param {Object} updates - Properties to update
     */
    updateBillboard(name, updates) {
        const billboard = this.billboards.get(name);
        if (!billboard) {
            Logger.warn('BillboardManager: Billboard not found for update:', name);
            return;
        }

        if (updates.position) {
            billboard.position.set(
                updates.position.x ?? billboard.position.x,
                updates.position.y ?? billboard.position.y,
                updates.position.z ?? billboard.position.z
            );
        }

        if (updates.rotation) {
            billboard.rotation.set(
                updates.rotation.x ?? billboard.rotation.x,
                updates.rotation.y ?? billboard.rotation.y,
                updates.rotation.z ?? billboard.rotation.z
            );
        }

        if (updates.scale) {
            billboard.scale.set(
                updates.scale.x ?? billboard.scale.x,
                updates.scale.y ?? billboard.scale.y,
                updates.scale.z ?? billboard.scale.z
            );
        }

        if (updates.visible !== undefined) {
            billboard.visible = updates.visible;
        }

        Logger.info('BillboardManager: Updated billboard:', name, updates);
    }

    /**
     * Disposes of all resources
     */
    dispose() {
        this.removeAllBillboards();
        this.textureLoader = null;
        this.scene = null;
    }
}