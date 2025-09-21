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
            damagedDistrictBuildings: [],
            totalDamaged: 0,
            canRepair: false,
            repairCost: 0,
            damagedByTier: {
                0: 0, // Houses
                1: 0, // Farms
                2: 0, // Diamond Stations
                3: 0, // REP Forges
                4: 0  // Yield Stations
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
                    damagedByTier: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
                });
                return;
            }

            // Get all active buildings
            const playerAddress = await this.contracts.gameState.getAddress();
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for damaged buildings
            const damagedBuildings = [];
            let totalRepairCost = 0n;
            const damagedByTier = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

            // Check grid buildings
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.damaged) {
                    const config = await this.contracts.gridBuildings.getBuildingConfig(building.buildingType);
                    const repairCost = config.upgradeCost * BigInt(building.level); // Equal to upgrade cost per level
                    
                    damagedBuildings.push({
                        id: buildingId,
                        type: building.buildingType,
                        level: building.level,
                        repairCost: repairCost.toString(),
                        name: config.name,
                        tier: config.tier,
                        buildingType: 'grid'
                    });
                    
                    totalRepairCost += repairCost;
                    damagedByTier[config.tier]++;
                }
            }

            // Check district buildings
            const damagedDistrictBuildings = [];
            const [buildingTypes, configs] = await this.contracts.districtBuildings.getAllDistrictBuildingConfigs();
            
            for (let i = 0; i < buildingTypes.length; i++) {
                const buildingType = buildingTypes[i];
                const config = configs[i];
                
                // Skip tier 0 buildings (they can't be damaged)
                if (config.tier === 0) continue;
                
                const isBuilt = await this.contracts.districtBuildings.isDistrictBuildingBuilt(config.name);
                const isDamaged = await this.contracts.districtBuildings.isBuildingDamaged(config.name);
                
                if (isBuilt && isDamaged) {
                    const repairCost = Math.floor(Number(config.buildCost) / 2); // Half the build cost
                    
                    damagedDistrictBuildings.push({
                        name: config.name,
                        tier: config.tier,
                        repairCost: repairCost.toString(),
                        buildingType: 'district'
                    });
                    
                    totalRepairCost += BigInt(repairCost);
                }
            }

            Logger.info('Found damaged grid buildings:', damagedBuildings);
            Logger.info('Found damaged district buildings:', damagedDistrictBuildings);

            // Update state
            this.setState({
                damagedBuildings: damagedBuildings,
                damagedDistrictBuildings: damagedDistrictBuildings,
                totalDamaged: damagedBuildings.length + damagedDistrictBuildings.length,
                canRepair: (damagedBuildings.length + damagedDistrictBuildings.length) > 0,
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

    async handleRepairDistrictBuilding(buildingName) {
        try {
            Logger.info('Starting district building repair for:', buildingName);
            
            // Show loading modal
            const loadingModal = this.modal.loading('Repairing district building...');
            
            // Repair the district building
            await this.contracts.districtBuildings.repairBuilding(buildingName);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload workshop data
            await this.loadWorkshopData();
            
            // Show success message
            this.modal.success(`Successfully repaired ${buildingName}!`);
            
        } catch (error) {
            Logger.error('Error repairing district building:', error);
            this.modal.error('Failed to repair district building. Please try again.');
        }
    }

    async handleRepairAllBuildings() {
        try {
            Logger.info('Starting repair of all damaged buildings...');
            
            const totalDamaged = this.state.damagedBuildings.length + this.state.damagedDistrictBuildings.length;
            
            if (totalDamaged === 0) {
                this.modal.error('No damaged buildings to repair.');
                return;
            }
            
            // Show loading modal
            const loadingModal = this.modal.loading('Repairing all damaged buildings...');
            
            let repairedCount = 0;
            
            // Repair grid buildings
            for (const building of this.state.damagedBuildings) {
                await this.contracts.gridBuildings.repairBuilding(building.id);
                repairedCount++;
            }
            
            // Repair district buildings
            for (const building of this.state.damagedDistrictBuildings) {
                await this.contracts.districtBuildings.repairBuilding(building.name);
                repairedCount++;
            }
            
            // Close loading modal
            loadingModal.close();
            
            // Reload workshop data
            await this.loadWorkshopData();
            
            // Show success message
            this.modal.success(`Successfully repaired ${repairedCount} buildings!`);
            
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

        // Add event listeners for district building repair buttons
        const districtRepairButtons = this.element.querySelectorAll('.repair-district-building-button');
        if (districtRepairButtons.length > 0) {
            this.addEventListener('.repair-district-building-button', 'click', (event) => {
                const buildingName = event.currentTarget.dataset.buildingName;
                if (buildingName) {
                    this.handleRepairDistrictBuilding(buildingName).catch(error => {
                        Logger.error('Error in handleRepairDistrictBuilding:', error);
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
                    <strong>The Workshop allows you to repair damaged buildings.</strong> 
                    Damaged buildings cannot function until repaired. 
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
                        <div class="status-item">
                            <span class="status-label">Tier 4 (Yield Stations):</span>
                            <span class="status-value" data-state="damagedByTier.4">0</span>
                        </div>
                    </div>
                </div>

                <!-- Damaged Grid Buildings Section -->
                <div class="page-section">
                    <h2>Damaged Grid Buildings</h2>
                    <div class="buildings-grid" id="damaged-buildings-list">
                        <!-- Damaged grid buildings will be populated here -->
                    </div>
                </div>

                <!-- Damaged District Buildings Section -->
                <div class="page-section">
                    <h2>Damaged District Buildings</h2>
                    <div class="buildings-grid" id="damaged-district-buildings-list">
                        <!-- Damaged district buildings will be populated here -->
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
        // Update grid buildings
        const gridContainer = this.element.querySelector('#damaged-buildings-list');
        if (gridContainer) {
            if (this.state.damagedBuildings.length === 0) {
                gridContainer.innerHTML = `
                    <div class="building-card">
                        <h3>No Damaged Grid Buildings</h3>
                        <p>All your grid buildings are in good condition!</p>
                    </div>
                `;
            } else {
                gridContainer.innerHTML = this.state.damagedBuildings.map(building => `
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
            }
        }

        // Update district buildings
        const districtContainer = this.element.querySelector('#damaged-district-buildings-list');
        if (districtContainer) {
            if (this.state.damagedDistrictBuildings.length === 0) {
                districtContainer.innerHTML = `
                    <div class="building-card">
                        <h3>No Damaged District Buildings</h3>
                        <p>All your district buildings are in good condition!</p>
                    </div>
                `;
            } else {
                districtContainer.innerHTML = this.state.damagedDistrictBuildings.map(building => `
                    <div class="building-card">
                        <h3>${building.name}</h3>
                        <p>District building (Tier ${building.tier})</p>
                        <div class="building-details">
                            <div class="detail-item">
                                <span class="detail-label">Repair Cost:</span>
                                <span class="detail-value">${building.repairCost} gold</span>
                            </div>
                        </div>
                        <button class="repair-district-building-button btn btn-secondary" data-building-name="${building.name}">
                            Repair Building
                        </button>
                    </div>
                `).join('');
            }
        }

        this.setupEventListeners();
    }

    updateUI(oldState, newState) {
        // Call parent updateUI first
        super.updateUI(oldState, newState);
        
        // Update damaged buildings list if either list changed
        if (oldState?.damagedBuildings?.length !== newState?.damagedBuildings?.length ||
            oldState?.damagedDistrictBuildings?.length !== newState?.damagedDistrictBuildings?.length) {
            this.updateDamagedBuildingsList();
        }
    }
} 