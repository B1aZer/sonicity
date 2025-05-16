import '../styles/start-page.css';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { appState } from '../js/core/state.js';
import { BasePage } from './BasePage.js';

export class StartPage extends BasePage {
    constructor() {
        super();
        Logger.info('StartPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'start-page';
        this.modal = new Modal();
        this.render();
        this.setupEventListeners();
    }

    async onInitialized(walletResult) {
        Logger.info('StartPage onInitialized called with wallet:', walletResult.address);
        try {
            // Enable start button if wallet is connected
            const startButton = this.element.querySelector('.start-button');
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = 'Start Game';
            }
        } catch (error) {
            Logger.error('Error initializing start page:', error);
            this.modal.error('Failed to initialize start page. Please try refreshing the page.');
        }
    }

    async onWalletConnected(walletResult) {
        // Enable start button when wallet is connected
        const startButton = this.element.querySelector('.start-button');
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = 'Start Game';
        }
    }

    setupEventListeners() {
        const startButton = this.element.querySelector('.start-button');
        if (startButton) {
            startButton.addEventListener('click', async () => {
                try {
                    // Disable button and show loading state
                    startButton.disabled = true;
                    startButton.classList.add('loading');
                    startButton.textContent = '';

                    // Check if player is already initialized
                    const isInitialized = await this.contracts.gameState.isPlayerInitialized();
                    if (!isInitialized) {
                        // Initialize contract with user's wallet
                        await this.contracts.gameState.initialize();
                        
                        // Initialize player
                        await this.contracts.gameState.initializePlayer();
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
                <button class="start-button" disabled>
                    Connect Wallet
                </button>
            </div>
        `;
    }

    mount(container) {
        Logger.info('Mounting start page...');
        container.appendChild(this.element);
        // Initialize using base class method
        this.initialize().catch(error => {
            Logger.error('Error during start page initialization:', error);
            this.modal.error('Failed to initialize start page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 