import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { Modal } from '../js/utils/modal.js';
import { BasePage } from './BasePage.js';

import '../styles/district-page.css';
import '../styles/building.css';

export class DistrictPage extends BasePage {
    constructor() {
        super();
        Logger.info('DistrictPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        this.render();
        this.setupEventListeners();
    }

    async onInitialized(walletResult) {
        Logger.info('DistrictPage onInitialized called with wallet:', walletResult.address);
        try {
            await this.loadDistrictData();
            Logger.info('District data loaded successfully');
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
            
            const [playerGold, buildingSlots, buildings] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerBuildingSlots(),
                this.contracts.gameState.getPlayerBuildings()
            ]);

            Logger.info('Received data from contract:', {
                playerGold: playerGold.toString(),
                buildingSlots: buildingSlots.toString(),
                buildings: buildings
            });

            // Update player gold display
            const goldValue = this.element.querySelector('.player-gold');
            if (goldValue) {
                goldValue.textContent = playerGold.toString();
            }

            // Update building slots display
            const slotsValue = this.element.querySelector('.building-slots');
            if (slotsValue) {
                slotsValue.textContent = buildingSlots.toString();
            }

            // Update buildings grid
            const buildingsGrid = this.element.querySelector('.buildings-grid');
            if (buildingsGrid) {
                buildingsGrid.innerHTML = buildings.map(building => this.renderBuildingCard(building)).join('');
            }

        } catch (error) {
            Logger.error('Error loading district data:', error);
            this.modal.error('Failed to load district data. Please try refreshing the page.');
        }
    }

    renderBuildingCard(building) {
        return `
            <div class="building-card" data-building-id="${building.id}">
                <h3>${building.type}</h3>
                <p>Level: <span class="level-value">${building.level}</span></p>
                <p>Production: <span class="production-value">${building.productionRate}</span>/hour</p>
                <p>Last Collection: <span class="last-collection">${new Date(building.lastCollectionTime * 1000).toLocaleString()}</span></p>
                <div class="building-actions">
                    <button class="collect-button" data-building-id="${building.id}">Collect Gold</button>
                    <button class="upgrade-button" data-building-id="${building.id}">Upgrade</button>
                </div>
            </div>
        `;
    }

    async handleBuildingAction(action, buildingId) {
        try {
            Logger.info(`Starting ${action} for building ${buildingId}`);
            
            // Show confirmation dialog
            const result = await this.modal.confirm(
                `Are you sure you want to ${action} this building?`,
                { title: `Confirm ${action}` }
            );

            if (result.isConfirmed) {
                Logger.info(`User confirmed ${action}`);
                try {
                    // Show transaction pending message
                    const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                    
                    // Execute action
                    let tx;
                    if (action === 'collect') {
                        tx = await this.contracts.gameState.collectGold(buildingId);
                    } else if (action === 'upgrade') {
                        tx = await this.contracts.gameState.upgradeBuilding(buildingId);
                    }
                    
                    await tx.wait();
                    
                    // Close loading modal
                    loadingModal.close();
                    
                    // Reload district data
                    await this.loadDistrictData();
                    
                    this.modal.success(`Successfully ${action}ed building!`);
                } catch (error) {
                    Logger.error(`Error ${action}ing building:`, error);
                    this.modal.error(`Error ${action}ing building: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error(`Error in handleBuildingAction:`, error);
            this.modal.error(`Error ${action}ing building: ${error.message}`);
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Building action buttons
        this.element.addEventListener('click', async (event) => {
            const collectButton = event.target.closest('.collect-button');
            const upgradeButton = event.target.closest('.upgrade-button');
            
            if (collectButton) {
                const buildingId = collectButton.dataset.buildingId;
                await this.handleBuildingAction('collect', buildingId);
            } else if (upgradeButton) {
                const buildingId = upgradeButton.dataset.buildingId;
                await this.handleBuildingAction('upgrade', buildingId);
            }
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
                            <span class="status-label">Your Gold:</span>
                            <span class="status-value player-gold">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Building Slots:</span>
                            <span class="status-value building-slots">Loading...</span>
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