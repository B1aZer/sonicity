import '../styles/game-page.css';
import * as THREE from 'three';
import { Game } from '../js/core/game.js';
import { LoadingScreen } from '../js/utils/loadingScreen.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { AccessControl } from '../js/utils/accessControl.js';
import { BasePage } from './BasePage.js';

export class GamePage extends BasePage {
    constructor() {
        super();
        this.element = document.createElement('div');
        this.element.className = 'game-page';
        this.gameStateContract = new GameStateContract();
        this.modal = new Modal();
        this.render();
        this.setupGame();
    }

    async onInitialized(walletResult) {
        try {
            await this.updateResourceDisplay();
        } catch (error) {
            Logger.error('Error initializing game page:', error);
            this.modal.error('Failed to initialize game page. Please try refreshing the page.');
        }
    }

    async updateResourceDisplay() {
        try {
            const [gold, totalBuildings, maxBuildingSlots] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getTotalBuildings(),
                this.contracts.gameState.getMaxBuildingSlots()
            ]);
            
            Logger.info('Resource values:', {
                gold: gold.toString(),
                buildingsBuilt: totalBuildings,
                maxBuildingSlots: maxBuildingSlots.toString()
            });
            
            const goldElement = this.element.querySelector('#gold-amount');
            const buildingSlotsElement = this.element.querySelector('#building-slots');
            const maxBuildingSlotsElement = this.element.querySelector('#max-building-slots');
            
            if (goldElement) {
                goldElement.textContent = gold.toString();
            }
            if (buildingSlotsElement) {
                buildingSlotsElement.textContent = totalBuildings.toString();
            }
            if (maxBuildingSlotsElement) {
                maxBuildingSlotsElement.textContent = maxBuildingSlots.toString();
            }
        } catch (error) {
            Logger.error('Error updating resource display:', error);
        }
    }

    async setupGame() {
        try {
            const renderDiv = this.element.querySelector('#renderDiv');
            this.game = new Game(renderDiv);
            
            // Show loading screen before starting initialization
            LoadingScreen.show(renderDiv);
            
            // Initialize the game and wait for it to complete
            await this.game.init();
            
            // Check if player is in a city
            if (!await AccessControl.checkCityAccess()) {
                LoadingScreen.hide(renderDiv);
                return;
            }

            // Update resource display initially
            await this.updateResourceDisplay();
            
            // Set up periodic updates for resource display
            this.resourceUpdateInterval = setInterval(() => {
                this.updateResourceDisplay().catch(error => {
                    Logger.error('Error in periodic resource update:', error);
                });
            }, 10000); // Update every 10 seconds
            
            // Ensure scene and assets are initialized before placing buildings
            if (!this.game.scene || !this.game.assetLoader.isLoadingComplete) {
                throw new Error('Scene or assets not initialized');
            }
            
            // Place the fixed buildings around the grid
            const gridSize = this.game.gridManager.getGridSize();
            const cellSize = this.game.gridManager.getCellSize();
            const gridRadius = (gridSize * cellSize) / 2;
            
            // Calculate positions in a semi-circle around the grid
            const radius = gridRadius + (cellSize * 2); // Increased distance from grid edge

            // Place static buildings first
            // Place Mine (right side)
            const minePosition = new THREE.Vector3(
                radius,  // X position
                0,
                0        // Z position
            );
            const mine = this.game.buildingManager.placeFixedBuilding('MINE', minePosition, -Math.PI / 2);
            if (!mine) {
                Logger.error('Failed to place Mine');
            }

            // Place City Hall (top)
            const cityHallPosition = new THREE.Vector3(
                0,        // X position
                0,
                -radius   // Z position
            );
            const cityHall = this.game.buildingManager.placeFixedBuilding('CITY_HALL', cityHallPosition, Math.PI);
            if (!cityHall) {
                Logger.error('Failed to place City Hall');
            }

            // Place Altar (left side)
            const altarPosition = new THREE.Vector3(
                -radius,  // X position
                0,
                0         // Z position
            );
            const altar = this.game.buildingManager.placeFixedBuilding('ALTAR', altarPosition, Math.PI / 2);
            if (!altar) {
                Logger.error('Failed to place Altar');
            }

            // Get all house building IDs from contract
            const houseIds = await this.contracts.gameState.getBuildingIdsOfType('house');
            Logger.info('Retrieved house IDs:', houseIds);

            // Place houses on the grid
            for (const houseId of houseIds) {
                const house = await this.contracts.gameState.getBuilding(houseId);
                if (!house.active) continue;

                Logger.info('Placing house:', house);

                // Find an available grid position
                let foundPosition = false;
                let gridX = 0, gridZ = 0;

                // Start from the center and spiral outward
                const center = Math.floor(gridSize / 2);
                for (let layer = 0; layer < gridSize; layer++) {
                    for (let i = -layer; i <= layer; i++) {
                        // Check all positions in the current layer
                        const positions = [
                            { x: center + i, z: center + layer },
                            { x: center + layer, z: center - i },
                            { x: center - i, z: center - layer },
                            { x: center - layer, z: center + i }
                        ];

                        for (const pos of positions) {
                            if (this.game.gridManager.isValidPosition(pos.x, pos.z) && 
                                !this.game.gridManager.isCellOccupied(pos.x, pos.z)) {
                                gridX = pos.x;
                                gridZ = pos.z;
                                foundPosition = true;
                                break;
                            }
                        }
                        if (foundPosition) break;
                    }
                    if (foundPosition) break;
                }

                if (!foundPosition) {
                    Logger.error('No available grid cells for house placement');
                    continue;
                }

                // Convert grid position to world position
                const worldPos = this.game.gridManager.getWorldPosition(gridX, gridZ);
                
                // Place the house
                const placedHouse = this.game.buildingManager.placeBuilding('HOUSE', worldPos);
                if (!placedHouse) {
                    Logger.error('Failed to place house');
                    this.game.gridManager.freeCell(gridX, gridZ);
                }
            }

            // Set up click handlers for the buildings
            if (this.game.renderer && this.game.renderer.domElement) {
                this.setupClickHandlers();
            } else {
                Logger.error('Renderer not initialized');
            }

            // Hide loading screen after all buildings are placed and click handlers are set up
            LoadingScreen.hide(renderDiv);
            
            Logger.info('Game setup complete');
        } catch (error) {
            Logger.error('Error in game setup:', error);
            LoadingScreen.hide(this.element.querySelector('#renderDiv'));
            this.modal.error('Failed to initialize game. Please try refreshing the page.');
        }
    }

    setupClickHandlers() {
        if (!this.game.renderer) {
            Logger.error('Renderer not initialized');
            return;
        }

        this.game.renderer.domElement.addEventListener('click', async (event) => {
            // Calculate mouse position in normalized device coordinates
            const rect = this.game.renderer.domElement.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update the picking ray with the camera and mouse position
            this.game.raycaster.setFromCamera({ x, y }, this.game.camera);
            
            // Find intersections
            const intersects = this.game.raycaster.intersectObjects(this.game.scene.children, true);
            
            Logger.info('Click detected, intersections:', intersects.length);
            
            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                Logger.info('Clicked object:', {
                    name: clickedObject.name,
                    userData: clickedObject.userData,
                    type: clickedObject.type,
                    parent: clickedObject.parent ? {
                        name: clickedObject.parent.name,
                        userData: clickedObject.parent.userData
                    } : null
                });
                
                // Check for building types using userData flags
                if (clickedObject.userData.isMine) {
                    Logger.info('Mine clicked');
                    this.modal.show('Mine is not operational yet. Coming soon!', { title: 'Mine' });
                } else if (clickedObject.userData.isCityhall) {
                    Logger.info('City Hall clicked');
                    window.history.pushState({}, '', '/dashboard');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isAltar) {
                    Logger.info('Altar clicked');
                    window.history.pushState({}, '', '/stake');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isHouse) {
                    Logger.info('House clicked');
                    window.history.pushState({}, '', '/house');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
            }
        });
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

    mount(container) {
        Logger.info('Mounting game page...');
        container.appendChild(this.element);
        // Initialize using base class method
        this.initialize().catch(error => {
            Logger.error('Error during game page initialization:', error);
            this.modal.error('Failed to initialize game page. Please try refreshing the page.');
        });
    }
 
    unmount() {
        // Clear the resource update interval
        if (this.resourceUpdateInterval) {
            clearInterval(this.resourceUpdateInterval);
        }
        
        if (this.game) {
            this.game.dispose();
        }
        this.element.remove();
    }
} 