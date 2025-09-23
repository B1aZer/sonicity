import { BasePage } from './BasePage.js';
import { WalletManager, formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';
import { getCurrentNetworkConfig, config } from '../js/utils/config.js';
import { ethers } from 'ethers';

export class FaucetPage extends BasePage {
    constructor() {
        super();
        Logger.info('FaucetPage constructor called');
        this.element.className = 'base-page';
        
        // Initialize state
        this.setState({
            walletAddress: 'Not Connected',
            balance: 'Unknown',
            lastRequest: null,
            canRequest: false,
            hasBalance: false,
            isPlayerInitialized: false,
            showStartSection: false
        });
        
        this.render();
        
        // Load initial data immediately (even without wallet)
        this.loadFaucetData();
    }

    async onInitialized(walletResult) {
        Logger.info('FaucetPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadFaucetData();
            this.setupEventListeners();
            Logger.info('Faucet page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing faucet page:', error);
            this.modal.error('Failed to initialize faucet page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // Reload data when wallet status changes
        this.loadFaucetData();
    }

    async loadFaucetData() {
        try {
            Logger.info('Loading faucet data...');
            
            const isConnected = WalletManager.isWalletConnected();
            const currentWallet = WalletManager.getCurrentWallet();
            
            let balance = 'Unknown';
            let canRequest = false;
            let hasBalance = false;
            let isPlayerInitialized = false;
            
            if (isConnected && window.ethereum) {
                try {
                    // Get user's balance
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const balanceWei = await provider.getBalance(currentWallet);
                    const balanceEther = ethers.formatEther(balanceWei);
                    // Format to 4 decimal places for better readability
                    balance = `${parseFloat(balanceEther).toFixed(4)} SONIC`;
                    canRequest = true;
                    hasBalance = balanceWei > 0n;
                    
                    // Check if player is initialized (only if they have balance)
                    if (hasBalance) {
                        try {
                            isPlayerInitialized = await this.contracts.gameState.isPlayerInitialized();
                        } catch (error) {
                            Logger.warn('Could not check player initialization:', error);
                        }
                    }
                } catch (error) {
                    Logger.error('Error getting balance:', error);
                    balance = 'Error loading balance';
                }
            }
            
            // Update state
            this.setState({
                walletAddress: isConnected ? formatAddress(currentWallet) : 'Not Connected',
                balance,
                canRequest: isConnected,
                hasBalance,
                isPlayerInitialized,
                showStartSection: hasBalance
            });

        } catch (error) {
            Logger.error('Error loading faucet data:', error);
            this.modal.error('Failed to load faucet data. Please try refreshing the page.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up faucet event listeners');
        
        // Request tokens button listener
        const requestBtn = this.element?.querySelector('.request-btn');
        if (requestBtn) {
            requestBtn.addEventListener('click', async () => {
                await this.requestTokens();
            });
        }
        
        // Refresh balance button listener
        const refreshBtn = this.element?.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadFaucetData();
            });
        }
        
        // Start/Continue game button listener
        const startGameBtn = this.element?.querySelector('.start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', async () => {
                await this.startGame();
            });
        }
    }

    async requestTokens() {
        try {
            // Get user's wallet address
            const userAddress = WalletManager.getCurrentWallet();
            if (!userAddress) {
                this.modal.error('Please connect your wallet first');
                return;
            }
            
            // Show loading modal immediately
            const loadingModal = this.modal.loading('Requesting testnet tokens...');
            
            // Call Netlify function
            const response = await fetch('/.netlify/functions/faucet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userAddress })
            });
            
            const result = await response.json();
            
            // Close loading modal
            loadingModal.close();
            
            if (response.ok && result.success) {
                this.modal.success(`Successfully sent ${result.amount} SONIC to your wallet!`, { title: 'Tokens Received!' });
                
                // Update last request time
                this.setState({
                    lastRequest: new Date().toLocaleString()
                });
                
                // Refresh balance after successful request
                setTimeout(() => {
                    this.loadFaucetData();
                    // Show the start section after getting tokens
                    this.setState({ showStartSection: true });
                }, 2000);
            } else if (response.status === 429) {
                // Rate limited
                this.modal.error(result.error || `Rate limit reached. Try again in ${result.daysLeft || 'a few'} days.`, { title: 'Rate Limited' });
            } else {
                this.modal.error(result.error || 'Faucet request failed', { title: 'Request Failed' });
            }
            
        } catch (error) {
            Logger.error('Faucet error:', error);
            this.modal.error('Failed to request testnet SONIC', { title: 'Request Failed' });
        }
    }

    async startGame() {
        try {
            Logger.info('Starting game initialization...');
            
            // Show loading modal immediately
            const loadingModal = this.modal.loading('Initializing game...');
            
            // Check if player is already initialized
            const isInitialized = await this.contracts.gameState.isPlayerInitialized();
            Logger.info('Checking player initialization before start:', isInitialized);

            if (!isInitialized) {
                Logger.info('Player not initialized, initializing contract and player...');
                // Initialize contract with user's wallet
                await this.contracts.gameState.initialize();
                
                // Initialize player
                await this.contracts.gameState.initializePlayer();
                
                Logger.info('Player initialization completed');
            } else {
                Logger.info('Player already initialized, proceeding to game...');
            }

            // Close loading modal
            loadingModal.close();
            
            // Show success message
            this.modal.success('Game initialized successfully!', { title: 'Welcome to Sonicity!' });

            // Navigate to overview page
            window.history.pushState({}, '', '/overview');
            window.dispatchEvent(new PopStateEvent('popstate'));

        } catch (error) {
            Logger.error('Error starting game:', error);
            this.modal.error(error.message || 'Failed to start game', { title: 'Initialization Failed' });
        }
    }

    // Override updateElements to handle showStartSection state
    updateElements(state) {
        // Call parent updateElements first
        super.updateElements(state);
        
        // Handle showStartSection state
        if (state.hasOwnProperty('showStartSection')) {
            const startSection = this.element.querySelector('.start-game-section');
            if (startSection) {
                startSection.style.display = state.showStartSection ? 'block' : 'none';
            }
        }
        
        // Handle isPlayerInitialized state for button text
        if (state.hasOwnProperty('isPlayerInitialized')) {
            const startGameBtn = this.element.querySelector('.start-game-btn');
            if (startGameBtn) {
                startGameBtn.textContent = state.isPlayerInitialized ? 'Continue Game' : 'Start Game';
            }
        }
    }

    render() {
        const networkConfig = getCurrentNetworkConfig();
        const faucetAmount = config.faucet.amount;
        
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Testnet Faucet</h1>
                <p class="page-description">
                    Get free testnet SONIC tokens to start playing the game!
                </p>
                
                <div class="page-section">
                    <h2>Your Wallet</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Address:</span>
                            <span class="status-value" data-state="walletAddress">Not Connected</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Balance:</span>
                            <span class="status-value" data-state="balance">Unknown</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Network:</span>
                            <span class="status-value">${networkConfig.name}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Start/Continue Game Section (hidden by default) -->
                <div class="page-section start-game-section" style="display: none;">
                    <h2>Ready to Play</h2>
                    <p class="section-description">You have SONIC tokens! You can now start the game</p>
                    
                    <div class="btn-container">
                        <button class="btn btn-primary start-game-btn">
                            Start Game
                        </button>
                    </div>
                </div>
                
                <div class="page-section">
                    <h2>Request Tokens</h2>
                    <p class="section-description">Click the button below to receive ${faucetAmount} testnet SONIC tokens</p>
                    
                    <div class="btn-container">
                        <button class="btn btn-primary request-btn" data-state="canRequest">
                            Request ${faucetAmount} SONIC
                        </button>
                        <button class="btn btn-secondary refresh-btn">
                            Refresh Balance
                        </button>
                    </div>
                    
                    ${this.state.lastRequest ? `
                        <div class="status-item">
                            <span class="status-label">Last Request:</span>
                            <span class="status-value">${this.state.lastRequest}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="page-section">
                    <h2>Faucet Information</h2>
                    <ul>
                        <li><strong>Amount per request:</strong> ${faucetAmount} SONIC</li>
                        <li><strong>Rate limit:</strong> Once per ${Math.floor(config.faucet.timeoutMinutes / (24 * 60))} day(s) per wallet address</li>
                        <li><strong>Network:</strong> ${networkConfig.name}</li>
                        <li><strong>Use case:</strong> Testing and playing the game</li>
                        <li><strong>Note:</strong> These are testnet tokens with no real value</li>
                    </ul>
                </div>
                
                <div class="page-section">
                    <h2>Need Help?</h2>
                    <ol>
                        <li><strong>Connect Wallet:</strong> Use the wallet button in the navbar</li>
                        <li><strong>Correct Network:</strong> Make sure you're on ${networkConfig.name}</li>
                        <li><strong>Request Tokens:</strong> Click "Request ${faucetAmount} SONIC" above</li>
                        <li><strong>Start Playing:</strong> Go back to the game once you have tokens!</li>
                    </ol>
                </div>
            </div>
        `;
    }
}
