import { BasePage } from './BasePage.js';
import { WalletManager, formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';
import { NetworkManager } from '../js/utils/networkManager.js';
import { getCurrentNetworkConfig } from '../js/utils/config.js';
import('../styles/access-page.css');

export class AccessPage extends BasePage {
    constructor() {
        super();
        Logger.info('AccessPage constructor called');
        this.element.className = 'base-page access-page';
        
        // Initialize state
        this.setState({
            walletStatus: 'Not Connected',
            networkStatus: 'Not Checked',
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
            
            let networkStatus = 'Not Checked';
            let networkCorrect = false;
            
            // Check network if wallet is connected
            if (isConnected && window.ethereum) {
                try {
                    const networkCheck = await NetworkManager.checkNetwork();
                    networkCorrect = networkCheck.isCorrect;
                    networkStatus = networkCorrect ? 
                        `✅ ${networkCheck.network.name}` : 
                        `❌ Wrong Network (Chain ${networkCheck.current})`;
                } catch (error) {
                    networkStatus = '❌ Error checking network';
                }
            }
            
            // Update state (this will automatically update UI)
            this.setState({
                walletStatus: isConnected ? formatAddress(currentWallet) : 'Not Connected',
                networkStatus,
                canProceed: isConnected && networkCorrect
            });

            // Auto-redirect to game if wallet is connected and network is correct
            if (isConnected && networkCorrect) {
                setTimeout(() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }, 1500);
            }

        } catch (error) {
            Logger.error('Error loading access data:', error);
            this.modal.error('Failed to load access data. Please try refreshing the page.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Add network button listener
        const addNetworkBtn = this.element?.querySelector('.add-network-btn');
        if (addNetworkBtn) {
            addNetworkBtn.addEventListener('click', async () => {
                try {
                    await NetworkManager.requestNetworkSwitch();
                    // Reload data after network switch
                    await this.loadAccessData();
                } catch (error) {
                    Logger.error('Error adding network:', error);
                    this.modal.error('Failed to add network to MetaMask');
                }
            });
        }
        
        // Add refresh button listener
        const refreshBtn = this.element?.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadAccessData();
            });
        }
    }

    render() {
        const networkConfig = getCurrentNetworkConfig();
        
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Welcome to Sonicity</h1>
                <p class="page-description">
                    Connect your wallet and set up the correct network to start building your district!
                </p>
                
                <div class="page-section">
                    <h2>Setup Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Wallet:</span>
                            <span class="status-value" data-state="walletStatus">Not Connected</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Network:</span>
                            <span class="status-value" data-state="networkStatus">Not Checked</span>
                        </div>
                    </div>
                </div>
                
                <div class="page-section">
                    <h2>Network Setup</h2>
                    <p class="section-description">This game requires connection to: <strong>${networkConfig.name}</strong></p>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Network Name:</span>
                            <span class="status-value">${networkConfig.name}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Chain ID:</span>
                            <span class="status-value">${networkConfig.chainId}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">RPC URL:</span>
                            <span class="status-value">${networkConfig.rpcUrl}</span>
                        </div>
                    </div>
                    
                    <div class="network-actions">
                        <button class="btn btn-primary add-network-btn">
                            🔗 Add Network to MetaMask
                        </button>
                        <button class="btn btn-secondary refresh-btn">
                            🔄 Check Status
                        </button>
                    </div>
                </div>
                
                <div class="page-section">
                    <h2>Getting Started</h2>
                    <ol>
                        <li><strong>Connect Wallet:</strong> Use the wallet button in the navbar</li>
                        <li><strong>Add Network:</strong> Click "Add Network to MetaMask" above</li>
                        <li><strong>Get Testnet Tokens:</strong> <a href="/faucet" class="btn btn-small btn-secondary">Faucet</a></li>
                        <li><strong>Start Playing:</strong> Build your district and compete!</li>
                    </ol>
                </div>
                
                <div class="page-section">
                    <h2>What You Can Do</h2>
                    <ul>
                        <li>Build and manage your district</li>
                        <li>Train troops and engage in battles</li>
                        <li>Earn resources and upgrade buildings</li>
                        <li>Compete with other players</li>
                    </ul>
                </div>
            </div>
        `;
        
        // Re-setup event listeners after render
        setTimeout(() => this.setupEventListeners(), 0);
    }
} 