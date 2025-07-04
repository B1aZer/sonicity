import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';

export class BarracksPage extends BasePage {
    constructor() {
        super();
        import('../styles/shop-page.css');
        Logger.info('BarracksPage constructor called');
        
        this.element.className = 'base-page';
        
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

            // Load resources and barracks level
            const [gold, food, barracksLevel] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerFood(),
                this.contracts.districtBuildings.getBuildingLevel("Barracks") // Use building name instead of numeric type
            ]);

            Logger.info('Barracks data loaded:', { gold, food, barracksLevel });

            // Check if barracks is built
            const isBarracksBuilt = await this.contracts.districtBuildings.isDistrictBuildingBuilt("Barracks");
            Logger.info('Barracks built status:', isBarracksBuilt);

            // Load troop counts using enum values
            const troopCounts = await Promise.all([
                this.contracts.battleSystem.playerTroops(address, BattleSystemContract.TROOP_TYPES.INFANTRY),
                this.contracts.battleSystem.playerTroops(address, BattleSystemContract.TROOP_TYPES.CAVALRY),
                this.contracts.battleSystem.playerTroops(address, BattleSystemContract.TROOP_TYPES.SIEGE)
            ]);

            Logger.info('Troop counts:', {
                infantry: troopCounts[0].toString(),
                cavalry: troopCounts[1].toString(),
                siege: troopCounts[2].toString()
            });

            // Update UI with troop counts
            this.element.querySelector('#infantry-count').textContent = troopCounts[0].toString();
            this.element.querySelector('#cavalry-count').textContent = troopCounts[1].toString();
            this.element.querySelector('#siege-count').textContent = troopCounts[2].toString();

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();
            this.element.querySelector('#food-amount').textContent = food.toString();

            // Update troop card states based on barracks level
            const troopCards = this.element.querySelectorAll('.shop-item-card');
            troopCards.forEach((card, index) => {
                const isLocked = Number(barracksLevel) <= index;
                Logger.info(`Troop card ${index} locked status:`, { isLocked, barracksLevel });
                if (isLocked) {
                    card.classList.add('locked');
                    const lockOverlay = document.createElement('div');
                    lockOverlay.className = 'lock-overlay';
                    lockOverlay.innerHTML = `
                        <i class="fas fa-lock lock-icon"></i>
                        <div class="unlock-info">
                            <p class="unlock-requirement">Requires Barracks Level ${index + 1}</p>
                        </div>
                    `;
                    card.appendChild(lockOverlay);
                } else {
                    card.classList.remove('locked');
                    const existingOverlay = card.querySelector('.lock-overlay');
                    if (existingOverlay) {
                        existingOverlay.remove();
                    }
                }
            });
        } catch (error) {
            console.error('Error loading barracks data:', error);
            this.modal.error('Failed to load barracks data: ' + error.message);
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Barracks</h1>
                
                <div class="page-section">
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

                <div class="page-section">
                    <h2>Available Troops</h2>
                    <div class="buildings-grid-rows">
                        ${Object.entries(BattleSystemContract.TROOP_DEFINITIONS).map(([type, troop]) => {
                            const config = this.troopConfigs[type] || { goldCost: 0, foodCost: 0 };
                            return `
                                <div class="shop-item-card">
                                    <div class="shop-item-image">
                                        <img src="${troop.image}" alt="${troop.name}" />
                                    </div>
                                    <div class="shop-item-info">
                                        <div class="shop-item-title-row">
                                            <h3>${troop.name}</h3>
                                        </div>
                                        <div class="shop-item-desc">${troop.description}</div>
                                        <div class="shop-item-cost">
                                            <div class="cost-item">
                                                <i class="fas fa-coins cost-icon"></i>
                                                <span class="cost-value">${config.goldCost}</span>
                                            </div>
                                            <div class="cost-item">
                                                <i class="fas fa-wheat-awn cost-icon"></i>
                                                <span class="cost-value">${config.foodCost}</span>
                                            </div>
                                            <span class="shop-item-stock in-stock">
                                                <i class="fas fa-check-circle"></i>
                                                <span id="${type.toLowerCase()}-count">0</span> trained 
                                            </span>
                                        </div>
                                    </div>
                                    <div class="shop-item-action-row">
                                        <input type="number" id="${type.toLowerCase()}-amount" min="1" value="1" class="input" />
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
        const trainButtons = this.element.querySelectorAll('.train-btn');
        trainButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const troopType = button.getAttribute('data-troop-type');
                const troopCard = button.closest('.shop-item-card');
                
                // Check if troop type is locked
                if (troopCard.classList.contains('locked')) {
                    this.modal.error('This troop type is not available at your current barracks level');
                    return;
                }

                const amountInput = this.element.querySelector(`#${troopType.toLowerCase()}-amount`);
                const amount = parseInt(amountInput.value);
                
                if (isNaN(amount) || amount <= 0) {
                    this.modal.error('Please enter a valid amount');
                    return;
                }

                try {
                    // Map troop type string to enum value
                    const troopTypeValue = BattleSystemContract.TROOP_TYPES[troopType];
                    Logger.info('Training troops:', { troopType, troopTypeValue, amount });

                    // Check if player can train this troop type
                    const canTrain = await this.contracts.districtBuildings.canTrainTroopType(troopTypeValue);
                    Logger.info('Can train troop type:', canTrain);

                    if (!canTrain) {
                        this.modal.error('Cannot train this troop type at current barracks level');
                        return;
                    }

                    // Get troop config to check costs
                    const config = this.troopConfigs[troopType];
                    Logger.info('Troop config:', config);

                    // Get current resources
                    const [gold, food] = await Promise.all([
                        this.contracts.gameState.getPlayerGold(),
                        this.contracts.gameState.getPlayerFood()
                    ]);
                    Logger.info('Current resources:', { gold, food });

                    // Check if player has enough resources
                    const totalGoldCost = BigInt(config.goldCost) * BigInt(amount);
                    const totalFoodCost = BigInt(config.foodCost) * BigInt(amount);
                    Logger.info('Required resources:', { totalGoldCost, totalFoodCost });

                    if (BigInt(gold) < totalGoldCost) {
                        this.modal.error(`Not enough gold. Required: ${totalGoldCost}, Available: ${gold}`);
                        return;
                    }
                    if (BigInt(food) < totalFoodCost) {
                        this.modal.error(`Not enough food. Required: ${totalFoodCost}, Available: ${food}`);
                        return;
                    }

                    await this.contracts.battleSystem.trainTroops(troopTypeValue, amount);
                    await this.loadBarracksData();
                    
                    // Show success modal with troop details
                    const troopName = BattleSystemContract.TROOP_DEFINITIONS[troopType].name;
                    const unitText = amount === 1 ? 'unit' : 'units';
                    this.modal.success(`Successfully trained ${amount} ${troopName} ${unitText}!`);
                } catch (error) {
                    console.error('Error training troops:', error);
                    this.modal.error('Failed to train troops: ' + error.message);
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