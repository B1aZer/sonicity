import { BasePage } from './BasePage.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { DistrictBuildingsContract } from '../js/contracts/DistrictBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class WorkshopPage extends BasePage {
    constructor() {
        super();
        this.requiredDistrictBuilding = 'Workshop';
        Logger.info('WorkshopPage constructor called');
        
        this.element.className = 'base-page';
        
        
        // Initialize state
        this.setState({
            damagedBuildings: [],
            totalDamaged: 0,
            canRepair: false,
            repairCost: 0,
            damagedByTier: {
                0: 0, // Houses
                1: 0, // Farms
                2: 0, // Diamond Stations
                3: 0  // REP Forges
            }
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('WorkshopPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadWorkshopData();
            this.setupEventListeners();
            Logger.info('Workshop page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing workshop page:', error);
            this.modal.error('Failed to initialize workshop page. Please try refreshing the page.');
        }
    }

    async loadWorkshopData() {
        try {
            Logger.info('Starting to load workshop data...');
            
            // Check if player has a workshop
            const hasWorkshop = await this.contracts.districtBuildings.isDistrictBuildingActive('Workshop');
            Logger.info('Player has workshop:', hasWorkshop);

            if (!hasWorkshop) {
                this.setState({
                    damagedBuildings: [],
                    totalDamaged: 0,
                    canRepair: false,
                    repairCost: 0,
                    damagedByTier: { 0: 0, 1: 0, 2: 0, 3: 0 }
                });
                return;
            }

            // Get all active buildings
            const playerAddress = await this.contracts.gameState.getAddress();
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for damaged buildings
            const damagedBuildings = [];
            let totalRepairCost = 0;
            const damagedByTier = { 0: 0, 1: 0, 2: 0, 3: 0 };

            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.damaged) {
                    const config = await this.contracts.gridBuildings.getBuildingConfig(building.buildingType);
                    const repairCost = (config.upgradeCost * building.level) / 2n; // Half the upgrade cost per level
                    
                    damagedBuildings.push({
                        id: buildingId,
                        type: building.buildingType,
                        level: building.level,
                        repairCost: repairCost.toString(),
                        name: config.name,
                        tier: config.tier
                    });
                    
                    totalRepairCost += repairCost;
                    damagedByTier[config.tier]++;
                }
            }
            Logger.info('Found damaged buildings:', damagedBuildings);

            // Update state
            this.setState({
                damagedBuildings: damagedBuildings,
                totalDamaged: damagedBuildings.length,
                canRepair: damagedBuildings.length > 0,
                repairCost: totalRepairCost.toString(),
                damagedByTier: damagedByTier
            });

        } catch (error) {
            Logger.error('Error loading workshop data:', error);
            this.modal.error('Failed to load workshop data. Please try refreshing the page.');
        }
    }

    async handleRepairBuilding(buildingId) {
        try {
            Logger.info('Starting building repair for building ID:', buildingId);
            
            // Show loading modal
            const loadingModal = this.modal.loading('Repairing building...');
            
            // Repair the building
            await this.contracts.gridBuildings.repairBuilding(buildingId);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload workshop data
            await this.loadWorkshopData();
            
            // Show success message
            this.modal.success('Successfully repaired building!');
            
        } catch (error) {
            Logger.error('Error repairing building:', error);
            this.modal.error('Failed to repair building. Please try again.');
        }
    }

    async handleRepairAllBuildings() {
        try {
            Logger.info('Starting repair of all damaged buildings...');
            
            if (this.state.damagedBuildings.length === 0) {
                this.modal.error('No damaged buildings to repair.');
                return;
            }
            
            // Show loading modal
            const loadingModal = this.modal.loading('Repairing all damaged buildings...');
            
            // Repair each building one by one
            for (const building of this.state.damagedBuildings) {
                await this.contracts.gridBuildings.repairBuilding(building.id);
            }
            
            // Close loading modal
            loadingModal.close();
            
            // Reload workshop data
            await this.loadWorkshopData();
            
            // Show success message
            this.modal.success(`Successfully repaired ${this.state.damagedBuildings.length} buildings!`);
            
        } catch (error) {
            Logger.error('Error repairing all buildings:', error);
            this.modal.error('Failed to repair buildings. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system
        this.addEventListener('.repair-all-button', 'click', () => {
            this.handleRepairAllBuildings().catch(error => {
                Logger.error('Error in handleRepairAllBuildings:', error);
            });
        });

        // Add event listeners for individual repair buttons only if they exist
        const repairButtons = this.element.querySelectorAll('.repair-building-button');
        if (repairButtons.length > 0) {
            this.addEventListener('.repair-building-button', 'click', (event) => {
                const buildingId = event.currentTarget.dataset.buildingId;
                if (buildingId) {
                    this.handleRepairBuilding(buildingId).catch(error => {
                        Logger.error('Error in handleRepairBuilding:', error);
                    });
                }
            });
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Workshop</h1>
                <p class="page-description">
                    <strong>The Workshop allows you to repair damaged grid buildings.</strong> 
                    Damaged buildings cannot produce resources until repaired. 
                    <em>Repair costs are based on the building's level and type.</em>
                </p>
                
                <!-- Workshop Status Section -->
                <div class="page-section">
                    <h2>Repair Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Damaged:</span>
                            <span class="status-value" data-state="totalDamaged">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Repair Cost:</span>
                            <span class="status-value" data-state="repairCost">0</span>
                        </div>
                    </div>
                </div>

                <!-- Damaged Buildings by Tier Section -->
                <div class="page-section">
                    <h2>Damaged Buildings by Tier</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Tier 0 (Houses):</span>
                            <span class="status-value" data-state="damagedByTier.0">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 1 (Farms):</span>
                            <span class="status-value" data-state="damagedByTier.1">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 2 (Diamond Stations):</span>
                            <span class="status-value" data-state="damagedByTier.2">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 3 (REP Forges):</span>
                            <span class="status-value" data-state="damagedByTier.3">0</span>
                        </div>
                    </div>
                </div>

                <!-- Damaged Buildings Section -->
                <div class="page-section">
                    <h2>Damaged Buildings</h2>
                    <div class="buildings-grid" id="damaged-buildings-list">
                        <!-- Damaged buildings will be populated here -->
                    </div>
                </div>

                <!-- Actions Section -->
                <div class="page-section">
                    <h2>Actions</h2>
                    <div class="building-actions">
                        <button class="repair-all-button btn btn-primary btn-lg" data-state="canRepair" disabled>
                            <span class="button-text">Repair All Buildings</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Update damaged buildings list
        this.updateDamagedBuildingsList();
    }

    updateDamagedBuildingsList() {
        const container = this.element.querySelector('#damaged-buildings-list');
        if (!container) return;

        if (this.state.damagedBuildings.length === 0) {
            container.innerHTML = `
                <div class="building-card">
                    <h3>No Damaged Buildings</h3>
                    <p>All your grid buildings are in good condition!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.damagedBuildings.map(building => `
            <div class="building-card">
                <h3>${building.name}</h3>
                <p>Level ${building.level} building (Tier ${building.tier})</p>
                <div class="building-details">
                    <div class="detail-item">
                        <span class="detail-label">Building ID:</span>
                        <span class="detail-value">${building.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Repair Cost:</span>
                        <span class="detail-value">${building.repairCost} gold</span>
                    </div>
                </div>
                <button class="repair-building-button btn btn-secondary" data-building-id="${building.id}">
                    Repair Building
                </button>
            </div>
        `).join('');

        this.setupEventListeners();
    }

    updateUI(oldState, newState) {
        // Call parent updateUI first
        super.updateUI(oldState, newState);
        
        // Update damaged buildings list if the list changed
        if (oldState?.damagedBuildings?.length !== newState?.damagedBuildings?.length) {
            this.updateDamagedBuildingsList();
        }
    }
} 