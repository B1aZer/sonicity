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
        this.element = document.createElement('div');
        this.element.className = 'base-page barracks-page';
        this.modal = new Modal();
        this.render();
    }

    async onInitialized(walletResult) {
        try {
            await this.updateResourceDisplay();
        } catch (error) {
            Logger.error('Error initializing barracks page:', error);
            this.modal.error('Failed to initialize barracks page. Please try refreshing the page.');
        }
    }

    async updateResourceDisplay() {
        try {
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
            }
            if (foodElement) {
                foodElement.textContent = food.toString();
            }
        } catch (error) {
            Logger.error('Error updating resource display:', error);
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container barracks-container">
                <h1 class="page-title">Barracks</h1>
                
                <div class="page-section status-section">
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
                                        <span class="cost-icon">💰</span>
                                        <span class="cost-value">${troop.cost.gold}</span>
                                    </div>
                                    <div class="cost-item">
                                        <span class="cost-icon">🌾</span>
                                        <span class="cost-value">${troop.cost.food}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="troop-action-row">
                                <button class="train-btn" data-troop-type="${type}">
                                    Train
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.setupTrainHandlers();
    }

    setupTrainHandlers() {
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
                        // TODO: Call contract to train troop
                        Logger.info(`Barracks: Training troop: ${troop.name}`);
                        this.modal.success(`You have trained <b>${troop.name}</b>!`);
                        await this.updateResourceDisplay();
                    }
                } catch (error) {
                    Logger.error('Error training troop:', error);
                    this.modal.error('Failed to train troop. Please try again.');
                }
            });
        });
    }

    mount(container) {
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