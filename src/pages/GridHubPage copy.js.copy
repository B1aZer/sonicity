import { BasePage } from './BasePage.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { ethers } from 'ethers';

export class GridHubPage extends BasePage {
    constructor() {
        super();
        import('../styles/grid-hub-page.css');
        Logger.info('GridHubPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        
        // Initialize state
        this.setState({
            // Grid Building Status
            totalBuildings: 0,
            damagedBuildings: 0,
            buildingsAtCap: 0,
            
            // Building counts by tier
            buildingsByTier: {
                0: 0, // Houses
                1: 0, // Farms
                2: 0  // Rep Stations
            },
            
            // Individual building data
            buildings: [],
            
            // Resources
            playerGold: 0,
            playerFood: 0,
            playerRep: 0,
            
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
            
            // Load player resources
            const [playerGold, playerFood, playerRep] = await Promise.all([
                this.contracts.gameState.getPlayerGold(playerAddress),
                this.contracts.gameState.getPlayerFood(playerAddress),
                this.contracts.gameState.getPlayerRep(playerAddress)
            ]);
            
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
            
            const buildingsByTier = { 0: 0, 1: 0, 2: 0 };
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
                    
                    // Calculate claimable resources with error handling
                    let claimableResources = 0;
                    try {
                        claimableResources = await this.contracts.gridBuildings.calculateClaimableResources(buildingId);
                        Logger.info(`Claimable resources for building ${buildingId}: ${claimableResources}`);
                    } catch (error) {
                        Logger.warn(`Failed to calculate claimable resources for building ${buildingId}:`, error);
                        Logger.warn('Error details:', error.message);
                        // Set to 0 if calculation fails
                        claimableResources = 0;
                    }
                    
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
                    // Continue with other buildings instead of failing completely
                    continue;
                }
            }
            
            Logger.info('Final building counts by tier:', buildingsByTier);
            Logger.info('Total buildings processed:', buildings.length);
            Logger.info('Buildings array:', buildings);
            
            // Update state
            this.setState({
                totalBuildings: activeBuildingIds.length,
                damagedBuildings,
                buildingsAtCap,
                playerGold: playerGold.toString(),
                playerFood: playerFood.toString(),
                playerRep: playerRep.toString(),
                buildingsByTier,
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
        // Update total buildings display
        const totalBuildingsValue = this.element.querySelector('.total-buildings');
        if (totalBuildingsValue) {
            totalBuildingsValue.textContent = this.state.totalBuildings.toString();
        }

        // Update damaged buildings display
        const damagedBuildingsValue = this.element.querySelector('.damaged-buildings');
        if (damagedBuildingsValue) {
            damagedBuildingsValue.textContent = this.state.damagedBuildings.toString();
        }

        // Update buildings at cap display
        const buildingsAtCapValue = this.element.querySelector('.buildings-at-cap');
        if (buildingsAtCapValue) {
            buildingsAtCapValue.textContent = this.state.buildingsAtCap.toString();
        }

        // Update resources display
        const goldValue = this.element.querySelector('.gold-amount');
        if (goldValue) {
            goldValue.textContent = this.state.playerGold;
        }

        const foodValue = this.element.querySelector('.food-amount');
        if (foodValue) {
            foodValue.textContent = this.state.playerFood;
        }

        const repValue = this.element.querySelector('.rep-amount');
        if (repValue) {
            repValue.textContent = this.state.playerRep;
        }
    }

    async updateBuildingCards() {
        Logger.info('Starting updateBuildingCards');
        Logger.info('Current state buildings:', this.state.buildings);
        Logger.info('Current state buildingsByTier:', this.state.buildingsByTier);
        
        // Check if there are any buildings at all
        if (this.state.buildings.length === 0) {
            Logger.info('No buildings found, showing empty state');
            // Update all tier contents to show empty state
            for (let tier = 0; tier <= 2; tier++) {
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
        for (let tier = 0; tier <= 2; tier++) {
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
        const icons = {
            0: '🏠', // HOUSE
            1: '🌾', // FARM
            2: '⭐'  // REP_STATION
        };
        return icons[buildingType] || '🏢';
    }

    updateTierTabs() {
        const tierTabs = this.element.querySelectorAll('.tier-tab');
        tierTabs.forEach(tab => {
            const tabTier = Number(tab.dataset.tier);
            const buildingCount = this.state.buildingsByTier[tabTier] || 0;
            
            // Update count badge
            const countBadge = tab.querySelector('.tier-count');
            if (countBadge) {
                countBadge.textContent = buildingCount;
                countBadge.style.display = buildingCount > 0 ? 'inline' : 'none';
            }
            
            // Disable tab if no buildings
            if (buildingCount === 0) {
                tab.classList.add('empty');
                tab.title = 'No buildings in this tier';
            } else {
                tab.classList.remove('empty');
                tab.title = `${buildingCount} building${buildingCount !== 1 ? 's' : ''} in Tier ${tabTier}`;
            }
        });
    }

    async handleCollectResources(buildingId) {
        try {
            Logger.info(`Starting collection from building ${buildingId}`);
            
            const building = this.state.buildings.find(b => b.id === buildingId);
            if (!building) {
                this.modal.error('Building not found');
                return;
            }
            
            if (building.claimableResources <= 0) {
                this.modal.error('No resources available to collect');
                return;
            }
            
            // Show confirmation
            const result = await this.modal.confirm(
                `Collect ${building.claimableResources} resources from ${building.config.name}?`,
                { title: 'Confirm Collection' }
            );
            
            if (result.isConfirmed) {
                const loadingModal = this.modal.loading('Collecting resources...');
                
                try {
                    await this.contracts.gridBuildings.collectResources(buildingId);
                    loadingModal.close();
                    await this.loadGridHubData();
                    this.setupEventListeners();
                    this.modal.success(`Successfully collected ${building.claimableResources} resources!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error collecting resources:', error);
                    this.modal.error(`Failed to collect resources: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleCollectResources:', error);
            this.modal.error(`Error collecting resources: ${error.message}`);
        }
    }

    async handleUpgradeBuilding(buildingId) {
        try {
            Logger.info(`Starting upgrade for building ${buildingId}`);
            
            const building = this.state.buildings.find(b => b.id === buildingId);
            if (!building) {
                this.modal.error('Building not found');
                return;
            }
            
            const upgradeCost = building.config.upgradeCost * building.level;
            
            // Check if player has enough gold
            if (BigInt(this.state.playerGold) < BigInt(upgradeCost)) {
                this.modal.error(`Insufficient gold. Required: ${upgradeCost}, Available: ${this.state.playerGold}`);
                return;
            }
            
            // Show confirmation
            const result = await this.modal.confirm(
                `Upgrade ${building.config.name} to level ${building.level + 1} for ${upgradeCost} Gold?`,
                { title: 'Confirm Upgrade' }
            );
            
            if (result.isConfirmed) {
                const loadingModal = this.modal.loading('Upgrading building...');
                
                try {
                    await this.contracts.gridBuildings.upgradeBuilding(buildingId);
                    loadingModal.close();
                    await this.loadGridHubData();
                    this.setupEventListeners();
                    this.modal.success(`Successfully upgraded ${building.config.name} to level ${building.level + 1}!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error upgrading building:', error);
                    this.modal.error(`Failed to upgrade building: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleUpgradeBuilding:', error);
            this.modal.error(`Error upgrading building: ${error.message}`);
        }
    }

    async handleRechargeBuilding(buildingId) {
        try {
            Logger.info(`Starting recharge for building ${buildingId}`);
            
            const building = this.state.buildings.find(b => b.id === buildingId);
            if (!building) {
                this.modal.error('Building not found');
                return;
            }
            
            // Show confirmation
            const result = await this.modal.confirm(
                `Recharge ${building.config.name} for ${this.state.rechargeCost} SONIC tokens?<br><br>
                This will reset the production timer and allow immediate collection.`,
                { title: 'Confirm Recharge' }
            );
            
            if (result.isConfirmed) {
                const loadingModal = this.modal.loading('Recharging building...');
                
                try {
                    await this.contracts.gridBuildings.rechargeBuilding(buildingId);
                    loadingModal.close();
                    await this.loadGridHubData();
                    this.setupEventListeners();
                    this.modal.success(`Successfully recharged ${building.config.name}!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error recharging building:', error);
                    this.modal.error(`Failed to recharge building: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleRechargeBuilding:', error);
            this.modal.error(`Error recharging building: ${error.message}`);
        }
    }

    async handleRepairBuilding(buildingId) {
        try {
            Logger.info(`Starting repair for building ${buildingId}`);
            
            const building = this.state.buildings.find(b => b.id === buildingId);
            if (!building) {
                this.modal.error('Building not found');
                return;
            }
            
            // Show confirmation
            const result = await this.modal.confirm(
                `Repair ${building.config.name}?<br><br>
                This will restore the building to full functionality.`,
                { title: 'Confirm Repair' }
            );
            
            if (result.isConfirmed) {
                const loadingModal = this.modal.loading('Repairing building...');
                
                try {
                    await this.contracts.gridBuildings.repairBuilding(buildingId);
                    loadingModal.close();
                    await this.loadGridHubData();
                    this.setupEventListeners();
                    this.modal.success(`Successfully repaired ${building.config.name}!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error repairing building:', error);
                    this.modal.error(`Failed to repair building: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleRepairBuilding:', error);
            this.modal.error(`Error repairing building: ${error.message}`);
        }
    }

    async handleResetBuilding(buildingId) {
        try {
            Logger.info(`Starting reset for building ${buildingId}`);
            
            const building = this.state.buildings.find(b => b.id === buildingId);
            if (!building) {
                this.modal.error('Building not found');
                return;
            }
            
            // Show confirmation
            const result = await this.modal.confirm(
                `Reset ${building.config.name}?<br><br>
                <strong>Warning:</strong> This will permanently remove the building from your grid.<br>
                This action cannot be undone.`,
                { title: 'Confirm Reset', type: 'warning' }
            );
            
            if (result.isConfirmed) {
                const loadingModal = this.modal.loading('Resetting building...');
                
                try {
                    // This would need to be implemented in the Altar contract
                    // await this.contracts.altar.removeBuilding(buildingId);
                    loadingModal.close();
                    await this.loadGridHubData();
                    this.setupEventListeners();
                    this.modal.success(`Successfully reset ${building.config.name}!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error resetting building:', error);
                    this.modal.error(`Failed to reset building: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleResetBuilding:', error);
            this.modal.error(`Error resetting building: ${error.message}`);
        }
    }

    async handleRechargeAll() {
        try {
            Logger.info('Starting recharge of all buildings at cap...');
            
            if (this.state.buildingsAtCap === 0) {
                this.modal.error('No buildings need recharging.');
                return;
            }
            
            const buildingsAtCap = this.state.buildings.filter(b => b.isAtCap && !b.damaged);
            const totalFee = BigInt(buildingsAtCap.length) * GridBuildingsContract.RECHARGE_FEE;
            
            // Show confirmation
            const result = await this.modal.confirm(
                `Recharge all ${buildingsAtCap.length} buildings at production cap?<br><br>
                Cost: ${this.state.rechargeCost} SONIC tokens per building (${ethers.formatEther(totalFee)} total)<br>
                This will reset production timers and allow immediate collection.`,
                { title: 'Confirm Recharge All' }
            );
            
            if (result.isConfirmed) {
                const loadingModal = this.modal.loading('Recharging buildings...');
                
                try {
                    await this.contracts.gridBuildings.rechargeAllBuildingsAtCap();
                    loadingModal.close();
                    await this.loadGridHubData();
                    this.setupEventListeners();
                    this.modal.success(`Successfully recharged ${buildingsAtCap.length} buildings!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error recharging buildings:', error);
                    this.modal.error(`Failed to recharge buildings: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleRechargeAll:', error);
            this.modal.error(`Error recharging buildings: ${error.message}`);
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Tier tabs
        const tierTabs = this.element.querySelectorAll('.tier-tab');
        tierTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Don't allow clicking empty tabs
                if (tab.classList.contains('empty')) {
                    return;
                }

                // Remove active class from all tabs and contents
                this.element.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
                this.element.querySelectorAll('.tier-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const tier = tab.dataset.tier;
                this.element.querySelector(`.tier-content[data-tier="${tier}"]`).classList.add('active');
                
                // Update selected tier in state
                this.setState({ selectedTier: Number(tier) });
            });
        });

        // Building action buttons
        const collectButtons = this.element.querySelectorAll('.collect-btn');
        collectButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = button.dataset.buildingId;
                this.handleCollectResources(buildingId);
            });
        });

        const upgradeButtons = this.element.querySelectorAll('.upgrade-btn');
        upgradeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = button.dataset.buildingId;
                this.handleUpgradeBuilding(buildingId);
            });
        });

        const rechargeButtons = this.element.querySelectorAll('.recharge-btn');
        rechargeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = button.dataset.buildingId;
                this.handleRechargeBuilding(buildingId);
            });
        });

        const repairButtons = this.element.querySelectorAll('.repair-btn');
        repairButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = button.dataset.buildingId;
                this.handleRepairBuilding(buildingId);
            });
        });

        const resetButtons = this.element.querySelectorAll('.reset-btn');
        resetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buildingId = button.dataset.buildingId;
                this.handleResetBuilding(buildingId);
            });
        });

        // Recharge all button
        const rechargeAllButton = this.element.querySelector('.recharge-all-button');
        if (rechargeAllButton) {
            rechargeAllButton.addEventListener('click', () => {
                this.handleRechargeAll();
            });
        }
    }

    render() {
        Logger.info('Rendering grid hub page');
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Grid Hub</h1>
                <p class="page-description">
                    <strong>Central management hub for all grid buildings.</strong> 
                    Monitor production, upgrade buildings, and manage your grid infrastructure.
                </p>
                
                <!-- Grid Status Section -->
                <div class="page-section status-section">
                    <h2>Grid Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Buildings:</span>
                            <span class="status-value total-buildings">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Damaged Buildings:</span>
                            <span class="status-value damaged-buildings">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">At Production Cap:</span>
                            <span class="status-value buildings-at-cap">0</span>
                        </div>
                    </div>
                </div>

                <!-- Resources Section -->
                <div class="page-section resources-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value gold-amount">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Food:</span>
                            <span class="status-value food-amount">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Reputation:</span>
                            <span class="status-value rep-amount">0</span>
                        </div>
                    </div>
                </div>

                <!-- Recharge All Section -->
                <div class="page-section recharge-section">
                    <h2>Bulk Operations</h2>
                    <div class="recharge-info">
                        <p>Recharge all buildings that have reached their 24-hour production cap.</p>
                        <div class="status-item">
                            <span class="status-label">Recharge Cost:</span>
                            <span class="status-value">${this.state.rechargeCost} SONIC per building</span>
                        </div>
                    </div>
                    <div class="building-actions">
                        <button class="recharge-all-button btn btn-secondary btn-lg" ${this.state.canRecharge ? '' : 'disabled'}>
                            Recharge All Buildings
                        </button>
                    </div>
                </div>

                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <h2>Building Management</h2>
                    <div class="tier-tabs">
                        <button class="tier-tab active" data-tier="0">
                            Tier 0 (Houses)
                            <span class="tier-count">0</span>
                        </button>
                        <button class="tier-tab" data-tier="1">
                            Tier 1 (Farms)
                            <span class="tier-count">0</span>
                        </button>
                        <button class="tier-tab" data-tier="2">
                            Tier 2 (Rep Stations)
                            <span class="tier-count">0</span>
                        </button>
                    </div>

                    <!-- Tier Contents -->
                    <div class="tier-content active" data-tier="0">
                        <div class="buildings-grid"></div>
                    </div>
                    <div class="tier-content" data-tier="1">
                        <div class="buildings-grid"></div>
                    </div>
                    <div class="tier-content" data-tier="2">
                        <div class="buildings-grid"></div>
                    </div>
                </div>
            </div>
        `;
    }

    updateUI(oldState, newState) {
        Logger.info('updateUI called with new state:', newState);
        Logger.info('Buildings in new state:', newState.buildings);
        Logger.info('Buildings count by tier in new state:', newState.buildingsByTier);
        
        // Update status section
        this.updateStatusSection();
        
        // Update building cards
        this.updateBuildingCards();
        
        // Update tier tabs
        this.updateTierTabs();
        
        // Update recharge all button
        const rechargeAllButton = this.element.querySelector('.recharge-all-button');
        if (rechargeAllButton) {
            rechargeAllButton.disabled = !newState.canRecharge;
        }
    }

    mount(container) {
        Logger.info('Mounting grid hub page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during grid hub page initialization:', error);
            this.modal.error('Failed to initialize grid hub page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 