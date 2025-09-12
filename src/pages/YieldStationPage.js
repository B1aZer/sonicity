import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';

export class YieldStationPage extends BasePage {
    constructor() {
        super();
        Logger.info('YieldStationPage constructor called');
        
        this.element.className = 'base-page';
        
        // Initialize state
        this.setState({
            stationCount: 0,
            claimableYield: '0',
            productionRate: 'Loading...',
            canClaim: false,
            revenuePool: '0',
            availablePool: '0',
            reservedRevenue: '0'
        });
        
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
            let totalClaimableYield = BigInt(0);
            let totalRevenueRate = BigInt(0);
            let activeStations = 0;

            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.YIELD_STATION) {
                    stations.push({ ...building, buildingId });
                    
                    // Get yield station specific info
                    try {
                        const stationInfo = await this.contracts.gridBuildings.getYieldStationInfo(playerAddress, buildingId);
                        totalClaimableYield += BigInt(stationInfo.claimableRevenue);
                        
                        if (stationInfo.isActive) {
                            totalRevenueRate += BigInt(stationInfo.revenueRate);
                            activeStations++;
                        }
                        
                        Logger.info(`Station ${buildingId} info:`, stationInfo);
                    } catch (error) {
                        Logger.warn(`Could not get info for station ${buildingId}:`, error);
                    }
                }
            }
            Logger.info('Filtered Yield Stations:', stations);

            // Get revenue pool information from contract
            const revenuePool = await this.contracts.gridBuildings.getRevenuePool();
            const availablePool = await this.contracts.gridBuildings.getAvailableRevenuePool();
            const reservedRevenue = await this.contracts.gridBuildings.getReservedRevenue();
            
            Logger.info('Revenue pool data:', {
                total: revenuePool.toString(),
                available: availablePool.toString(),
                reserved: reservedRevenue.toString()
            });

            // Calculate production rate display
            let productionRateDisplay = 'No active stations';
            if (activeStations > 0) {
                // Convert from wei per second to more readable format
                const ratePerHour = totalRevenueRate * BigInt(3600);
                const rateInEther = Number(ratePerHour) / 1e18;
                productionRateDisplay = `${rateInEther.toFixed(6)} SONIC/hour (${activeStations} active)`;
            }

            // Update state (this will automatically update UI)
            this.setState({
                stationCount: stations.length,
                claimableYield: totalClaimableYield.toString(),
                productionRate: productionRateDisplay,
                canClaim: totalClaimableYield > BigInt(0),
                revenuePool: revenuePool.toString(),
                availablePool: availablePool.toString(),
                reservedRevenue: reservedRevenue.toString()
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
            const loadingModal = this.modal.loading('Collecting SONIC yield...');
            
            // Collect yield from all stations in a single transaction
            // Note: For yield stations, we use the specific yield collection method
            await this.contracts.gridBuildings.collectResourcesByType(
                GridBuildingsContract.BuildingType.YIELD_STATION
            );
            
            // Close loading modal
            loadingModal.close();
            
            // Reload station data
            await this.loadStationData();
            
            // Show success message
            this.modal.success('Successfully collected SONIC yield from all stations!');
            
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
                    <strong><em>SONIC</em> yield is distributed from the revenue pool generated by building operations.</strong> 
                    Yield stations earn SONIC tokens proportionally to staked NFT value from recharge fees paid by all players.
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
                            <span class="status-label">Claimable SONIC:</span>
                            <span class="status-value" data-state="claimableYield">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Revenue Pool:</span>
                            <span class="status-value" data-state="revenuePool">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Available Pool:</span>
                            <span class="status-value" data-state="availablePool">0</span>
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
                                    <span class="detail-value">Based on staked NFT value</span>
                                </div>
                            </div>
                        </div>
                        <div class="building-card">
                            <h3>Collection Rules</h3>
                            <p>Collect SONIC yield from your stations</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Max Collection:</span>
                                    <span class="detail-value">24 hours</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Collection Cooldown:</span>
                                    <span class="detail-value">None</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Yield Source:</span>
                                    <span class="detail-value">Revenue pool from recharges</span>
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
                            <span class="button-text">Claim SONIC Yield</span>
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
