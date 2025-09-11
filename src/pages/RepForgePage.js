import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';

export class RepForgePage extends BasePage {
    constructor() {
        super();
        this.element.className = 'base-page rep-forge-page';
        this.statusComponent = new StatusComponent();
        this.modal = new Modal();
        
        // Initialize state
        this.state = {
            forgeCount: 0,
            claimableRep: '0',
            productionRate: 'Loading...',
            canClaim: false
        };
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('RepForgePage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadForgeData();
            this.setupEventListeners();
            this.startAutoRefresh();
            Logger.info('REP Forge page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing RepForgePage:', error);
            this.modal.error('Failed to initialize REP Forge page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    async loadForgeData() {
        try {
            Logger.info('Starting to load REP Forge data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Get all active buildings
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for REP forges
            const forges = [];
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.REP_FORGE) {
                    forges.push(building);
                }
            }
            Logger.info('Filtered REP Forges:', forges);

            // Get the current production rate from contract
            const buildingConfig = await this.contracts.gridBuildings.getBuildingConfig(
                GridBuildingsContract.BuildingType.REP_FORGE
            );
            const baseProductionRate = buildingConfig.baseProductionRate;
            Logger.info('Current REP Forge production rate:', baseProductionRate.toString());

            // Get total claimable REP directly from contract
            const totalClaimableRep = await this.contracts.gridBuildings.calculateTotalClaimableResources(
                GridBuildingsContract.BuildingType.REP_FORGE
            );
            Logger.info('Total claimable REP from contract:', totalClaimableRep.toString());

            // Update state (this will automatically update UI)
            this.setState({
                forgeCount: forges.length,
                claimableRep: totalClaimableRep.toString(),
                productionRate: `${forges.length} REP point(s) per 48 hours`,
                canClaim: totalClaimableRep > BigInt(0)
            });

        } catch (error) {
            Logger.error('Error loading REP Forge data:', error);
            this.modal.error('Failed to load REP Forge data. Please try refreshing the page.');
        }
    }

    async handleClaimRep() {
        try {
            Logger.info('Starting REP collection...');
            
            // Show loading modal
            const loadingModal = this.modal.loading('Collecting REP points...');
            
            // Collect REP from all forges in a single transaction
            await this.contracts.gridBuildings.collectResourcesByType(
                GridBuildingsContract.BuildingType.REP_FORGE
            );
            
            // Close loading modal
            loadingModal.close();
            
            // Reload forge data
            await this.loadForgeData();
            
            // Show success message
            this.modal.success('Successfully collected REP points from all forges!');
            
        } catch (error) {
            Logger.error('Error collecting REP:', error);
            this.modal.error('Failed to collect REP points. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system
        this.addEventListener('.claim-button', 'click', () => {
            this.handleClaimRep().catch(error => {
                Logger.error('Error in handleClaimRep:', error);
            });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>REP Forge Management</h1>
                <p class="page-description">
                    <strong>REP Points fuel your reputation in the community.</strong> REP Forges produce reputation points over time that can be earned through battles, donations, and production. 
                    <em>Each forge produces 1 REP point every 168 hours (7 days), scaling with building level.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Forge Statistics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Forges:</span>
                            <span class="status-value" data-state="forgeCount">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Claimable REP:</span>
                            <span class="status-value" data-state="claimableRep">0</span>
                        </div>
                    </div>
                </div>

                <!-- Forge Details Section -->
                <div class="page-section">
                    <h2>Forge Details</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Production Rate</h3>
                            <p>Current production rate per forge</p>
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
                            <p>Collect REP points from your forges</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Max Collection:</span>
                                    <span class="detail-value">168 hours</span>
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
                            <span class="button-text">Claim REP Points</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadForgeData();
        }, 30000);
    }

    onUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
} 