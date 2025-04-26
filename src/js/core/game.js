import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { InputHandler } from '../utils/inputHandler.js';
import { BuildingManager } from '../managers/buildingManager.js';
import { ResourceManager } from '../managers/resourceManager.js';
import { UI } from '../utils/ui.js';
import { AssetLoader } from '../managers/assetLoader.js';
import { BUILDING_TYPES, BUILDING_TYPES_KEYS } from '../utils/constants.js';
export class Game {
    constructor(renderDiv) {
        this.renderDiv = renderDiv;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.groundPlane = null;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.clock = new THREE.Clock();
        this.incomeTimer = 0; // Timer for income generation
        this.incomeInterval = 5.0; // Generate income every 5 seconds
        this.functionalityCheckTimer = 0; // Timer for checking building functionality
        this.functionalityCheckInterval = 1.0; // Check functionality every 1 second
        // Grid properties
        this.gridSize = 0; // Will be set in init
        this.gridCellSize = 0; // Will be set in init
        this.grid = []; // Logical grid to track occupied cells (stores building type or false)
        // State properties
        this.selectedBuildingType = BUILDING_TYPES_KEYS[0]; // Which building to place in 'BUILD' mode
        this.currentMode = 'BUILD'; // 'BUILD' or 'BULLDOZE'
        // Managers
        this.resourceManager = new ResourceManager();
        this.assetLoader = new AssetLoader(); // Create the asset loader instance
        // Pass assetLoader to BuildingManager constructor
        this.buildingManager = new BuildingManager(null, this.resourceManager, 0, this.assetLoader);
        this.money = 5000; // Starting money
        // Pass the selection handler and restart handler methods to the UI constructor
        this.ui = new UI(
            this.handleBuildingSelection.bind(this),
            this.restartGame.bind(this) // Pass the restart method
        );
        this.inputHandler = new InputHandler(this);
    }

    async init() {
        console.log("Game: Starting initialization");
        
        // --- Loading Screen Setup ---
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.style.position = 'absolute';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.width = '100%';
        loadingScreen.style.height = '100%';
        loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        loadingScreen.style.color = 'white';
        loadingScreen.style.display = 'flex';
        loadingScreen.style.justifyContent = 'center';
        loadingScreen.style.alignItems = 'center';
        loadingScreen.style.fontSize = '24px';
        loadingScreen.style.fontFamily = 'Arial, sans-serif';
        loadingScreen.textContent = 'Loading Assets...';
        this.renderDiv.appendChild(loadingScreen);
        
        try {
            console.log("Game: Loading assets");
            await this.assetLoader.loadAssets();
            
            if (loadingScreen.parentNode === this.renderDiv) {
                this.renderDiv.removeChild(loadingScreen);
            }
            
            console.log("Game: Setting up scene");
            const { scene, camera, renderer, controls, groundPlane, gridSize, gridCellSize } = setupScene(this.renderDiv);
            
            // Store scene components
            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.controls = controls;
            this.groundPlane = groundPlane;
            this.gridSize = gridSize;
            this.gridCellSize = gridCellSize;
            
            // Initialize the logical grid
            this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
            
            // Update building manager with scene components
            this.buildingManager.setScene(this.scene, this.gridCellSize, this.assetLoader);
            
            // Set up input handlers AFTER renderer is available
            console.log("Game: Setting up input handlers");
            this.inputHandler.setupEventListeners();
            
            // Show UI and update initial state
            console.log("Game: Setting up UI");
            this.ui.show();
            this.updateUI();
            
            // Set up window resize handler
            this.boundOnWindowResize = this.onWindowResize.bind(this);
            window.addEventListener('resize', this.boundOnWindowResize);
            
            // Start the game loop
            console.log("Game: Starting game loop");
            this.start();
            
            console.log("Game: Initialization complete");
        } catch (error) {
            console.error("Game: Initialization error:", error);
            if (loadingScreen.parentNode === this.renderDiv) {
                this.renderDiv.removeChild(loadingScreen);
            }
            const errorMessage = document.createElement('div');
            errorMessage.style.position = 'absolute';
            errorMessage.style.top = '50%';
            errorMessage.style.left = '50%';
            errorMessage.style.transform = 'translate(-50%, -50%)';
            errorMessage.style.color = 'red';
            errorMessage.style.fontSize = '18px';
            errorMessage.style.fontFamily = 'Arial, sans-serif';
            errorMessage.textContent = 'Failed to load game assets. Please refresh the page.';
            this.renderDiv.appendChild(errorMessage);
        }
    }
    start() {
        this.animate();
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        // Safeguard: Only update controls if they exist (in case init failed somehow)
        if (this.controls) {
             this.controls.update();
        }
        // Check building functionality periodically
        this.functionalityCheckTimer += deltaTime;
        if (this.functionalityCheckTimer >= this.functionalityCheckInterval) {
            this.functionalityCheckTimer = 0;
            this.checkAllBuildingFunctionality();
        }
        // Generate income periodically
        this.incomeTimer += deltaTime;
        if (this.incomeTimer >= this.incomeInterval) {
             this.incomeTimer = 0;
             this.generateIncome();
        }
        // Update building visuals (minimal logic now, mostly for future use)
        this.buildingManager.update(deltaTime);
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    // Called by InputHandler on click
    handlePlacement(event) {
        console.log(`Game: handlePlacement - Started. Current selectedBuildingType: ${this.selectedBuildingType}, Mode: ${this.currentMode}`); // Log at start
        
        // Get the renderer's DOM element dimensions and position
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        // Calculate mouse position relative to the renderer element
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);

        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            // Convert world coordinates to grid coordinates
            // The grid helper is centered at (0,0), so we adjust the calculation
            const gridX = Math.floor(intersectPoint.x / this.gridCellSize + this.gridSize / 2);
            const gridZ = Math.floor(intersectPoint.z / this.gridCellSize + this.gridSize / 2);
            // Check if the grid coordinates are within bounds
            if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
                 if (this.currentMode === 'BUILD') {
                     // --- BUILD MODE ---
                     // Check if the cell is already occupied
                     if (!this.grid[gridX][gridZ]) {
                         // Check if a building type is selected
                         if (!this.selectedBuildingType) {
                             console.warn("Build mode active, but no building type selected.");
                             return;
                         }
                         // Check affordability BEFORE placement
                         const buildingData = BUILDING_TYPES[this.selectedBuildingType];
                         // This check prevents the original error if selectedBuildingType somehow became invalid
                         if (!buildingData) {
                             console.error(`Invalid building type selected: ${this.selectedBuildingType}`);
                             return;
                         }
                         const cost = buildingData.cost || 0;
                         if (this.money >= cost) {
                             // Deduct cost
                             this.money -= cost;
                             // Calculate the world position for the center of the grid cell
                        const worldX = (gridX - this.gridSize / 2 + 0.5) * this.gridCellSize;
                        const worldZ = (gridZ - this.gridSize / 2 + 0.5) * this.gridCellSize;
                        const position = new THREE.Vector3(
                            worldX,
                            buildingData.size.y / 2, // Place base on ground, pivot is center
                            worldZ
                        );
                        // Place the building
                        const placedBuilding = this.buildingManager.placeBuilding(this.selectedBuildingType, position);
                         // Mark the cell as occupied with the building type
                         this.grid[gridX][gridZ] = this.selectedBuildingType;
                         // Store grid coordinates on the building object itself
                         if(placedBuilding) { // Check if placement was successful
                             placedBuilding.gridX = gridX;
                             placedBuilding.gridZ = gridZ;
                              // Immediately check functionality of the newly placed building and update visuals
                             this.checkBuildingFunctionality(placedBuilding);
                                 this.buildingManager.updateBuildingVisuals(placedBuilding);
                             }
                             this.updateUI(); // Update resources AND money display
                             console.log(`Placed ${this.selectedBuildingType} at grid cell [${gridX}, ${gridZ}]. Cost: $${cost}. Remaining money: $${this.money}`);
                         } else {
                              console.log(`Not enough money to place ${this.selectedBuildingType}. Need $${cost}, have $${this.money}.`);
                              // Optionally provide UI feedback here (e.g., flash money display red)
                         }
                     } else {
                         console.log(`Build Mode: Grid cell [${gridX}, ${gridZ}] is already occupied.`);
                     }
                 } else if (this.currentMode === 'BULLDOZE') {
                     // --- BULLDOZE MODE ---
                     // Check if the cell IS occupied
                     if (this.grid[gridX][gridZ]) {
                         // Find the building object to remove
                         const buildingToRemove = this.buildingManager.buildings.find(b => b.gridX === gridX && b.gridZ === gridZ);
                         if (buildingToRemove) {
                             // Get refund (e.g., 50% of original cost)
                             const refundAmount = Math.floor((buildingToRemove.data.cost || 0) * 0.5);
                             this.money += refundAmount;
                             // Remove the building using BuildingManager
                             this.buildingManager.removeBuilding(buildingToRemove);
                             // Clear the logical grid cell
                             this.grid[gridX][gridZ] = null;
                             // Update UI (money, resources might change)
                             this.updateUI();
                             // Re-check functionality of potentially affected neighbors (important!)
                             this.checkAllBuildingFunctionality();
                             console.log(`Bulldozed building at [${gridX}, ${gridZ}]. Refund: $${refundAmount}. Total money: $${this.money}`);
                         } else {
                              console.warn(`Bulldoze Mode: Grid cell [${gridX}, ${gridZ}] occupied in grid, but no building object found.`);
                              // Clear the grid cell anyway to fix potential inconsistency
                              this.grid[gridX][gridZ] = null;
                         }
                     } else {
                         console.log(`Bulldoze Mode: Grid cell [${gridX}, ${gridZ}] is empty.`);
                     }
                 }
            } else {
                 console.log("Clicked outside the defined grid area.");
            }
        }
    }

    // Called by UI button clicks
    handleBuildingSelection(selectionKey) {
         if (selectionKey === 'BULLDOZE') {
             this.currentMode = 'BULLDOZE';
             this.selectedBuildingType = null; // No building type selected in bulldoze mode
             console.log('Mode set to: BULLDOZE');
             // Optional: Change mouse cursor
             this.renderDiv.style.cursor = 'crosshair'; // Example cursor
         } else if (BUILDING_TYPES[selectionKey]) {
             this.currentMode = 'BUILD';
            this.selectedBuildingType = selectionKey;
            console.log(`Game: handleBuildingSelection - Set selectedBuildingType to: ${this.selectedBuildingType}`); // Log selection set
            console.log(`Mode set to: BUILD, Selected: ${selectionKey}`);
            // Optional: Restore default cursor
            this.renderDiv.style.cursor = 'default';
         } else {
              console.warn(`Invalid selection key: ${selectionKey}`);
              return; // Do nothing if invalid key
         }
         this.updateUI(); // Update UI to show selection/mode and affordability
    }

    // Update UI elements
    updateUI() {
        const { electricity, water } = this.resourceManager.getResources();
        // Pass money to UI update methods
        this.ui.updateResourceDisplay(this.money, electricity, water);
        // Pass the current mode or selected building type key
        const activeSelectionKey = this.currentMode === 'BULLDOZE' ? 'BULLDOZE' : this.selectedBuildingType;
        this.ui.updateSelectionVisuals(activeSelectionKey, this.money);
    }
    // Handle window resize
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    // --- Income and Functionality Logic ---
    checkAllBuildingFunctionality() {
        this.buildingManager.buildings.forEach(building => {
            this.checkBuildingFunctionality(building);
        });
    }
    checkBuildingFunctionality(building) {
        const oldFunctionalState = building.isFunctional;
        let isNowFunctional = false; // Assume not functional by default
        if (building.type === 'HOUSE') {
            // House needs adjacent power plant AND water tower
            // House needs utilities within range
            isNowFunctional = this.hasUtilitiesInRange(building.gridX, building.gridZ);
        } else if (building.data.generates) {
            // Generators are always considered functional for now
            isNowFunctional = true;
        } else if (building.type === 'SHOP') {
             // Shops need global resources (example of different logic)
             const { hasEnoughPower, hasEnoughWater } = this.resourceManager.checkGlobalSufficiency();
             const needsPower = building.data.consumes?.electricity > 0;
             const needsWater = building.data.consumes?.water > 0;
             isNowFunctional = true;
             if (needsPower && !hasEnoughPower) isNowFunctional = false;
             if (needsWater && !hasEnoughWater) isNowFunctional = false;
        }
        // Add more rules for other building types here if needed
        building.isFunctional = isNowFunctional;
        // Update visuals only if the state changed
        if (isNowFunctional !== oldFunctionalState) {
            this.buildingManager.updateBuildingVisuals(building);
        }
    }
     // Renamed to reflect that it now checks within range, not just adjacent
     hasUtilitiesInRange(gridX, gridZ) {
        let foundPower = false;
        let foundWater = false;
        // Iterate through all buildings instead of just checking grid neighbors
        for (const utilityBuilding of this.buildingManager.buildings) {
            if (!utilityBuilding.data.generates || !utilityBuilding.data.range) continue; // Skip non-generators or those without range
            const range = utilityBuilding.data.range;
            const dx = Math.abs(gridX - utilityBuilding.gridX);
            const dz = Math.abs(gridZ - utilityBuilding.gridZ);
            const distance = dx + dz; // Manhattan distance
            if (distance <= range) {
                 if (utilityBuilding.type === 'POWER_PLANT') {
                     foundPower = true;
                 } else if (utilityBuilding.type === 'WATER_TOWER') {
                     foundWater = true;
                 }
            }
            // Optimization: if both found, no need to check further
            if (foundPower && foundWater) break;
        }
        return foundPower && foundWater;
    }
    generateIncome() {
        let cycleIncome = 0;
        this.buildingManager.buildings.forEach(building => {
            // Check if the building is a HOUSE and is functional
            if (building.type === 'HOUSE' && building.isFunctional && building.data.income) {
                cycleIncome += building.data.income;
            }
            // Add income rules for other buildings here if needed
        });
        if (cycleIncome > 0) {
            this.money += cycleIncome;
            console.log(`Generated $${cycleIncome} income. Total money: $${this.money}`);
            this.updateUI(); // Update money display
        }
    }
    // --- Game Reset Logic ---
    restartGame() {
        console.log("Game: restartGame() method entered."); // Log 5: Method start
        // 1. Reset Money
        this.money = 5000; // Back to starting value
        // 2. Reset Timers
        this.incomeTimer = 0;
        this.functionalityCheckTimer = 0;
        // 3. Reset Game Mode and Selection
        this.currentMode = 'BUILD';
        this.selectedBuildingType = BUILDING_TYPES_KEYS[0]; // Default selection
        this.renderDiv.style.cursor = 'default'; // Reset cursor
        // 4. Clear Buildings
        // Make a copy of the array because removeBuilding modifies it
        const buildingsToRemove = [...this.buildingManager.buildings];
        buildingsToRemove.forEach(building => {
            this.buildingManager.removeBuilding(building);
        });
        // Ensure the buildings array is definitely empty
        this.buildingManager.buildings = [];
        // 5. Reset Logical Grid
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        // 6. Reset Resource Manager
        this.resourceManager.reset(); // Call the new reset method
        // 7. Update UI to reflect reset state
        this.updateUI();
        console.log("Game: restartGame() method finished successfully."); // Log 6: Method end
    }
    
    // Add dispose method to clean up resources when switching pages
    dispose() {
        console.log("Game: dispose() method called");
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Remove event listeners
        if (this.inputHandler) {
            this.inputHandler.dispose();
        }
        
        // Remove window resize listener
        if (this.boundOnWindowResize) {
            window.removeEventListener('resize', this.boundOnWindowResize);
        }
        
        // Clean up buildings
        if (this.buildingManager) {
            const buildingsToRemove = [...this.buildingManager.buildings];
            buildingsToRemove.forEach(building => {
                this.buildingManager.removeBuilding(building);
            });
        }
        
        // Dispose of Three.js resources
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        // Remove renderer from DOM
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.groundPlane = null;
        this.buildingManager = null;
        this.resourceManager = null;
        this.ui = null;
        this.inputHandler = null;
        this.boundOnWindowResize = null;
        
        console.log("Game: dispose() method completed");
    }
}