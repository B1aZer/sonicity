import { BasePage } from './BasePage.js';
import { WalletManager, formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';

export class AccessPage extends BasePage {
    constructor() {
        super();
        Logger.info('AccessPage constructor called');
        this.element.className = 'base-page';
        
        // Initialize state
        this.setState({
            walletStatus: 'Not Connected',
            nftStatus: 'Not Verified',
            canProceed: false
        });
        
        this.render();
        this.setupEventListeners();
    }

    async onInitialized(walletResult) {
        Logger.info('AccessPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadAccessData();
            Logger.info('Access page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing access page:', error);
            this.modal.error('Failed to initialize access page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    async loadAccessData() {
        try {
            Logger.info('Loading access data...');
            
            const isConnected = WalletManager.isWalletConnected();
            const currentWallet = WalletManager.getCurrentWallet();
            
            // Update state (this will automatically update UI)
            this.setState({
                walletStatus: isConnected ? formatAddress(currentWallet) : 'Not Connected',
                canProceed: isConnected
            });

            // Auto-redirect to game if wallet is connected
            if (isConnected) {
                setTimeout(() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }, 1000);
            }

        } catch (error) {
            Logger.error('Error loading access data:', error);
            this.modal.error('Failed to load access data. Please try refreshing the page.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        // No event listeners needed for access page
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Welcome to Sonicity</h1>
                <p class="page-description">
                    Connect your wallet to start building your district and competing with other players!
                </p>
                
                <div class="page-section">
                    <h2>Wallet Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Wallet:</span>
                            <span class="status-value" data-state="walletStatus">Not Connected</span>
                        </div>
                    </div>
                </div>
                

                
                <div class="page-section">
                    <h2>Getting Started</h2>
                    <p>Connect your wallet using the button in the navbar to start playing. You'll be able to:</p>
                    <ul>
                        <li>Build and manage your district</li>
                        <li>Train troops and engage in battles</li>
                        <li>Earn resources and upgrade buildings</li>
                        <li>Compete with other players</li>
                    </ul>
                </div>
            </div>
        `;
    }
} 