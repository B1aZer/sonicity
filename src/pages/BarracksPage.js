import { BasePage } from './BasePage.js';
import { TROOP_TYPES } from '../js/utils/constants.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import '../styles/barracks-page.css';
import '../styles/building.css';
import '../styles/buttons.css';

export class BarracksPage extends BasePage {
    constructor() {
        super();
        Logger.info('BarracksPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page barracks-page';
        this.modal = new Modal();
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('BarracksPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadBarracksData();
            this.setupTrainHandlers();
            Logger.info('Barracks page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing barracks page:', error);
            this.modal.error('Failed to initialize barracks page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadBarracksData().catch(error => {
                Logger.error('Error loading barracks data after wallet update:', error);
            });
        }
    }

    async loadBarracksData() {
        try {
            Logger.info('Starting to load barracks data...');
            
            const [gold, food] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerFood()
            ]);
            
            Logger.info('Resource values:', {
                gold: gold.toString(),
                food: food.toString()
            });
            
            const goldElement = this.element.querySelector('#gold-amount');
            const foodElement = this.element.querySelector('#food-amount');
            
            if (goldElement) {
                goldElement.textContent = gold.toString();
                Logger.info('Updated UI with gold amount:', gold.toString());
            } else {
                Logger.warn('Gold amount element not found in DOM');
            }
            
            if (foodElement) {
                foodElement.textContent = food.toString();
                Logger.info('Updated UI with food amount:', food.toString());
            } else {
                Logger.warn('Food amount element not found in DOM');
            }
        } catch (error) {
            Logger.error('Error loading barracks data:', error);
            this.modal.error('Failed to load barracks data. Please try refreshing the page.');
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container barracks-container">
                <h1 class="page-title">Barracks</h1>
                
                <div class="page-section status-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span id="gold-amount" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Food:</span>
                            <span id="food-amount" class="status-value">0</span>
                        </div>
                    </div>
                </div>

                <div class="page-section troops-section">
                    <h2>Available Troops</h2>
                    <div class="buildings-grid">
                        ${Object.entries(TROOP_TYPES).map(([type, troop]) => `
                            <div class="troop-card">
                                <div class="troop-image">
                                    <img src="${troop.image}" alt="${troop.name}" />
                                </div>
                                <div class="troop-info">
                                    <div class="troop-title-row">
                                        <h3>${troop.name}</h3>
                                    </div>
                                    <div class="troop-desc">${troop.description}</div>
                                    <div class="troop-cost">
                                        <div class="cost-item">
                                            <i class="fas fa-coins cost-icon"></i>
                                            <span class="cost-value">${troop.cost.gold}</span>
                                        </div>
                                        <div class="cost-item">
                                            <i class="fas fa-wheat-awn cost-icon"></i>
                                            <span class="cost-value">${troop.cost.food}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="troop-action-row">
                                    <button class="btn btn-primary train-btn" data-troop-type="${type}">
                                        <i class="fas fa-shield-halved"></i>
                                        Train
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    setupTrainHandlers() {
        Logger.info('Setting up train handlers');
        
        const trainButtons = this.element.querySelectorAll('.train-btn');
        trainButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const troopType = btn.getAttribute('data-troop-type');
                const troop = TROOP_TYPES[troopType];
                if (!troop) return;

                Logger.info(`Barracks: Attempting to train troop: ${troop.name}`);

                try {
                    // Get current resources
                    const [gold, food] = await Promise.all([
                        this.contracts.gameState.getPlayerGold(),
                        this.contracts.gameState.getPlayerFood()
                    ]);

                    // Check if player has enough resources
                    if (gold < troop.cost.gold) {
                        this.modal.error(`Not enough Gold! You need ${troop.cost.gold} Gold.`);
                        return;
                    }
                    if (food < troop.cost.food) {
                        this.modal.error(`Not enough Food! You need ${troop.cost.food} Food.`);
                        return;
                    }

                    // Confirm training
                    const result = await this.modal.confirm(
                        `Train <b>${troop.name}</b> for <b>${troop.cost.gold} Gold</b> and <b>${troop.cost.food} Food</b>?`,
                        { title: 'Confirm Training' }
                    );

                    if (result.isConfirmed) {
                        // Show loading modal
                        const loadingModal = this.modal.loading('Training troop...');
                        
                        try {
                            // TODO: Call contract to train troop
                            // await this.contracts.barracks.trainTroop(troopType);
                            
                            // Close loading modal
                            loadingModal.close();
                            
                            // Show success message
                            this.modal.success(`Successfully trained <b>${troop.name}</b>!`);
                            
                            // Update resource display
                            await this.loadBarracksData();
                        } catch (error) {
                            loadingModal.close();
                            throw error;
                        }
                    }
                } catch (error) {
                    Logger.error('Error training troop:', error);
                    this.modal.error('Failed to train troop. Please try again.');
                }
            });
        });
    }

    mount(container) {
        Logger.info('Mounting barracks page...');
        container.appendChild(this.element);
        // Initialize using base class method
        this.initialize().catch(error => {
            Logger.error('Error during barracks page initialization:', error);
            this.modal.error('Failed to initialize barracks page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 