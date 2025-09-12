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
            // Check if player is initialized
            const isInitialized = await this.contracts.gameState.isPlayerInitialized();
            Logger.info('Player initialization status:', isInitialized);

            // Enable start button if wallet is connected
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

    setupEventListeners() {
        const startButton = this.element.querySelector('.start-button');
        const faucetButton = this.element.querySelector('.faucet-button');
        
        // Faucet button listener
        if (faucetButton) {
            faucetButton.addEventListener('click', async () => {
                try {
                    // Get user's wallet address
                    const userAddress = await this.contracts.gameState.signer.getAddress();
                    
                    // Disable button and show loading
                    faucetButton.disabled = true;
                    faucetButton.textContent = 'Sending...';
                    
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
                    } else {
                        this.modal.error(result.error || 'Faucet request failed');
                    }
                    
                } catch (error) {
                    console.error('Faucet error:', error);
                    this.modal.error('Failed to request testnet SONIC');
                } finally {
                    // Reset button
                    faucetButton.disabled = false;
                    faucetButton.textContent = 'Get 10 $SONIC';
                }
            });
        }
        
        // Start button listener
        if (startButton) {
            startButton.addEventListener('click', async () => {
                try {
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
                <div class="start-buttons">
                    <button class="faucet-button btn btn-lg btn-primary">
                        Get 10 $SONIC
                    </button>
                    <button class="start-button btn btn-lg btn-secondary" disabled>
                        Connect Wallet
                    </button>
                </div>
            </div>
        `;
    }
} 