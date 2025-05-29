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
            const [gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount, searchStatus] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.districtBuildings.getBuildingLevel("Command Center"),
                this.contracts.battleSystem.playerTroops(address, 0), // INFANTRY
                this.contracts.battleSystem.playerTroops(address, 1), // CAVALRY
                this.contracts.battleSystem.playerTroops(address, 2),  // SIEGE
                this.contracts.battleSystem.checkSearchStatus()
            ]);

            Logger.info('Command center data loaded:', { gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount, searchStatus });

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();
            this.element.querySelector('#infantry-count').textContent = infantryCount.toString();
            this.element.querySelector('#cavalry-count').textContent = cavalryCount.toString();
            this.element.querySelector('#siege-count').textContent = siegeCount.toString();
            this.element.querySelector('#command-center-level').textContent = commandCenterLevel.toString();

            // Update opponent status section
            this.updateOpponentStatus(searchStatus);

            // Update troop deployment section
            this.updateTroopDeploymentSection(searchStatus, infantryCount, cavalryCount, siegeCount);
        } catch (error) {
            Logger.error('Error loading command center data:', error);
            this.modal.error('Failed to load command center data: ' + error.message);
        }
    }

    updateOpponentStatus(searchStatus) {
        const statusSection = this.element.querySelector('.opponent-status-section');
        const statusText = statusSection.querySelector('.status-text');
        const statusDetails = statusSection.querySelector('.status-details');

        if (searchStatus.completed && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
            statusText.textContent = 'Opponent Found!';
            statusDetails.textContent = `Enemy stronghold at: ${searchStatus.foundOpponent}`;
        } else {
            statusText.textContent = 'No Opponent';
            statusDetails.textContent = 'Visit the Scout Guild to search for opponents';
        }
    }

    updateTroopDeploymentSection(searchStatus, infantryCount, cavalryCount, siegeCount) {
        const deploymentSection = this.element.querySelector('.troop-deployment-section');
        const deployButton = deploymentSection.querySelector('.deploy-troops-btn');
        const infantryInput = deploymentSection.querySelector('#deploy-infantry');
        const cavalryInput = deploymentSection.querySelector('#deploy-cavalry');
        const siegeInput = deploymentSection.querySelector('#deploy-siege');

        // Enable/disable deployment section based on search status
        if (searchStatus.completed && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
            deploymentSection.style.display = 'block';
            deployButton.disabled = false;
        } else {
            deploymentSection.style.display = 'none';
            deployButton.disabled = true;
        }

        // Set max values for inputs and update display
        infantryInput.max = infantryCount;
        cavalryInput.max = cavalryCount;
        siegeInput.max = siegeCount;

        // Update max-troops display spans
        deploymentSection.querySelector('#max-infantry').textContent = infantryCount;
        deploymentSection.querySelector('#max-cavalry').textContent = cavalryCount;
        deploymentSection.querySelector('#max-siege').textContent = siegeCount;
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

                <div class="page-section opponent-status-section">
                    <h2>Opponent Status</h2>
                    <div class="status-display">
                        <div class="status-text">No Active Search</div>
                        <div class="status-details">Visit the Scout Guild to search for opponents</div>
                    </div>
                </div>

                <div class="page-section troop-deployment-section" style="display: none;">
                    <h2>Deploy Troops</h2>
                    <div class="deployment-form">
                        <div class="troop-input-group">
                            <label for="deploy-infantry">Infantry:</label>
                            <input type="number" id="deploy-infantry" min="0" value="0">
                            <span class="max-troops">/ <span id="max-infantry">0</span></span>
                        </div>
                        <div class="troop-input-group">
                            <label for="deploy-cavalry">Cavalry:</label>
                            <input type="number" id="deploy-cavalry" min="0" value="0">
                            <span class="max-troops">/ <span id="max-cavalry">0</span></span>
                        </div>
                        <div class="troop-input-group">
                            <label for="deploy-siege">Siege:</label>
                            <input type="number" id="deploy-siege" min="0" value="0">
                            <span class="max-troops">/ <span id="max-siege">0</span></span>
                        </div>
                        <button class="btn btn-primary deploy-troops-btn" disabled>
                            Deploy Troops
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const deployButton = this.element.querySelector('.deploy-troops-btn');
        const infantryInput = this.element.querySelector('#deploy-infantry');
        const cavalryInput = this.element.querySelector('#deploy-cavalry');
        const siegeInput = this.element.querySelector('#deploy-siege');

        deployButton.addEventListener('click', async () => {
            try {
                const infantryCount = parseInt(infantryInput.value) || 0;
                const cavalryCount = parseInt(cavalryInput.value) || 0;
                const siegeCount = parseInt(siegeInput.value) || 0;

                if (infantryCount === 0 && cavalryCount === 0 && siegeCount === 0) {
                    this.modal.error('Please deploy at least one troop type');
                    return;
                }

                await this.contracts.battleSystem.startBattle(
                    infantryCount,
                    cavalryCount,
                    siegeCount
                );

                this.modal.success('Battle started! Troops have been deployed.');
                await this.loadCommandCenterData();
            } catch (error) {
                Logger.error('Error starting battle:', error);
                this.modal.error('Failed to start battle: ' + error.message);
            }
        });

        // Add input validation
        [infantryInput, cavalryInput, siegeInput].forEach(input => {
            input.addEventListener('input', () => {
                const value = parseInt(input.value) || 0;
                const max = parseInt(input.max) || 0;
                if (value < 0) input.value = 0;
                if (value > max) input.value = max;
            });
        });
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