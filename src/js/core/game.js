import * as THREE from 'three';
import { InputHandler } from '../utils/inputHandler.js';
import { BuildingManager } from '../managers/buildingManager.js';
import { ResourceManager } from '../managers/resourceManager.js';
import { UI } from '../utils/ui.js';
import { AssetLoader } from '../managers/assetLoader.js';
import { BUILDING_TYPES } from '../utils/constants.js';

export class Game {
    constructor(renderTarget) {
        this.renderTarget = renderTarget;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.selectedBuilding = null;
        
        // Initialize managers
        this.assetLoader = new AssetLoader();
        this.buildingManager = new BuildingManager(this.scene);
        this.resourceManager = new ResourceManager();
        this.inputHandler = new InputHandler(this.camera, this.scene, this.buildingManager);
        
        // Initialize UI
        this.ui = new UI(
            (buildingType) => this.setSelectedBuilding(buildingType),
            () => this.restart()
        );
        
        // Set up camera
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Set up renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderTarget.appendChild(this.renderer.domElement);
        
        // Set up lights
        this.setupLights();
        
        // Set up ground
        this.setupGround();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    async init() {
        // Load assets
        await this.assetLoader.loadAll();
        
        // Initialize building models
        this.buildingManager.initModels(this.assetLoader);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start the game loop
        this.isRunning = true;
        this.animate();
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }
    
    stop() {
        this.isRunning = false;
    }
    
    restart() {
        // Clear all buildings
        this.buildingManager.clearAllBuildings();
        
        // Reset resources
        this.resourceManager.reset();
        
        // Update UI
        this.ui.updateResources(this.resourceManager.getResources());
        
        // Reset camera
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Reset selected building
        this.setSelectedBuilding('house');
        
        // Update UI buttons
        document.querySelectorAll('.game-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.game-button[data-building="house"]').classList.add('active');
    }
    
    setSelectedBuilding(buildingType) {
        this.selectedBuilding = buildingType;
        this.inputHandler.setSelectedBuilding(buildingType);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
    }
    
    setupGround() {
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7CFC00,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);
    }
    
    setupEventListeners() {
        // Handle building placement
        this.inputHandler.onBuildingPlaced = (buildingType, position) => {
            // Check if player has enough resources
            const buildingCost = BUILDING_TYPES[buildingType].cost;
            if (this.resourceManager.canAfford(buildingCost)) {
                // Deduct resources
                this.resourceManager.deductResources(buildingCost);
                
                // Place building
                this.buildingManager.placeBuilding(buildingType, position);
                
                // Update UI
                this.ui.updateResources(this.resourceManager.getResources());
            } else {
                // Not enough resources
                console.log('Not enough resources to place building');
                // TODO: Show error message to user
            }
        };
        
        // Handle building removal
        this.inputHandler.onBuildingRemoved = (building) => {
            // Remove building
            this.buildingManager.removeBuilding(building);
            
            // Update UI
            this.ui.updateResources(this.resourceManager.getResources());
        };
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        // Update building animations
        this.buildingManager.update(delta);
        
        // Update resources based on buildings
        this.resourceManager.update(this.buildingManager.getBuildings());
        
        // Update UI
        this.ui.updateResources(this.resourceManager.getResources());
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}