import { BasePage } from './BasePage.js';
import { COSMETIC_METADATA, RESOURCE_TYPES } from '../js/utils/constants.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

import('../styles/shop-page.css');

export class ShopPage extends BasePage {
    constructor() {
        super();
        
        this.cosmeticItems = []; // Will be loaded from contract
        this.element.className = 'base-page';
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('ShopPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadCosmeticItems();
            await this.loadPlayerResources();
            this.setupBuyHandlers();
            Logger.info('Shop page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing shop page:', error);
            this.modal.error('Failed to initialize shop page. Please try refreshing the page.');
        }
    }

    async loadCosmeticItems() {
        try {
            // Get available cosmetics from contract
            const availableIds = await this.contracts.cosmeticItems.getAvailableCosmetics(255); // Max 255 items
            
            this.cosmeticItems = [];
            for (const id of availableIds) {
                const config = await this.contracts.cosmeticItems.getCosmeticConfig(id);
                const metadata = COSMETIC_METADATA[id] || {};
                
                this.cosmeticItems.push({
                    id: Number(id),
                    name: config.name,
                    cost: Number(config.cost),
                    currency: RESOURCE_TYPES[config.resourceType] || 'UNKNOWN',
                    enabled: config.enabled,
                    // Use contract data when available, fallback to constants
                    description: config.description || metadata.description || 'No description available',
                    modelPath: config.modelPath || metadata.modelPath || '',
                    type: metadata.type || 'unknown',
                    cosmeticType: Number(config.cosmeticType) || 0,
                    // Image from constants (file paths not suitable for contracts)
                    image: metadata.image || '/images/shop/default.png'
                });
            }
            
            // Re-render if items were loaded after initial render
            if (this.cosmeticItems.length > 0) {
                this.render();
            }
        } catch (error) {
            Logger.error('Error loading cosmetic items:', error);
        }
    }

    async loadPlayerResources() {
        try {
            const playerAddress = await this.wallet.getAddress();
            const diamonds = await this.contracts.gameState.getPlayerDiamonds(playerAddress);
            
            // Update diamonds display
            const diamondsElement = this.element.querySelector('#diamonds-amount');
            if (diamondsElement) {
                diamondsElement.textContent = diamonds.toString();
            }

            // Update ownership status for each cosmetic item
            for (const item of this.cosmeticItems) {
                await this.updateItemOwnership(playerAddress, item.id);
            }
        } catch (error) {
            Logger.error('Error loading player resources:', error);
        }
    }

    async updateItemOwnership(playerAddress, itemId) {
        try {
            const isOwned = await this.contracts.cosmeticItems.ownsCosmetic(playerAddress, itemId);
            const card = this.element.querySelector(`[data-item-id="${itemId}"]`).closest('.shop-item-card');
            
            if (card) {
                const statusElement = card.querySelector('.shop-item-stock');
                const button = card.querySelector('.buy-btn');
                
                if (isOwned) {
                    statusElement.innerHTML = '<i class="fas fa-check-circle"></i>Owned';
                    statusElement.className = 'shop-item-stock in-stock';
                    button.textContent = 'Already Owned';
                    button.disabled = true;
                    button.className = 'btn btn-secondary buy-btn';
                } else {
                    statusElement.innerHTML = '<i class="fas fa-plus-circle"></i>Available';
                    statusElement.className = 'shop-item-stock in-stock';
                    button.innerHTML = '<i class="fas fa-shopping-cart"></i> Purchase';
                    button.disabled = false;
                    button.className = 'btn btn-primary buy-btn';
                }
            }
        } catch (error) {
            Logger.error('Error updating item ownership:', error);
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            // Refresh shop data when wallet changes
            // this.render();
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Shop</h1>
                <p class="page-description">
                    <strong>Welcome to the Shop!</strong> Here you can purchase cosmetic items to personalize your city.
                    <em>These decorative elements don't affect gameplay but make your city unique and showcase your style.</em>
                </p>
                
                <div class="page-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Diamonds:</span>
                            <span id="diamonds-amount" class="status-value">0</span>
                        </div>
                    </div>
                </div>
                
                <div class="page-section">
                    <h2>Available Items</h2>
                    <div class="buildings-grid-rows">
                        ${this.cosmeticItems.map(item => `
                            <div class="shop-item-card">
                                <div class="shop-item-image">
                                    <img src="/images/shop/cosmetic.png" alt="${item.name}" />
                                </div>
                                <div class="shop-item-info">
                                    <div class="shop-item-title-row">
                                        <h3>${item.name}</h3>
                                        <span class="shop-item-stock in-stock">
                                            <i class="fas fa-plus-circle"></i>
                                            Available
                                        </span>
                                    </div>
                                    <div class="shop-item-desc">${item.description}</div>
                                    <div class="cost-component">
                                        <div class="cost-item">
                                            <i class="fas fa-gem cost-icon"></i>
                                            <span class="cost-value">${item.cost}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="shop-item-action-row">
                                    <button class="btn btn-primary buy-btn" data-item-id="${item.id}">
                                        <i class="fas fa-shopping-cart"></i>
                                        Purchase
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        this.setupBuyHandlers();
    }

    setupBuyHandlers() {
        const buyButtons = this.element.querySelectorAll('.buy-btn');
        buyButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = parseInt(btn.getAttribute('data-item-id'));
                const item = this.cosmeticItems.find(i => i.id === itemId);
                if (!item) return;
                
                Logger.info(`Shop: Attempting to buy cosmetic: ${item.name}`);
                
                try {
                    const playerAddress = await this.wallet.getAddress();
                    const diamonds = await this.contracts.gameState.getPlayerDiamonds(playerAddress);
                    
                    if (diamonds < item.cost) {
                        this.modal.error(`Insufficient diamonds! You need ${item.cost} diamonds but only have ${diamonds}.`);
                        return;
                    }
                    
                    // Check if already owned
                    const alreadyOwned = await this.contracts.cosmeticItems.ownsCosmetic(playerAddress, itemId);
                    if (alreadyOwned) {
                        this.modal.info(`You already own <b>${item.name}</b>!`);
                        return;
                    }
                    
                    const result = await this.modal.confirm(
                        `Purchase <b>${item.name}</b> for <b>${item.cost} 💎 Diamonds</b>?<br><small>${item.description}</small>`,
                        { title: 'Confirm Purchase' }
                    );
                    
                    if (result.isConfirmed) {
                        await this.purchaseCosmetic(itemId, item);
                    }
                } catch (error) {
                    Logger.error('Error in buy handler:', error);
                    this.modal.error('Failed to process purchase. Please try again.');
                }
            });
        });
    }
    
    async purchaseCosmetic(cosmeticId, item) {
        try {
            Logger.info(`Purchasing cosmetic: ${item.name} (ID: ${cosmeticId})`);
            
            await this.contracts.cosmeticItems.transact('purchaseCosmetic', [cosmeticId], {
                statusUpdate: (message) => {
                    Logger.info(`Purchase status: ${message}`);
                }
            });
            
            Logger.info(`Successfully purchased cosmetic: ${item.name}`);
            this.modal.success(`You have purchased <b>${item.name}</b>! It will appear in your city.`);
            
            // Refresh player resources and ownership status
            await this.loadPlayerResources();
            
        } catch (error) {
            Logger.error('Error purchasing cosmetic:', error);
            this.modal.error(`Failed to purchase ${item.name}. ${error.message || 'Please try again.'}`);
        }
    }
} 