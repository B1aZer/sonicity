import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';

export class YieldStationPage extends BasePage {
    constructor() {
        super();
        this.element.className = 'base-page yield-station-page';
        this.statusComponent = new StatusComponent();
        this.modal = new Modal();
        
        // Initialize state
        this.state = {
            stationCount: 0,
            claimableYield: '0',
            productionRate: 'Loading...',
            canClaim: false,
            treasuryPool: '0'
        };
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('YieldStationPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadStationData();
            this.setupEventListeners();
            this.startAutoRefresh();
            Logger.info('Yield Station page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing YieldStationPage:', error);
            this.modal.error('Failed to initialize Yield Station page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    async loadStationData() {
        try {
            Logger.info('Starting to load Yield Station data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Get all active buildings
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for yield stations
            const stations = [];
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.YIELD_STATION) {
                    stations.push(building);
                }
            }
            Logger.info('Filtered Yield Stations:', stations);

            // Get the current production rate from contract
            const buildingConfig = await this.contracts.gridBuildings.getBuildingConfig(
                GridBuildingsContract.BuildingType.YIELD_STATION
            );
            const baseProductionRate = buildingConfig.baseProductionRate;
            Logger.info('Current Yield Station production rate:', baseProductionRate.toString());

            // Get total claimable yield directly from contract
            const totalClaimableYield = await this.contracts.gridBuildings.calculateTotalClaimableResources(
                GridBuildingsContract.BuildingType.YIELD_STATION
            );
            Logger.info('Total claimable yield from contract:', totalClaimableYield.toString());

            // Get treasury pool information
            let treasuryPool = '0';
            try {
                // Try to get treasury pool from yield contract if available
                if (this.contracts.yieldNft && this.contracts.yieldNft.getTreasuryPool) {
                    treasuryPool = await this.contracts.yieldNft.getTreasuryPool();
                }
            } catch (error) {
                Logger.warn('Could not get treasury pool:', error);
            }

            // Update state (this will automatically update UI)
            this.setState({
                stationCount: stations.length,
                claimableYield: totalClaimableYield.toString(),
                productionRate: `Treasury-based yield per station`,
                canClaim: totalClaimableYield > BigInt(0),
                treasuryPool: treasuryPool.toString()
            });

        } catch (error) {
            Logger.error('Error loading Yield Station data:', error);
            this.modal.error('Failed to load Yield Station data. Please try refreshing the page.');
        }
    }

    async handleClaimYield() {
        try {
            Logger.info('Starting yield collection...');
            
            // Show loading modal
            const loadingModal = this.modal.loading('Collecting yield...');
            
            // Collect yield from all stations in a single transaction
            await this.contracts.gridBuildings.collectResourcesByType(
                GridBuildingsContract.BuildingType.YIELD_STATION
            );
            
            // Close loading modal
            loadingModal.close();
            
            // Reload station data
            await this.loadStationData();
            
            // Show success message
            this.modal.success('Successfully collected yield from all stations!');
            
        } catch (error) {
            Logger.error('Error collecting yield:', error);
            this.modal.error('Failed to collect yield. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system
        this.addEventListener('.claim-button', 'click', () => {
            this.handleClaimYield().catch(error => {
                Logger.error('Error in handleClaimYield:', error);
            });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Yield Station Management</h1>
                <p class="page-description">
                    <strong>Yield Stations provide passive income from the treasury pool.</strong> These advanced buildings earn yield from all grid building operations across the game. 
                    <em>Yield is distributed proportionally to staked NFT value from the global treasury pool.</em>
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
                            <span class="status-label">Claimable Yield:</span>
                            <span class="status-value" data-state="claimableYield">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Treasury Pool:</span>
                            <span class="status-value" data-state="treasuryPool">0</span>
                        </div>
                    </div>
                </div>

                <!-- Station Details Section -->
                <div class="page-section">
                    <h2>Station Details</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Yield Source</h3>
                            <p>How yield stations generate income</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Source:</span>
                                    <span class="detail-value">Global treasury pool</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Distribution:</span>
                                    <span class="detail-value">Proportional to NFT value</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Pool Funding:</span>
                                    <span class="detail-value">Grid building upgrade fees</span>
                                </div>
                            </div>
                        </div>
                        <div class="building-card">
                            <h3>Collection Rules</h3>
                            <p>Collect yield from your stations</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Yield Type:</span>
                                    <span class="detail-value">Gold from treasury</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Collection Cooldown:</span>
                                    <span class="detail-value">None</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Max Accumulation:</span>
                                    <span class="detail-value">Based on pool size</span>
                                </div>
                            </div>
                        </div>
                        <div class="building-card">
                            <h3>Requirements</h3>
                            <p>Prerequisites for yield stations</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Min Treasury:</span>
                                    <span class="detail-value">10,000 Gold</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Building Slots:</span>
                                    <span class="detail-value">16 (4x4 grid)</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">NFT Required:</span>
                                    <span class="detail-value">Yield Station NFT</span>
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
                            <span class="button-text">Claim Yield</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadStationData();
        }, 30000);
    }

    onUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}
