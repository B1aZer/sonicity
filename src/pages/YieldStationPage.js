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
            let totalProjectedRate = BigInt(0);
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
                            // Use actual rate for active stations
                            totalProjectedRate += BigInt(stationInfo.revenueRate);
                            activeStations++;
                        } else {
                            // Use projected rate for inactive stations to show potential
                            try {
                                const projectedRate = await this.contracts.gridBuildings.calculateProjectedYieldRate(playerAddress, buildingId);
                                totalProjectedRate += BigInt(projectedRate);
                                Logger.info(`Station ${buildingId} projected rate:`, projectedRate.toString());
                            } catch (error) {
                                Logger.warn(`Could not get projected rate for station ${buildingId}:`, error);
                            }
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
            let productionRateDisplay;
            if (stations.length === 0) {
                productionRateDisplay = 'No stations built';
            } else if (totalProjectedRate === BigInt(0)) {
                productionRateDisplay = 'No revenue pool available';
            } else {
                // Convert from wei per second to more readable format
                const ratePerHour = totalProjectedRate * BigInt(3600);
                const rateInEther = Number(ratePerHour) / 1e18;
                productionRateDisplay = `${rateInEther.toFixed(4)} SONIC/hour`;
            }

            // Format values for display (convert from wei to ether)
            const formatSonic = (weiValue) => {
                const etherValue = Number(weiValue) / 1e18;
                return etherValue.toFixed(4) + ' SONIC';
            };

            // Update state (this will automatically update UI)
            this.setState({
                stationCount: stations.length,
                claimableYield: formatSonic(totalClaimableYield),
                productionRate: productionRateDisplay,
                canClaim: totalClaimableYield > BigInt(0),
                revenuePool: formatSonic(revenuePool),
                availablePool: formatSonic(availablePool),
                reservedRevenue: formatSonic(reservedRevenue)
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

        // Auto-refresh every 30 seconds for real-time yield updates
        this.refreshInterval = setInterval(() => {
            if (!this.state.isLoading) {
                this.loadStationData().catch(error => {
                    Logger.error('Error in auto-refresh:', error);
                });
            }
        }, 30000); // 30 seconds for yield updates
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Yield Station</h1>
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
                    </div>
                </div>

                <!-- Revenue Pool Section -->
                <div class="page-section">
                    <h2>Revenue Pool Information</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Pool:</span>
                            <span class="status-value" data-state="revenuePool">0 SONIC</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Available Pool:</span>
                            <span class="status-value" data-state="availablePool">0 SONIC</span>
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
                                    <span class="detail-label">Distribution Duration:</span>
                                    <span class="detail-value">7 days</span>
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

    onUnmount() {
        // Clean up auto-refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}
