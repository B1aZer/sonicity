import * as THREE from 'three';
import Logger from '../utils/logger.js';
import { BUILDINGS } from '../utils/constants.js';
import { getConfiguredGLTFLoader } from '../utils/gltfLoader.js';

export class Trees {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.trees = [];
        this.options = {
            count: options.count || 20,
            minDistance: options.minDistance || 80,  // Increased to avoid city hall area
            maxDistance: options.maxDistance || 150, // Increased to spread trees further
            scale: options.scale || 1.0,
            ...options
        };
        
        // Get building exclusion zones from BUILDINGS constant
        this.buildingZones = Object.values(BUILDINGS)
            .filter(building => building.position) // Only include buildings with fixed positions
            .map(building => ({
                x: building.position.x,
                z: building.position.z,
                radius: Math.max(building.size.x, building.size.z) / 2 + 5 // Add 5 units buffer
            }));
        
        this.treeModels = [
            'assets/tree.glb',
        ];
        
        this.loadTrees();
    }

    isPositionValid(x, z) {
        // Check if position is too close to any building
        for (const zone of this.buildingZones) {
            const dx = x - zone.x;
            const dz = z - zone.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance < zone.radius) {
                return false;
            }
        }
        return true;
    }

    async loadTrees() {
        const loader = getConfiguredGLTFLoader();
        
        try {
            // Load all tree models
            const treeModels = await Promise.all(
                this.treeModels.map(modelPath => 
                    new Promise((resolve, reject) => {
                        loader.load(
                            modelPath,
                            (gltf) => resolve(gltf),
                            undefined,
                            (error) => reject(error)
                        );
                    })
                )
            );

            // Place trees randomly
            let placedTrees = 0;
            let attempts = 0;
            const maxAttempts = this.options.count * 3; // Allow some extra attempts

            while (placedTrees < this.options.count && attempts < maxAttempts) {
                const randomModel = treeModels[Math.floor(Math.random() * treeModels.length)];
                const tree = randomModel.scene.clone();
                
                // Random position within bounds
                const angle = Math.random() * Math.PI * 2;
                const distance = this.options.minDistance + 
                    Math.random() * (this.options.maxDistance - this.options.minDistance);
                
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                // Check if position is valid (not too close to buildings)
                if (this.isPositionValid(x, z)) {
                    tree.position.set(x, 0, z);
                    
                    // Random rotation
                    tree.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Random scale variation for more natural look
                    const scaleVariation = 0.6 + Math.random() * 0.8;
                    const heightVariation = 0.8 + Math.random() * 0.4;
                    tree.scale.set(
                        this.options.scale * scaleVariation,
                        this.options.scale * heightVariation,
                        this.options.scale * scaleVariation
                    );
                    
                    // Enable shadows
                    tree.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    this.scene.add(tree);
                    this.trees.push(tree);
                    placedTrees++;
                }
                
                attempts++;
            }
            
            Logger.info(`Placed ${placedTrees} trees in the scene after ${attempts} attempts`);
        } catch (error) {
            Logger.error('Error loading trees:', error);
        }
    }

    update(time) {
        // Add any tree animations or updates here if needed
    }

    dispose() {
        this.trees.forEach(tree => {
            this.scene.remove(tree);
            tree.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        });
        this.trees = [];
    }
} 