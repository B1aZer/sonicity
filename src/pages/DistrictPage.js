import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import { BasePage } from './BasePage.js';

import '../styles/district-page.css';
export class DistrictPage extends BasePage {
    constructor() {
        super();
        Logger.info('DistrictPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('DistrictPage onInitialized called with wallet:', walletResult.address);
        try {
            // Initialize GridBuildings contract
            this.contracts.gridBuildings = new GridBuildingsContract();
            await this.contracts.gridBuildings.initialize();
            
            await this.loadDistrictData();
            this.setupEventListeners();
            Logger.info('District page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing district page:', error);
            this.modal.error('Failed to initialize district page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
    }

    async loadDistrictData() {
        try {
            Logger.info('Starting to load district data...');
            
            const [gold, buildingSlots, activeBuildings] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getBuildingSlots(),
                this.contracts.gridBuildings.getActiveBuildings()
            ]);

            Logger.info('Received data from contract:', {
                gold: gold.toString(),
                buildingSlots: buildingSlots.toString(),
                totalBuildings: activeBuildings.length
            });

            // Update gold display
            const goldValue = this.element.querySelector('.gold-value');
            if (goldValue) {
                goldValue.textContent = gold.toString();
            }

            // Update total buildings display
            const buildingsValue = this.element.querySelector('.total-buildings-value');
            if (buildingsValue) {
                buildingsValue.textContent = activeBuildings.length.toString();
            }

            // Update building slots display
            const slotsValue = this.element.querySelector('.building-slots-value');
            if (slotsValue) {
                slotsValue.textContent = buildingSlots.toString();
            }

        } catch (error) {
            Logger.error('Error loading district data:', error);
            this.modal.error('Failed to load district data. Please try refreshing the page.');
        }
    }

    async handleBuildingAction(buildingType) {
        try {
            Logger.info(`Starting handleBuildingAction for: ${buildingType}`);
            
            // Convert building type to enum value
            const buildingTypeEnum = GridBuildingsContract.BuildingType[buildingType.toUpperCase()];
            if (buildingTypeEnum === undefined) {
                throw new Error(`Invalid building type: ${buildingType}`);
            }
            
            Logger.info(`Building type enum: ${buildingTypeEnum}`);
            
            // Check if player is in a city
            const cityId = await this.contracts.gameState.getPlayerCity();
            Logger.info(`Player city ID: ${cityId}`);
            if (!cityId) {
                Logger.info('Player not in a city, showing modal');
                this.modal.error('You need to join a city before building!');
                return;
            }

            // Check available building slots
            const slots = await this.contracts.gameState.getBuildingSlots();
            Logger.info(`Building slots: ${slots}`);
            if (slots <= 0) {
                Logger.info('No building slots available, showing modal');
                this.modal.error('No building slots available! You need to stake an NFT to get more slots.');
                return;
            }

            // Check gold balance
            const gold = await this.contracts.gameState.getPlayerGold();
            const buildingConfig = await this.contracts.gridBuildings.getBuildingConfig(buildingTypeEnum);
            const requiredGold = buildingConfig.buildCost;
            Logger.info(`Player gold: ${gold}, Required: ${requiredGold}`);
            if (Number(gold) < requiredGold) {
                Logger.info('Insufficient gold, showing modal');
                this.modal.error(
                    `Insufficient gold!<br>
                    Required: ${requiredGold} Gold<br>
                    Current balance: ${gold} Gold`
                );
                return;
            }

            // Show confirmation dialog
            Logger.info('Showing confirmation dialog');
            const result = await this.modal.confirm(
                `Build a ${buildingType} for ${requiredGold} Gold?`,
                { title: 'Confirm Building' }
            );

            if (result.isConfirmed) {
                Logger.info('User confirmed building action');
                try {
                    // Show transaction pending message
                    const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                    
                    // Create the building
                    Logger.info('Calling createBuilding on contract');
                    const tx = await this.contracts.gridBuildings.createBuilding(buildingTypeEnum);
                    Logger.info('Transaction sent, waiting for confirmation');
                    
                    // Wait for transaction to be mined
                    const receipt = await tx;
                    Logger.info('Transaction confirmed');
                    
                    // Close loading modal
                    loadingModal.close();
                    
                    // Reload district data to update UI
                    await this.loadDistrictData();
                    
                    this.modal.success(`Successfully built ${buildingType}!`);
                    Logger.info(`Successfully built: ${buildingType}`);
                } catch (error) {
                    Logger.error(`Error building ${buildingType}:`, error);
                    this.modal.error(`Error building ${buildingType}: ${error.message}`);
                }
            } else {
                Logger.info('User cancelled building action');
            }
        } catch (error) {
            Logger.error(`Error in handleBuildingAction for ${buildingType}:`, error);
            this.modal.error(`Error building ${buildingType}: ${error.message}`);
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Add click event listeners for building buttons
        const buildingButtons = this.element.querySelectorAll('.building-button');
        buildingButtons.forEach(button => {
            Logger.info(`Setting up listener for button: ${button.getAttribute('data-building')}`);
            button.addEventListener('click', (event) => {
                Logger.info('Building button clicked');
                const buildingType = button.getAttribute('data-building');
                if (buildingType) {
                    Logger.info(`Attempting to build: ${buildingType}`);
                    this.handleBuildingAction(buildingType).catch(error => {
                        Logger.error('Error in handleBuildingAction:', error);
                    });
                }
            });
        });
    }

    render() {
        Logger.info('Rendering district page');
        this.element.innerHTML = `
            <div class="page-container">
                <h1>District</h1>
                
                <!-- District Status Section -->
                <div class="page-section status-section">
                    <h2>District Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value gold-value">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Buildings:</span>
                            <span class="status-value total-buildings-value">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Building Slots:</span>
                            <span class="status-value building-slots-value">Loading...</span>
                        </div>
                    </div>
                </div>

                <!-- District Buildings Section -->
                <div class="page-section district-buildings-section">
                    <h2>District Buildings</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>House</h3>
                            <p>Basic residential building for citizens</p>
                            <p>Production: 10 gold/hour</p>
                            <p>Cost: 100 gold</p>
                            <button class="building-button" data-building="house" type="button">Build House</button>
                        </div>
                        <div class="building-card">
                            <h3>Water Supply</h3>
                            <p>Provides water infrastructure for the district</p>
                            <p>Production: 15 gold/hour</p>
                            <p>Cost: 200 gold</p>
                            <button class="building-button" data-building="water-supply" type="button">Build Water Supply</button>
                        </div>
                        <div class="building-card">
                            <h3>Workshop</h3>
                            <p>Produces goods and provides employment</p>
                            <p>Production: 20 gold/hour</p>
                            <p>Cost: 300 gold</p>
                            <button class="building-button" data-building="workshop" type="button">Build Workshop</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mount(container) {
        Logger.info('Mounting district page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during district page initialization:', error);
            this.modal.error('Failed to initialize district page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 