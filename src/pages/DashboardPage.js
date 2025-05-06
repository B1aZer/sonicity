import '../styles/dashboard-page.css';
import '../styles/modal.css';
import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { ethers } from 'ethers';
import { Modal } from '../js/utils/modal.js';

export class DashboardPage {
    constructor() {
        Logger.info('DashboardPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'dashboard-page';
        this.gameState = new GameStateContract();
        this.modal = new Modal();
        this.render();
        this.setupEventListeners();
        this.loadPlayerData();
    }

    showModal(content, isError = false) {
        if (isError) {
            this.modal.error(content);
        } else {
            this.modal.show(content);
        }
    }

    async loadPlayerData() {
        try {
            const [gold, buildingSlots] = await Promise.all([
                this.gameState.getPlayerGold(),
                this.gameState.getBuildingSlots()
            ]);

            // Update gold display
            const goldValue = this.element.querySelector('.status-value');
            if (goldValue) {
                goldValue.textContent = gold.toString();
            }

            // Update building slots display
            const slotsItem = this.element.querySelector('.status-item:last-child .status-value');
            if (slotsItem) {
                slotsItem.textContent = buildingSlots.toString();
            }
        } catch (error) {
            Logger.error('Error loading player data:', error);
        }
    }

    async handleBuildingAction(buildingType) {
        try {
            Logger.info(`Starting handleBuildingAction for: ${buildingType}`);
            
            // Convert building type to lowercase to match contract expectations
            const formattedBuildingType = buildingType.toLowerCase();
            Logger.info(`Formatted building type: ${formattedBuildingType}`);
            
            // Check if player is in a city
            const cityId = await this.gameState.getPlayerCity();
            Logger.info(`Player city ID: ${cityId}`);
            if (!cityId) {
                Logger.info('Player not in a city, showing modal');
                this.modal.error('You need to join a city before building!');
                return;
            }

            // Check available building slots
            const slots = await this.gameState.getBuildingSlots();
            Logger.info(`Building slots: ${slots}`);
            if (slots <= 0) {
                Logger.info('No building slots available, showing modal');
                this.modal.error('No building slots available! You need to stake an NFT to get more slots.');
                return;
            }

            // Check gold balance
            const gold = await this.gameState.getPlayerGold();
            const requiredGold = 100; // 100 Gold for a house
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
                `Build a ${formattedBuildingType} for ${requiredGold} Gold?`,
                { title: 'Confirm Building' }
            );

            if (result.isConfirmed) {
                Logger.info('User confirmed building action');
                try {
                    // Show transaction pending message
                    const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                    
                    // Create the building
                    Logger.info('Calling createBuilding on contract');
                    const tx = await this.gameState.createBuilding(formattedBuildingType);
                    Logger.info('Transaction sent, waiting for confirmation');
                    
                    // Wait for transaction to be mined
                    const receipt = await tx;
                    Logger.info('Transaction confirmed');
                    
                    // Close loading modal
                    loadingModal.close();
                    
                    // Reload player data to update UI
                    await this.loadPlayerData();
                    
                    this.modal.success(`Successfully built ${formattedBuildingType}!`);
                    Logger.info(`Successfully built: ${formattedBuildingType}`);
                } catch (error) {
                    Logger.error(`Error building ${formattedBuildingType}:`, error);
                    this.modal.error(`Error building ${formattedBuildingType}: ${error.message}`);
                }
            } else {
                Logger.info('User cancelled building action');
            }
        } catch (error) {
            Logger.error(`Error in handleBuildingAction for ${formattedBuildingType}:`, error);
            this.modal.error(`Error building ${formattedBuildingType}: ${error.message}`);
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

        // Add click event listener for the bottom left city
        const bottomLeftCity = this.element.querySelector('.city-bottom-left');
        if (bottomLeftCity) {
            bottomLeftCity.addEventListener('click', () => {
                window.history.pushState({}, '', '/dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }
    }

    render() {
        Logger.info('Rendering dashboard page');
        this.element.innerHTML = `
            <div class="dashboard-container">
                <h1>City Dashboard</h1>
                
                <!-- Status Section -->
                <div class="dashboard-section status-section">
                    <h2>Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Rep Points:</span>
                            <span class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Building Slots:</span>
                            <span class="status-value">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <!-- District Buildings Section -->
                <div class="dashboard-section district-buildings-section">
                    <h2>District Buildings</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>House</h3>
                            <p>Basic residential building for citizens</p>
                            <button class="building-button" data-building="house" type="button">Build House</button>
                        </div>
                        <div class="building-card">
                            <h3>Water Supply</h3>
                            <p>Provides water infrastructure for the district</p>
                            <button class="building-button" data-building="water-supply" type="button">Build Water Supply</button>
                        </div>
                        <div class="building-card">
                            <h3>Workshop</h3>
                            <p>Produces goods and provides employment</p>
                            <button class="building-button" data-building="workshop" type="button">Build Workshop</button>
                        </div>
                    </div>
                </div>
                
                <!-- City Buildings Section -->
                <div class="dashboard-section city-buildings-section">
                    <h2>City Buildings</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Town Hall</h3>
                            <p>Increase of gold production for all homes</p>
                            <p>Rep Point increase</p>
                            <button class="building-button" data-building="town-hall" type="button">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Treasury</h3>
                            <p>Allows gold imports with heavy taxes</p>
                            <p>Limited amounts weekly</p>
                            <button class="building-button" data-building="treasury" type="button">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Barracks</h3>
                            <p>Buy units for future arena battles (cool PvP later)</p>
                            <button class="building-button" data-building="barracks" type="button">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Diplomacy Center</h3>
                            <p>Start negotiations: alliances, trades, non-aggression</p>
                            <button class="building-button" data-building="diplomacy" type="button">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Bank</h3>
                            <p>Allows gold trade</p>
                            <button class="building-button" data-building="bank" type="button">Build/Upgrade</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 