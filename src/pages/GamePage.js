import '../styles/game-page.css';
import * as THREE from 'three';
import { Game } from '../js/core/game.js';
import { LoadingScreen } from '../js/utils/loadingScreen.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { Toast } from '../js/utils/toast.js';

export class GamePage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'game-page';
        this.gameStateContract = new GameStateContract();
        this.render();
        this.setupGame();
    }

    setupGame() {
        const renderDiv = this.element.querySelector('#renderDiv');
        this.game = new Game(renderDiv);
        
        // Show loading screen before starting initialization
        LoadingScreen.show(renderDiv);
        
        // Initialize the game and wait for it to complete
        this.game.init().then(() => {
            // Load assets first
            return this.game.assetLoader.loadAssets();
        }).then(() => {
            // Wait for assets to load and ensure they're ready
            return this.game.assetLoader.waitForLoad();
        }).then(async () => {
            // Check if user has joined a city
            try {
                const cityId = await this.gameStateContract.getPlayerCity();
                if (cityId === 0) {
                    // User hasn't joined a city yet
                    Toast.error('Please join a city first before accessing the game overview.');
                    return;
                }
                
                // Update building slots display
                await this.updateBuildingSlots();
            } catch (error) {
                console.error('Error checking city status:', error);
                Toast.error('Error checking city status. Please try again.');
                return;
            }

            // Place the buildings
            const gridSize = this.game.gridSize;
            const cellSize = this.game.gridCellSize;
            const gridRadius = (gridSize * cellSize) / 2;
            
            // Calculate positions in a semi-circle around the grid
            const radius = gridRadius + (cellSize * 2); // Place buildings 2 cells away from grid edge
            const angleStep = Math.PI / 3; // 60 degrees between buildings
            
            // Place PowerPlant as Mine (right side)
            const mineAngle = - Math.PI / 2; // 0 degrees (right side)
            const minePosition = new THREE.Vector3(
                Math.cos(mineAngle) * radius,  // X position
                0,
                Math.sin(mineAngle) * radius   // Z position
            );
            const mine = this.game.buildingManager.placeBuilding('MINE', minePosition);
            if (mine && mine.mesh) {
                mine.mesh.userData.isMine = true;
                mine.mesh.rotation.y = Math.PI / 2; // Rotate 90 degrees to face center
            }
            
            // Place WaterPump as City Hall (left side)
            const cityHallAngle = Math.PI; // 180 degrees
            const cityHallPosition = new THREE.Vector3(
                Math.cos(cityHallAngle) * radius,  // X position
                0,
                Math.sin(cityHallAngle) * radius   // Z position
            );
            const cityHall = this.game.buildingManager.placeBuilding('CITY_HALL', cityHallPosition);
            if (cityHall && cityHall.mesh) {
                cityHall.mesh.userData.isCityHall = true;
                cityHall.mesh.rotation.y = 0; // Rotate 180 degrees
            }
            
            // Place Shop as Altar (top)
            const altarAngle = Math.PI / 2; // 90 degrees
            const altarPosition = new THREE.Vector3(
                Math.cos(altarAngle) * radius,  // X position
                0,
                Math.sin(altarAngle) * radius   // Z position
            );
            const altar = this.game.buildingManager.placeBuilding('ALTAR', altarPosition);
            if (altar && altar.mesh) {
                altar.mesh.userData.isAltar = true;
                altar.mesh.rotation.y = altarAngle; // Rotate to face center
            }

            // Set up click handlers for the buildings
            this.setupBuildingClickHandlers();

            // Hide loading screen after all buildings are placed and click handlers are set up
            LoadingScreen.hide(renderDiv);
        }).catch(error => {
            console.error('Error during game setup:', error);
            LoadingScreen.hide(renderDiv);
            Toast.error('Error during game setup. Please try again.');
        });
    }

    setupBuildingClickHandlers() {
        // Add click handler to the renderer
        this.game.renderer.domElement.addEventListener('click', (event) => {
            // Calculate mouse position in normalized device coordinates
            const rect = this.game.renderer.domElement.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Update the picking ray with the camera and mouse position
            this.game.raycaster.setFromCamera(new THREE.Vector2(x, y), this.game.camera);

            // Calculate objects intersecting the picking ray
            const intersects = this.game.raycaster.intersectObjects(this.game.scene.children, true);

            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                // Find the parent building mesh if we clicked a child mesh
                const buildingMesh = this.findParentBuilding(clickedObject);
                
                if (buildingMesh) {
                    if (buildingMesh.userData.isMine) {
                        Toast.info('Mine is not operational yet. Coming soon!');
                    } else if (buildingMesh.userData.isCityHall) {
                        window.history.pushState({}, '', '/dashboard');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    } else if (buildingMesh.userData.isAltar) {
                        window.history.pushState({}, '', '/stake');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                }
            }
        });
    }

    findParentBuilding(object) {
        let current = object;
        while (current) {
            if (current.userData.isMine || current.userData.isCityHall || current.userData.isAltar) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    showStakeNFTModal() {
        const modal = document.createElement('div');
        modal.className = 'stake-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Stake NFTs</h2>
                <p>Stake your NFTs to receive building slots for houses.</p>
                <div class="nft-grid">
                    <!-- NFTs will be loaded here -->
                </div>
                <div class="modal-actions">
                    <button class="stake-button">Stake Selected</button>
                    <button class="close-button">Close</button>
                </div>
            </div>
        `;

        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.remove();
        });

        this.element.appendChild(modal);
    }

    render() {
        this.element.innerHTML = `
            <div id="renderDiv"></div>
            
            <!-- UI Container -->
            <div id="ui-container">
                <div id="resource-display">
                    Gold: <span id="gold-amount" style="color: #FFD700; font-weight: bold;">0</span><br>
                    Rep Points: <span id="rep-points" style="color: #4CAF50; font-weight: bold;">0</span><br>
                    Building Slots: <span id="building-slots" style="color: #87CEEB; font-weight: bold;">0</span>/<span id="max-building-slots" style="color: #87CEEB; font-weight: bold;">0</span>
                </div>
            </div>
        `;
    }

    async updateBuildingSlots() {
        try {
            const buildingSlots = await this.gameStateContract.getBuildingSlots();
            const maxBuildingSlots = await this.gameStateContract.getMaxBuildingSlots();
            
            const buildingSlotsElement = this.element.querySelector('#building-slots');
            const maxBuildingSlotsElement = this.element.querySelector('#max-building-slots');
            
            if (buildingSlotsElement && maxBuildingSlotsElement) {
                buildingSlotsElement.textContent = buildingSlots;
                maxBuildingSlotsElement.textContent = maxBuildingSlots;
            }
        } catch (error) {
            console.error('Error updating building slots:', error);
        }
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        if (this.game) {
            this.game.dispose();
        }
        this.element.remove();
    }
} 