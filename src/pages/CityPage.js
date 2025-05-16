import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
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
        this.setupEventListeners();
    }

    async onInitialized(walletResult) {
        Logger.info('CityPage onInitialized called with wallet:', walletResult.address);
        try {
            await this.loadCityData();
            Logger.info('City data loaded successfully');
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
            const [playerRep, nextTierCost] = await Promise.all([
                this.contracts.gameState.getPlayerRep(),
                this.contracts.gameState.getTierRequirements(Number(playerState.tier) + 1)
            ]);

            Logger.info('Received data from contract:', {
                tier: playerState.tier.toString(),
                treasury: playerState.treasury.toString(),
                playerRep: playerRep.toString(),
                nextTierCost: nextTierCost.toString()
            });

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

            // Update tier progress bar
            const progressBar = this.element.querySelector('.tier-progress-bar');
            const progressContainer = this.element.querySelector('.tier-progress');
            if (progressBar && progressContainer) {
                const treasury = Number(playerState.treasury);
                const cost = Number(nextTierCost);
                const progress = (treasury / cost) * 100;
                progressBar.style.width = `${Math.min(progress, 100)}%`;
                
                // Update progress tooltip
                progressContainer.title = `${treasury} / ${cost} Gold`;
            }

            // Update building locks and progress based on treasury
            const buildingCards = this.element.querySelectorAll('.building-card[data-required-donation]');
            buildingCards.forEach(card => {
                const requiredDonation = Number(card.dataset.requiredDonation);
                const treasury = Number(playerState.treasury);
                const progress = Math.min((treasury / requiredDonation) * 100, 100);
                
                // Update progress bar
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }

                // Update lock status
                if (treasury >= requiredDonation) {
                    card.classList.remove('locked');
                } else {
                    card.classList.add('locked');
                }
            });

            // Update tab locks based on current tier
            const tierTabs = this.element.querySelectorAll('.tier-tab');
            tierTabs.forEach(tab => {
                const tabTier = Number(tab.dataset.tier);
                const currentTier = Number(playerState.tier);
                
                if (tabTier > currentTier) {
                    tab.classList.add('locked');
                    tab.title = `Requires Tier ${tabTier}`;
                } else {
                    tab.classList.remove('locked');
                    tab.title = '';
                }
            });
        } catch (error) {
            Logger.error('Error loading district data:', error);
            this.modal.error('Failed to load district data. Please try again.');
        }
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

                    <!-- Tier 0 Buildings -->
                    <div class="tier-content active" data-tier="0">
                        <div class="buildings-grid">
                            <div class="building-card locked" data-required-donation="200">
                                <div class="lock-overlay">
                                    <i class="fas fa-lock lock-icon"></i>
                                    <div class="unlock-info">
                                        <p class="unlock-requirement">Requires 200 Gold in Treasury</p>
                                        <div class="progress-container">
                                            <div class="progress-bar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                </div>
                                <h3>Workshop</h3>
                                <p>Repair buildings (e.g., Houses after 24h)</p>
                                <div class="building-details">
                                    <p class="build-cost">Build Cost: 100 gold</p>
                                    <p class="unlock-cost">Unlock Cost: 200 gold</p>
                                </div>
                                <button class="building-button" data-building="workshop" type="button">Build Workshop</button>
                            </div>
                            <div class="building-card locked" data-required-donation="400">
                                <div class="lock-overlay">
                                    <i class="fas fa-lock lock-icon"></i>
                                    <div class="unlock-info">
                                        <p class="unlock-requirement">Requires 400 Gold in Treasury</p>
                                        <div class="progress-container">
                                            <div class="progress-bar" style="width: 0%"></div>
                                        </div>
                                    </div>
                                </div>
                                <h3>Shop</h3>
                                <p>Sells items (e.g., emergency Gold aid)</p>
                                <div class="building-details">
                                    <p class="build-cost">Build Cost: 150 gold</p>
                                    <p class="unlock-cost">Unlock Cost: 400 gold</p>
                                </div>
                                <button class="building-button" data-building="shop" type="button">Build Shop</button>
                            </div>
                        </div>
                    </div>

                    <!-- Other tier contents will be added dynamically -->
                    <div class="tier-content" data-tier="1"></div>
                    <div class="tier-content" data-tier="2"></div>
                    <div class="tier-content" data-tier="3"></div>
                    <div class="tier-content" data-tier="4"></div>
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