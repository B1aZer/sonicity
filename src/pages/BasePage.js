import { WalletManager } from '../js/utils/wallet.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { NFTContract } from '../js/contracts/NFTContract.js';
import { DistrictBuildingsContract } from '../js/contracts/DistrictBuildingsContract.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { appState } from '../js/core/state.js';
import '../styles/base-page.css';

export class BasePage {
    constructor() {
        this.modal = new Modal();
        this.provider = null;
        this.signer = null;
        this.contracts = {
            gameState: new GameStateContract(),
            altar: new AltarContract(),
            nft: new NFTContract(),
            districtBuildings: new DistrictBuildingsContract(),
            gridBuildings: new GridBuildingsContract()
        };
        
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
            // Check if wallet is already connected from appState
            const state = appState.getState();
            if (state.walletConnected && state.currentWallet) {
                await this.initializeContracts();
                this.updateWalletStatus(state.currentWallet);
                await this.onInitialized({ 
                    success: true, 
                    address: state.currentWallet 
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
                this.contracts.districtBuildings.initialize().catch(e => {
                    Logger.warn('DistrictBuildings contract initialization failed:', e);
                    return null;
                }),
                this.contracts.gridBuildings.initialize().catch(e => {
                    Logger.warn('GridBuildings contract initialization failed:', e);
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
            this.updateWalletStatus(address);
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
        // To be implemented by child classes
    }
} 