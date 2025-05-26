import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import '../styles/barracks-page.css';
import '../styles/building.css';
import '../styles/buttons.css';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';

export class BarracksPage extends BasePage {
    constructor() {
        super();
        Logger.info('BarracksPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page barracks-page';
        this.modal = new Modal();
        this.troopConfigs = {};
        this.render(); // Render the initial UI
    }

    async onInitialized(walletResult) {
        Logger.info('BarracksPage onInitialized called with wallet:', walletResult);
        try {
            // Load troop configs from contract
            await this.loadTroopConfigs();
            this.render(); // Re-render with troop configs
            await this.loadBarracksData();
            this.setupTrainHandlers();
            Logger.info('Barracks page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing barracks page:', error);
            this.modal.error('Failed to initialize barracks page. Please try refreshing the page.');
        }
    }

    async loadTroopConfigs() {
        try {
            // Load configs for each troop type
            const troopTypes = Object.keys(BattleSystemContract.TROOP_TYPES);
            for (const type of troopTypes) {
                const troopTypeValue = BattleSystemContract.TROOP_TYPES[type];
                this.troopConfigs[type] = await this.contracts.battleSystem.getTroopConfig(troopTypeValue);
            }
        } catch (error) {
            Logger.error('Error loading troop configs:', error);
            throw error;
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
            const signer = await this.contracts.battleSystem.getSigner();
            const address = await signer.getAddress();

            // Load resources
            const [gold, food] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerFood()
            ]);

            // Load troop counts using enum values
            const troopCounts = await Promise.all([
                this.contracts.battleSystem.playerTroops(address, BattleSystemContract.TROOP_TYPES.INFANTRY),
                this.contracts.battleSystem.playerTroops(address, BattleSystemContract.TROOP_TYPES.CAVALRY),
                this.contracts.battleSystem.playerTroops(address, BattleSystemContract.TROOP_TYPES.SIEGE)
            ]);

            // Update UI with troop counts
            this.element.querySelector('#infantry-count').textContent = troopCounts[0].toString();
            this.element.querySelector('#cavalry-count').textContent = troopCounts[1].toString();
            this.element.querySelector('#siege-count').textContent = troopCounts[2].toString();

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();
            this.element.querySelector('#food-amount').textContent = food.toString();
        } catch (error) {
            console.error('Error loading barracks data:', error);
            this.showError('Failed to load barracks data');
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
                        ${Object.entries(BattleSystemContract.TROOP_DEFINITIONS).map(([type, troop]) => {
                            const config = this.troopConfigs[type] || { goldCost: 0, foodCost: 0 };
                            return `
                                <div class="troop-card">
                                    <div class="troop-image">
                                        <img src="${troop.image}" alt="${troop.name}" />
                                    </div>
                                    <div class="troop-info">
                                        <div class="troop-title-row">
                                            <h3>${troop.name}</h3>
                                            <span class="troop-count">Owned: <span id="${type.toLowerCase()}-count">0</span></span>
                                        </div>
                                        <div class="troop-desc">${troop.description}</div>
                                        <div class="troop-cost">
                                            <div class="cost-item">
                                                <i class="fas fa-coins cost-icon"></i>
                                                <span class="cost-value">${config.goldCost}</span>
                                            </div>
                                            <div class="cost-item">
                                                <i class="fas fa-wheat-awn cost-icon"></i>
                                                <span class="cost-value">${config.foodCost}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="troop-action-row">
                                        <input type="number" id="${type.toLowerCase()}-amount" min="1" value="1" class="amount-input" />
                                        <button class="btn btn-primary train-btn" data-troop-type="${type}">
                                            <i class="fas fa-shield-halved"></i>
                                            Train
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    setupTrainHandlers() {
        const trainButtons = document.querySelectorAll('.train-btn');
        trainButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const troopType = button.getAttribute('data-troop-type');
                const amount = parseInt(document.getElementById(`${troopType}-amount`).value);
                
                if (isNaN(amount) || amount <= 0) {
                    this.showError('Please enter a valid amount');
                    return;
                }

                try {
                    // Map troop type string to enum value
                    const troopTypeValue = BattleSystemContract.TROOP_TYPES[troopType.toUpperCase()];
                    await this.contracts.battleSystem.trainTroops(troopTypeValue, amount);
                    await this.loadBarracksData();
                } catch (error) {
                    console.error('Error training troops:', error);
                    this.showError('Failed to train troops');
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