import '../styles/grid-building-page.css';
import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class FarmPage extends BasePage {
    constructor() {
        super();
        Logger.info('FarmPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page building-page farm-page';
        this.modal = new Modal();
        
        // Initialize state
        this.setState({
            farmCount: 0,
            claimableFood: 0,
            productionRate: 'Loading...',
            canClaim: false
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('FarmPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        try {
            await this.loadFarmData();
            this.setupEventListeners();
            Logger.info('Farm page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing farm page:', error);
            this.modal.error('Failed to initialize farm page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    async loadFarmData() {
        try {
            Logger.info('Starting to load farm data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Get all active buildings
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for farms
            const farms = [];
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.FARM) {
                    farms.push(building);
                }
            }
            Logger.info('Filtered farms:', farms);

            // Get the current production rate from contract
            const buildingConfig = await this.contracts.gridBuildings.getBuildingConfig(
                GridBuildingsContract.BuildingType.FARM
            );
            const productionRate = buildingConfig.baseProductionRate;
            Logger.info('Current farm production rate:', productionRate.toString());

            // Get total claimable food directly from contract
            const totalClaimableFood = await this.contracts.gridBuildings.calculateTotalClaimableResources(
                GridBuildingsContract.BuildingType.FARM
            );
            Logger.info('Total claimable food from contract:', totalClaimableFood.toString());

            // Update state (this will automatically update UI)
            this.setState({
                farmCount: farms.length,
                claimableFood: totalClaimableFood.toString(),
                productionRate: `${productionRate.toString()} food/hour`,
                canClaim: totalClaimableFood > BigInt(0)
            });

        } catch (error) {
            Logger.error('Error loading farm data:', error);
            this.modal.error('Failed to load farm data. Please try refreshing the page.');
        }
    }

    async handleClaimFood() {
        try {
            Logger.info('Starting food collection...');
            
            // Show loading modal
            const loadingModal = this.modal.loading('Collecting food...');
            
            // Collect food from all farms in a single transaction
            await this.contracts.gridBuildings.collectResourcesByType(
                GridBuildingsContract.BuildingType.FARM
            );
            
            // Close loading modal
            loadingModal.close();
            
            // Reload farm data
            await this.loadFarmData();
            
            // Show success message
            this.modal.success('Successfully collected food from all farms!');
            
        } catch (error) {
            Logger.error('Error collecting food:', error);
            this.modal.error('Failed to collect food. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system
        this.addEventListener('.claim-button', 'click', () => {
            this.handleClaimFood().catch(error => {
                Logger.error('Error in handleClaimFood:', error);
            });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container container-min-width-800">
                <h1>Farm Management</h1>
                <p class="page-description">
                    <strong>Food sustains your population and fuels your economy.</strong> Farms produce food continuously, but you must collect it regularly. 
                    <em>Larger farms produce more food and can support bigger cities.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section status-section">
                    <h2>Farm Statistics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Farms:</span>
                            <span class="status-value" data-state="farmCount">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Claimable Food:</span>
                            <span class="status-value" data-state="claimableFood">0</span>
                        </div>
                    </div>
                </div>

                <!-- Farm Details Section -->
                <div class="page-section farm-details-section">
                    <h2>Farm Details</h2>
                    <div class="building-info">
                        <div class="info-card">
                            <h3>Production Rate</h3>
                            <p>Current production rate per farm</p>
                            <div class="info-details">
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
                        <div class="info-card">
                            <h3>Collection Rules</h3>
                            <p>Collect food from your farms</p>
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
                        <button class="claim-button btn btn-primary btn-lg" data-state="canClaim" disabled>
                            <span class="button-text">Claim Food</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
} 