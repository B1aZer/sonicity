import { WalletManager } from '../utils/wallet.js';
import { ContractManager } from '../utils/contracts.js';
import { Modal } from '../utils/modal.js';
import Logger from '../utils/logger.js';

export class BasePage {
    constructor() {
        this.modal = new Modal();
        this.provider = null;
        this.signer = null;
        this.contracts = null;
    }

    async initialize() {
        try {
            // Initialize wallet connection
            const walletResult = await WalletManager.initializeConnection();
            if (walletResult.success) {
                // Initialize contracts
                this.signer = await ContractManager.getSigner();
                this.contracts = await ContractManager.initializeContracts(this.signer);
                
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
                this.signer = await ContractManager.getSigner();
                this.contracts = await ContractManager.initializeContracts(this.signer);
                
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
        // To be implemented by child classes
        throw new Error('updateWalletStatus must be implemented by child class');
    }

    async onInitialized(walletResult) {
        // To be implemented by child classes
    }

    async onWalletConnected(walletResult) {
        // To be implemented by child classes
    }
} 