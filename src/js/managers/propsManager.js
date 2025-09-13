import * as THREE from 'three';
import { PROPS } from '../utils/constants.js';
import Logger from '../utils/logger.js';
import { getConfiguredGLTFLoader } from '../utils/gltfLoader.js';

export class PropsManager {
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.props = new Map(); // Track all placed props
        this.propModels = new Map(); // Cache loaded models
        this.loader = getConfiguredGLTFLoader();
        
        Logger.info('PropsManager initialized');
    }

    /**
     * Load all props defined in the PROPS configuration
     */
    async loadAllProps() {
        try {
            Logger.info('Loading all props...');
            
            // Load all prop types in parallel for better performance
            const loadPromises = Object.entries(PROPS).map(([propType, config]) => 
                this.loadPropType(propType, config)
            );
            
            await Promise.all(loadPromises);
            
            Logger.info(`✅ All props loaded successfully. Total props: ${this.props.size}`);
        } catch (error) {
            Logger.error('Error loading props:', error);
        }
    }

    /**
     * Load a specific prop type and place all its instances
     */
    async loadPropType(propType, config) {
        try {
            Logger.info(`Loading prop type: ${config.name} (${config.instances.length} instances)`);
            
            // Skip missing assets to avoid 404 errors and delays
            if (config.model === 'assets/rock.glb' || config.model === 'assets/bush.glb') {
                Logger.warn(`Skipping missing asset: ${config.model} (404 error)`);
                return;
            }
            
            // Load the model if not already cached
            let model = this.propModels.get(config.model);
            if (!model) {
                Logger.info(`Loading model: ${config.model}`);
                model = await this.loader.loadAsync(config.model);
                this.propModels.set(config.model, model);
            }
            
            // Place all instances of this prop type
            for (let i = 0; i < config.instances.length; i++) {
                const instance = config.instances[i];
                const prop = this.createPropInstance(model, propType, instance, i);
                
                if (prop) {
                    const propId = `${propType}_${i}`;
                    this.props.set(propId, prop);
                    this.scene.add(prop);
                }
            }
            
            Logger.info(`✅ Loaded ${config.instances.length} instances of ${propType}`);
        } catch (error) {
            Logger.error(`Error loading prop type ${propType}:`, error);
        }
    }

    /**
     * Create a single prop instance with the specified properties
     */
    createPropInstance(model, propType, instance, index) {
        try {
            // Clone the model
            const prop = model.scene.clone();
            
            // Set position using 3D coordinates from location object
            const location = instance.location || { x: 0, y: 0, z: 0 };
            prop.position.set(location.x, location.y, location.z);
            
            // Set rotation using 3D rotations from rotation object
            const rotation = instance.rotation || { x: 0, y: 0, z: 0 };
            prop.rotation.set(rotation.x, rotation.y, rotation.z);
            
            // Set scale using size Vector3 for independent x, y, z dimension control
            if (instance.size) {
                prop.scale.set(instance.size.x, instance.size.y, instance.size.z);
            }
            
            // Enable shadows
            prop.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Set name for debugging
            prop.name = `${propType}_${index}`;
            
            Logger.debug(`Created prop: ${prop.name} at (${location.x}, ${location.y}, ${location.z}) with rotation (${rotation.x}, ${rotation.y}, ${rotation.z}) and size (${instance.size ? `${instance.size.x}, ${instance.size.y}, ${instance.size.z}` : 'default'})`);
            return prop;
            
        } catch (error) {
            Logger.error(`Error creating prop instance ${propType}_${index}:`, error);
            return null;
        }
    }

    /**
     * Manually place a prop at a specific position
     */
    placeProp(modelPath, x, y, z, options = {}) {
        const {
            size = new THREE.Vector3(1, 1, 1),
            rotation = { x: 0, y: 0, z: 0 },
            propType = 'MANUAL'
        } = options;
        
        try {
            // Check if model is already loaded
            let model = this.propModels.get(modelPath);
            if (!model) {
                Logger.warn(`Model ${modelPath} not loaded. Use loadPropType first.`);
                return null;
            }
            
            const instance = { 
                location: { x, y: y || 0, z }, 
                size, 
                rotation 
            };
            const prop = this.createPropInstance(model, propType, instance, Date.now());
            
            if (prop) {
                const propId = `${propType}_${Date.now()}`;
                this.props.set(propId, prop);
                this.scene.add(prop);
                
                Logger.info(`Manually placed prop at (${x}, ${y || 0}, ${z}) with size (${size.x}, ${size.y}, ${size.z}) and rotation (${rotation.x}, ${rotation.y}, ${rotation.z})`);
                return prop;
            }
            
        } catch (error) {
            Logger.error('Error manually placing prop:', error);
        }
        
        return null;
    }

    /**
     * Remove a specific prop
     */
    removeProp(propId) {
        const prop = this.props.get(propId);
        if (prop) {
            this.scene.remove(prop);
            this.props.delete(propId);
            Logger.info(`Removed prop: ${propId}`);
            return true;
        }
        return false;
    }

    /**
     * Remove all props of a specific type
     */
    removePropType(propType) {
        const toRemove = [];
        
        for (const [propId, prop] of this.props.entries()) {
            if (propId.startsWith(propType)) {
                toRemove.push(propId);
            }
        }
        
        toRemove.forEach(propId => this.removeProp(propId));
        Logger.info(`Removed ${toRemove.length} props of type: ${propType}`);
    }

    /**
     * Get all props of a specific type
     */
    getPropsByType(propType) {
        const props = [];
        
        for (const [propId, prop] of this.props.entries()) {
            if (propId.startsWith(propType)) {
                props.push({ id: propId, prop });
            }
        }
        
        return props;
    }

    /**
     * Get prop at specific coordinates
     */
    getPropAtPosition(x, z, tolerance = 1.0) {
        for (const [propId, prop] of this.props.entries()) {
            const distance = Math.sqrt(
                Math.pow(prop.position.x - x, 2) + 
                Math.pow(prop.position.z - z, 2)
            );
            
            if (distance <= tolerance) {
                return { id: propId, prop, distance };
            }
        }
        
        return null;
    }

    /**
     * Update prop properties (position, rotation, scale)
     */
    updateProp(propId, updates) {
        const prop = this.props.get(propId);
        if (!prop) {
            Logger.warn(`Prop not found: ${propId}`);
            return false;
        }
        
        try {
            if (updates.location) {
                prop.position.set(
                    updates.location.x !== undefined ? updates.location.x : prop.position.x,
                    updates.location.y !== undefined ? updates.location.y : prop.position.y,
                    updates.location.z !== undefined ? updates.location.z : prop.position.z
                );
            }
            
            if (updates.rotation) {
                prop.rotation.set(
                    updates.rotation.x !== undefined ? updates.rotation.x : prop.rotation.x,
                    updates.rotation.y !== undefined ? updates.rotation.y : prop.rotation.y,
                    updates.rotation.z !== undefined ? updates.rotation.z : prop.rotation.z
                );
            }
            
            if (updates.size) {
                prop.scale.set(
                    updates.size.x !== undefined ? updates.size.x : prop.scale.x,
                    updates.size.y !== undefined ? updates.size.y : prop.scale.y,
                    updates.size.z !== undefined ? updates.size.z : prop.scale.z
                );
            }
            
            Logger.info(`Updated prop: ${propId}`);
            return true;
            
        } catch (error) {
            Logger.error(`Error updating prop ${propId}:`, error);
            return false;
        }
    }

    /**
     * Get statistics about loaded props
     */
    getStats() {
        const stats = {
            totalProps: this.props.size,
            propTypes: {},
            totalModels: this.propModels.size
        };
        
        // Count props by type
        for (const [propId] of this.props.entries()) {
            const propType = propId.split('_')[0];
            stats.propTypes[propType] = (stats.propTypes[propType] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Dispose of all props and free memory
     */
    dispose() {
        Logger.info('Disposing PropsManager...');
        
        // Remove all props from scene
        for (const [propId, prop] of this.props.entries()) {
            this.scene.remove(prop);
        }
        
        // Clear maps
        this.props.clear();
        this.propModels.clear();
        
        Logger.info('PropsManager disposed');
    }

    // Method to place a cluster of trees
    placeTreeCluster(centerX, centerY, centerZ, count, radius, options = {}) {
        const trees = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const distance = Math.random() * radius;
            
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            const y = centerY || 0; // Use center height or default to 0
            
            const tree = this.placeProp('assets/tree.glb', x, y, z, options);
            if (tree) {
                trees.push(tree);
            }
        }
        
        Logger.info(`Placed tree cluster with ${trees.length} trees at (${centerX}, ${centerY || 0}, ${centerZ})`);
        return trees;
    }
} 