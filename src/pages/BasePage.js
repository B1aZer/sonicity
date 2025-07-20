import { WalletManager } from '../js/utils/wallet.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { NFTContract } from '../js/contracts/NFTContract.js';
import { FarmNFTContract } from '../js/contracts/FarmNFTContract.js';
import { DistrictBuildingsContract } from '../js/contracts/DistrictBuildingsContract.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class BasePage {
    constructor() {
        this.modal = new Modal();
        this.provider = null;
        this.signer = null;
        this.contracts = {
            gameState: new GameStateContract(),
            altar: new AltarContract(),
            nft: new NFTContract(),
            farmNft: new FarmNFTContract(),
            districtBuildings: new DistrictBuildingsContract(),
            gridBuildings: new GridBuildingsContract(),
            battleSystem: new BattleSystemContract()
        };
        
        // Page state management
        this.state = {};
        this.eventListeners = new Map();
        
        // Create the main element
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        
        // Setup wallet event listener
        this.setupWalletListener();
    }
    
    setupWalletListener() {
        // Listen for wallet connection from the navbar
        window.addEventListener('walletConnected', (e) => {
            Logger.debug('BasePage setupWalletListener called with address:', e.detail.address);
            this.handleWalletConnected(e.detail.address);
        });
    }

    async initialize() {
        try {
            // Check if wallet is already connected using WalletManager
            if (WalletManager.isWalletConnected() && WalletManager.getCurrentWallet()) {
                await this.initializeContracts();
                await this.onInitialized({ 
                    success: true, 
                    address: WalletManager.getCurrentWallet() 
                });
            }
        } catch (error) {
            Logger.error('Page initialization error:', error);
            this.modal.error('Failed to initialize page. Please try again.');
        }
    }
    
    async initializeContracts() {
        try {
            // Initialize contracts but handle errors gracefully
            const promises = [
                this.contracts.gameState.initialize().catch(e => {
                    Logger.warn('GameState contract initialization failed:', e);
                    return null;
                }),
                this.contracts.altar.initialize().catch(e => {
                    Logger.warn('Altar contract initialization failed:', e);
                    return null;
                }),
                this.contracts.nft.initialize().catch(e => {
                    Logger.warn('NFT contract initialization failed:', e);
                    return null;
                }),
                this.contracts.farmNft.initialize().catch(e => {
                    Logger.warn('Farm NFT contract initialization failed:', e);
                    return null;
                }),
                this.contracts.districtBuildings.initialize().catch(e => {
                    Logger.warn('DistrictBuildings contract initialization failed:', e);
                    return null;
                }),
                this.contracts.gridBuildings.initialize().catch(e => {
                    Logger.warn('GridBuildings contract initialization failed:', e);
                    return null;
                }),
                this.contracts.battleSystem.initialize().catch(e => {
                    Logger.warn('BattleSystem contract initialization failed:', e);
                    return null;
                })
            ];
            
            await Promise.all(promises);
            return true;
        } catch (error) {
            Logger.error('Contract initialization error:', error);
            return false;
        }
    }

    async handleWalletConnected(address) {
        try {
            await this.initializeContracts();
            Logger.debug('BasePage handleWalletConnected called with address:', address);
            await this.onInitialized({ success: true, address });
        } catch (error) {
            Logger.error('Wallet connection handler error:', error);
            this.modal.error('Failed to initialize after wallet connection. Please try again.');
        }
    }

    updateWalletStatus(address) {
        // Optional method - child classes can override if they need to display wallet status
        Logger.debug('Base updateWalletStatus called with address:', address);
    }

    async onInitialized(walletResult) {
        // To be implemented by child classes
        // This is where child classes should load their data and setup event listeners
    }

    async onWalletConnected(walletResult) {
        // WARNING: Do not override this method in child pages!
        // The wallet connection is now handled by calling onInitialized when the wallet connects.
        // Child pages should only implement onInitialized to handle both initial page load
        // and wallet connection events.
        Logger.warn('onWalletConnected called - this method should not be overridden. Use onInitialized instead.');
    }

    // Minimal render system
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        // console.log('🔄 DEBUG: State changed in', this.constructor.name, newState);
        this.updateUI(oldState, this.state);
    }

    // Get loading spinner HTML for local use
    getLoadingSpinnerHTML(className = '') {
        return `<div class="loading-spinner ${className}"></div>`;
    }

    // Get loading container with spinner and text
    getLoadingContainerHTML(text = 'Loading...', className = '') {
        return `
            <div class="loading-container ${className}" style="display: flex; justify-content: center; align-items: center; min-height: 100px;">
                ${this.getLoadingSpinnerHTML()}
                <span style="margin-left: 10px; color: var(--text-muted);">${text}</span>
            </div>
        `;
    }

    updateUI(oldState, newState) {
        // Child classes can override this to update specific UI elements
        // Default implementation updates common patterns
        this.updateElements(newState);
    }

    updateElements(state) {
        // Update elements based on state keys
        Object.entries(state).forEach(([key, value]) => {
            const elements = this.element.querySelectorAll(`[data-state="${key}"]`);
            elements.forEach(element => {
                if (element.tagName === 'BUTTON') {
                    element.disabled = value === false || value === 0;
                } else {
                    element.textContent = value?.toString() || '';
                }
            });
        });
    }

    // Event listener management
    addEventListener(selector, event, handler) {
        const element = this.element.querySelector(selector);
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.set(`${selector}-${event}`, { element, event, handler });
        }
    }

    removeEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
    }

    mount(container) {
        Logger.info(`BasePage.mount called for ${this.constructor.name}`);
        
        // Check if already mounted
        if (this.element.parentNode) {
            Logger.info('Element already mounted, skipping');
            return;
        }
        
        // Append to container
        container.appendChild(this.element);
        Logger.info('Element appended to container');
        
        // Initialize the page automatically
        this.initialize().catch(error => {
            Logger.error('Error during page initialization:', error);
            this.modal.error('Failed to initialize page. Please try refreshing the page.');
        });
    }

    unmount() {
        Logger.info(`BasePage.unmount called for ${this.constructor.name}`);
        
        // Clean up event listeners
        this.removeEventListeners();
        
        // Remove the element from DOM if it exists
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}