import { BasePage } from './BasePage.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class HousePage extends BasePage {
    constructor() {
        super();
        Logger.info('HousePage constructor called');
        
        this.element.className = 'base-page';
        
        
        // Initialize state
        this.setState({
            houseCount: 0,
            claimableGold: 0,
            productionRate: 'Loading...',
            canClaim: false
        });
        
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

    async loadHouseData() {
        try {
            Logger.info('Starting to load house data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Get all active buildings
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for houses
            const houses = [];
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.HOUSE) {
                    houses.push(building);
                }
            }
            Logger.info('Filtered houses:', houses);

            // Get the current production rate from contract
            const buildingConfig = await this.contracts.gridBuildings.getBuildingConfig(
                GridBuildingsContract.BuildingType.HOUSE
            );
            const productionRate = buildingConfig.baseProductionRate;
            Logger.info('Current house production rate:', productionRate.toString());

            // Get total claimable gold directly from contract
            const totalClaimableGold = await this.contracts.gridBuildings.calculateTotalClaimableResources(
                GridBuildingsContract.BuildingType.HOUSE
            );
            Logger.info('Total claimable gold from contract:', totalClaimableGold.toString());

            // Update state (this will automatically update UI)
            this.setState({
                houseCount: houses.length,
                claimableGold: totalClaimableGold.toString(),
                productionRate: `${productionRate.toString()} gold/hour`,
                canClaim: totalClaimableGold > BigInt(0)
            });

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
            await this.contracts.gridBuildings.collectResourcesByType(
                GridBuildingsContract.BuildingType.HOUSE
            );
            
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
        
        // Use the new event listener system
        this.addEventListener('.claim-button', 'click', () => {
            this.handleClaimGold().catch(error => {
                Logger.error('Error in handleClaimGold:', error);
            });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>House Management</h1>
                <p class="page-description">
                    <strong><em>Gold</em> is stored in your vault for 24 hours. After that, workers rest and production stops until you collect.
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>House Statistics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Houses:</span>
                            <span class="status-value" data-state="houseCount">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Claimable Gold:</span>
                            <span class="status-value" data-state="claimableGold">0</span>
                        </div>
                    </div>
                </div>

                <!-- House Details Section -->
                <div class="page-section">
                    <h2>House Details</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Production Rate</h3>
                            <p>Current production rate per house</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Base Rate:</span>
                                    <span class="detail-value" data-state="productionRate">Loading...</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Level Bonus:</span>
                                    <span class="detail-value">Multiplies base rate</span>
                                </div>
                            </div>
                        </div>
                        <div class="building-card">
                            <h3>Collection Rules</h3>
                            <p>Collect gold from your houses</p>
                            <div class="building-details">
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
                <div class="page-section">
                    <h2>Actions</h2>
                    <div class="building-actions">
                        <button class="claim-button btn btn-primary btn-lg" data-state="canClaim" disabled>
                            <span class="button-text">Claim Gold</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
} 