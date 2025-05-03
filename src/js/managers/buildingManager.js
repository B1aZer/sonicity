import * as THREE from 'three';
import { BUILDING_TYPES } from '../utils/constants.js';
import { AssetLoader } from './assetLoader.js'; // Not strictly needed here unless type hinting
export class BuildingManager {
    constructor(scene, resourceManager, gridCellSize, assetLoader) { // Add assetLoader
        this.scene = scene;
        this.resourceManager = resourceManager;
        this.gridCellSize = gridCellSize;
        this.assetLoader = assetLoader; // Store the asset loader
        this.buildings = []; // Store building data and mesh
        this.updateTimer = 0;
        this.updateInterval = 0.5; // Update resource checks twice per second
    }

    setScene(scene, gridCellSize, assetLoader) { // Add assetLoader here too if Game.init is primary setup point
        this.scene = scene;
        this.gridCellSize = gridCellSize;
        this.assetLoader = assetLoader || this.assetLoader; // Use passed one or existing one
    }
    placeBuilding(typeKey, position) {
        console.log(`BuildingManager: placeBuilding - Received typeKey: ${typeKey}`); // Log received typeKey
        if (!this.scene) {
            console.error("Scene not set in BuildingManager");
            return;
        }

        const buildingData = BUILDING_TYPES[typeKey];
        if (!buildingData) {
            console.error(`Invalid building type key: ${typeKey}`);
            return;
        }
        let mesh;
        let isUsingModel = false;
        const loadedModel = this.assetLoader.getModel(typeKey);
        // Log the entire object to inspect its structure in the console
        console.log(`BuildingManager [${typeKey}]: Received object from getModel:`, loadedModel);
        if (loadedModel) {
            console.log(`Using loaded model for ${typeKey}. Original received UUID: ${loadedModel.uuid}`);
            // Force update matrix on the first clone before cloning again (long shot)
            loadedModel.updateMatrixWorld(true);
            // **Add an extra clone here to ensure absolute independence**
            mesh = loadedModel.clone();
            console.log(`Cloned again inside placeBuilding. New mesh UUID: ${mesh.uuid}`);
            isUsingModel = true;
            // --- Model Scaling and Positioning ---
            // Calculate the model's bounding box AFTER it's potentially transformed/rotated
             mesh.updateMatrixWorld(true); // Ensure world matrix and bounding box are up-to-date
            const box = new THREE.Box3().setFromObject(mesh);
            const modelSize = new THREE.Vector3();
            box.getSize(modelSize);
            const modelCenter = new THREE.Vector3();
            box.getCenter(modelCenter);
            // Desired size (currently always 2xN M x 2)
            const targetSize = buildingData.size; // Use the defined size in constants.js
            // Calculate scale factors (handle zero dimensions)
            const scaleX = modelSize.x === 0 ? 1 : targetSize.x / modelSize.x;
            const scaleY = modelSize.y === 0 ? 1 : targetSize.y / modelSize.y;
            const scaleZ = modelSize.z === 0 ? 1 : targetSize.z / modelSize.z;
            // Apply scale: Normalize the model so its largest horizontal dimension fits the target size.
            // This maintains aspect ratio while ensuring it fits the grid footprint.
            const maxDim = Math.max(modelSize.x, modelSize.z); // Find the largest horizontal dimension of the model
            let scale = 1;
            if (maxDim > 0) {
                 // Calculate scale factor based on the largest dimension fitting the target X size (assuming square footprint target)
                 scale = targetSize.x / maxDim;
            }
            // Handle potential vertical scaling if needed, or keep it proportional
             // For now, let's scale uniformly:
             mesh.scale.set(scale, scale, scale);
            // Recalculate bounds after scaling
            mesh.updateMatrixWorld(true);
            const scaledBox = new THREE.Box3().setFromObject(mesh);
             const scaledModelCenter = new THREE.Vector3();
            scaledBox.getCenter(scaledModelCenter);
             const scaledModelSize = new THREE.Vector3();
             scaledBox.getSize(scaledModelSize);
            // Adjust position: place the calculated BOTTOM center of the scaled model at the target position's Y=0
             const targetPosition = position.clone();
            targetPosition.y = 0; // Ensure the final position is on the ground plane Y=0
            // Calculate the offset needed to move the model's origin so its scaled bounding box's bottom-center is at targetPosition
            // 1. Find the center of the scaled bounding box: scaledModelCenter
            // 2. Find the vector from the model's origin (mesh.position) to its scaled bottom-center point:
            //    bottomCenterOffset = scaledModelCenter - mesh.position + (0, -scaledModelSize.y / 2, 0)
            // 3. The final mesh position should be: targetPosition - bottomCenterOffset
            // Calculate the vector from the mesh's origin to its scaled bottom-center
             const offsetToBottomCenter = scaledModelCenter.clone().sub(mesh.position); // Vector from origin to center
             offsetToBottomCenter.y -= scaledModelSize.y / 2; // Adjust vector to point to bottom-center
             // Set the mesh's final position
             mesh.position.copy(targetPosition).sub(offsetToBottomCenter);
            // Enable shadows for all child meshes within the model
            mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Optional: Adjust material properties if needed
                    // child.material.metalness = 0.5;
                    // child.material.roughness = 0.6;
                 }
            });
        } else {
            console.warn(`Model for ${typeKey} not loaded yet or failed. Using fallback cube.`);
            // Fallback to cube geometry if model not ready
            const geometry = new THREE.BoxGeometry(buildingData.size.x, buildingData.size.y, buildingData.size.z);
            // Use a default material or the building's color
            const material = new THREE.MeshStandardMaterial({ color: buildingData.color });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position); // Use original position logic for cube
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        }
        this.scene.add(mesh);
        const building = {
            id: THREE.MathUtils.generateUUID(),
            type: typeKey,
            mesh: mesh, // This is now the model Group/Scene or the fallback Mesh
            position: mesh.position.clone(), // Use the final mesh position
            data: buildingData,
            isUsingModel: isUsingModel, // Flag if model was successfully used
            isFunctional: true, // All buildings are now functional by default (no resource checks)
            gridX: -1,
            gridZ: -1,
            originalColor: isUsingModel ? null : new THREE.Color(buildingData.color), // Color applies to fallback
            noResourceColor: new THREE.Color(0x555555)
        };
        // Store grid coordinates on the building object
        // Need to calculate them here based on position (reverse of placement logic)
        // This assumes placeBuilding receives the final, snapped position.
        // We need the grid coords *before* pushing to the array if game logic depends on it immediately.
        // Let's have Game.js calculate and assign this after placement instead for simplicity.
        this.buildings.push(building);
        // Register global resource supply/demand (still needed for overall balance display)
        if (buildingData.generates) {
            this.resourceManager.addSupply(buildingData.generates);
        }
        if (buildingData.consumes) {
            this.resourceManager.addDemand(buildingData.consumes);
        }
        // Initial visual state update will be handled by game loop shortly
        // this.checkBuildingResources(building); // Remove initial check here, game loop handles it
        console.log(`Placed ${typeKey} at ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
        console.log("Current Buildings:", this.buildings.length);
        console.log("Resources:", this.resourceManager.getResources());
        
        // No longer adding range visualizers (removed for simplification)
        
        return building; // Return the created building object
    }

    update(deltaTime) {
        // This update function can be simplified or removed if Game.js handles all logic.
        // For now, let's keep it minimal, mainly for potential future uses.
        // The core functionality check and income generation will happen in Game.js.
        this.updateTimer += deltaTime;
        if (this.updateTimer >= this.updateInterval) {
             this.updateTimer = 0;
            // No periodic checks needed here anymore, Game.js handles functionality state
            // Game.js will call updateBuildingVisuals if functionality changes.
        }
    }
    // Removed checkBuildingResources method as Game.js now determines functionality.
    // Update visuals based SOLELY on the isFunctional flag set by Game.js
    updateBuildingVisuals(building) {
        // Only modify color/material if it's NOT a loaded model (or apply effects differently)
        if (!building.isUsingModel && building.mesh.material) {
            const targetColor = building.isFunctional ? building.originalColor : building.noResourceColor;
            building.mesh.material.color.copy(targetColor);
            building.mesh.material.transparent = false;
            building.mesh.material.opacity = 1.0;
            building.mesh.material.needsUpdate = true;
        } else if (building.isUsingModel) {
            // For models, maybe apply an overlay, tint, or transparency effect?
            // Example: Dimming the model slightly when not functional
            building.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                     // Clone material if not already done to avoid affecting other instances
                     if (!child.userData.originalMaterial) {
                        child.userData.originalMaterial = child.material.clone();
                    }
                    if (building.isFunctional) {
                        // Restore original appearance (potentially copy properties back)
                        if(child.userData.clonedMaterial) {
                             child.material = child.userData.clonedMaterial; // Restore potentially cloned original
                             delete child.userData.clonedMaterial; // Clean up flag
                        }
                         child.material.opacity = child.userData.originalMaterial?.opacity ?? 1.0;
                         child.material.transparent = child.material.opacity < 1.0;
                         // If we tinted, restore color tint here
                    } else {
                         // Apply non-functional effect (e.g., lower opacity or desaturate)
                          if (!child.userData.clonedMaterial) {
                             child.material = child.material.clone(); // Clone before modifying
                             child.userData.clonedMaterial = child.material;
                         }
                         child.material.opacity = 0.5; // Make it semi-transparent
                         child.material.transparent = true;
                         // Could also apply a color tint: child.material.color.multiplyScalar(0.5);
                    }
                     child.material.needsUpdate = true;
                }
            });
        }
    }
    // Add function to remove building and its visualizer later if needed
     removeBuilding(buildingToRemove) {
         if (!buildingToRemove || !this.scene) return;
        // Remove building mesh (could be a Group/Scene if it's a model)
        this.scene.remove(buildingToRemove.mesh);
        // Dispose of model resources recursively if it's a model
        if (buildingToRemove.isUsingModel) {
            buildingToRemove.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    // Dispose materials carefully, especially if shared or cloned
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        } else if (buildingToRemove.mesh.geometry && buildingToRemove.mesh.material) {
            // Dispose simple mesh resources
            buildingToRemove.mesh.geometry.dispose();
            buildingToRemove.mesh.material.dispose();
        }
        
        // Visualization mesh removal (now a no-op - removed for simplification)
        
        // Remove from resource counts
        if (buildingToRemove.data.generates) {
            this.resourceManager.removeSupply(buildingToRemove.data.generates);
        }
        if (buildingToRemove.data.consumes) {
            this.resourceManager.removeDemand(buildingToRemove.data.consumes);
        }
        // Remove from buildings array
        this.buildings = this.buildings.filter(b => b.id !== buildingToRemove.id);
        console.log(`Removed ${buildingToRemove.type}`);
        // Need to inform Game.js to update grid and potentially re-check functionality
    }
}