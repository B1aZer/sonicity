import '../styles/house-page.css';
import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class HousePage extends BasePage {
    constructor() {
        super();
        Logger.info('HousePage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page house-page';
        this.modal = new Modal();
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('HousePage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        try {
            await this.loadHouseData();
            this.setupEventListeners();
            Logger.info('House page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing house page:', error);
            this.modal.error('Failed to initialize house page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadHouseData().catch(error => {
                Logger.error('Error loading house data after wallet update:', error);
            });
        }
    }

    async loadHouseData() {
        try {
            Logger.info('Starting to load house data...');
            
            // Get all active buildings
            const activeBuildings = await this.contracts.gridBuildings.getActiveBuildings();
            Logger.info('Retrieved active buildings:', activeBuildings);

            // Filter for houses
            const houses = activeBuildings.filter(building => 
                building.buildingType === GridBuildingsContract.BuildingType.HOUSE && 
                building.active
            );
            Logger.info('Filtered houses:', houses);

            // Get the current production rate from contract
            const productionRate = await this.contracts.gridBuildings.getBuildingProductionRate(
                GridBuildingsContract.BuildingType.HOUSE
            );
            Logger.info('Current house production rate:', productionRate.toString());

            // Update UI with house count
            const houseCountElement = this.element.querySelector('.house-count');
            if (houseCountElement) {
                houseCountElement.textContent = houses.length.toString();
                Logger.info('Updated UI with house count:', houses.length.toString());
            } else {
                Logger.warn('House count element not found in DOM');
            }

            // Update UI with production rate
            const productionRateElements = this.element.querySelectorAll('.detail-value');
            if (productionRateElements && productionRateElements.length > 0) {
                productionRateElements[0].textContent = `${productionRate.toString()} gold/hour`;
                Logger.info('Updated UI with production rate:', productionRate.toString());
            } else {
                Logger.warn('Production rate element not found in DOM');
            }

            // Get total claimable gold directly from contract
            const totalClaimableGold = await this.contracts.gridBuildings.calculateTotalClaimableGold(
                GridBuildingsContract.BuildingType.HOUSE
            );
            Logger.info('Total claimable gold from contract:', totalClaimableGold.toString());

            // Update UI with claimable gold
            const claimableGoldElement = this.element.querySelector('.claimable-gold');
            if (claimableGoldElement) {
                claimableGoldElement.textContent = totalClaimableGold.toString();
                Logger.info('Updated UI with claimable gold:', totalClaimableGold.toString());
            } else {
                Logger.warn('Claimable gold element not found in DOM');
            }

            // Enable/disable claim button based on claimable gold
            const claimButton = this.element.querySelector('.claim-button');
            if (claimButton) {
                claimButton.disabled = totalClaimableGold <= BigInt(0);
                Logger.info('Updated claim button state:', !claimButton.disabled);
            } else {
                Logger.warn('Claim button not found in DOM');
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
            
            // Collect gold from all houses in a single transaction
            const tx = await this.contracts.gridBuildings.collectAllGoldByType(
                GridBuildingsContract.BuildingType.HOUSE
            );
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
                            <p>Current production rate per house</p>
                            <div class="info-details">
                                <div class="detail-item">
                                    <span class="detail-label">Base Rate:</span>
                                    <span class="detail-value">Loading...</span>
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
        
        // Remove redundant loadHouseData call since it's handled by onInitialized and updateWalletStatus
    }

    mount(container) {
        Logger.info('Mounting house page...');
        container.appendChild(this.element);
        // Initialize using base class method
        this.initialize().catch(error => {
            Logger.error('Error during house page initialization:', error);
            this.modal.error('Failed to initialize house page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 