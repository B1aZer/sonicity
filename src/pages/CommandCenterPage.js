import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import '../styles/command-center-page.css';
import '../styles/building.css';
import '../styles/buttons.css';

export class CommandCenterPage extends BasePage {
    constructor() {
        super();
        Logger.info('CommandCenterPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page command-center-page';
        this.modal = new Modal();
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('CommandCenterPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadCommandCenterData();
            this.setupEventListeners();
            Logger.info('Command center page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing command center page:', error);
            this.modal.error('Failed to initialize command center page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadCommandCenterData().catch(error => {
                Logger.error('Error loading command center data after wallet update:', error);
            });
        }
    }

    async loadCommandCenterData() {
        try {
            const signer = await this.contracts.gameState.getSigner();
            const address = await signer.getAddress();

            // Load resources, command center level, and troop counts
            const [gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.districtBuildings.getBuildingLevel("Command Center"),
                this.contracts.battleSystem.playerTroops(address, 0), // INFANTRY
                this.contracts.battleSystem.playerTroops(address, 1), // CAVALRY
                this.contracts.battleSystem.playerTroops(address, 2)  // SIEGE
            ]);

            Logger.info('Command center data loaded:', { gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount });

            // Check if command center is built
            const isCommandCenterBuilt = await this.contracts.districtBuildings.isDistrictBuildingBuilt("Command Center");
            Logger.info('Command center built status:', isCommandCenterBuilt);

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();
            this.element.querySelector('#infantry-count').textContent = infantryCount.toString();
            this.element.querySelector('#cavalry-count').textContent = cavalryCount.toString();
            this.element.querySelector('#siege-count').textContent = siegeCount.toString();

            // Update command center level display
            this.element.querySelector('#command-center-level').textContent = commandCenterLevel.toString();

            // Update feature card states based on command center level
            const featureCards = this.element.querySelectorAll('.feature-card');
            featureCards.forEach((card, index) => {
                const isLocked = Number(commandCenterLevel) <= index;
                Logger.info(`Feature card ${index} locked status:`, { isLocked, commandCenterLevel });
                if (isLocked) {
                    card.classList.add('locked');
                    const lockOverlay = document.createElement('div');
                    lockOverlay.className = 'lock-overlay';
                    lockOverlay.innerHTML = `
                        <i class="fas fa-lock lock-icon"></i>
                        <div class="unlock-info">
                            <p class="unlock-requirement">Requires Command Center Level ${index + 1}</p>
                        </div>
                    `;
                    card.appendChild(lockOverlay);
                } else {
                    card.classList.remove('locked');
                    const existingOverlay = card.querySelector('.lock-overlay');
                    if (existingOverlay) {
                        existingOverlay.remove();
                    }
                }
            });
        } catch (error) {
            Logger.error('Error loading command center data:', error);
            this.modal.error('Failed to load command center data: ' + error.message);
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container command-center-container">
                <h1 class="page-title">Command Center</h1>
                
                <div class="page-section status-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span id="gold-amount" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Command Center Level:</span>
                            <span id="command-center-level" class="status-value">0</span>
                        </div>
                    </div>
                </div>

                <div class="page-section troops-section">
                    <h2>Current Troops</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Infantry:</span>
                            <span id="infantry-count" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Cavalry:</span>
                            <span id="cavalry-count" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Siege:</span>
                            <span id="siege-count" class="status-value">0</span>
                        </div>
                    </div>
                </div>

                <div class="page-section features-section">
                    <h2>Available Features</h2>
                    <div class="buildings-grid">
                        <div class="feature-card">
                            <div class="feature-image">
                                <i class="fas fa-map-marked-alt feature-icon"></i>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title-row">
                                    <h3>Enhanced Map View</h3>
                                </div>
                                <div class="feature-desc">
                                    Unlock advanced map features including resource locations, enemy positions, and strategic points.
                                </div>
                            </div>
                        </div>

                        <div class="feature-card">
                            <div class="feature-image">
                                <i class="fas fa-chess feature-icon"></i>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title-row">
                                    <h3>Battle Tactics</h3>
                                </div>
                                <div class="feature-desc">
                                    Access advanced battle tactics and formations for your troops.
                                </div>
                            </div>
                        </div>

                        <div class="feature-card">
                            <div class="feature-image">
                                <i class="fas fa-shield-alt feature-icon"></i>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title-row">
                                    <h3>Defense Systems</h3>
                                </div>
                                <div class="feature-desc">
                                    Unlock advanced defense systems and fortifications for your city.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add any event listeners for command center features here
    }

    mount(container) {
        Logger.info('Mounting command center page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during command center page initialization:', error);
            this.modal.error('Failed to initialize command center page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 