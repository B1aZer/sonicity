import { BasePage } from './BasePage.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { ethers } from 'ethers';

//import('../styles/grid-hub-page.css');

export class GridHubPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('GridHubPage constructor called');
        
        this.element.className = 'base-page';
        
        
        // Initialize state
        this.setState({
            // Global Status
            totalBuildings: 0,
            totalBuildingSlots: 0,
            usedBuildingSlots: 0,
            
            // Progress to next tier
            currentTier: 0,
            currentTierRequirement: 0,
            nextTierRequirement: 0,
            treasury: 0,
            
            // Building counts by tier
            buildingsByTier: {
                0: 0, // Houses
                1: 0, // Farms
                2: 0, // Diamond Stations
                3: 0  // Rep Stations
            },
            
            // Associated resources by tier
            resourcesByTier: {
                0: 0, // Gold from houses
                1: 0, // Food from farms
                2: 0, // Diamonds from diamond stations
                3: 0  // Rep from rep stations
            },
            
            // Additional status
            buildingsAtCap: 0,
            damagedBuildings: 0,
            
            // Individual building data
            buildings: [],
            
            // Recharge costs
            rechargeCost: '0.01',
            
            // UI states
            canRecharge: false,
            selectedTier: 0
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('GridHubPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadGridHubData();
            this.setupEventListeners();
            Logger.info('Grid Hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing grid hub page:', error);
            this.modal.error('Failed to initialize grid hub page. Please try refreshing the page.');
        }
    }

    async loadGridHubData() {
        try {
            Logger.info('Starting to load grid hub data...');
            
            const playerAddress = await this.contracts.gameState.getAddress();
            Logger.info('Player address:', playerAddress);
            
            // Load player state and tier data
            const playerState = await this.contracts.gameState.call('playerState', playerAddress);
            Logger.info('Player state:', playerState);
            const currentTier = Number(playerState.tier);
            const [currentTierRequirement, nextTierRequirement] = await Promise.all([
                currentTier === 0 ? 0 : this.contracts.gameState.getTierRequirements(currentTier),
                this.contracts.gameState.getTierRequirements(currentTier + 1)
            ]);
            
            // Load building slots data
            const totalBuildingSlots = Number(playerState.buildingSlots);
            Logger.info('Total building slots:', totalBuildingSlots);
            
            // Load building data
            let activeBuildingIds = [];
            try {
                activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings();
                Logger.info('Active building IDs:', activeBuildingIds);
                Logger.info('Number of active buildings:', activeBuildingIds.length);
            } catch (error) {
                Logger.warn('Failed to get active buildings, assuming no buildings:', error);
                activeBuildingIds = [];
            }
            
            const buildingsByTier = { 0: 0, 1: 0, 2: 0, 3: 0 };
            const resourcesByTier = { 0: 0, 1: 0, 2: 0, 3: 0 };
            let damagedBuildings = 0;
            let buildingsAtCap = 0;
            const buildings = [];
            
            // Analyze each building
            for (const buildingId of activeBuildingIds) {
                try {
                    Logger.info(`Processing building ID: ${buildingId}`);
                    const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                    Logger.info('Building data:', building);
                    Logger.info('Building type:', building.buildingType);
                    Logger.info('Building level:', building.level);
                    Logger.info('Building damaged:', building.damaged);
                    
                    // Validate building data
                    if (!building || (building.buildingType === 0n && building.level === 0n)) {
                        Logger.info(`Skipping building ${buildingId} - invalid or inactive building`);
                        continue;
                    }
                    
                    const config = await this.contracts.gridBuildings.getBuildingConfig(building.buildingType);
                    Logger.info('Building config:', config);
                    Logger.info('Building tier:', config.tier);
                    
                    // Count by tier
                    buildingsByTier[config.tier]++;
                    Logger.info(`Added building to tier ${config.tier}, count now: ${buildingsByTier[config.tier]}`);
                    
                    // Check if damaged
                    if (building.damaged) {
                        damagedBuildings++;
                    }
                    
                    // Check if at production cap (24 hours)
                    const timeSinceCollection = Date.now() / 1000 - Number(building.lastCollectionTime);
                    const isAtCap = timeSinceCollection >= 24 * 3600;
                    if (isAtCap) {
                        buildingsAtCap++;
                    }
                    
                    // Calculate claimable resources
                    let claimableResources = 0;
                    try {
                        claimableResources = await this.contracts.gridBuildings.calculateClaimableResources(buildingId);
                        Logger.info(`Claimable resources for building ${buildingId}: ${claimableResources}`);
                    } catch (error) {
                        Logger.warn(`Failed to calculate claimable resources for building ${buildingId}:`, error);
                        claimableResources = 0;
                    }
                    
                    // Add to resources by tier
                    resourcesByTier[config.tier] += Number(claimableResources);
                    
                    // Add building to detailed list
                    buildings.push({
                        id: buildingId,
                        type: building.buildingType,
                        level: Number(building.level),
                        damaged: building.damaged,
                        isAtCap,
                        lastCollectionTime: Number(building.lastCollectionTime),
                        lastUpgradeTime: Number(building.lastUpgradeTime),
                        claimableResources: Number(claimableResources),
                        config: {
                            name: config.name,
                            description: config.description,
                            tier: config.tier,
                            baseProductionRate: Number(config.baseProductionRate),
                            upgradeCost: Number(config.upgradeCost),
                            maxLevel: Number(config.maxLevel)
                        }
                    });
                    
                    Logger.info(`Successfully added building ${buildingId} to buildings array`);
                } catch (error) {
                    Logger.error(`Error processing building ${buildingId}:`, error);
                    Logger.error('Error details:', error.message);
                    continue;
                }
            }
            
            Logger.info('Final building counts by tier:', buildingsByTier);
            Logger.info('Total buildings processed:', buildings.length);
            Logger.info('Buildings array:', buildings);
            
            // Update state
            this.setState({
                totalBuildings: activeBuildingIds.length,
                totalBuildingSlots,
                usedBuildingSlots: activeBuildingIds.length,
                currentTier,
                currentTierRequirement: currentTierRequirement.toString(),
                nextTierRequirement: nextTierRequirement.toString(),
                treasury: playerState.treasury.toString(),
                damagedBuildings,
                buildingsAtCap,
                buildingsByTier,
                resourcesByTier,
                buildings,
                canRecharge: buildingsAtCap > 0,
                rechargeCost: ethers.formatEther(GridBuildingsContract.RECHARGE_FEE)
            });
            
        } catch (error) {
            Logger.error('Error loading grid hub data:', error);
            this.modal.error('Failed to load grid hub data. Please try refreshing the page.');
        }
    }

    updateStatusSection() {
        // Update building slots display
        const usedSlots = this.element.querySelector('.used-building-slots');
        const totalSlots = this.element.querySelector('.total-building-slots');
        if (usedSlots) usedSlots.textContent = this.state.usedBuildingSlots;
        if (totalSlots) totalSlots.textContent = this.state.totalBuildingSlots;
        
        // Update tier progress bar
        const progressBar = this.element.querySelector('.tier-progress-bar');
        const progressContainer = this.element.querySelector('.tier-progress');
        if (progressBar && progressContainer) {
            const treasury = BigInt(this.state.treasury);
            const currentTier = this.state.currentTier;
            const currentReq = BigInt(this.state.currentTierRequirement);
            const nextReq = BigInt(this.state.nextTierRequirement);
            
            // Calculate progress using BigInt arithmetic
            const progress = Number((treasury - currentReq) * BigInt(100) / (nextReq - currentReq));
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            progressContainer.title = `${treasury.toString()} / ${nextReq.toString()} Gold`;
            
            // Update tier progress text
            const progressText = this.element.querySelector('.tier-progress-text');
            if (progressText) {
                progressText.textContent = `Progress to Tier ${currentTier + 1}: ${Math.min(progress, 100).toFixed(1)}%`;
            }
        }
    }

    updateTierTabs() {
        // Update tier tab counts
        Object.entries(this.state.buildingsByTier).forEach(([tier, count]) => {
            const tab = this.element.querySelector(`.tier-tab[data-tier="${tier}"]`);
            if (tab) {
                const countElement = tab.querySelector('.tier-count');
                if (countElement) {
                    countElement.textContent = count;
                }
                
                // Add empty class if no buildings
                if (count === 0) {
                    tab.classList.add('empty');
                } else {
                    tab.classList.remove('empty');
                }
            }
        });
    }

    async updateBuildingCards() {
        Logger.info('Starting updateBuildingCards');
        Logger.info('Current state buildings:', this.state.buildings);
        Logger.info('Current state buildingsByTier:', this.state.buildingsByTier);
        
        // Check if there are any buildings at all
        if (this.state.buildings.length === 0) {
            Logger.info('No buildings found, showing empty state');
            // Update all tier contents to show empty state
            for (let tier = 0; tier <= 3; tier++) {
                const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
                if (tierContent) {
                    const buildingsGrid = tierContent.querySelector('.buildings-grid');
                    if (buildingsGrid) {
                        buildingsGrid.innerHTML = `
                            <div class="empty-state">
                                <div class="empty-icon">🏗️</div>
                                <h3>No Buildings Found</h3>
                                <p>You don't have any buildings in this tier yet.</p>
                                <p>Buildings will appear here once you create them in the game.</p>
                            </div>
                        `;
                    }
                }
            }
            return;
        }
        
        // Get buildings for each tier
        for (let tier = 0; tier <= 3; tier++) {
            Logger.info(`Processing tier ${tier}`);
            const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
            if (!tierContent) {
                Logger.info(`No content found for tier ${tier}, skipping`);
                continue;
            }

            // Filter buildings by tier
            const tierBuildings = this.state.buildings.filter(building => {
                const buildingTier = Number(building.config.tier);
                const currentTier = Number(tier);
                Logger.info(`Checking building ${building.id}: building.config.tier = ${building.config.tier} (${typeof building.config.tier}), tier = ${tier} (${typeof tier}), buildingTier = ${buildingTier}, currentTier = ${currentTier}, match = ${buildingTier === currentTier}`);
                return buildingTier === currentTier;
            });
            Logger.info(`Found ${tierBuildings.length} buildings for tier ${tier}`);
            Logger.info('Tier buildings:', tierBuildings);
            
            const buildingsGrid = tierContent.querySelector('.buildings-grid');
            if (!buildingsGrid) {
                Logger.warn(`No buildings grid found for tier ${tier}`);
                continue;
            }
            
            // Show empty state if no buildings in this tier
            if (tierBuildings.length === 0) {
                buildingsGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🏗️</div>
                        <h3>No Buildings in Tier ${tier}</h3>
                        <p>You don't have any buildings in this tier yet.</p>
                        <p>Buildings will appear here once you create them in the game.</p>
                    </div>
                `;
                continue;
            }
            
            buildingsGrid.innerHTML = tierBuildings.map(building => {
                const { id, type, level, damaged, isAtCap, lastCollectionTime, claimableResources, config } = building;
                
                // Calculate time since last collection
                const timeSinceCollection = Date.now() / 1000 - lastCollectionTime;
                const hoursSinceCollection = Math.floor(timeSinceCollection / 3600);
                const minutesSinceCollection = Math.floor((timeSinceCollection % 3600) / 60);
                
                // Calculate production rate
                const productionRate = config.baseProductionRate * level;
                
                // Determine building status
                let statusClass = 'normal';
                let statusText = 'Operating';
                if (damaged) {
                    statusClass = 'damaged';
                    statusText = 'Damaged';
                } else if (isAtCap) {
                    statusClass = 'at-cap';
                    statusText = 'At Production Cap';
                }
                
                // Determine if can upgrade
                const canUpgrade = !damaged && level < config.maxLevel;
                const upgradeCost = canUpgrade ? config.upgradeCost * level : 0;
                
                // Determine if can collect
                const canCollect = !damaged && claimableResources > 0;
                
                // Determine if can recharge
                const canRecharge = !damaged && isAtCap;
                
                // Determine if can repair
                const canRepair = damaged;
                
                return `
                    <div class="building-card ${statusClass}" data-building-id="${id}">
                        <div class="building-header">
                            <div class="building-icon">
                                ${this.getBuildingIcon(type)}
                            </div>
                            <div class="building-info">
                                <h3>${config.name}</h3>
                                <p class="building-description">${config.description}</p>
                            </div>
                            <div class="building-status ${statusClass}">
                                <span class="status-indicator"></span>
                                <span class="status-text">${statusText}</span>
                            </div>
                        </div>
                        
                        <div class="building-details">
                            <div class="detail-item">
                                <span class="detail-label">Level:</span>
                                <span class="detail-value">${level} / ${config.maxLevel}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Production Rate:</span>
                                <span class="detail-value">${productionRate}/hour</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Collection:</span>
                                <span class="detail-value">${hoursSinceCollection}h ${minutesSinceCollection}m ago</span>
                            </div>
                            ${claimableResources > 0 ? `
                                <div class="detail-item">
                                    <span class="detail-label">Claimable:</span>
                                    <span class="detail-value">${claimableResources}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="building-actions">
                            ${canCollect ? `
                                <button class="building-button btn btn-primary collect-btn" data-building-id="${id}">
                                    Collect Resources
                                </button>
                            ` : ''}
                            ${canUpgrade ? `
                                <button class="building-button btn btn-secondary upgrade-btn" data-building-id="${id}" data-upgrade-cost="${upgradeCost}">
                                    Upgrade (${upgradeCost} Gold)
                                </button>
                            ` : ''}
                            ${canRecharge ? `
                                <button class="building-button btn btn-warning recharge-btn" data-building-id="${id}">
                                    Recharge (${this.state.rechargeCost} SONIC)
                                </button>
                            ` : ''}
                            ${canRepair ? `
                                <button class="building-button btn btn-danger repair-btn" data-building-id="${id}">
                                    Repair Building
                                </button>
                            ` : ''}
                            <button class="building-button btn btn-info reset-btn" data-building-id="${id}">
                                Reset Building
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    getBuildingIcon(buildingType) {
        switch (Number(buildingType)) {
            case 0: return '🏠'; // House
            case 1: return '🌾'; // Farm
            case 2: return '💎'; // Diamond Station
            case 3: return '⭐'; // Rep Station
            default: return '🏗️';
        }
    }

    async handleCollectResources(buildingId) {
        try {
            Logger.info('Starting resource collection...');
            const loadingModal = this.modal.loading('Collecting resources...');
            
            await this.contracts.gridBuildings.collectResources(buildingId);
            
            loadingModal.close();
            await this.loadGridHubData();
            this.modal.success('Successfully collected resources!');
            
        } catch (error) {
            Logger.error('Error collecting resources:', error);
            this.modal.error('Failed to collect resources. Please try again.');
        }
    }

    async handleUpgradeBuilding(buildingId) {
        try {
            Logger.info('Starting building upgrade...');
            const loadingModal = this.modal.loading('Upgrading building...');
            
            await this.contracts.gridBuildings.upgradeBuilding(buildingId);
            
            loadingModal.close();
            await this.loadGridHubData();
            this.modal.success('Successfully upgraded building!');
            
        } catch (error) {
            Logger.error('Error upgrading building:', error);
            this.modal.error('Failed to upgrade building. Please try again.');
        }
    }

    async handleRechargeBuilding(buildingId) {
        try {
            Logger.info('Starting building recharge...');
            const loadingModal = this.modal.loading('Recharging building...');
            
            await this.contracts.gridBuildings.rechargeBuilding(buildingId);
            
            loadingModal.close();
            await this.loadGridHubData();
            this.modal.success('Successfully recharged building!');
            
        } catch (error) {
            Logger.error('Error recharging building:', error);
            this.modal.error('Failed to recharge building. Please try again.');
        }
    }

    async handleRepairBuilding(buildingId) {
        try {
            Logger.info('Starting building repair...');
            const loadingModal = this.modal.loading('Repairing building...');
            
            await this.contracts.gridBuildings.repairBuilding(buildingId);
            
            loadingModal.close();
            await this.loadGridHubData();
            this.modal.success('Successfully repaired building!');
            
        } catch (error) {
            Logger.error('Error repairing building:', error);
            this.modal.error('Failed to repair building. Please try again.');
        }
    }

    async handleResetBuilding(buildingId) {
        try {
            Logger.info('Starting building reset...');
            const loadingModal = this.modal.loading('Resetting building...');
            
            await this.contracts.gridBuildings.removeBuilding(buildingId);
            
            loadingModal.close();
            await this.loadGridHubData();
            this.modal.success('Successfully reset building!');
            
        } catch (error) {
            Logger.error('Error resetting building:', error);
            this.modal.error('Failed to reset building. Please try again.');
        }
    }

    async handleRechargeAll() {
        try {
            Logger.info('Starting recharge all buildings...');
            const loadingModal = this.modal.loading('Recharging all buildings...');
            
            await this.contracts.gridBuildings.rechargeAllBuildingsAtCap();
            
            loadingModal.close();
            await this.loadGridHubData();
            this.modal.success('Successfully recharged all buildings!');
            
        } catch (error) {
            Logger.error('Error recharging all buildings:', error);
            this.modal.error('Failed to recharge all buildings. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Tier tab switching
        this.addEventListener('.tier-tab', 'click', (e) => {
            const tier = parseInt(e.currentTarget.dataset.tier);
            this.setState({ selectedTier: tier });
            
            // Update active tab
            this.element.querySelectorAll('.tier-tab').forEach(tab => tab.classList.remove('active'));
            this.element.querySelectorAll('.tier-content').forEach(content => content.classList.remove('active'));
            
            e.currentTarget.classList.add('active');
            this.element.querySelector(`.tier-content[data-tier="${tier}"]`).classList.add('active');
        });
        
        // Recharge all button
        this.addEventListener('.recharge-all-button', 'click', () => {
            this.handleRechargeAll().catch(error => {
                Logger.error('Error in handleRechargeAll:', error);
            });
        });
        
        // Building action buttons - using event delegation for dynamically created buttons
        this.element.addEventListener('click', (e) => {
            const target = e.target;
            
            // Check if clicked element is a building button
            if (target.classList.contains('building-button')) {
                const buildingId = target.dataset.buildingId;
                
                if (target.classList.contains('collect-btn')) {
                    this.handleCollectResources(buildingId).catch(error => {
                        Logger.error('Error in handleCollectResources:', error);
                    });
                } else if (target.classList.contains('upgrade-btn')) {
                    this.handleUpgradeBuilding(buildingId).catch(error => {
                        Logger.error('Error in handleUpgradeBuilding:', error);
                    });
                } else if (target.classList.contains('recharge-btn')) {
                    this.handleRechargeBuilding(buildingId).catch(error => {
                        Logger.error('Error in handleRechargeBuilding:', error);
                    });
                } else if (target.classList.contains('repair-btn')) {
                    this.handleRepairBuilding(buildingId).catch(error => {
                        Logger.error('Error in handleRepairBuilding:', error);
                    });
                } else if (target.classList.contains('reset-btn')) {
                    this.handleResetBuilding(buildingId).catch(error => {
                        Logger.error('Error in handleResetBuilding:', error);
                    });
                }
            }
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Grid Hub</h1>
                <p class="page-description">
                    Manage your grid buildings across different tiers. <strong>Buildings produce resources for 24 hours</strong> before needing to be recharged. 
                    <em>Upgrade your buildings to increase production rates and unlock new features.</em>
                </p>
                
                <!-- Global Status Section -->
                <div class="page-section">
                    <h2>Global Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Building Slots:</span>
                            <span class="status-value">
                                <span data-state="usedBuildingSlots">0</span>/<span data-state="totalBuildingSlots">0</span>
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Buildings:</span>
                            <span class="status-value" data-state="totalBuildings">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">At Cap:</span>
                            <span class="status-value" data-state="buildingsAtCap">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Damaged:</span>
                            <span class="status-value" data-state="damagedBuildings">0</span>
                        </div>
                    </div>
                </div>

                <!-- Progress Section -->
                <div class="page-section">
                    <h2>District Progress</h2>
                    <div class="tier-progress">
                        <div class="tier-progress-bar"></div>
                    </div>
                    <p class="tier-progress-text">Progress to Tier 1: 0%</p>
                    
                    <div class="recharge-section">
                        <div class="recharge-info">
                            <p><strong>Recharge Cost:</strong> <span data-state="rechargeCost">0.01</span> SONIC per building</p>
                            <p>Recharge buildings that have reached their 24-hour production cap to continue generating resources.</p>
                        </div>
                        <button class="recharge-all-button btn btn-primary" data-state="canRecharge" disabled>
                            Recharge All
                        </button>
                    </div>
                </div>

                <!-- Tier Tabs Section -->
                <div class="tier-tabs-section">
                    <h2>Building Tiers</h2>
                    <div class="tier-tabs">
                        <button class="tier-tab active" data-tier="0">
                            <span>Tier 0</span>
                            <span class="tier-count">0</span>
                        </button>
                        <button class="tier-tab" data-tier="1">
                            <span>Tier 1</span>
                            <span class="tier-count">0</span>
                        </button>
                        <button class="tier-tab" data-tier="2">
                            <span>Tier 2</span>
                            <span class="tier-count">0</span>
                        </button>
                        <button class="tier-tab" data-tier="3">
                            <span>Tier 3</span>
                            <span class="tier-count">0</span>
                        </button>
                    </div>
                    
                    <!-- Tier Status -->
                    <div class="tier-status">
                        <div class="status-item">
                            <span class="status-label">Tier 0 (Houses):</span>
                            <span class="status-value">
                                <span data-state="buildingsByTier.0">0</span> buildings, 
                                <span data-state="resourcesByTier.0">0</span> gold
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 1 (Farms):</span>
                            <span class="status-value">
                                <span data-state="buildingsByTier.1">0</span> buildings, 
                                <span data-state="resourcesByTier.1">0</span> food
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 2 (Diamond Stations):</span>
                            <span class="status-value">
                                <span data-state="buildingsByTier.2">0</span> buildings, 
                                <span data-state="resourcesByTier.2">0</span> diamonds
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 3 (Rep Stations):</span>
                            <span class="status-value">
                                <span data-state="buildingsByTier.3">0</span> buildings, 
                                <span data-state="resourcesByTier.3">0</span> rep
                            </span>
                        </div>
                    </div>
                    
                    <!-- Tier Content -->
                    <div class="tier-content active" data-tier="0">
                        <div class="buildings-grid">
                            <!-- Buildings will be populated here -->
                        </div>
                    </div>
                    
                    <div class="tier-content" data-tier="1">
                        <div class="buildings-grid">
                            <!-- Buildings will be populated here -->
                        </div>
                    </div>
                    
                    <div class="tier-content" data-tier="2">
                        <div class="buildings-grid">
                            <!-- Buildings will be populated here -->
                        </div>
                    </div>
                    
                    <div class="tier-content" data-tier="3">
                        <div class="buildings-grid">
                            <!-- Buildings will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateUI(oldState, newState) {
        // Update status section
        this.updateStatusSection();
        
        // Update tier tabs
        this.updateTierTabs();
        
        // Update building cards if buildings data changed or tier changed
        if (oldState.buildings !== newState.buildings || oldState.selectedTier !== newState.selectedTier) {
            this.updateBuildingCards();
        }
        
        // Call parent updateUI
        super.updateUI(oldState, newState);
    }

}
