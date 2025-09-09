import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { SCOUT_GUILD_MESSAGES } from '../js/utils/constants.js';
import { BattleSystemContract } from '../js/contracts/BattleSystemContract.js';
import { WalletManager } from '../js/utils/wallet.js';

import('../styles/scout-guild-page.css');


export class ScoutGuildPage extends BasePage {
    constructor() {
        super();
        Logger.info('ScoutGuildPage constructor called');
        
        this.element.className = 'base-page scout-guild-page';
        
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

        if (!searchStatus.active) {
            // No active search
            searchButton.disabled = goldAmount < searchCost;
            searchButton.textContent = 'Deploy Scouts';
            checkResultsButton.style.display = 'none';
            searchTimer.style.display = 'none';
        } else if (!searchStatus.completed) {
            // Search is in progress
            searchButton.disabled = true;
            searchButton.textContent = 'Scouts Deployed...';
            checkResultsButton.style.display = 'none';
            searchTimer.style.display = 'block';
            const timeRemainingMinutes = Math.floor(Number(searchStatus.timeRemaining) / 60);
            searchTimer.textContent = `Scouts return in: ${timeRemainingMinutes} minutes`;
        } else {
            // Search is complete
            searchButton.disabled = goldAmount < searchCost;
            searchButton.textContent = 'Deploy Scouts';
            searchTimer.style.display = 'none';
            
            // Show check results button only if search is complete, no opponent has been found yet, and hasn't attempted to find one
            if (searchStatus.foundOpponent === '0x0000000000000000000000000000000000000000' && !searchStatus.hasAttemptedFind) {
                checkResultsButton.style.display = 'block';
                checkResultsButton.disabled = false;
                checkResultsButton.title = 'Check scout reports for potential enemies';
            } else {
                checkResultsButton.style.display = 'none';
            }
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container scout-guild-container">
                <h1 class="page-title">Scout Guild</h1>
                <p class="page-description">
                    <strong>Discover and target enemy districts for raids.</strong> 
                    <em>Use your scouts to find vulnerable opponents and plan strategic attacks.</em>
                </p>
                
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
                    </div>
                </div>
            </div>
        `;
    }

    setupSearchHandlers() {
        // Use BasePage event management system to prevent duplicate handlers
        this.addEventListener('.search-btn', 'click', async () => {
            try {
                Logger.info('Starting search...');
                
                const searchDuration = await this.contracts.battleSystem.searchDuration();
                const hours = Math.floor(Number(searchDuration) / 3600);
                
                // Check if user already has an active search
                const searchStatus = await this.contracts.battleSystem.checkSearchStatus();
                if (searchStatus.active && !searchStatus.completed) {
                    this.modal.info('Your scouts are still searching. Please wait for them to return.', { title: 'Search In Progress' });
                    return;
                }
                
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

        this.addEventListener('.check-results-btn', 'click', async () => {
            try {
                Logger.info('Starting to check scout reports...');
                
                // Verify search is complete before proceeding
                const searchStatus = await this.contracts.battleSystem.checkSearchStatus();
                
                if (!searchStatus.completed) {
                    this.modal.error('Your scouts are still searching. Please wait for them to return.', { title: 'Search Not Complete' });
                    return;
                }

                if (searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
                    this.modal.info('You have already found an opponent in this search. Start a new search to find another.', { title: 'Already Found Opponent' });
                    return;
                }
                
                
                Logger.info('Calling findRandomOpponent...');
                const tx = await this.contracts.battleSystem.findRandomOpponent();
                Logger.info('Transaction sent:', tx.hash);
                
                Logger.info('Waiting for transaction to be mined...');
                await tx.wait();
                Logger.info('Transaction mined');
                
                Logger.info('Reloading scout guild data...');
                await this.loadScoutGuildData();
                Logger.info('Scout guild data reloaded');

                // Get the search status to check the result
                const newSearchStatus = await this.contracts.battleSystem.checkSearchStatus();
                Logger.info('Search status after transaction:', newSearchStatus);
                const opponent = newSearchStatus.foundOpponent;
                Logger.info('Found opponent:', opponent);

                if (opponent === '0x0000000000000000000000000000000000000000') {
                    Logger.info('No opponent found, showing random scout message');
                    // Get a random message from the array
                    const randomMessage = SCOUT_GUILD_MESSAGES[Math.floor(Math.random() * SCOUT_GUILD_MESSAGES.length)];
                    this.modal.show(randomMessage, { title: 'Scout Report' });
                } else {
                    Logger.info('Opponent found:', opponent);
                    this.modal.success(`Your scouts have returned with news of an enemy stronghold at location: ${opponent}\n\nPrepare your forces for battle!`, { title: 'Enemy Stronghold Discovered!' });
                }
            } catch (error) {
                Logger.error('Error checking scout results:', error);
                
                // Handle specific error messages
                if (error.message.includes('Already attempted to find opponent')) {
                    this.modal.error('You have already checked the scout reports for this search. Start a new search to find another opponent.', { title: 'Search Already Used' });
                } else {
                    this.modal.error('Failed to check scout reports: ' + error.message);
                }
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
        // Call parent unmount to properly clean up event listeners
        super.unmount();
    }
} 