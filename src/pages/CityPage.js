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
            
            const [playerState, playerRep, nextTierCost] = await Promise.all([
                this.contracts.gameState.call('playerState', await this.contracts.gameState.getAddress()),
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

            // Update next tier cost display
            const nextTierValue = this.element.querySelector('.next-tier-cost');
            if (nextTierValue) {
                nextTierValue.textContent = nextTierCost.toString();
            }

            // Update progress bar
            const progressBar = this.element.querySelector('.tier-progress-bar');
            if (progressBar) {
                const progress = (playerState.treasury / nextTierCost) * 100;
                progressBar.style.width = `${Math.min(progress, 100)}%`;
            }
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

        // Upgrade buttons
        const upgradeButtons = this.element.querySelectorAll('.upgrade-button');
        upgradeButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const buildingType = button.dataset.building;
                try {
                    await this.handleBuildingUpgrade(buildingType);
                } catch (error) {
                    this.modal.error('Failed to upgrade building: ' + error.message);
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
                            <span class="status-label">Next Tier Cost:</span>
                            <span class="status-value next-tier-cost">Loading...</span>
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

                <!-- District Buildings Section -->
                <div class="page-section city-buildings-section">
                    <h2>District Buildings</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Town Hall</h3>
                            <p>Current Tier: <span class="tier-value">1</span></p>
                            <p>Production Bonus: <span class="bonus-value">100%</span></p>
                        </div>
                        <div class="building-card locked">
                            <div class="lock-overlay">
                                <i class="fas fa-lock lock-icon"></i>
                            </div>
                            <h3>Treasury</h3>
                            <p>Current Level: <span class="level-value">1</span></p>
                            <p>Weekly Import Limit: <span class="limit-value">1000</span></p>
                        </div>
                        <div class="building-card locked">
                            <div class="lock-overlay">
                                <i class="fas fa-lock lock-icon"></i>
                            </div>
                            <h3>Barracks</h3>
                            <p>Current Level: <span class="level-value">1</span></p>
                            <p>Unit Capacity: <span class="capacity-value">10</span></p>
                        </div>
                        <div class="building-card locked">
                            <div class="lock-overlay">
                                <i class="fas fa-lock lock-icon"></i>
                            </div>
                            <h3>Diplomacy Center</h3>
                            <p>Current Level: <span class="level-value">1</span></p>
                            <p>Alliance Slots: <span class="slots-value">1</span></p>
                        </div>
                        <div class="building-card locked">
                            <div class="lock-overlay">
                                <i class="fas fa-lock lock-icon"></i>
                            </div>
                            <h3>Bank</h3>
                            <p>Current Level: <span class="level-value">1</span></p>
                            <p>Trading Fee: <span class="fee-value">5%</span></p>
                        </div>
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