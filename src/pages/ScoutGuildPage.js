import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { SCOUT_GUILD_MESSAGES } from '../js/utils/constants.js';
import '../styles/scout-guild-page.css';
import '../styles/building.css';
import '../styles/buttons.css';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';

export class ScoutGuildPage extends BasePage {
    constructor() {
        super();
        Logger.info('ScoutGuildPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page scout-guild-page';
        this.modal = new Modal();
        this.searchTimer = null;
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('ScoutGuildPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadScoutGuildData();
            this.setupSearchHandlers();
            Logger.info('Scout guild page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing scout guild page:', error);
            this.modal.error('Failed to initialize scout guild page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadScoutGuildData().catch(error => {
                Logger.error('Error loading scout guild data after wallet update:', error);
            });
        }
    }

    async loadScoutGuildData() {
        try {
            const signer = await this.contracts.battleSystem.getSigner();
            const address = await signer.getAddress();

            // Load resources
            const gold = await this.contracts.gameState.getPlayerGold();
            Logger.info('Scout guild data loaded:', { gold });

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();

            // Check search status
            const searchStatus = await this.contracts.battleSystem.checkSearchStatus();
            Logger.info('Search status:', searchStatus);

            // Update search UI based on status
            this.updateSearchUI(searchStatus);
        } catch (error) {
            console.error('Error loading scout guild data:', error);
            this.modal.error('Failed to load scout guild data: ' + error.message);
        }
    }

    updateSearchUI(searchStatus) {
        const searchSection = this.element.querySelector('.search-section');
        const searchButton = searchSection.querySelector('.search-btn');
        const searchTimer = searchSection.querySelector('.search-timer');
        const opponentInfo = searchSection.querySelector('.opponent-info');

        if (searchStatus.active) {
            searchButton.disabled = true;
            searchButton.textContent = 'Searching...';
            searchTimer.style.display = 'block';
            searchTimer.textContent = `Time remaining: ${Math.floor(searchStatus.timeRemaining / 60)} minutes`;
            opponentInfo.style.display = 'none';
        } else {
            searchButton.disabled = false;
            searchButton.textContent = 'Start Search';
            searchTimer.style.display = 'none';
            
            // Show appropriate message based on search status
            if (searchStatus.completed) {
                opponentInfo.style.display = 'block';
                if (searchStatus.foundOpponent && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
                    opponentInfo.innerHTML = `
                        <h3>Opponent Found!</h3>
                        <p>Address: ${searchStatus.foundOpponent}</p>
                    `;
                } else {
                    // Get a random message from the array
                    const randomMessage = SCOUT_GUILD_MESSAGES[Math.floor(Math.random() * SCOUT_GUILD_MESSAGES.length)];
                    opponentInfo.innerHTML = `
                        <h3>Search Complete</h3>
                        <p class="narrative-message">${randomMessage}</p>
                    `;
                }
            } else {
                opponentInfo.style.display = 'none';
            }
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container scout-guild-container">
                <h1 class="page-title">Scout Guild</h1>
                
                <div class="page-section status-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span id="gold-amount" class="status-value">0</span>
                        </div>
                    </div>
                </div>

                <div class="page-section search-section">
                    <h2>Search for Opponents</h2>
                    <div class="search-container">
                        <button class="btn btn-primary search-btn">
                            <i class="fas fa-search"></i>
                            Start Search
                        </button>
                        <div class="search-timer" style="display: none;"></div>
                        <div class="opponent-info" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
    }

    setupSearchHandlers() {
        const searchButton = this.element.querySelector('.search-btn');
        searchButton.addEventListener('click', async () => {
            try {
                await this.contracts.battleSystem.startSearch();
                this.modal.success('Search started! Finding opponents...');
                await this.loadScoutGuildData();
                
                // Start polling for search status
                this.startSearchPolling();
            } catch (error) {
                console.error('Error starting search:', error);
                this.modal.error('Failed to start search: ' + error.message);
            }
        });
    }

    startSearchPolling() {
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
        }

        this.searchTimer = setInterval(async () => {
            try {
                const searchStatus = await this.contracts.battleSystem.checkSearchStatus();
                this.updateSearchUI(searchStatus);

                if (!searchStatus.active) {
                    clearInterval(this.searchTimer);
                    this.searchTimer = null;
                }
            } catch (error) {
                console.error('Error polling search status:', error);
                clearInterval(this.searchTimer);
                this.searchTimer = null;
            }
        }, 1000);
    }

    mount(container) {
        Logger.info('Mounting scout guild page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during scout guild page initialization:', error);
            this.modal.error('Failed to initialize scout guild page. Please try refreshing the page.');
        });
    }

    unmount() {
        if (this.searchTimer) {
            clearInterval(this.searchTimer);
            this.searchTimer = null;
        }
        this.element.remove();
    }
} 