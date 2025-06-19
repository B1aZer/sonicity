import { BasePage } from './BasePage.js';
import { WalletManager, formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';

export class AccessPage extends BasePage {
    constructor() {
        super();
        Logger.info('AccessPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        
        // Initialize state
        this.setState({
            walletStatus: 'Not Connected',
            nftStatus: 'Not Verified',
            canProceed: false
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('AccessPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadAccessData();
            this.setupEventListeners();
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
            const isNFTVerified = WalletManager.isNFTVerified();
            
            // Update state (this will automatically update UI)
            this.setState({
                walletStatus: isConnected ? formatAddress(currentWallet) : 'Not Connected',
                nftStatus: isNFTVerified ? 'Verified' : 'Not Verified',
                canProceed: isConnected && isNFTVerified
            });

            // For demo purposes, automatically verify NFT if wallet is connected
            if (isConnected && !isNFTVerified) {
                this.simulateNFTVerification();
            }

        } catch (error) {
            Logger.error('Error loading access data:', error);
            this.modal.error('Failed to load access data. Please try refreshing the page.');
        }
    }
    
    simulateNFTVerification() {
        setTimeout(() => {
            // NFT verification is now handled by WalletManager
            this.setState({
                nftStatus: 'Verified',
                canProceed: true
            });
            
            // Redirect to root (map) after verification
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }, 1000);
    }

    handleMintPageNavigation() {
        window.history.pushState({}, '', '/mint');
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system
        this.addEventListener('.mint-link', 'click', (e) => {
            e.preventDefault();
            this.handleMintPageNavigation();
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Welcome to Sonicity</h1>
                <p class="page-description">
                    Please connect your wallet using the button in the navbar and verify your NFT to access the game. 
                </p>
                
                <div class="page-section">
                    <h2>Access Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Wallet:</span>
                            <span class="status-value" data-state="walletStatus">Not Connected</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">NFT Status:</span>
                            <span class="status-value" data-state="nftStatus">Not Verified</span>
                        </div>
                    </div>
                </div>
                
                <div class="page-section">
                    <h2>Actions</h2>
                    <div class="access-actions">
                        <a href="/mint" class="mint-link btn btn-primary btn-lg">
                            <span class="button-text">Go to Mint Page</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
} 