import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { DistrictBuildingsContract } from '../js/contracts/DistrictBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import { BasePage } from './BasePage.js';

import '../styles/city-page.css';
import '../styles/building.css';

export class CityPage extends BasePage {
    constructor() {
        super();
        Logger.info('CityPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
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
            
            // Then get other data
            const [playerRep, nextTierCost, playerGold] = await Promise.all([
                this.contracts.gameState.getPlayerRep(),
                this.contracts.gameState.getTierRequirements(Number(playerState.tier) + 1),
                this.contracts.gameState.getPlayerGold()
            ]);

            // Update UI elements
            this.updateStatusSection(playerState, playerRep, nextTierCost, playerGold);
            await this.updateBuildingCards(playerState.tier, playerState.treasury);
            this.updateTierTabs(playerState.tier);
        } catch (error) {
            Logger.error('Error loading city data:', error);
            this.modal.error('Error loading city data: ' + error.message);
        }
    }

    updateStatusSection(playerState, playerRep, nextTierCost, playerGold) {
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
            const treasury = Number(playerState.treasury);
            const cost = Number(nextTierCost);
            const progress = (treasury / cost) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            progressContainer.title = `${treasury} / ${cost} Gold`;
            
            // Update tier progress text
            const progressText = this.element.querySelector('.tier-progress-text');
            if (progressText) {
                progressText.textContent = `Progress to Tier ${Number(playerState.tier) + 1}: ${Math.min(progress, 100).toFixed(1)}%`;
            }
        }
    }

    async updateBuildingCards(currentTier, treasury) {
        // Get buildings for each tier
        for (let tier = 0; tier <= 4; tier++) {
            const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
            if (!tierContent) continue;

            const [buildingTypes, configs] = await this.contracts.districtBuildings.getDistrictBuildingsByTier(tier);
            const buildingsGrid = tierContent.querySelector('.buildings-grid');
            
            if (buildingsGrid) {
                // Check which buildings are already built
                const builtStatuses = await Promise.all(buildingTypes.map(type => this.contracts.districtBuildings.isDistrictBuildingBuilt(type)));

                buildingsGrid.innerHTML = buildingTypes.map((type, index) => {
                    const config = configs[index];
                    const treasuryBigInt = BigInt(treasury);
                    const unlockCostBigInt = BigInt(config.unlockCost);
                    const isLocked = treasuryBigInt < unlockCostBigInt;
                    const isTierLocked = tier > currentTier;
                    const isBuilt = builtStatuses[index];
                    
                    return `
                        <div class="building-card ${isLocked || isTierLocked ? 'locked' : ''} ${isBuilt ? 'built' : ''}" 
                             data-required-donation="${config.unlockCost}"
                             data-building-type="${type}">
                            ${(isLocked || isTierLocked) ? `
                                <div class="lock-overlay">
                                    <i class="fas fa-lock lock-icon"></i>
                                    <div class="unlock-info">
                                        ${isTierLocked ? 
                                            `<p class="unlock-requirement">Requires Tier ${tier}</p>` :
                                            `<p class="unlock-requirement">Requires ${config.unlockCost} Gold in Treasury</p>
                                             <div class="progress-container">
                                                <div class="progress-bar" style="width: ${Math.min((Number(treasuryBigInt) / Number(unlockCostBigInt)) * 100, 100)}%"></div>
                                             </div>`
                                        }
                                    </div>
                                </div>
                            ` : ''}
                            <h3>${config.name}</h3>
                            <p>${config.description}</p>
                            <div class="building-details">
                                <p class="build-cost">Build Cost: ${config.buildCost} gold</p>
                                <p class="unlock-cost">Unlock Cost: ${config.unlockCost} gold</p>
                            </div>
                            <button class="building-button" data-building="${type}" type="button" ${isBuilt ? 'disabled' : ''}>
                                ${isBuilt ? 'Constructed' : `Build ${config.name}`}
                            </button>
                        </div>
                    `;
                }).join('');
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
            
            // Find the building config by numeric type
            const buildingIndex = buildingTypes.findIndex(type => Number(type) === Number(buildingType));
            if (buildingIndex === -1) {
                Logger.error('Building type not found in configs:', buildingType);
                this.modal.error('Invalid building type');
                return;
            }
            const config = configs[buildingIndex];
            Logger.info(`Building config found: ${config.name} (Type: ${buildingType})`);

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
                Logger.warn(`Building ${config.name} is already built`);
                this.modal.error(`${config.name} is already built!`);
                return;
            }

            // Check gold balance
            Logger.info('Checking player gold balance...');
            const gold = await this.contracts.gameState.getPlayerGold();
            Logger.info(`Player gold balance: ${gold}, Required: ${config.buildCost}`);
            if (Number(gold) < Number(config.buildCost)) {
                Logger.warn(`Insufficient gold to build ${config.name}. Required: ${config.buildCost}, Available: ${gold}`);
                this.modal.error(
                    `Insufficient gold to build ${config.name}!<br>
                    Required: ${config.buildCost} Gold<br>
                    Current balance: ${gold} Gold`
                );
                return;
            }

            // Show confirmation dialog
            Logger.info('Showing build confirmation dialog...');
            const result = await this.modal.confirm(
                `Build ${config.name} for ${config.buildCost} Gold?`,
                { title: 'Confirm Building' }
            );

            if (result.isConfirmed) {
                Logger.info('User confirmed building construction');
                const loadingModal = this.modal.loading('Transaction submitted! Waiting for confirmation...');
                
                try {
                    Logger.info('Initiating building construction transaction...');
                    await this.contracts.districtBuildings.buildDistrictBuilding(buildingType);
                    Logger.info('Building construction transaction successful');
                    loadingModal.close();
                    Logger.info('Reloading city data after successful build...');
                    await this.loadCityData();
                    this.modal.success(`Successfully built ${config.name}!`);
                } catch (error) {
                    loadingModal.close();
                    Logger.error('Error building district building:', error);
                    this.modal.error(`Failed to build ${config.name}: ${error.message}`);
                }
            } else {
                Logger.info('User cancelled building construction');
            }
        } catch (error) {
            Logger.error('Error in handleBuildingAction:', error);
            this.modal.error(`Error building district building: ${error.message}`);
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
                            <span class="status-label">Rep Points:</span>
                            <span class="status-value rep-points">Loading...</span>
                        </div>
                    </div>
                    <div class="tier-progress">
                        <div class="tier-progress-bar"></div>
                        <div class="tier-progress-text"></div>
                    </div>
                </div>

                <!-- Donation Section -->
                <div class="page-section donation-section">
                    <h2>Donate to District</h2>
                    <div class="donation-form">
                        <input type="number" class="donation-amount" placeholder="Amount to donate">
                        <button class="btn btn-primary">Donate Gold</button>
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