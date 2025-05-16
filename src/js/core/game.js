import * as THREE from 'three';
import { InputHandler } from '../utils/inputHandler.js';
import { BuildingManager } from '../managers/buildingManager.js';
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
        
        // Grid properties
        this.gridSize = 0; // Will be set in init
        this.gridCellSize = 0; // Will be set in init
        this.grid = []; // Logical grid to track occupied cells (stores building type or false)
        
        // Game state
        this.isRunning = false;
        
        // Managers
        this.assetLoader = new AssetLoader();
        this.buildingManager = null; // Will be initialized after assets are loaded
        this.inputHandler = new InputHandler(this);
        
        // Initialize contracts
        this.gameStateContract = new GameStateContract();

        // Get reference to money display
        this.goldDisplay = document.getElementById('gold-amount');
    }

    async init() {
        Logger.info("Game: Starting initialization");
        
        // Initialize grid manager first with gameStateContract
        await this.gridManager.initialize(this.gameStateContract);
        
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
        
        // Load assets first
        await this.assetLoader.loadAssets();
        
        // Now create building manager after assets are loaded
        this.buildingManager = new BuildingManager(this.gridManager, this.gameStateContract, 0, this.assetLoader);
        this.buildingManager.setScene(this.scene, this.gridManager.getCellSize(), this.assetLoader);
        
        // Set up input handlers
        Logger.info("Game: Setting up input handlers");
        this.inputHandler.setupEventListeners();
        
        // Show UI and update initial state
        Logger.info("Game: Setting up UI");
        this.showUI();
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
        
        // Update scene (including grass animation)
        if (this.sceneManager) {
            this.sceneManager.update();
        }
        
        // Update building manager
        if (this.buildingManager) {
            this.buildingManager.update(deltaTime);
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // UI methods
    showUI() {
        const uiContainer = document.getElementById('ui-container');
        if (uiContainer) {
            uiContainer.style.display = 'block';
        }
    }

    hideUI() {
        const uiContainer = document.getElementById('ui-container');
        if (uiContainer) {
            uiContainer.style.display = 'none';
        }
    }

    updateUI() {
        // Get money from contract (default to 0 if not implemented yet)
        const money = this.gameStateContract.getMoney?.() ?? 0;
        // Update gold display
        if (this.goldDisplay) {
            this.goldDisplay.textContent = money;
        }
    }

    // --- Game Reset Logic ---
    restartGame() {
        console.log("Game: restartGame() method entered.");
        
        // 1. Clear Buildings
        // Make a copy of the array because removeBuilding modifies it
        const buildingsToRemove = [...this.buildingManager.buildings];
        buildingsToRemove.forEach(building => {
            this.buildingManager.removeBuilding(building);
        });
        // Ensure the buildings array is definitely empty
        this.buildingManager.buildings = [];
        
        // 2. Reset Logical Grid
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        
        // 3. Update UI to reflect reset state
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
        this.inputHandler = null;
        
        console.log("Game: dispose() method completed");
    }
}