import '../styles/house-page.css';
import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class HousePage extends BasePage {
    constructor() {
        super();
        this.element = document.createElement('div');
        this.element.className = 'base-page house-page';
        this.modal = new Modal();
        this.render();
        this.setupEventListeners();
    }

    async onInitialized(walletResult) {
        Logger.info('HousePage onInitialized called with wallet:', walletResult.address);
        try {
            await this.loadHouseData();
            Logger.info('House data loaded successfully');
        } catch (error) {
            Logger.error('Error initializing house page:', error);
            this.modal.error('Failed to initialize house page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
    }

    async loadHouseData() {
        try {
            Logger.info('Starting to load house data...');
            
            // Get all house building IDs
            const houseIds = await this.contracts.gameState.getBuildingIdsOfType('house');
            Logger.info('Retrieved house IDs:', houseIds);

            // Get total houses count
            const totalHouses = await this.contracts.gameState.getBuildingsByType('house');
            Logger.info('Total houses:', totalHouses);

            // Update UI with house count
            const houseCountElement = this.element.querySelector('.house-count');
            if (houseCountElement) {
                houseCountElement.textContent = totalHouses.toString();
            }

            // Calculate total claimable gold
            let totalClaimableGold = 0;
            const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

            for (const houseId of houseIds) {
                const building = await this.contracts.gameState.getBuilding(houseId);
                if (building.active) {
                    const timePassed = currentTime - building.lastCollectionTime;
                    const totalTimeSinceCreation = currentTime - building.lastUpgradeTime;
                    
                    // Calculate claimable gold for this house
                    let claimableTime = timePassed;
                    if (totalTimeSinceCreation > 24 * 3600) { // 24 hours in seconds
                        if (building.lastCollectionTime >= building.lastUpgradeTime + 24 * 3600) {
                            continue; // Skip if already collected all possible gold
                        }
                        claimableTime = (building.lastUpgradeTime + 24 * 3600) - building.lastCollectionTime;
                    }
                    
                    const productionRate = 10; // 10 gold per hour for houses
                    const claimableGold = (productionRate * claimableTime * building.level) / 3600;
                    totalClaimableGold += claimableGold;
                }
            }

            // Update UI with claimable gold
            const claimableGoldElement = this.element.querySelector('.claimable-gold');
            if (claimableGoldElement) {
                claimableGoldElement.textContent = Math.floor(totalClaimableGold).toString();
            }

            // Enable/disable claim button based on claimable gold
            const claimButton = this.element.querySelector('.claim-button');
            if (claimButton) {
                claimButton.disabled = totalClaimableGold <= 0;
            }

        } catch (error) {
            Logger.error('Error loading house data:', error);
            this.modal.error('Failed to load house data. Please try refreshing the page.');
        }
    }

    async handleClaimGold() {
        try {
            Logger.info('Starting gold collection...');
            
            // Show loading modal
            const loadingModal = this.modal.loading('Collecting gold...');
            
            // Collect gold from all buildings
            const tx = await this.contracts.gameState.collectAllGold();
            await tx;
            
            // Close loading modal
            loadingModal.close();
            
            // Reload house data
            await this.loadHouseData();
            
            // Show success message
            this.modal.success('Successfully collected gold from all houses!');
            
        } catch (error) {
            Logger.error('Error collecting gold:', error);
            this.modal.error('Failed to collect gold. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Add click event listener for claim button
        const claimButton = this.element.querySelector('.claim-button');
        if (claimButton) {
            claimButton.addEventListener('click', () => {
                this.handleClaimGold().catch(error => {
                    Logger.error('Error in handleClaimGold:', error);
                });
            });
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container container-min-width-800">
                <h1>House Management</h1>
                
                <!-- Status Section -->
                <div class="page-section status-section">
                    <h2>House Statistics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Houses:</span>
                            <span class="status-value house-count">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Claimable Gold:</span>
                            <span class="status-value claimable-gold">0</span>
                        </div>
                    </div>
                </div>

                <!-- House Details Section -->
                <div class="page-section house-details-section">
                    <h2>House Details</h2>
                    <div class="house-info">
                        <div class="info-card">
                            <h3>Production Rate</h3>
                            <p>10 gold per hour per house</p>
                            <div class="info-details">
                                <div class="detail-item">
                                    <span class="detail-label">Base Rate:</span>
                                    <span class="detail-value">10 gold/hour</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Level Bonus:</span>
                                    <span class="detail-value">Multiplies base rate</span>
                                </div>
                            </div>
                        </div>
                        <div class="info-card">
                            <h3>Collection Rules</h3>
                            <p>Collect gold from your houses</p>
                            <div class="info-details">
                                <div class="detail-item">
                                    <span class="detail-label">Max Collection:</span>
                                    <span class="detail-value">24 hours</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Collection Cooldown:</span>
                                    <span class="detail-value">None</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Actions Section -->
                <div class="page-section actions-section">
                    <h2>Actions</h2>
                    <div class="actions-container">
                        <button class="claim-button" disabled>
                            <span class="button-text">Claim Gold</span>
                        </button>
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