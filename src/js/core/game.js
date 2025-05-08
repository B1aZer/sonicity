import * as THREE from 'three';
import { InputHandler } from '../utils/inputHandler.js';
import { BuildingManager } from '../managers/buildingManager.js';
import { ResourceManager } from '../managers/resourceManager.js';
import { UI } from '../utils/ui.js';
import { AssetLoader } from '../managers/assetLoader.js';
import { BUILDING_TYPES, BUILDING_TYPES_KEYS } from '../utils/constants.js';
import { LoadingScreen } from '../utils/loadingScreen.js';
import { GridManager } from '../managers/gridManager.js';
import { SceneManager } from '../managers/sceneManager.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import Logger from '../utils/logger.js';

export class Game {
    constructor(renderDiv) {
        this.renderDiv = renderDiv;
        this.gridManager = new GridManager();
        this.sceneManager = new SceneManager(this.gridManager);
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.clock = new THREE.Clock();
        
        // Game state timers
        this.timers = {
            income: { current: 0, interval: 5.0 },
            functionality: { current: 0, interval: 1.0 }
        };
        
        // Grid properties
        this.gridSize = 0; // Will be set in init
        this.gridCellSize = 0; // Will be set in init
        this.grid = []; // Logical grid to track occupied cells (stores building type or false)
        
        // Game state
        this.selectedBuildingType = BUILDING_TYPES_KEYS[0]; // Which building to place in 'BUILD' mode
        this.currentMode = 'BUILD'; // 'BUILD' or 'BULLDOZE'
        this.money = 5000; // Starting money
        this.isRunning = false;
        
        // Managers
        this.resourceManager = new ResourceManager();
        this.assetLoader = new AssetLoader();
        this.buildingManager = new BuildingManager(this.gridManager, this.resourceManager, 0, this.assetLoader);
        this.ui = new UI();
        this.inputHandler = new InputHandler(this);
        
        // Initialize contracts
        this.gameStateContract = new GameStateContract();
    }

    async init() {
        Logger.info("Game: Starting initialization");
        
        // Initialize grid manager first with gameStateContract
        await this.gridManager.initialize(this.gameStateContract);
        Logger.info("Grid initialized:", {
            gridSize: this.gridManager.getGridSize(),
            cellSize: this.gridManager.getCellSize(),
            totalSize: this.gridManager.getTotalSize()
        });
        
        // Set up scene with dynamic grid
        const { scene, camera, renderer, controls, groundPlane, gridHelper } = 
            await this.sceneManager.setupScene(this.renderDiv);
        
        // Store scene components
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.groundPlane = groundPlane;
        this.gridHelper = gridHelper;
        
        // Initialize the logical grid
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        
        // Update building manager with scene components
        this.buildingManager.setScene(this.scene, this.gridManager.getCellSize(), this.assetLoader);
        
        // Set up input handlers
        Logger.info("Game: Setting up input handlers");
        this.inputHandler.setupEventListeners();
        
        // Show UI and update initial state
        Logger.info("Game: Setting up UI");
        this.ui.show();
        this.updateUI();
        
        // Start the game loop
        Logger.info("Game: Starting game loop");
        this.start();
        
        Logger.info("Game: Initialization complete");
    }

    start() {
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();
        
        this.updateGameState(deltaTime);
        this.render();
    }

    updateGameState(deltaTime) {
        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Update timers and check conditions
        this.updateTimers(deltaTime);
    }

    updateTimers(deltaTime) {
        // Update functionality check timer
        this.timers.functionality.current += deltaTime;
        if (this.timers.functionality.current >= this.timers.functionality.interval) {
            this.timers.functionality.current = 0;
            this.checkAllBuildingFunctionality();
        }

        // Update income timer
        this.timers.income.current += deltaTime;
        if (this.timers.income.current >= this.timers.income.interval) {
            this.timers.income.current = 0;
            this.generateIncome();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // Called by InputHandler on click
    async handlePlacement(event) {
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
            const gridX = Math.floor(intersectPoint.x / this.gridCellSize + this.gridSize / 2);
            const gridZ = Math.floor(intersectPoint.z / this.gridCellSize + this.gridSize / 2);

            // Check if the grid coordinates are within bounds
            if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
                if (this.currentMode === 'BUILD') {
                    // Check if the cell is empty in the contract
                    const isCellEmpty = await this.checkCellEmptyInContract(gridX, gridZ);
                    if (isCellEmpty) {
                        // Get building data
                        const buildingData = BUILDING_TYPES[this.selectedBuildingType];
                        if (!buildingData) {
                            console.error(`Invalid building type selected: ${this.selectedBuildingType}`);
                            return;
                        }

                        // Check if player can afford the building
                        const canAfford = await this.checkPlayerCanAfford(buildingData.cost);
                        if (canAfford) {
                            try {
                                // Call contract to place building
                                await this.placeBuilding(gridX, gridZ, this.selectedBuildingType);
                                
                                // Update local state from contract
                                await this.syncWithContract();
                            } catch (error) {
                                console.error('Error placing building:', error);
                            }
                        } else {
                            console.log(`Not enough resources to place ${this.selectedBuildingType}`);
                        }
                    } else {
                        console.log(`Cell [${gridX}, ${gridZ}] is already occupied`);
                    }
                } else if (this.currentMode === 'BULLDOZE') {
                    try {
                        // Call contract to remove building
                        await this.removeBuildingFromContract(gridX, gridZ);
                        
                        // Update local state from contract
                        await this.syncWithContract();
                    } catch (error) {
                        console.error('Error removing building:', error);
                    }
                }
            }
        }
    }

    // Contract interaction methods
    async checkCellEmptyInContract(x, z) {
        // TODO: Implement contract call to check if cell is empty
        return true; // Placeholder
    }

    async checkPlayerCanAfford(cost) {
        // TODO: Implement contract call to check player resources
        return true; // Placeholder
    }

    async placeBuilding(x, z, type) {
        // TODO: Implement contract call to place building
        console.log(`Placing ${type} at [${x}, ${z}]`);
    }

    async removeBuildingFromContract(x, z) {
        // TODO: Implement contract call to remove building
        console.log(`Removing building at [${x}, ${z}]`);
    }

    async syncWithContract() {
        try {
            // TODO: Get state from contract
            const contractState = {
                buildings: [] // Placeholder
            };

            // Update visual representation
            await this.buildingManager.syncWithContractState(contractState);
            
            // Update UI
            this.updateUI();
        } catch (error) {
            console.error('Error syncing with contract:', error);
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
        // Get money from ResourceManager
        const money = this.resourceManager.getMoney();
        // Update UI (now only shows money/gold)
        this.ui.updateUI(money);
    }

    // --- Income and Functionality Logic ---
    // All buildings are now functional by default (simplified)
    checkAllBuildingFunctionality() {
        // No-op (all buildings are functional by default now)
    }
    
    // All buildings are now functional by default (simplified)
    checkBuildingFunctionality(building) {
        // Set all buildings to functional
        building.isFunctional = true;
        
        // Update visuals if needed
        this.buildingManager.updateBuildingVisuals(building);
    }
    
    // Utilities in range check no longer needed (simplified)
    hasUtilitiesInRange(gridX, gridZ) {
        // Always return true (simplified)
        return true;
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
        this.timers.income.current = 0;
        this.timers.functionality.current = 0;
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
        
        // Stop game loop
        this.stop();
        
        // Remove event listeners
        if (this.inputHandler) {
            this.inputHandler.dispose();
        }
        
        // Clean up buildings
        if (this.buildingManager) {
            const buildingsToRemove = [...this.buildingManager.buildings];
            buildingsToRemove.forEach(building => {
                this.buildingManager.removeBuilding(building);
            });
        }
        
        // Dispose of scene manager
        this.sceneManager.dispose();
        
        // Clear references
        this.buildingManager = null;
        this.resourceManager = null;
        this.ui = null;
        this.inputHandler = null;
        
        console.log("Game: dispose() method completed");
    }

    updateUtilityEffects() {
        // Update utility coverage for each utility building
        const utilityBuildings = this.buildingManager.getUtilityBuildings();
        
        utilityBuildings.forEach(utilityBuilding => {
            if (utilityBuilding.type === 'MINE') {
                this.resourceManager.addResource('electricity', utilityBuilding.data.generates.electricity);
            } else if (utilityBuilding.type === 'CITY_HALL') {
                this.resourceManager.addResource('water', utilityBuilding.data.generates.water);
            }
        });
    }
}