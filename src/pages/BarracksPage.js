import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';

import('../styles/shop-page.css');

export class BarracksPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('BarracksPage constructor called');
        
        this.element.className = 'base-page';
        
        // Initialize state
        this.setState({
            gold: 0,
            food: 0,
            barracksLevel: 0,
            isBarracksBuilt: false,
            infantryCount: 0,
            cavalryCount: 0,
            siegeCount: 0,
            infantryGoldCost: 0,
            infantryFoodCost: 0,
            cavalryGoldCost: 0,
            cavalryFoodCost: 0,
            siegeGoldCost: 0,
            siegeFoodCost: 0
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('BarracksPage onInitialized called with wallet:', walletResult);
        try {
            // Load troop configs from contract
            await this.loadTroopConfigs();
            // Load barracks data
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
            const troopConfigs = {};
            for (const type of troopTypes) {
                const troopTypeValue = BattleSystemContract.TROOP_TYPES[type];
                troopConfigs[type] = await this.contracts.battleSystem.getTroopConfig(troopTypeValue);
            }
            
            // Update state with flattened troop configs
            this.setState({
                infantryGoldCost: troopConfigs.INFANTRY.goldCost,
                infantryFoodCost: troopConfigs.INFANTRY.foodCost,
                cavalryGoldCost: troopConfigs.CAVALRY.goldCost,
                cavalryFoodCost: troopConfigs.CAVALRY.foodCost,
                siegeGoldCost: troopConfigs.SIEGE.goldCost,
                siegeFoodCost: troopConfigs.SIEGE.foodCost
            });
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

            // Update state (this will automatically update UI)
            this.setState({
                gold: gold.toString(),
                food: food.toString(),
                barracksLevel: Number(barracksLevel),
                isBarracksBuilt,
                infantryCount: troopCounts[0].toString(),
                cavalryCount: troopCounts[1].toString(),
                siegeCount: troopCounts[2].toString()
            });

            // Update troop card states based on barracks level
            this.updateTroopCardStates(Number(barracksLevel));
        } catch (error) {
            console.error('Error loading barracks data:', error);
            this.modal.error('Failed to load barracks data: ' + error.message);
        }
    }

    updateTroopCardStates(barracksLevel) {
        const troopCards = this.element.querySelectorAll('.shop-item-card');
        troopCards.forEach((card, index) => {
            const isLocked = barracksLevel <= index;
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
                            <span id="gold-amount" class="status-value" data-state="gold">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Food:</span>
                            <span id="food-amount" class="status-value" data-state="food">Loading...</span>
                        </div>
                    </div>
                </div>

                <div class="page-section">
                    <h2>Troop Counts</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Infantry:</span>
                            <span class="status-value" data-state="infantryCount">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Cavalry:</span>
                            <span class="status-value" data-state="cavalryCount">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Siege:</span>
                            <span class="status-value" data-state="siegeCount">Loading...</span>
                        </div>
                    </div>
                </div>

                <div class="page-section">
                    <h2>Available Troops</h2>
                    <div class="buildings-grid-rows">
                        ${Object.entries(BattleSystemContract.TROOP_DEFINITIONS).map(([type, troop]) => {
                            const goldCostKey = `${type.toLowerCase()}GoldCost`;
                            const foodCostKey = `${type.toLowerCase()}FoodCost`;
                            const countKey = `${type.toLowerCase()}Count`;
                            return `
                                <div class="shop-item-card">
                                    <div class="shop-item-image">
                                        <img src="${troop.image}" alt="${troop.name}" />
                                    </div>
                                    <div class="shop-item-info">
                                        <div class="shop-item-title-row">
                                            <h3>${troop.name}</h3>
                                            <span class="shop-item-stock in-stock">
                                                <i class="fas fa-check-circle"></i>
                                                <span id="${type.toLowerCase()}-count" data-state="${countKey}">Loading...</span> trained 
                                            </span>
                                        </div>
                                        <div class="shop-item-desc">${troop.description}</div>
                                        <div class="cost-component">
                                            <div class="cost-item">
                                                <i class="fas fa-coins cost-icon"></i>
                                                <span class="cost-value" data-state="${goldCostKey}">0</span>
                                            </div>
                                            <div class="cost-item">
                                                <i class="fas fa-wheat-awn cost-icon"></i>
                                                <span class="cost-value" data-state="${foodCostKey}">0</span>
                                            </div>
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
        // Use BasePage event management system to prevent duplicate handlers
        this.addEventListener('.train-btn', 'click', async (event) => {
            const button = event.currentTarget;
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
                    const goldCostKey = `${troopType.toLowerCase()}GoldCost`;
                    const foodCostKey = `${troopType.toLowerCase()}FoodCost`;
                    const goldCost = this.state[goldCostKey];
                    const foodCost = this.state[foodCostKey];
                    Logger.info('Troop costs:', { goldCost, foodCost });

                    // Get current resources
                    const [gold, food] = await Promise.all([
                        this.contracts.gameState.getPlayerGold(),
                        this.contracts.gameState.getPlayerFood()
                    ]);
                    Logger.info('Current resources:', { gold, food });

                    // Check if player has enough resources
                    const totalGoldCost = BigInt(goldCost) * BigInt(amount);
                    const totalFoodCost = BigInt(foodCost) * BigInt(amount);
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

} 