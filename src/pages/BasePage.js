import { WalletManager } from '../js/utils/wallet.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { NFTContract } from '../js/contracts/NFTContract.js';
import { FarmNFTContract } from '../js/contracts/FarmNFTContract.js';
import { DiamondNFTContract } from '../js/contracts/DiamondNFTContract.js';
import { RepNFTContract } from '../js/contracts/RepNFTContract.js';
import { SonicityYieldNFTContract } from '../js/contracts/SonicityYieldNFTContract.js';
import { DistrictBuildingsContract } from '../js/contracts/DistrictBuildingsContract.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';
import { MatchmakingSystemContract } from '../js/contracts/MatchmakingSystemContract.js';
import { HeroNFTContract } from '../js/contracts/HeroNFTContract.js';
import { TacticsNFTContract } from '../js/contracts/TacticsNFTContract.js';
import { CosmeticItemsContract } from '../js/contracts/CosmeticItemsContract.js';
import { AdventureSystemContract } from '../js/contracts/AdventureSystemContract.js';
import { RelicNFTContract } from '../js/contracts/RelicNFTContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { ContractErrorHandler } from '../js/utils/contractErrorHandler.js';
import { SimpleEventDelegation } from '../js/utils/SimpleEventDelegation.js';

export class BasePage {
    constructor() {
        this.modal = new Modal();
        this.provider = null;
        this.signer = null;
        this.isInitialized = false;
        this.contracts = {
            gameState: new GameStateContract(),
            altar: new AltarContract(),
            nft: new NFTContract(),
            farmNft: new FarmNFTContract(),
            diamondNft: new DiamondNFTContract(),
            repNft: new RepNFTContract(),
            yieldNft: new SonicityYieldNFTContract(),
            districtBuildings: new DistrictBuildingsContract(),
            gridBuildings: new GridBuildingsContract(),
            battleSystem: new BattleSystemContract(),
            matchmakingSystem: new MatchmakingSystemContract(),
            heroNFT: new HeroNFTContract(),
            tacticsNFT: new TacticsNFTContract(),
            cosmeticItems: new CosmeticItemsContract(),
            adventureSystem: new AdventureSystemContract(),
            relicNFT: new RelicNFTContract()
        };
        
        // Page state management
        this.state = {};
        this.eventListeners = new Map();
        this.intervals = new Map(); // Track intervals by key
        
        // Building access control
        this.requiredDistrictBuilding = null; // Child classes can set this
        
        // Create the main element
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        
        // Add simple event delegation alongside existing system (after element is created)
        this.delegation = new SimpleEventDelegation(this.element);
        
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
                
                // Add building access check here
                if (!(await this.checkDistrictBuildingAccess(WalletManager.getCurrentWallet()))) {
                    return; // Stop initialization
                }
                
                await this.onInitialized({ 
                    success: true, 
                    address: WalletManager.getCurrentWallet() 
                });
                
                // Mark as initialized to prevent duplicate initialization for cached pages
                this.isInitialized = true;
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
                this.contracts.diamondNft.initialize().catch(e => {
                    Logger.warn('Diamond NFT contract initialization failed:', e);
                    return null;
                }),
                this.contracts.repNft.initialize().catch(e => {
                    Logger.warn('Rep NFT contract initialization failed:', e);
                    return null;
                }),
                this.contracts.yieldNft.initialize().catch(e => {
                    Logger.warn('Sonicity Yield NFT contract initialization failed:', e);
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
                }),
                this.contracts.matchmakingSystem.initialize().catch(e => {
                    Logger.warn('MatchmakingSystem contract initialization failed:', e);
                    return null;
                }),
                this.contracts.heroNFT.initialize().catch(e => {
                    Logger.warn('HeroNFT contract initialization failed:', e);
                    return null;
                }),
                this.contracts.tacticsNFT.initialize().catch(e => {
                    Logger.warn('TacticsNFT contract initialization failed:', e);
                    return null;
                }),
                this.contracts.cosmeticItems.initialize().catch(e => {
                    Logger.warn('CosmeticItems contract initialization failed:', e);
                    return null;
                }),
                this.contracts.adventureSystem.initialize().catch(e => {
                    Logger.warn('AdventureSystem contract initialization failed:', e);
                    return null;
                }),
                this.contracts.relicNFT.initialize().catch(e => {
                    Logger.warn('RelicNFT contract initialization failed:', e);
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

    async checkDistrictBuildingAccess(address) {
        if (!this.requiredDistrictBuilding) return true; // No building required
        
        try {
            const isBuilt = await this.contracts.districtBuildings.isDistrictBuildingBuilt(this.requiredDistrictBuilding);
            const isDamaged = await this.contracts.districtBuildings.isBuildingDamaged(this.requiredDistrictBuilding);
            
            if (!isBuilt) {
                this.modal.error(`You need to build ${this.requiredDistrictBuilding} to access this page.`);
                return false;
            }
            
            if (isDamaged) {
                this.modal.error(`${this.requiredDistrictBuilding} is damaged and needs repair.`);
                return false;
            }
            
            return true;
        } catch (error) {
            Logger.error('Error checking district building access:', error);
            return true; // Allow access if check fails
        }
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
        try {
            const elements = this.element.querySelectorAll(selector);
            if (elements.length === 0) {
                Logger.warn(`No elements found for selector: ${selector}`);
                return;
            }
            
            elements.forEach((element, index) => {
                const listenerKey = `${selector}-${event}-${index}`;
                
                // Remove existing listener for this key if it exists (for cached pages)
                if (this.eventListeners.has(listenerKey)) {
                    const existing = this.eventListeners.get(listenerKey);
                    existing.element.removeEventListener(existing.event, existing.handler);
                    this.eventListeners.delete(listenerKey);
                }
                
                // Wrap handler with error handling
                const safeHandler = (e) => {
                    try {
                        handler(e);
                    } catch (error) {
                        Logger.error(`Error in event handler for ${selector}:`, error);
                    }
                };
                
                element.addEventListener(event, safeHandler);
                // Use unique keys for each element to properly track them
                this.eventListeners.set(listenerKey, { 
                    element, 
                    event, 
                    handler: safeHandler 
                });
            });
        } catch (error) {
            Logger.error(`Error setting up event listener for ${selector}:`, error);
        }
    }
    
    // Helper method to clear all event listeners before setting up new ones
    clearEventListeners() {
        this.removeEventListeners();
    }

    /**
     * New declarative method - works with dynamic content automatically
     * 
     * Usage:
     * this.on('.btn-primary', 'click', (e) => this.handleClick(e));
     * this.on('.hero-select-radio', 'change', (e) => this.handleHeroChange(e));
     */
    on(selector, event, handler) {
        this.delegation.on(selector, event, handler);
    }

    /**
     * Remove delegated event handler
     */
    off(selector, event) {
        this.delegation.off(selector, event);
    }

    removeEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
    }

    // Interval management methods
    setInterval(key, callback, delay) {
        // Clear existing interval with this key if it exists
        this.clearInterval(key);
        
        // Create new interval and store it
        const intervalId = setInterval(callback, delay);
        this.intervals.set(key, intervalId);
        
        Logger.info(`Set interval '${key}' with ID ${intervalId}`);
        return intervalId;
    }
    
    clearInterval(key) {
        if (this.intervals.has(key)) {
            const intervalId = this.intervals.get(key);
            clearInterval(intervalId);
            this.intervals.delete(key);
            Logger.info(`Cleared interval '${key}' with ID ${intervalId}`);
            return true;
        }
        return false;
    }
    
    clearAllIntervals() {
        this.intervals.forEach((intervalId, key) => {
            clearInterval(intervalId);
            Logger.info(`Cleared interval '${key}' with ID ${intervalId}`);
        });
        this.intervals.clear();
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
        
        // Always initialize to ensure event listeners are properly attached
        // This fixes issues with cached pages where event listeners might be lost
        this.initialize().catch(error => {
            Logger.error('Error during page initialization:', error);
            this.modal.error('Failed to initialize page. Please try refreshing the page.');
        });
    }

    /**
     * Handle contract errors with centralized error processing
     * @param {Error} error - The error from contract call
     * @param {string} operation - The operation being performed
     */
    handleContractError(error, operation) {
        const userMessage = ContractErrorHandler.getErrorMessage(error);
        this.modal.error(userMessage);
    }

    unmount() {
        Logger.info(`BasePage.unmount called for ${this.constructor.name}`);
        
        // Call page-specific cleanup if it exists
        if (typeof this.onUnmount === 'function') {
            this.onUnmount();
        }
        
        // Clean up event listeners and intervals
        this.removeEventListeners();
        this.clearAllIntervals();
        
        // Remove the element from DOM if it exists
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}