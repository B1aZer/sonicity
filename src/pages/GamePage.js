import * as THREE from 'three';
import { Game } from '../js/core/game.js';
import { LoadingScreen } from '../js/utils/loadingScreen.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { AccessControl } from '../js/utils/accessControl.js';
import { BasePage } from './BasePage.js';
import scenePerformanceLogger from '../js/utils/scenePerformanceLogger.js';
import { BUILDINGS, BUILDING_ENTER_DELAY } from '../js/utils/constants.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { AudioManager } from '../js/managers/audioManager.js';

import('../styles/game-page.css');


export class GamePage extends BasePage {
    constructor() {
        super();
        Logger.info('GamePage constructor called');
        this.element.className = 'game-page';
        this.game = null;
        this.resourceUpdateInterval = null;
        this.audioManager = new AudioManager();
        this.render();

        // Don't call setupGame() here - moved to onInitialized() to prevent race condition
    }

    async onInitialized(walletResult) {
        try {
            Logger.info('GamePage onInitialized called with wallet:', walletResult);
            scenePerformanceLogger.start('game-page-init');
            
            // All contracts are already initialized by BasePage.initializeContracts()
            // Now setup the game since contracts are ready
            scenePerformanceLogger.start('game-setup');
            await this.setupGame();
            scenePerformanceLogger.end('game-setup');
            
            // Load all wallet-dependent data here (like other pages)
            scenePerformanceLogger.start('player-data-loading');
            await this.loadPlayerData();
            scenePerformanceLogger.end('player-data-loading');
            
            // Update resource display
            scenePerformanceLogger.start('resource-display-update');
            await this.updateResourceDisplay();
            scenePerformanceLogger.end('resource-display-update');
            
            // Check for outpost warnings on page load
            scenePerformanceLogger.start('outpost-warning-check');
            await this.checkOutpostWarning();
            scenePerformanceLogger.end('outpost-warning-check');
            
            // Hide loading screen after everything is completely loaded
            scenePerformanceLogger.start('loading-screen-hide');
            const renderDiv = this.element.querySelector('#renderDiv');
            if (renderDiv) {
                LoadingScreen.hide(renderDiv);
            }
            scenePerformanceLogger.end('loading-screen-hide');
            
            scenePerformanceLogger.end('game-page-init');
            scenePerformanceLogger.milestone('game-page-complete');
            
            Logger.info('GamePage initialized successfully');
        } catch (error) {
            Logger.error('Error initializing game page:', error);
            this.modal.error('Failed to initialize game page. Please try refreshing the page.');
        }
    }

    /**
     * Preload a page using the router's preload method
     * @param {string} route - The route to preload (with leading slash)
     */
    async preloadPage(route) {
        if (window.appRouter) {
            // Remove leading slash for router
            const routeWithoutSlash = route.startsWith('/') ? route.slice(1) : route;
            await window.appRouter.preloadPage(routeWithoutSlash);
        } else {
            Logger.warn('Router not available for preloading');
        }
    }

    async updateResourceDisplay() {
        try {
            const playerAddress = await this.contracts.gameState.getAddress();
            // OPTIMIZATION: Get all resource data in parallel
            const [gold, food, activeBuildings, buildingSlots, repPoints, diamonds] = await Promise.all([
                this.contracts.gameState.getPlayerGold(playerAddress),
                this.contracts.gameState.getPlayerFood(playerAddress),
                this.contracts.gridBuildings.getActiveBuildings(playerAddress),
                this.contracts.gameState.getBuildingSlots(playerAddress),
                this.contracts.gameState.getPlayerRep(playerAddress),
                this.contracts.gameState.getPlayerDiamonds(playerAddress)
            ]);
            
            // TODO: Implement gems contract calls
            const gems = 0; // await this.contracts.gameState.getPlayerGems(playerAddress);
            
            Logger.info('Resource values:', {
                gold: gold.toString(),
                food: food.toString(),
                buildingsBuilt: activeBuildings.length,
                buildingSlots: buildingSlots.toString(),
                repPoints: repPoints.toString(),
                gems: gems.toString(),
                diamonds: diamonds.toString()
            });
            
            const goldElement = this.element.querySelector('#gold-amount');
            const foodElement = this.element.querySelector('#food-amount');
            const buildingSlotsElement = this.element.querySelector('#building-slots');
            const maxBuildingSlotsElement = this.element.querySelector('#max-building-slots');
            const repPointsElement = this.element.querySelector('#rep-points');
            const gemsElement = this.element.querySelector('#gems-amount');
            const diamondsElement = this.element.querySelector('#diamonds-amount');
            
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
            if (gemsElement) {
                gemsElement.textContent = gems.toString();
            }
            if (diamondsElement) {
                diamondsElement.textContent = diamonds.toString();
            }
        } catch (error) {
            Logger.error('Error updating resource display:', error);
        }
    }

    async checkOutpostWarning() {
        try {
            const playerAddress = await this.contracts.gameState.getAddress();
            const activeBattle = await this.contracts.battleSystem.getActiveBattle(playerAddress);
            
            // Check if player is in battle as defender and hasn't seen the warning yet
            if (activeBattle && 
                activeBattle[1] === playerAddress && // defender
                !activeBattle[12]) { // outpostWarningShown
                
                // Get current blockchain time
                const provider = this.contracts.gameState.provider;
                const currentBlock = await provider.getBlock('latest');
                const now = currentBlock.timestamp;
                
                // Calculate time remaining until battle resolution
                const battleStartTime = Number(activeBattle[2]); // startTime
                const battleDuration = 24 * 60 * 60; // 24 hours in seconds
                const battleEndTime = battleStartTime + battleDuration;
                const timeRemaining = Math.max(0, battleEndTime - now);
                const hoursRemaining = Math.floor(timeRemaining / (60 * 60));
                const minutesRemaining = Math.floor((timeRemaining % (60 * 60)) / 60);
                
                const timeString = hoursRemaining > 0 
                    ? `${hoursRemaining}h ${minutesRemaining}m remaining`
                    : `${minutesRemaining}m remaining`;
                
                // Show warning modal
                const modalContent = `ENEMY ATTACK IN PROGRESS!<br><br>
                    Your district is under attack by enemy forces!<br><br>
                    Battle duration: ${timeString}.<br><br>
                    Deploy your troops to the Garrison and prepare your defenses!`;
                
                const result = await this.modal.confirm(
                    modalContent,
                    { 
                        title: 'Battle Alert',
                        confirmButtonText: 'Acknowledge',
                        showCancelButton: false,
                        icon: 'warning'
                    }
                );
                
                if (result.isConfirmed) {
                    // User confirmed the warning
                    await this.contracts.battleSystem.confirmOutpostWarning();
                }
            }
        } catch (error) {
            Logger.error('Error checking outpost warning:', error);
        }
    }

    async setupGame() {
        try {
            scenePerformanceLogger.start('game-creation');
            const renderDiv = this.element.querySelector('#renderDiv');
            this.game = new Game(renderDiv, this.contracts);
            scenePerformanceLogger.end('game-creation');
            
            // Show loading screen before starting initialization
            scenePerformanceLogger.start('loading-screen-show');
            LoadingScreen.show(renderDiv);
            scenePerformanceLogger.end('loading-screen-show');
            
            // Initialize the game and wait for it to complete
            scenePerformanceLogger.start('game-init-call');
            await this.game.init();
            scenePerformanceLogger.end('game-init-call');

            // Update resource display initially
            scenePerformanceLogger.start('initial-resource-display-update');
            await this.updateResourceDisplay();
            scenePerformanceLogger.end('initial-resource-display-update');
            
            // Set up periodic updates for resource display and outpost warnings
            this.resourceUpdateInterval = setInterval(() => {
                this.updateResourceDisplay().catch(error => {
                    Logger.error('Error in periodic resource update:', error);
                });
                this.checkOutpostWarning().catch(error => {
                    Logger.error('Error checking outpost warning:', error);
                });
            }, 10000); // Update every 10 seconds
            
            // Ensure scene and assets are initialized before placing buildings
            if (!this.game.scene || !this.game.globalAssetCache.isAssetsLoaded()) {
                throw new Error('Scene or assets not initialized');
            }

            // Place district buildings
            try {
                scenePerformanceLogger.start('district-buildings-placement');
                // Get built district buildings from contract
                const builtDistrictBuildings = await this.contracts.districtBuildings.getBuiltBuildings();
                Logger.info('Retrieved district buildings:', builtDistrictBuildings);

                // Place all built district buildings in parallel for better performance
                const buildingPlacementPromises = builtDistrictBuildings.map(async (building) => {
                    const buildingConfig = BUILDINGS[building.name];
                    if (buildingConfig) {
                        const position = new THREE.Vector3(
                            buildingConfig.position.x,
                            buildingConfig.position.y,
                            buildingConfig.position.z
                        );
                        
                        // Time individual building placement for debugging
                        const startTime = performance.now();
                        const placedBuilding = await this.game.buildingManager.placeFixedBuilding(
                            building.name,
                            position,
                            buildingConfig.rotation,
                            building.level
                        );
                        const endTime = performance.now();
                        
                        if (!placedBuilding) {
                            Logger.error(`Failed to place district building: ${building.name} (${(endTime - startTime).toFixed(2)}ms)`);
                            return { success: false, building: building.name, time: endTime - startTime };
                        } else {
                            Logger.info(`Successfully placed district building: ${building.name} (${(endTime - startTime).toFixed(2)}ms)`);
                            return { success: true, building: building.name, time: endTime - startTime };
                        }
                    }
                    return { success: false, building: building.name, reason: 'No config found', time: 0 };
                });
                
                // Wait for all buildings to be placed in parallel
                const placementResults = await Promise.all(buildingPlacementPromises);
                
                // Log summary with performance metrics
                const successful = placementResults.filter(r => r.success);
                const failed = placementResults.filter(r => !r.success);
                const totalTime = placementResults.reduce((sum, r) => sum + (r.time || 0), 0);
                const avgTime = successful.length > 0 ? totalTime / successful.length : 0;
                
                Logger.info(`District building placement complete: ${successful.length} successful, ${failed.length} failed`);
                Logger.info(`Performance: Total time ${totalTime.toFixed(2)}ms, Average per building ${avgTime.toFixed(2)}ms`);
                scenePerformanceLogger.end('district-buildings-placement');
            } catch (error) {
                Logger.error('Error placing district buildings:', error);
            }

            // Set up click handlers for the buildings
            scenePerformanceLogger.start('click-handlers-setup');
            if (this.game.renderer && this.game.renderer.domElement) {
                this.setupClickHandlers();
            } else {
                Logger.error('Renderer not initialized');
            }
            scenePerformanceLogger.end('click-handlers-setup');

            Logger.info('Game setup complete (loading screen still visible)');
        } catch (error) {
            Logger.error('Error in setupGame:', error);
            this.modal.error('Failed to setup game. Please try refreshing the page.');
        }
    }

    /**
     * Load player's grid buildings and place them in the scene
     */
    async loadPlayerBuildings(playerAddress) {
        try {
            // Get all house building IDs from contract
            const activeBuildings = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active buildings:', activeBuildings);

            // OPTIMIZATION: Fetch all building data in parallel
            Logger.info('Fetching building data in parallel...');
            const buildingDataPromises = activeBuildings.map(async (buildingId) => {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                return { buildingId, building };
            });
            
            const buildingDataResults = await Promise.all(buildingDataPromises);
            Logger.info(`Fetched ${buildingDataResults.length} building data entries in parallel`);

            // Process buildings sequentially (position search needs to be sequential)
            for (const { buildingId, building } of buildingDataResults) {
                Logger.info('Processing building:', buildingId);
                
                // Skip if building type is 0 and level is 0 (inactive building)
                if (building.buildingType === 0 && building.level === 0) {
                    Logger.info('Skipping building - inactive:', {
                        buildingId: buildingId.toString(),
                        buildingType: building.buildingType,
                        level: building.level
                    });
                    continue;
                }

                const buildingType = this.getBuildingTypeFromContract(building.buildingType);
                if (!buildingType) {
                    Logger.warn('Unknown building type:', building.buildingType);
                    continue;
                }

                Logger.info('Placing building:', {
                    buildingId: buildingId.toString(),
                    buildingType,
                    level: building.level
                });

                // Find an available position for this building using spiral search
                let foundPosition = false;
                let gridX = 0, gridZ = 0;

                // Start from the center and spiral outward
                const center = Math.floor(this.game.gridManager.getGridSize() / 2);
                Logger.info('Starting position search from center:', { center, gridSize: this.game.gridManager.getGridSize() });
                
                for (let layer = 0; layer < this.game.gridManager.getGridSize(); layer++) {
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
                        Logger.error(`Failed to place ${buildingType.toLowerCase()}`);
                    }
                } else {
                    Logger.error('No available position found for building');
                }
            }
        } catch (error) {
            Logger.error('Error loading player buildings:', error);
            throw error;
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
                // Filter out Line objects (grid lines) and look for the first building object
                let clickedObject = null;
                
                for (const intersection of intersects) {
                    const obj = intersection.object;
                    
                    // Skip Line objects (grid lines)
                    if (obj.type === 'Line') {
                        continue;
                    }
                    
                    // Check if this object or any of its parents has building userData
                    let current = obj;
                    while (current) {
                        if (current.userData && this.hasBuildingType(current.userData)) {
                            clickedObject = current;
                            break;
                        }
                        current = current.parent;
                    }
                    
                    if (clickedObject) {
                        break;
                    }
                }
                
                if (!clickedObject) {
                    Logger.info('No building object found in click intersections');
                    return;
                }
                
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
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/revenue-hub');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/revenue-hub');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isCityhall) {
                    Logger.info('City Hall clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/city');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/city');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isAltar) {
                    Logger.info('Altar clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/stake');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/stake');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isHouse) {
                    Logger.info('House clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/house');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/house');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isFarm) {
                    Logger.info('Farm clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/farm');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/farm');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isDiamondstation) {
                    Logger.info('Diamond Station clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/diamond-station');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/diamond-station');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isRepforge) {
                    Logger.info('REP Forge clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/rep-forge');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/rep-forge');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isYieldstation) {
                    Logger.info('Yield Station clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/yield-station');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/yield-station');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isArcanumofnames) {
                    Logger.info('Arcanum of Names clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/arcanum');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/arcanum');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isShop) {
                    Logger.info('Shop clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/shop');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/shop');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isWorkshop) {
                    Logger.info('Workshop clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/workshop');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/workshop');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isBarracks) {
                    Logger.info('Barracks clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/barracks');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/barracks');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isScoutguild) {
                    Logger.info('Scout Guild clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/scout-guild');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/scout-guild');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isCommandcenter) {
                    Logger.info('Command Center clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/command-center');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/command-center');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isTavern) {
                    Logger.info('Tavern clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/tavern');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/tavern');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isTacticscenter) {
                    Logger.info('Tactics Center clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/tactics-center');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/tactics-center');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isGarrison) {
                    Logger.info('Garrison clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/garrison');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/garrison');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                } else if (clickedObject.userData.isOutpost) {
                    Logger.info('Outpost clicked');
                    this.audioManager.playBuildingEnter();
                    this.preloadPage('/outpost');
                    setTimeout(() => {
                        window.history.pushState({}, '', '/outpost');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }, BUILDING_ENTER_DELAY);
                }
            }
        });
    }

    /**
     * Helper method to check if userData contains any building type flags
     */
    hasBuildingType(userData) {
        const buildingTypes = [
            'isMine', 'isCityhall', 'isAltar', 'isHouse', 'isFarm', 'isDiamondstation',
            'isRepforge', 'isYieldstation', 'isArcanumofnames', 'isShop', 'isWorkshop',
            'isBarracks', 'isScoutguild', 'isCommandcenter', 'isGarrison', 'isOutpost', 'isTavern', 'isTacticscenter'
        ];
        
        return buildingTypes.some(type => userData[type] === true);
    }

    render() {
        this.element.innerHTML = `
            <div id="renderDiv"></div>
            
            <!-- UI Container -->
            <div id="ui-container">
                <div id="resource-display">
                    Gold: <span id="gold-amount" style="color: #FFD700; font-weight: bold;">0</span><br>
                    Food: <span id="food-amount" style="color: #90EE90; font-weight: bold;">0</span><br>
                    Gems: <span id="gems-amount" style="color: #E91E63; font-weight: bold;">0</span><br>
                    Diamonds: <span id="diamonds-amount" style="color: #00BCD4; font-weight: bold;">0</span><br>
                    Rep Points: <span id="rep-points" style="color: #4CAF50; font-weight: bold;">0</span><br>
                    Building Slots: <span id="building-slots" style="color: #87CEEB; font-weight: bold;">0</span>/<span id="max-building-slots" style="color: #87CEEB; font-weight: bold;">0</span>
                </div>
            </div>
        `;
    }
 
    unmount() {
        // Clear the resource update interval
        if (this.resourceUpdateInterval) {
            clearInterval(this.resourceUpdateInterval);
        }
        
        if (this.game) {
            this.game.dispose();
        }
        
        // Call parent unmount to properly clean up event listeners
        super.unmount();
    }

    /**
     * Map building type from contract to string
     */
    getBuildingTypeFromContract(buildingType) {
        if (buildingType === GridBuildingsContract.BuildingType.HOUSE) {
            return 'HOUSE';
        } else if (buildingType === GridBuildingsContract.BuildingType.FARM) {
            return 'FARM';
        } else if (buildingType === GridBuildingsContract.BuildingType.DIAMOND_STATION) {
            return 'DIAMOND_STATION';
        } else if (buildingType === GridBuildingsContract.BuildingType.REP_FORGE) {
            return 'REP_FORGE';
        } else if (buildingType === GridBuildingsContract.BuildingType.YIELD_STATION) {
            return 'YIELD_STATION';
        } else {
            return null;
        }
    }

    /**
     * Load all player-specific data (buildings, cosmetics, etc.)
     * This is called from onInitialized() for both existing and new wallet connections
     */
    async loadPlayerData() {
        try {
            const playerAddress = await this.contracts.gameState.getAddress();
            Logger.info('Loading player data for:', playerAddress);

            // Load player's grid buildings
            await this.loadPlayerBuildings(playerAddress);
            
            // Load player's cosmetics
            if (this.game && this.game.cosmeticManager) {
                await this.game.loadPlayerCosmetics(playerAddress);
            }
            
            Logger.info('Player data loaded successfully');
        } catch (error) {
            Logger.error('Error loading player data:', error);
            throw error;
        }
    }
} 