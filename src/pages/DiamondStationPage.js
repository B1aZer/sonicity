import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';

export class DiamondStationPage extends BasePage {
    constructor() {
        super();
        this.element.className = 'base-page diamond-station-page';
        this.statusComponent = new StatusComponent();
        this.modal = new Modal();
        
        // Initialize state
        this.state = {
            stationCount: 0,
            claimableDiamonds: '0',
            productionRate: 'Loading...',
            canClaim: false
        };
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('DiamondStationPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadStationData();
            this.setupEventListeners();
            Logger.info('Diamond Station page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing DiamondStationPage:', error);
            this.modal.error('Failed to initialize Diamond Station page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    async loadStationData() {
        try {
            Logger.info('Starting to load Diamond Station data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Get all active buildings
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for diamond stations
            const stations = [];
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.DIAMOND_STATION) {
                    stations.push(building);
                }
            }
            Logger.info('Filtered Diamond Stations:', stations);

            // Get the current production rate from contract
            const buildingConfig = await this.contracts.gridBuildings.getBuildingConfig(
                GridBuildingsContract.BuildingType.DIAMOND_STATION
            );
            const baseProductionRate = buildingConfig.baseProductionRate;
            Logger.info('Current Diamond Station production rate:', baseProductionRate.toString());

            // Contract produces 8 diamonds per 24 hours at level 1
            const diamondsPerStation = 8 * stations.length; // 8 diamonds per station per 24h cycle
            
            // Get total claimable diamonds directly from contract
            const totalClaimableDiamonds = await this.contracts.gridBuildings.calculateTotalClaimableResources(
                GridBuildingsContract.BuildingType.DIAMOND_STATION
            );
            Logger.info('Total claimable diamonds from contract:', totalClaimableDiamonds.toString());

            // Update state (this will automatically update UI)
            this.setState({
                stationCount: stations.length,
                claimableDiamonds: totalClaimableDiamonds.toString(),
                productionRate: `${diamondsPerStation} diamond(s) per 24 hours`,
                canClaim: totalClaimableDiamonds > BigInt(0)
            });

        } catch (error) {
            Logger.error('Error loading Diamond Station data:', error);
            this.modal.error('Failed to load Diamond Station data. Please try refreshing the page.');
        }
    }

    async handleClaimDiamonds() {
        try {
            Logger.info('Starting diamond collection...');
            
            // Show loading modal
            const loadingModal = this.modal.loading('Collecting diamonds...');
            
            // Collect diamonds from all stations in a single transaction
            await this.contracts.gridBuildings.collectResourcesByType(
                GridBuildingsContract.BuildingType.DIAMOND_STATION
            );
            
            // Close loading modal
            loadingModal.close();
            
            // Reload station data
            await this.loadStationData();
            
            // Show success message
            this.modal.success('Successfully collected diamonds from all stations!');
            
        } catch (error) {
            Logger.error('Error collecting diamonds:', error);
            this.modal.error('Failed to collect diamonds. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system
        this.addEventListener('.claim-button', 'click', () => {
            this.handleClaimDiamonds().catch(error => {
                Logger.error('Error in handleClaimDiamonds:', error);
            });
        });

        // Auto-refresh every 30 seconds for real-time diamond updates
        this.refreshInterval = setInterval(() => {
            if (!this.state.isLoading) {
                this.loadStationData().catch(error => {
                    Logger.error('Error in auto-refresh:', error);
                });
            }
        }, 30000); // 30 seconds for diamond updates
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Diamond Station</h1>
                <p class="page-description">
                    <strong>Diamonds are precious resources for advanced upgrades.</strong> Diamond Stations produce diamonds steadily over time. 
                    <em>Each station produces 8 diamonds every 24 hours at level 1, scaling with building level.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Station Statistics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Stations:</span>
                            <span class="status-value" data-state="stationCount">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Claimable Diamonds:</span>
                            <span class="status-value" data-state="claimableDiamonds">0</span>
                        </div>
                    </div>
                </div>

                <!-- Station Details Section -->
                <div class="page-section">
                    <h2>Station Details</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Production Rate</h3>
                            <p>Current production rate per station</p>
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
                            <p>Collect diamonds from your stations</p>
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
                            <span class="button-text">Claim Diamonds</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    onUnmount() {
        // Clean up auto-refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
} 