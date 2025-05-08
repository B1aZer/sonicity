import * as THREE from 'three';
import { InputHandler } from '../utils/inputHandler.js';
import { BuildingManager } from '../managers/buildingManager.js';
import { ResourceManager } from '../managers/resourceManager.js';
import { UI } from '../utils/ui.js';
import { AssetLoader } from '../managers/assetLoader.js';
import { BUILDING_TYPES, BUILDING_TYPES_KEYS } from '../utils/constants.js';
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
            income: { current: 0, interval: 5.0 }
        };
        
        // Grid properties
        this.gridSize = 0; // Will be set in init
        this.gridCellSize = 0; // Will be set in init
        this.grid = []; // Logical grid to track occupied cells (stores building type or false)
        
        // Game state
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

    // Update UI elements
    updateUI() {
        // Get money from ResourceManager
        const money = this.resourceManager.getMoney();
        // Update UI (now only shows money/gold)
        this.ui.updateUI(money);
    }

    generateIncome() {
        let cycleIncome = 0;
        this.buildingManager.buildings.forEach(building => {
            if (building.type === 'HOUSE' && building.data.income) {
                cycleIncome += building.data.income;
            }
        });
        if (cycleIncome > 0) {
            this.money += cycleIncome;
            console.log(`Generated $${cycleIncome} income. Total money: $${this.money}`);
            this.updateUI();
        }
    }

    // --- Game Reset Logic ---
    restartGame() {
        console.log("Game: restartGame() method entered.");
        
        // 1. Reset Money
        this.money = 5000; // Back to starting value
        
        // 2. Reset Timers
        this.timers.income.current = 0;
        
        // 3. Clear Buildings
        // Make a copy of the array because removeBuilding modifies it
        const buildingsToRemove = [...this.buildingManager.buildings];
        buildingsToRemove.forEach(building => {
            this.buildingManager.removeBuilding(building);
        });
        // Ensure the buildings array is definitely empty
        this.buildingManager.buildings = [];
        
        // 4. Reset Logical Grid
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        
        // 5. Reset Resource Manager
        this.resourceManager.reset(); // Call the new reset method
        
        // 6. Update UI to reflect reset state
        this.updateUI();
        
        console.log("Game: restartGame() method finished successfully.");
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
}