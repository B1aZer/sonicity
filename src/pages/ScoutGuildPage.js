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

            // Load resources and search parameters
            const [gold, searchCost, searchDuration] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.battleSystem.searchCost(),
                this.contracts.battleSystem.searchDuration()
            ]);
            Logger.info('Scout guild data loaded:', { gold, searchCost, searchDuration });

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();
            this.element.querySelector('#search-cost').textContent = searchCost.toString();
            this.element.querySelector('#search-duration').textContent = Math.floor(Number(searchDuration) / 3600); // Convert seconds to hours

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
        const checkResultsButton = searchSection.querySelector('.check-results-btn');
        const searchTimer = searchSection.querySelector('.search-timer');
        const opponentInfo = searchSection.querySelector('.opponent-info');
        const goldAmount = BigInt(this.element.querySelector('#gold-amount').textContent);
        const searchCost = BigInt(this.element.querySelector('#search-cost').textContent);

        // Disable search button if not enough gold
        if (goldAmount < searchCost) {
            searchButton.disabled = true;
            searchButton.title = `Not enough gold. Required: ${searchCost}`;
        } else {
            searchButton.disabled = false;
            searchButton.title = '';
        }

        if (!searchStatus.completed) {
            // Search is in progress
            searchButton.disabled = true;
            searchButton.textContent = 'Scouts Deployed...';
            checkResultsButton.style.display = 'none';
            searchTimer.style.display = 'block';
            const timeRemainingMinutes = Math.floor(Number(searchStatus.timeRemaining) / 60);
            searchTimer.textContent = `Scouts return in: ${timeRemainingMinutes} minutes`;
            opponentInfo.style.display = 'none';
        } else {
            // Search is complete
            searchButton.disabled = goldAmount < searchCost;
            searchButton.textContent = 'Deploy Scouts';
            searchTimer.style.display = 'none';
            
            if (searchStatus.foundOpponent && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
                // Opponent was found
                checkResultsButton.style.display = 'none';
                opponentInfo.style.display = 'block';
                opponentInfo.innerHTML = `
                    <h3>Enemy Stronghold Discovered!</h3>
                    <p>Your scouts have returned with news of an enemy stronghold at location: ${searchStatus.foundOpponent}</p>
                    <p>Prepare your forces for battle!</p>
                `;
            } else if (searchStatus.foundOpponent === '0x0000000000000000000000000000000000000000') {
                // No opponent found
                checkResultsButton.style.display = 'none';
                opponentInfo.style.display = 'block';
                const randomMessage = SCOUT_GUILD_MESSAGES[Math.floor(Math.random() * SCOUT_GUILD_MESSAGES.length)];
                opponentInfo.innerHTML = `
                    <h3>Scout Report</h3>
                    <p>${randomMessage}</p>
                `;
            } else {
                // Search completed but no results checked yet
                checkResultsButton.style.display = 'block';
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
                    <h2>Scout for Enemies</h2>
                    <div class="search-info">
                        <p>Cost: <span id="search-cost">0</span> gold</p>
                        <p>Duration: <span id="search-duration">0</span> hours</p>
                    </div>
                    <div class="search-container">
                        <button class="btn btn-primary search-btn">
                            <i class="fas fa-search"></i>
                            Deploy Scouts
                        </button>
                        <button class="btn btn-secondary check-results-btn" style="display: none;">
                            <i class="fas fa-scroll"></i>
                            Check Scout Reports
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
        const checkResultsButton = this.element.querySelector('.check-results-btn');

        searchButton.addEventListener('click', async () => {
            try {
                const searchDuration = await this.contracts.battleSystem.searchDuration();
                const hours = Math.floor(Number(searchDuration) / 3600);
                await this.contracts.battleSystem.startSearch();
                this.modal.success(`Scouts have been deployed! They will return in ${hours} hours.`);
                await this.loadScoutGuildData();
                
                // Start polling for search status
                this.startSearchPolling();
            } catch (error) {
                console.error('Error starting search:', error);
                this.modal.error('Failed to deploy scouts: ' + error.message);
            }
        });

        checkResultsButton.addEventListener('click', async () => {
            try {
                const opponent = await this.contracts.battleSystem.findRandomOpponent();
                await this.loadScoutGuildData();

                if (opponent === '0x0000000000000000000000000000000000000000') {
                    // Get a random message from the array
                    const randomMessage = SCOUT_GUILD_MESSAGES[Math.floor(Math.random() * SCOUT_GUILD_MESSAGES.length)];
                    this.modal.info(randomMessage);
                } else {
                    this.modal.success('Your scouts have discovered an enemy stronghold!');
                }
            } catch (error) {
                console.error('Error checking scout results:', error);
                this.modal.error('Failed to check scout reports: ' + error.message);
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

                if (searchStatus.completed) {
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