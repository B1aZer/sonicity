import '../styles/game-page.css';
import * as THREE from 'three';
import { Game } from '../js/core/game.js';
import { LoadingScreen } from '../js/utils/loadingScreen.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { AccessControl } from '../js/utils/accessControl.js';
import { BasePage } from './BasePage.js';
import { BUILDINGS } from '../js/utils/constants.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';

export class GamePage extends BasePage {
    constructor() {
        super();
        this.element = document.createElement('div');
        this.element.className = 'game-page';
        this.modal = new Modal();
        this.render();
        this.setupGame();
    }

    async onInitialized(walletResult) {
        try {
            // All contracts are already initialized by BasePage.initializeContracts()
            // Just update the resource display
            await this.updateResourceDisplay();
        } catch (error) {
            Logger.error('Error initializing game page:', error);
            this.modal.error('Failed to initialize game page. Please try refreshing the page.');
        }
    }

    async updateResourceDisplay() {
        try {
            const playerAddress = await this.contracts.gameState.getAddress();
            const [gold, food, activeBuildings, buildingSlots, repPoints] = await Promise.all([
                this.contracts.gameState.getPlayerGold(playerAddress),
                this.contracts.gameState.getPlayerFood(playerAddress),
                this.contracts.gridBuildings.getActiveBuildings(playerAddress),
                this.contracts.gameState.getBuildingSlots(playerAddress),
                this.contracts.gameState.getPlayerRep(playerAddress)
            ]);
            
            Logger.info('Resource values:', {
                gold: gold.toString(),
                food: food.toString(),
                buildingsBuilt: activeBuildings.length,
                buildingSlots: buildingSlots.toString(),
                repPoints: repPoints.toString()
            });
            
            const goldElement = this.element.querySelector('#gold-amount');
            const foodElement = this.element.querySelector('#food-amount');
            const buildingSlotsElement = this.element.querySelector('#building-slots');
            const maxBuildingSlotsElement = this.element.querySelector('#max-building-slots');
            const repPointsElement = this.element.querySelector('#rep-points');
            
            if (goldElement) {
                goldElement.textContent = gold.toString();
            }
            if (foodElement) {
                foodElement.textContent = food.toString();
            }
            if (buildingSlotsElement) {
                buildingSlotsElement.textContent = activeBuildings.length.toString();
            }
            if (maxBuildingSlotsElement) {
                maxBuildingSlotsElement.textContent = buildingSlots.toString();
            }
            if (repPointsElement) {
                repPointsElement.textContent = repPoints.toString();
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

            // Place district buildings
            try {
                // Get built district buildings from contract
                const builtDistrictBuildings = await this.contracts.districtBuildings.getBuiltBuildings();
                Logger.info('Retrieved district buildings:', builtDistrictBuildings);

                // Place each built district building
                for (const building of builtDistrictBuildings) {
                    const buildingConfig = BUILDINGS[building.name];
                    if (buildingConfig) {
                        const placedBuilding = this.game.buildingManager.placeFixedBuilding(
                            building.name,
                            new THREE.Vector3(buildingConfig.position.x, buildingConfig.position.y, buildingConfig.position.z),
                            buildingConfig.rotation
                        );
                        
                        if (!placedBuilding) {
                            Logger.error(`Failed to place district building: ${building.name}`);
                        } else {
                            Logger.info(`Successfully placed district building: ${building.name}`);
                        }
                    }
                }
            } catch (error) {
                Logger.error('Error placing district buildings:', error);
            }

            // Get all house building IDs from contract
            const playerAddress = await this.contracts.gameState.getAddress();
            const activeBuildings = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active buildings:', activeBuildings);

            // Place houses on the grid
            for (const buildingId of activeBuildings) {
                Logger.info('Processing building:', buildingId);
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                
                // Skip if building type is 0 and level is 0 (inactive building)
                if (building.buildingType === 0n && building.level === 0n) {
                    Logger.info('Skipping building - inactive:', {
                        buildingType: building.buildingType,
                        level: building.level
                    });
                    continue;
                }

                // Map building type to string
                let buildingType;
                if (building.buildingType === GridBuildingsContract.BuildingType.HOUSE) {
                    buildingType = 'HOUSE';
                } else if (building.buildingType === GridBuildingsContract.BuildingType.FARM) {
                    buildingType = 'FARM';
                } else {
                    Logger.info('Skipping building - unknown type:', {
                        buildingType: building.buildingType
                    });
                    continue;
                }

                Logger.info(`Placing ${buildingType.toLowerCase()}:`, building);

                // Find an available grid position
                let foundPosition = false;
                let gridX = 0, gridZ = 0;

                // Start from the center and spiral outward
                const center = Math.floor(gridSize / 2);
                Logger.info('Starting position search from center:', { center, gridSize });
                
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
                            Logger.info('Checking position:', pos);
                            if (this.game.gridManager.isValidPosition(pos.x, pos.z) && 
                                !this.game.gridManager.isCellOccupied(pos.x, pos.z)) {
                                gridX = pos.x;
                                gridZ = pos.z;
                                foundPosition = true;
                                Logger.info('Found available position:', { gridX, gridZ });
                                break;
                            }
                        }
                        if (foundPosition) break;
                    }
                    if (foundPosition) break;
                }

                if (foundPosition) {
                    const position = this.game.gridManager.getWorldPosition(gridX, gridZ);
                    Logger.info('Calculated world position:', position);
                    const house = this.game.buildingManager.placeBuilding(buildingType, position);
                    if (house) {
                        this.game.gridManager.occupyCell(gridX, gridZ, house.mesh);
                        Logger.info(`Successfully placed ${buildingType.toLowerCase()} at grid position (${gridX}, ${gridZ})`);
                    } else {
                        Logger.error(`Failed to place ${buildingType.toLowerCase()} at grid position (${gridX}, ${gridZ})`);
                    }
                } else {
                    Logger.error('No available grid position found for house');
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
            Logger.error('Error in setupGame:', error);
            this.modal.error('Failed to setup game. Please try refreshing the page.');
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
                    window.history.pushState({}, '', '/mint');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isCityhall) {
                    Logger.info('City Hall clicked');
                    window.history.pushState({}, '', '/city');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isAltar) {
                    Logger.info('Altar clicked');
                    window.history.pushState({}, '', '/stake');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isHouse) {
                    Logger.info('House clicked');
                    window.history.pushState({}, '', '/house');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isFarm) {
                    Logger.info('Farm clicked');
                    window.history.pushState({}, '', '/farm');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isShop) {
                    Logger.info('Shop clicked');
                    window.history.pushState({}, '', '/shop');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isWorkshop) {
                    Logger.info('Workshop clicked');
                    window.history.pushState({}, '', '/workshop');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isBarracks) {
                    Logger.info('Barracks clicked');
                    window.history.pushState({}, '', '/barracks');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } else if (clickedObject.userData.isScoutguild) {
                    Logger.info('Scout Guild clicked');
                    window.history.pushState({}, '', '/scout-guild');
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
                    Food: <span id="food-amount" style="color: #90EE90; font-weight: bold;">0</span><br>
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