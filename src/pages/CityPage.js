import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';
import { BasePage } from './BasePage.js';

import('../styles/city-page.css');

export class CityPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('CityPage constructor called');
        
        this.element.className = 'base-page';
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('CityPage onInitialized called with wallet:', walletResult.address);
        try {
            await this.loadCityData();
            this.setupEventListeners();
            Logger.info('City page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing city page:', error);
            this.modal.error('Failed to initialize city page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
    }

    async loadCityData() {
        try {
            Logger.info('Starting to load district data...');
            
            // First get player state
            const address = await this.contracts.gameState.getAddress();
            const playerState = await this.contracts.gameState.call('playerState', address);
            
            // Get tier requirements for current and next tier
            const currentTier = Number(playerState.tier);
            const [currentTierRequirement, nextTierRequirement] = await Promise.all([
                currentTier === 0 ? 0 : this.contracts.gameState.getTierRequirements(currentTier),
                this.contracts.gameState.getTierRequirements(currentTier + 1)
            ]);
            
            // Then get other data
            const [playerRep, playerGold] = await Promise.all([
                this.contracts.gameState.getPlayerRep(),
                this.contracts.gameState.getPlayerGold()
            ]);

            // Update UI elements
            this.updateStatusSection(playerState, playerRep, currentTierRequirement, nextTierRequirement, playerGold);
            await this.updateBuildingCards(playerState.tier, playerState.treasury);
            this.updateTierTabs(playerState.tier);
        } catch (error) {
            Logger.error('Error loading city data:', error);
            this.modal.error('Error loading city data: ' + error.message);
        }
    }

    updateStatusSection(playerState, playerRep, currentTierRequirement, nextTierRequirement, playerGold) {
        // Update district tier display
        const tierValue = this.element.querySelector('.city-tier');
        if (tierValue) {
            tierValue.textContent = playerState.tier.toString();
        }

        // Update treasury display
        const treasuryValue = this.element.querySelector('.treasury-amount');
        if (treasuryValue) {
            treasuryValue.textContent = playerState.treasury.toString();
        }

        // Update rep points display
        const repValue = this.element.querySelector('.rep-points');
        if (repValue) {
            repValue.textContent = playerRep.toString();
        }

        // Update gold display
        const goldValue = this.element.querySelector('.gold-amount');
        if (goldValue) {
            goldValue.textContent = playerGold.toString();
        }

        // Update tier progress bar
        const progressBar = this.element.querySelector('.tier-progress-bar');
        const progressContainer = this.element.querySelector('.tier-progress');
        if (progressBar && progressContainer) {
            const treasury = BigInt(playerState.treasury);
            const currentTier = Number(playerState.tier);
            const currentReq = BigInt(currentTierRequirement);
            const nextReq = BigInt(nextTierRequirement);
            
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

    async updateBuildingCards(currentTier, treasury) {
        Logger.info('Starting updateBuildingCards with tier:', currentTier, 'treasury:', treasury);
        
        // Get buildings for each tier
        for (let tier = 0; tier <= 4; tier++) {
            Logger.info(`Processing tier ${tier}`);
            const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
            if (!tierContent) {
                Logger.info(`No content found for tier ${tier}, skipping`);
                continue;
            }

            try {
                const [buildingTypes, configs] = await this.contracts.districtBuildings.getDistrictBuildingsByTier(tier);
                Logger.info(`Got ${buildingTypes.length} buildings for tier ${tier}:`, buildingTypes);
                Logger.info('Building configs:', configs);
                
                // Filter out core buildings
                const nonCoreBuildings = buildingTypes.filter((type, index) => !configs[index].isCoreBuilding);
                const nonCoreConfigs = configs.filter(config => !config.isCoreBuilding);
                
                Logger.info(`Filtered to ${nonCoreBuildings.length} non-core buildings for tier ${tier}`);
                
                const buildingsGrid = tierContent.querySelector('.buildings-grid');
                if (!buildingsGrid) {
                    Logger.warn(`No buildings grid found for tier ${tier}`);
                    continue;
                }
                
                // Fetch all building data in parallel
                const buildingData = await Promise.all(
                    nonCoreBuildings.map(async (type) => {
                        // Get the building name from the config
                        const buildingName = nonCoreConfigs[nonCoreBuildings.indexOf(type)].name;
                        Logger.info(`Processing building: ${buildingName}`);
                        
                        try {
                            const [isBuilt, level] = await Promise.all([
                                this.contracts.districtBuildings.isDistrictBuildingBuilt(buildingName),
                                this.contracts.districtBuildings.getBuildingLevel(buildingName)
                            ]);
                            Logger.info(`Building ${buildingName} - Built: ${isBuilt}, Level: ${level}`);
                            return { type, isBuilt, level };
                        } catch (error) {
                            Logger.error(`Error getting data for building ${buildingName}:`, error);
                            throw error;
                        }
                    })
                );

                buildingsGrid.innerHTML = nonCoreBuildings.map((type, index) => {
                    const config = nonCoreConfigs[index];
                    const { isBuilt, level } = buildingData[index];
                    Logger.info(`Rendering building ${config.name}:`, { isBuilt, level, config });
                    
                    const treasuryBigInt = BigInt(treasury);
                    const unlockCostBigInt = BigInt(config.unlockCost);
                    Logger.info(`Building ${config.name} - Treasury: ${treasuryBigInt}, Unlock Cost: ${unlockCostBigInt}`);
                    
                    const isLocked = treasuryBigInt < unlockCostBigInt;
                    const isTierLocked = tier > currentTier;
                    const currentLevel = Number(level);
                    const canUpgrade = isBuilt && currentLevel < Number(config.maxLevel);
                    
                    // Calculate remaining gold needed
                    const remainingGold = unlockCostBigInt - treasuryBigInt;
                    
                    // Calculate upgrade cost if applicable
                    const upgradeCost = canUpgrade ? BigInt(config.upgradeCost) * BigInt(currentLevel) : BigInt(0);
                    
                    // Calculate progress percentage using BigInt arithmetic
                    let progressPercentage = 0;
                    if (unlockCostBigInt > 0n) {
                        progressPercentage = Number((treasuryBigInt * BigInt(100)) / unlockCostBigInt);
                    }
                    Logger.info(`Building ${config.name} - Progress: ${progressPercentage}%`);
                    
                    // Determine if button should be disabled
                    const isButtonDisabled = isLocked || isTierLocked || (isBuilt && !canUpgrade);
                    
                    return `
                        <div class="building-card ${isLocked || isTierLocked ? 'locked' : ''} ${isBuilt ? 'built' : ''}" 
                             data-required-donation="${config.unlockCost}"
                             data-building-type="${config.name}">
                            ${(isLocked || isTierLocked) ? `
                                <div class="lock-overlay">
                                    <i class="fas fa-lock lock-icon"></i>
                                    <div class="unlock-info">
                                        ${isTierLocked ? 
                                            `<p class="unlock-requirement">Requires Tier ${tier}</p>` :
                                            `<p class="unlock-requirement">Requires ${remainingGold.toString()} more Gold to unlock</p>
                                             <div class="progress-container">
                                                <div class="progress-bar" style="width: ${Math.min(progressPercentage, 100)}%"></div>
                                             </div>`
                                        }
                                    </div>
                                </div>
                            ` : ''}
                            <h3>${config.name}</h3>
                            <p>${config.description}</p>
                            <div class="building-details">
                                ${isBuilt ? `
                                    <p class="build-cost">Current Level: ${currentLevel} / ${config.maxLevel}</p>
                                    ${canUpgrade ? `<p class="upgrade-cost">Upgrade Cost: ${upgradeCost.toString()} gold</p>` : ''}
                                ` : `
                                    <p class="build-cost">Build Cost: ${config.buildCost} gold</p>
                                    <p class="unlock-cost">Unlock Cost: ${config.unlockCost} gold</p>
                                `}
                            </div>
                            <button class="building-button btn btn-primary" data-building="${config.name}" type="button" ${isButtonDisabled ? 'disabled' : ''}>
                                ${isBuilt ? 
                                    (canUpgrade ? `Upgrade to Level ${currentLevel + 1}` : 'Constructed') : 
                                    `Build ${config.name}`}
                            </button>
                        </div>
                    `;
                }).join('');
            } catch (error) {
                Logger.error(`Error processing tier ${tier}:`, error);
                throw error;
            }
        }
    }

    updateTierTabs(currentTier) {
        const tierTabs = this.element.querySelectorAll('.tier-tab');
        tierTabs.forEach(tab => {
            const tabTier = Number(tab.dataset.tier);
            if (tabTier > currentTier) {
                tab.classList.add('locked');
                tab.title = `Requires Tier ${tabTier}`;
            } else {
                tab.classList.remove('locked');
                tab.title = '';
            }
        });
    }

    async handleDonation(amount) {
        try {
            Logger.info(`Starting donation of ${amount} gold`);
            
            // Show confirmation dialog
            const result = await this.modal.confirm(
                `Donate ${amount} Gold to city treasury?`,
                { title: 'Confirm Donation' }
            );

            if (result.isConfirmed) {
                Logger.info('User confirmed donation');
                try {
                    // Show transaction pending message
                    const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                    
                    // Execute donation using transact
                    await this.contracts.gameState.donateGold(amount);
                    
                    // Close loading modal
                    loadingModal.close();
                    
                    // Reload city data
                    await this.loadCityData();

                    // re-setup event listeners
                    this.setupEventListeners();
                    
                    this.modal.success(`Successfully donated ${amount} gold to city!`);
                } catch (error) {
                    Logger.error('Error donating gold:', error);
                    this.modal.error(`Error donating gold: ${error.message}`);
                }
            }
        } catch (error) {
            Logger.error('Error in handleDonation:', error);
            this.modal.error(`Error donating gold: ${error.message}`);
        }
    }

    async handleBuildingAction(buildingType) {
        try {
            Logger.info(`Starting handleBuildingAction for: ${buildingType}`);

            // Get building config first to show proper name in error messages
            Logger.info('Fetching building configurations...');
            const [buildingTypes, configs] = await this.contracts.districtBuildings.getAllDistrictBuildingConfigs();
            Logger.info('Received building types:', buildingTypes);
            
            // Find the building config by name
            const buildingIndex = configs.findIndex(config => config.name === buildingType);
            if (buildingIndex === -1) {
                Logger.error('Building type not found in configs:', buildingType);
                this.modal.error('Invalid building type');
                return;
            }
            const config = configs[buildingIndex];
            Logger.info(`Building config found: ${config.name} (Type: ${buildingTypes[buildingIndex]})`);

            // Check if building is unlocked
            Logger.info('Checking if building is unlocked...');
            const isUnlocked = await this.contracts.districtBuildings.isDistrictBuildingUnlocked(buildingType);
            Logger.info(`Building unlock status: ${isUnlocked}`);
            if (!isUnlocked) {
                Logger.warn(`Building ${config.name} is not unlocked. Required treasury: ${config.unlockCost} Gold`);
                this.modal.error(
                    `${config.name} is not unlocked yet!<br>
                    Required treasury: ${config.unlockCost} Gold`
                );
                return;
            }

            // Check if building is already built
            Logger.info('Checking if building is already built...');
            const isBuilt = await this.contracts.districtBuildings.isDistrictBuildingBuilt(buildingType);
            Logger.info(`Building built status: ${isBuilt}`);

            if (isBuilt) {
                // Handle upgrade
                const currentLevel = await this.contracts.districtBuildings.getBuildingLevel(buildingType);
                if (Number(currentLevel) >= Number(config.maxLevel)) {
                    Logger.warn(`Building ${config.name} is already at max level`);
                    this.modal.error(`${config.name} is already at maximum level!`);
                    return;
                }

                const upgradeCost = BigInt(config.upgradeCost) * BigInt(currentLevel);
                
                // Check gold balance for upgrade
                const gold = await this.contracts.gameState.getPlayerGold();
                if (BigInt(gold) < upgradeCost) {
                    Logger.warn(`Insufficient gold to upgrade ${config.name}. Required: ${upgradeCost}, Available: ${gold}`);
                    this.modal.error(
                        `Insufficient gold to upgrade ${config.name}!<br>
                        Required: ${upgradeCost.toString()} Gold<br>
                        Current balance: ${gold} Gold`
                    );
                    return;
                }

                // Show upgrade confirmation dialog
                const result = await this.modal.confirm(
                    `Upgrade ${config.name} to level ${Number(currentLevel) + 1} for ${upgradeCost.toString()} Gold?`,
                    { title: 'Confirm Upgrade' }
                );

                if (result.isConfirmed) {
                    const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                    try {
                        await this.contracts.districtBuildings.upgradeDistrictBuilding(buildingType);
                        loadingModal.close();
                        await this.loadCityData();
                        this.setupEventListeners();
                        this.modal.success(`Successfully upgraded ${config.name} to level ${Number(currentLevel) + 1}!`);
                    } catch (error) {
                        loadingModal.close();
                        Logger.error('Error upgrading district building:', error);
                        this.modal.error(`Failed to upgrade ${config.name}: ${error.message}`);
                    }
                }
            } else {
                // Handle initial build
                // Check gold balance
                const gold = await this.contracts.gameState.getPlayerGold();
                if (BigInt(gold) < BigInt(config.buildCost)) {
                    Logger.warn(`Insufficient gold to build ${config.name}. Required: ${config.buildCost}, Available: ${gold}`);
                    this.modal.error(
                        `Insufficient gold to build ${config.name}!<br>
                        Required: ${config.buildCost} Gold<br>
                        Current balance: ${gold} Gold`
                    );
                    return;
                }

                // Show build confirmation dialog
                const result = await this.modal.confirm(
                    `Build ${config.name} for ${config.buildCost} Gold?`,
                    { title: 'Confirm Building' }
                );

                if (result.isConfirmed) {
                    const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                    try {
                        await this.contracts.districtBuildings.buildDistrictBuilding(buildingType);
                        loadingModal.close();
                        await this.loadCityData();
                        this.setupEventListeners();
                        this.modal.success(`Successfully built ${config.name}!`);
                    } catch (error) {
                        loadingModal.close();
                        Logger.error('Error building district building:', error);
                        this.modal.error(`Failed to build ${config.name}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            Logger.error('Error in handleBuildingAction:', error);
            this.modal.error(`Error handling building action: ${error.message}`);
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Donation form
        const donateButton = this.element.querySelector('.btn-primary');
        const donationInput = this.element.querySelector('.donation-amount');
        
        if (donateButton && donationInput) {
            donateButton.addEventListener('click', () => {
                const amount = parseInt(donationInput.value);
                if (amount > 0) {
                    this.handleDonation(amount);
                } else {
                    this.modal.error('Please enter a valid amount to donate');
                }
            });
        }

        // Tier tabs
        const tierTabs = this.element.querySelectorAll('.tier-tab');
        tierTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Don't allow clicking locked tabs
                if (tab.classList.contains('locked')) {
                    return;
                }

                // Remove active class from all tabs and contents
                this.element.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
                this.element.querySelectorAll('.tier-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const tier = tab.dataset.tier;
                this.element.querySelector(`.tier-content[data-tier="${tier}"]`).classList.add('active');
            });
        });

        // Building buttons
        const buildingButtons = this.element.querySelectorAll('.building-button');
        buildingButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const buildingType = button.dataset.building;
                const buildingCard = button.closest('.building-card');
                const requiredDonation = buildingCard.dataset.requiredDonation;
                
                try {
                    // Check if building is locked
                    if (buildingCard.classList.contains('locked')) {
                        this.modal.error(`This building requires ${requiredDonation} gold in donations to unlock`);
                        return;
                    }
                    
                    await this.handleBuildingAction(buildingType);
                } catch (error) {
                    this.modal.error('Failed to build: ' + error.message);
                }
            });
        });
    }

    render() {
        Logger.info('Rendering district page');
        this.element.innerHTML = `
            <div class="page-container">
                <h1>District Hall</h1>
                
                <!-- District Status Section -->
                <div class="page-section status-section">
                    <h2>District Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Current Tier:</span>
                            <span class="status-value city-tier">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Treasury:</span>
                            <span class="status-value treasury-amount">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value gold-amount">Loading...</span>
                        </div>
                    </div>
                </div>

                <!-- Donation Section -->
                <div class="page-section donation-section">
                    <h2>Donate to District</h2>
                    <div class="donation-form">
                        <input type="number" class="donation-amount" placeholder="Amount to donate">
                        <button class="btn btn-primary">Donate Gold</button>
                    </div>
                    <div class="tier-progress">
                        <div class="tier-progress-bar"></div>
                        <div class="tier-progress-text"></div>
                    </div>
                </div>

                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <div class="tier-tabs">
                        <button class="tier-tab active" data-tier="0">Tier 0</button>
                        <button class="tier-tab" data-tier="1">Tier 1</button>
                        <button class="tier-tab" data-tier="2">Tier 2</button>
                        <button class="tier-tab" data-tier="3">Tier 3</button>
                        <button class="tier-tab" data-tier="4">Tier 4</button>
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
                    <div class="tier-content" data-tier="3">
                        <div class="buildings-grid"></div>
                    </div>
                    <div class="tier-content" data-tier="4">
                        <div class="buildings-grid"></div>
                    </div>
                </div>
            </div>
        `;
    }

    mount(container) {
        Logger.info('Mounting city page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during city page initialization:', error);
            this.modal.error('Failed to initialize city page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
}