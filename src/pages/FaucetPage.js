import { BasePage } from './BasePage.js';
import { WalletManager, formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';
import { getCurrentNetworkConfig } from '../js/utils/config.js';
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
            canRequest: false
        });
        
        this.render();
        this.setupEventListeners();
        
        // Load initial data immediately (even without wallet)
        this.loadFaucetData();
    }

    async onInitialized(walletResult) {
        Logger.info('FaucetPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadFaucetData();
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
            
            if (isConnected && window.ethereum) {
                try {
                    // Get user's balance
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const balanceWei = await provider.getBalance(currentWallet);
                    const balanceEther = ethers.formatEther(balanceWei);
                    // Format to 4 decimal places for better readability
                    balance = `${parseFloat(balanceEther).toFixed(4)} SONIC`;
                    canRequest = true;
                } catch (error) {
                    Logger.error('Error getting balance:', error);
                    balance = 'Error loading balance';
                }
            }
            
            // Update state
            this.setState({
                walletAddress: isConnected ? formatAddress(currentWallet) : 'Not Connected',
                balance,
                canRequest: isConnected
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
    }

    async requestTokens() {
        try {
            const requestBtn = this.element.querySelector('.request-btn');
            if (!requestBtn) return;

            // Get user's wallet address
            const userAddress = WalletManager.getCurrentWallet();
            if (!userAddress) {
                this.modal.error('Please connect your wallet first');
                return;
            }
            
            // Disable button and show loading
            requestBtn.disabled = true;
            requestBtn.textContent = 'Sending...';
            
            // Call Netlify function
            const response = await fetch('/.netlify/functions/faucet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userAddress })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.modal.success(`Successfully sent ${result.amount} SONIC to your wallet!`);
                
                // Update last request time
                this.setState({
                    lastRequest: new Date().toLocaleString()
                });
                
                // Refresh balance after successful request
                setTimeout(() => this.loadFaucetData(), 2000);
            } else {
                this.modal.error(result.error || 'Faucet request failed');
            }
            
        } catch (error) {
            Logger.error('Faucet error:', error);
            this.modal.error('Failed to request testnet SONIC');
        } finally {
            // Reset button
            const requestBtn = this.element.querySelector('.request-btn');
            if (requestBtn) {
                requestBtn.disabled = false;
                requestBtn.textContent = 'Request 10 SONIC';
            }
        }
    }

    render() {
        const networkConfig = getCurrentNetworkConfig();
        
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Testnet Faucet</h1>
                <p class="page-description">
                    Get free testnet SONIC tokens to start playing the game! You can request 10 SONIC tokens.
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
                
                <div class="page-section">
                    <h2>Request Tokens</h2>
                    <p class="section-description">Click the button below to receive 10 testnet SONIC tokens</p>
                    
                    <div class="btn-container">
                        <button class="btn btn-primary request-btn" data-state="canRequest">
                            Request 10 SONIC
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
                        <li><strong>Amount per request:</strong> 10 SONIC</li>
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
                        <li><strong>Request Tokens:</strong> Click "Request 10 SONIC" above</li>
                        <li><strong>Start Playing:</strong> Go back to the game once you have tokens!</li>
                    </ol>
                </div>
            </div>
        `;
        
        // Re-setup event listeners after render
        setTimeout(() => this.setupEventListeners(), 0);
    }
}
