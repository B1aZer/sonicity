import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Logger from '../utils/logger.js';

export class Trees {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.trees = [];
        this.options = {
            count: options.count || 20,
            minDistance: options.minDistance || 5,
            maxDistance: options.maxDistance || 80,
            scale: options.scale || 1.0,
            ...options
        };
        
        this.treeModels = [
            'assets/tree.glb',
        ];
        
        this.loadTrees();
    }

    async loadTrees() {
        const loader = new GLTFLoader();
        
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
            for (let i = 0; i < this.options.count; i++) {
                const randomModel = treeModels[Math.floor(Math.random() * treeModels.length)];
                const tree = randomModel.scene.clone();
                
                // Random position within bounds
                const angle = Math.random() * Math.PI * 2;
                const distance = this.options.minDistance + 
                    Math.random() * (this.options.maxDistance - this.options.minDistance);
                
                tree.position.x = Math.cos(angle) * distance;
                tree.position.z = Math.sin(angle) * distance;
                tree.position.y = 0;
                
                // Random rotation
                tree.rotation.y = Math.random() * Math.PI * 2;
                
                // Random scale variation for more natural look
                const scaleVariation = 0.6 + Math.random() * 0.8; // Random scale between 0.6 and 1.4
                const heightVariation = 0.8 + Math.random() * 0.4; // Slightly different height variation
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
            }
            
            Logger.info(`Placed ${this.options.count} trees in the scene`);
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