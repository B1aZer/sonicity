import { WalletManager } from '../js/utils/wallet.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { NFTContract } from '../js/contracts/NFTContract.js';
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
            nft: new NFTContract()
        };
    }

    async initialize() {
        try {
            // Initialize wallet connection
            const walletResult = await WalletManager.initializeConnection();
            if (walletResult.success) {
                // Initialize contracts
                await Promise.all([
                    this.contracts.gameState.initialize(),
                    this.contracts.altar.initialize(),
                    this.contracts.nft.initialize()
                ]);
                
                // Update UI with wallet address
                this.updateWalletStatus(walletResult.address);
                
                // Additional initialization specific to the page
                await this.onInitialized(walletResult);
            }
        } catch (error) {
            Logger.error('Page initialization error:', error);
            this.modal.error('Failed to initialize page. Please try again.');
        }
    }

    async handleConnectWallet() {
        try {
            const result = await WalletManager.connectWallet();
            if (result.success) {
                // Initialize contracts
                await Promise.all([
                    this.contracts.gameState.initialize(),
                    this.contracts.altar.initialize(),
                    this.contracts.nft.initialize()
                ]);
                
                // Update UI with wallet address
                this.updateWalletStatus(result.address);
                
                // Additional initialization specific to the page
                await this.onWalletConnected(result);
            }
        } catch (error) {
            Logger.error('Wallet connection error:', error);
            this.modal.error('Failed to connect wallet. Please try again.');
        }
    }

    updateWalletStatus(address) {
        // Optional method - child classes can override if they need to display wallet status
        Logger.debug('Base updateWalletStatus called with address:', address);
    }

    async onInitialized(walletResult) {
        // To be implemented by child classes
    }

    async onWalletConnected(walletResult) {
        // To be implemented by child classes
    }
} 