import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { BasePage } from './BasePage.js';

import('../styles/start-page.css');

export class StartPage extends BasePage {
    constructor() {
        super();
        Logger.info('StartPage constructor called');
        
        this.element.className = 'start-page';
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('StartPage onInitialized called with wallet:', walletResult.address);
        try {
            // Check native balance first
            const hasBalance = await this.checkNativeBalance();
            Logger.info('Native balance check result:', hasBalance);

            if (!hasBalance) {
                // Show faucet button if no balance
                this.showFaucetButton();
                this.setupEventListeners();
                return;
            }

            // Check if player is initialized
            const isInitialized = await this.contracts.gameState.isPlayerInitialized();
            Logger.info('Player initialization status:', isInitialized);

            // Enable start button if wallet is connected and has balance
            const startButton = this.element.querySelector('.start-button');
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = isInitialized ? 'Continue Game' : 'Start Game';
            }
            this.setupEventListeners();
            Logger.info('Start page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing start page:', error);
            this.modal.error('Failed to initialize start page. Please try refreshing the page.');
        }
    }

    async checkNativeBalance() {
        try {
            if (!window.ethereum) {
                Logger.warn('No ethereum provider available for balance check');
                return true; // Allow access if we can't check
            }

            const { ethers } = await import('ethers');
            const { WalletManager } = await import('../js/utils/wallet.js');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const currentWallet = WalletManager.getCurrentWallet();
            
            if (!currentWallet) {
                return false;
            }

            const balance = await provider.getBalance(currentWallet);
            const hasBalance = balance > 0n;
            
            Logger.info(`Wallet ${currentWallet} balance check: ${ethers.formatEther(balance)} SONIC (has balance: ${hasBalance})`);
            return hasBalance;
        } catch (error) {
            Logger.error('Error checking native balance:', error);
            return true; // Allow access if balance check fails to avoid blocking users
        }
    }

    showFaucetButton() {
        const startButton = this.element.querySelector('.start-button');
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = 'Get Testnet Tokens';
            startButton.classList.add('faucet-button');
        }
    }

    setupEventListeners() {
        const startButton = this.element.querySelector('.start-button');
        
        // Start button listener
        if (startButton) {
            startButton.addEventListener('click', async () => {
                try {
                    // Check if this is a faucet button
                    if (startButton.classList.contains('faucet-button')) {
                        // Navigate to faucet page
                        window.history.pushState({}, '', '/faucet');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        return;
                    }

                    // Disable button and show loading state
                    startButton.disabled = true;
                    startButton.classList.add('loading');
                    startButton.textContent = '';

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

                    // Show loading message
                    this.modal.loading('Initializing game...');

                    // Navigate to overview page
                    window.history.pushState({}, '', '/overview');
                    window.dispatchEvent(new PopStateEvent('popstate'));

                    // Close loading modal
                    this.modal.close();
                } catch (error) {
                    Logger.error('Error starting game:', error);
                    this.modal.error(error.message || 'Failed to start game');
                    
                    // Reset button state
                    startButton.disabled = false;
                    startButton.classList.remove('loading');
                    startButton.textContent = 'Start Game';
                }
            });
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="start-container">
                <img src="/images/Start.png" alt="Start Game" class="start-image" />
                <button class="start-button btn btn-lg btn-primary" disabled>
                    Connect Wallet
                </button>
            </div>
        `;
    }
} 