import * as THREE from 'three';
import { InputHandler } from '../utils/inputHandler.js';
import { BuildingManager } from '../managers/buildingManager.js';
import { AssetLoader } from '../managers/assetLoader.js';
import { GridManager } from '../managers/gridManager.js';
import { SceneManager } from '../managers/sceneManager.js';
import { CosmeticManager } from '../managers/cosmeticManager.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import { GridBuildingsContract } from '../contracts/GridBuildingsContract.js';
import { DistrictBuildingsContract } from '../contracts/DistrictBuildingsContract.js';
import { CosmeticItemsContract } from '../contracts/CosmeticItemsContract.js';
import Logger from '../utils/logger.js';
import { musicManager } from '../managers/musicManager.js';

export class Game {
    constructor(renderDiv, contracts = null) {
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
        this.cosmeticManager = null; // Will be initialized after scene is ready
        this.inputHandler = new InputHandler(this);
        
        // Use provided contracts or create new ones
        if (contracts) {
            this.gameStateContract = contracts.gameState;
            this.gridBuildingsContract = contracts.gridBuildings;
            this.districtBuildingsContract = contracts.districtBuildings;
            this.cosmeticItemsContract = contracts.cosmeticItems;
        } else {
            // Fallback: Initialize contracts (for standalone usage)
            this.gameStateContract = new GameStateContract();
            this.gridBuildingsContract = new GridBuildingsContract();
            this.districtBuildingsContract = new DistrictBuildingsContract();
            this.cosmeticItemsContract = new CosmeticItemsContract();
        }

        // Game initialization complete
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
        
        // Initialize music manager with camera for 3D audio
        musicManager.init(this.camera);
        
        // Load assets first
        await this.assetLoader.loadAssets();
        
        // Now create building manager after assets are loaded
        this.buildingManager = new BuildingManager(
            this.gridManager, 
            this.gameStateContract, 
            0, 
            this.assetLoader,
            this.gridBuildingsContract,
            this.districtBuildingsContract
        );
        this.buildingManager.setScene(this.scene, this.gridManager.getCellSize(), this.assetLoader);
        
        // Initialize cosmetic manager
        this.cosmeticManager = new CosmeticManager(this.scene, this.cosmeticItemsContract);
        
        // Set up input handlers
        Logger.info("Game: Setting up input handlers");
        this.inputHandler.setupEventListeners();
        
        // Show UI and update initial state
        Logger.info("Game: Setting up UI");
        this.showUI();
        
        // Start the game loop
        Logger.info("Game: Starting game loop");
        this.start();
        
        Logger.info("Game: Initialization complete");
    }

    start() {
        if (this.isRunning) {
            Logger.warn('Game is already running');
            return;
        }
        
        this.isRunning = true;
        this.clock.start();
        this.animate();
        Logger.info('Game started');
    }

    stop() {
        this.isRunning = false;
        this.clock.stop();
        Logger.info('Game stopped');
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

    // Cosmetic management methods
    async loadPlayerCosmetics(playerAddress) {
        if (this.cosmeticManager && playerAddress) {
            await this.cosmeticManager.loadPlayerCosmetics(playerAddress);
        }
    }

    removePlayerCosmetics(playerAddress) {
        if (this.cosmeticManager && playerAddress) {
            Logger.info(`Game: Removing cosmetics for player ${playerAddress}`);
            this.cosmeticManager.removePlayerCosmetics(playerAddress);
        }
    }

    dispose() {
        Logger.info("Game: Starting disposal");
        
        // Stop the game loop FIRST to prevent any further execution
        this.stop();
        
        // Dispose of input handler (includes event listener cleanup)
        if (this.inputHandler) {
            this.inputHandler.dispose();
            this.inputHandler = null;
        }
        
        // Dispose of building manager
        if (this.buildingManager) {
            this.buildingManager.dispose();
            this.buildingManager = null;
        }
        
        // Dispose of cosmetic manager
        if (this.cosmeticManager) {
            this.cosmeticManager.dispose();
            this.cosmeticManager = null;
        }
        
        // Dispose of scene manager (includes THREE.js cleanup)
        if (this.sceneManager) {
            this.sceneManager.dispose();
            this.sceneManager = null;
        }
        
        // Clear additional references that might hold memory
        this.raycaster = null;
        this.pointer = null;
        this.clock = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.groundPlane = null;
        this.gridHelper = null;
        this.assetLoader = null;
        this.grid = [];
        
        // Clear contract references
        this.gameStateContract = null;
        this.gridBuildingsContract = null;
        this.districtBuildingsContract = null;
        this.cosmeticItemsContract = null;
        
        Logger.info("Game: dispose() method completed");
    }
}