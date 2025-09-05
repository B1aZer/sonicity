import { BasePage } from './BasePage.js';
import { COSMETIC_METADATA, RESOURCE_TYPES } from '../js/utils/constants.js';
import { Modal } from '../js/utils/modal.js';
import { WalletManager } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';

import('../styles/shop-page.css');

export class ShopPage extends BasePage {
    constructor() {
        super();
        
        // Set required district building (assuming shop needs a specific building)
        this.requiredDistrictBuilding = 'Shop'; // Uncomment if needed
        
        this.element.className = 'base-page';
        
        // Initialize state using the BasePage pattern
        this.setState({
            cosmeticItems: [],
            diamonds: 0,
            gold: 0,
            isLoading: true,
            canPurchase: false,
            playerAddress: null
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('ShopPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            this.setState({ 
                isLoading: true,
                playerAddress: walletResult.address 
            });
            
            await this.loadShopData();
            Logger.info('Shop page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing shop page:', error);
            this.modal.error('Failed to initialize shop page. Please try refreshing the page.');
        } finally {
            this.setState({ isLoading: false });
        }
    }

    async loadShopData() {
        try {
            Logger.info('Loading shop data...');
            
            // Load cosmetic items and player resources in parallel
            await Promise.all([
                this.loadCosmeticItems(),
                this.loadPlayerResources()
            ]);
            
        } catch (error) {
            Logger.error('Error loading shop data:', error);
            this.modal.error('Failed to load shop data. Please try refreshing the page.');
        }
    }

    async loadCosmeticItems() {
        try {
            Logger.info('Loading cosmetic items from contract...');
            
            // First, try to check if the default Royal Banner (ID 0) exists
            try {
                const bannerConfig = await this.contracts.cosmeticItems.getCosmeticConfig(0);
                Logger.info('Royal Banner config (ID 0):', bannerConfig);
                
                if (bannerConfig.name && bannerConfig.enabled) {
                    Logger.info('Default Royal Banner found, proceeding with getAvailableCosmetics');
                } else {
                    Logger.warn('Royal Banner not properly configured:', bannerConfig);
                }
            } catch (bannerError) {
                Logger.error('Error checking Royal Banner config:', bannerError);
            }
            
            // Get available cosmetics from contract
            const availableIds = await this.contracts.cosmeticItems.getAvailableCosmetics(10);
            Logger.info('Available cosmetic IDs:', availableIds);
            
            const cosmeticItems = [];
            for (const id of availableIds) {
                Logger.info(`Loading config for cosmetic ID: ${id}`);
                const config = await this.contracts.cosmeticItems.getCosmeticConfig(id);
                Logger.info(`Config for ID ${id}:`, config);
                
                const metadata = COSMETIC_METADATA[id] || {};
                
                cosmeticItems.push({
                    id: Number(id),
                    name: config.name,
                    cost: Number(config.cost),
                    currency: RESOURCE_TYPES[config.resourceType] || 'UNKNOWN',
                    enabled: config.enabled,
                    description: config.description || metadata.description || 'No description available',
                    modelPath: config.modelPath || metadata.modelPath || '',
                    type: metadata.type || 'unknown',
                    cosmeticType: Number(config.cosmeticType) || 0,
                    image: metadata.image || '/images/shop/default.png',
                    isOwned: false // Will be updated in loadPlayerResources
                });
            }
            
            Logger.info(`Loaded ${cosmeticItems.length} cosmetic items:`, cosmeticItems);
            
            // Update state with loaded items
            this.setState({ 
                cosmeticItems,
                canPurchase: cosmeticItems.length > 0 
            });
            
            if (cosmeticItems.length === 0) {
                Logger.warn('No cosmetic items available from contract');
                this.modal.info('No cosmetic items are currently available for purchase. The contract may need to be initialized with cosmetic items.');
            }
        } catch (error) {
            Logger.error('Error loading cosmetic items:', error);
            Logger.error('Error details:', error.message);
            
            // Show detailed error message to help with debugging
            this.modal.error(`Failed to load cosmetic items: ${error.message || 'Unknown error'}. Please check the browser console for more details.`);
        }
    }

    async loadPlayerResources() {
        try {
            if (!this.state.playerAddress) {
                Logger.warn('No wallet connected');
                return;
            }
            
            // Load player resources in parallel
            const [diamonds, gold] = await Promise.all([
                this.contracts.gameState.getPlayerDiamonds(this.state.playerAddress),
                this.contracts.gameState.getPlayerGold(this.state.playerAddress)
            ]);
            
            // Update ownership status for each cosmetic item
            const updatedItems = await Promise.all(
                this.state.cosmeticItems.map(async (item) => {
                    const isOwned = await this.contracts.cosmeticItems.ownsCosmetic(this.state.playerAddress, item.id);
                    return { ...item, isOwned };
                })
            );

            // Update state with resources and ownership info
            this.setState({
                diamonds: diamonds.toString(),
                gold: gold.toString(),
                cosmeticItems: updatedItems
            });
            
        } catch (error) {
            Logger.error('Error loading player resources:', error);
        }
    }

    async handlePurchaseCosmetic(cosmeticId) {
        try {
            const item = this.state.cosmeticItems.find(i => i.id === cosmeticId);
            if (!item) return;
            
            Logger.info(`Shop: Attempting to buy cosmetic: ${item.name}`);
            
            if (!this.state.playerAddress) {
                this.modal.error('Please connect your wallet to make a purchase.');
                return;
            }
            
            if (Number(this.state.diamonds) < item.cost) {
                this.modal.error(`Insufficient diamonds! You need ${item.cost} diamonds but only have ${this.state.diamonds}.`);
                return;
            }
            
            // Check if already owned
            if (item.isOwned) {
                this.modal.info(`You already own <b>${item.name}</b>!`);
                return;
            }
            
            const result = await this.modal.confirm(
                `Purchase <b>${item.name}</b> for <b>${item.cost} Diamonds</b>?`,
                { title: 'Confirm Purchase' }
            );
            
            if (result.isConfirmed) {
                await this.purchaseCosmetic(cosmeticId, item);
            }
        } catch (error) {
            Logger.error('Error in purchase handler:', error);
            this.modal.error('Failed to process purchase. Please try again.');
        }
    }
    
    async purchaseCosmetic(cosmeticId, item) {
        try {
            Logger.info(`Purchasing cosmetic: ${item.name} (ID: ${cosmeticId})`);
            
            // Show loading modal
            const loadingModal = this.modal.loading('Processing purchase...');
            
            await this.contracts.cosmeticItems.transact('purchaseCosmetic', [cosmeticId], {
                statusUpdate: (message) => {
                    Logger.info(`Purchase status: ${message}`);
                }
            });
            
            // Close loading modal
            loadingModal.close();
            
            Logger.info(`Successfully purchased cosmetic: ${item.name}`);
            this.modal.success(`You have purchased <b>${item.name}</b>! It will appear in your district.`);
            
            // Refresh player resources and ownership status
            await this.loadPlayerResources();
            
        } catch (error) {
            Logger.error('Error purchasing cosmetic:', error);
            this.modal.error(`Failed to purchase ${item.name}. ${error.message || 'Please try again.'}`);
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the BasePage event listener system for proper cleanup
        this.addEventListener('.buy-btn', 'click', (event) => {
            const itemId = parseInt(event.target.getAttribute('data-item-id'));
            this.handlePurchaseCosmetic(itemId).catch(error => {
                Logger.error('Error in handlePurchaseCosmetic:', error);
            });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Shop</h1>
                <p class="page-description">
                    <strong>Welcome to the Shop!</strong> Here you can purchase cosmetic items to personalize your city.
                    <em>These decorative elements don't affect gameplay but make your city unique and showcase your style.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Diamonds:</span>
                            <span class="status-value" data-state="diamonds">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value" data-state="gold">0</span>
                        </div>
                    </div>
                </div>
                
                <!-- Available Items Section -->
                <div class="page-section">
                    <h2>Available Items</h2>
                    <div class="shop-items-container" id="shop-items-list">
                        ${this.state.isLoading ? this.getLoadingContainerHTML('Loading shop items...') : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Update shop items list
        this.updateShopItemsList();
    }

    updateShopItemsList() {
        const container = this.element.querySelector('#shop-items-list');
        if (!container) return;

        if (this.state.isLoading) {
            container.innerHTML = this.getLoadingContainerHTML('Loading shop items...');
            return;
        }

        if (this.state.cosmeticItems.length === 0) {
            container.innerHTML = `
                <div class="building-card">
                    <h3>No Items Available</h3>
                    <p>No cosmetic items are currently available for purchase.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="buildings-grid">
                ${this.state.cosmeticItems.map(item => `
                    <div class="shop-item-card">
                        <div class="shop-item-image">
                            <img src="${item.image}" alt="${item.name}" />
                        </div>
                        <div class="shop-item-info">
                            <div class="shop-item-title-row">
                                <h3>${item.name}</h3>
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
                            <button class="btn ${item.isOwned ? 'btn-secondary' : 'btn-primary'} buy-btn" 
                                    data-item-id="${item.id}" 
                                    ${item.isOwned ? 'disabled' : ''}>
                                <i class="fas ${item.isOwned ? 'fa-check' : 'fa-shopping-cart'}"></i>
                                ${item.isOwned ? 'Already Owned' : 'Purchase'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Setup event listeners after creating the buttons
        this.setupEventListeners();
    }

    updateUI(oldState, newState) {
        // Call parent updateUI first for standard state updates
        super.updateUI(oldState, newState);
        
        // Update shop items list if cosmetic items or loading state changed
        if (oldState?.cosmeticItems?.length !== newState?.cosmeticItems?.length ||
            oldState?.isLoading !== newState?.isLoading ||
            JSON.stringify(oldState?.cosmeticItems) !== JSON.stringify(newState?.cosmeticItems)) {
            this.updateShopItemsList();
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // Wallet status updates are handled through onInitialized
        // This method is kept for BasePage compatibility
    }
} 