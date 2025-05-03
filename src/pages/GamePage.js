import '../styles/game-page.css';
import * as THREE from 'three';
import { Game } from '../js/core/game.js';
import { LoadingScreen } from '../js/utils/loadingScreen.js';

export class GamePage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'game-page';
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
            // Wait for assets to load
            this.game.assetLoader.loadAssets().then(() => {
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
                const mine = this.game.buildingManager.placeBuilding('POWER_PLANT', minePosition);
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
                const cityHall = this.game.buildingManager.placeBuilding('WATER_TOWER', cityHallPosition);
                if (cityHall && cityHall.mesh) {
                    cityHall.mesh.userData.isCityHall = true;
                    cityHall.mesh.rotation.y = -cityHallAngle; // Rotate to face center
                }
                
                // Place Shop as Altar (top)
                const altarAngle = Math.PI / 2; // 90 degrees
                const altarPosition = new THREE.Vector3(
                    Math.cos(altarAngle) * radius,  // X position
                    0,
                    Math.sin(altarAngle) * radius   // Z position
                );
                const altar = this.game.buildingManager.placeBuilding('SHOP', altarPosition);
                if (altar && altar.mesh) {
                    altar.mesh.userData.isAltar = true;
                    altar.mesh.rotation.y = altarAngle; // Rotate to face center
                }

                // Set up click handlers for the buildings
                this.setupBuildingClickHandlers();

                // Hide loading screen after all buildings are placed and click handlers are set up
                LoadingScreen.hide(renderDiv);
            }).catch(error => {
                console.error('Error loading assets:', error);
                LoadingScreen.hide(renderDiv);
            });
        }).catch(error => {
            console.error('Error initializing game:', error);
            LoadingScreen.hide(renderDiv);
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
                        this.showMessage('Mine is not operational yet. Coming soon!');
                    } else if (buildingMesh.userData.isCityHall) {
                        window.history.pushState({}, '', '/dashboard');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    } else if (buildingMesh.userData.isAltar) {
                        this.showStakeNFTModal();
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

    showMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-popup';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <button class="close-button">OK</button>
            </div>
        `;
        
        messageDiv.querySelector('.close-button').addEventListener('click', () => {
            messageDiv.remove();
        });
        
        this.element.appendChild(messageDiv);
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
                    Rep Points: <span id="rep-points" style="color: #4CAF50; font-weight: bold;">0</span>
                </div>
            </div>
        `;
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