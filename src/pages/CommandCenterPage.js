import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';


export class CommandCenterPage extends BasePage {
    constructor() {
        super();
        import('../styles/command-center-page.css');
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
            const [gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount, searchStatus, activeBattle, battleDuration] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.districtBuildings.getBuildingLevel("Command Center"),
                this.contracts.battleSystem.playerTroops(address, 0), // INFANTRY
                this.contracts.battleSystem.playerTroops(address, 1), // CAVALRY
                this.contracts.battleSystem.playerTroops(address, 2),  // SIEGE
                this.contracts.battleSystem.checkSearchStatus(),
                this.contracts.battleSystem.activeBattles(address),
                this.contracts.battleSystem.battleDuration()
            ]);

            Logger.info('Command center data loaded:', { gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount, searchStatus, activeBattle, battleDuration });

            // Update resource displays
            this.element.querySelector('#gold-amount').textContent = gold.toString();
            this.element.querySelector('#infantry-count').textContent = infantryCount.toString();
            this.element.querySelector('#cavalry-count').textContent = cavalryCount.toString();
            this.element.querySelector('#siege-count').textContent = siegeCount.toString();
            this.element.querySelector('#command-center-level').textContent = commandCenterLevel.toString();

            // Update opponent status section
            this.updateOpponentStatus(searchStatus, activeBattle);

            // Update troop deployment section
            this.updateTroopDeploymentSection(searchStatus, infantryCount, cavalryCount, siegeCount, activeBattle);

            // Start battle timer if there's an active battle
            if (activeBattle.startTime > 0n) {
                await this.startBattleTimer(Number(activeBattle.startTime), Number(battleDuration));
            }

            // Load battle history
            await this.loadBattleHistory();
        } catch (error) {
            Logger.error('Error loading command center data:', error);
            this.modal.error('Failed to load command center data: ' + error.message);
        }
    }

    updateOpponentStatus(searchStatus, activeBattle) {
        const statusSection = this.element.querySelector('.opponent-status-section');
        const statusText = statusSection.querySelector('.status-text');
        const statusDetails = statusSection.querySelector('.status-details');
        const battleTimer = statusSection.querySelector('.battle-timer');
        const resolveBattleBtn = statusSection.querySelector('.resolve-battle-btn');

        if (activeBattle.startTime > 0n) {
            statusText.textContent = 'Battle in Progress!';
            const battleTime = new Date(Number(activeBattle.startTime) * 1000);
            statusDetails.textContent = `Battle started at: ${battleTime.toLocaleString()}`;
            battleTimer.style.display = 'block';
            resolveBattleBtn.style.display = 'none';
        } else if (searchStatus.completed && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
            statusText.textContent = 'Opponent Found!';
            statusDetails.textContent = `Enemy stronghold at: ${searchStatus.foundOpponent}`;
            battleTimer.style.display = 'none';
            resolveBattleBtn.style.display = 'none';
        } else {
            statusText.textContent = 'No Opponent';
            statusDetails.textContent = 'Visit the Scout Guild to search for opponents';
            battleTimer.style.display = 'none';
            resolveBattleBtn.style.display = 'none';
        }
    }

    async startBattleTimer(battleStartTime, battleDuration) {
        const battleTimer = this.element.querySelector('.battle-timer');
        const resolveBattleBtn = this.element.querySelector('.resolve-battle-btn');
        
        const updateTimer = async () => {
            try {
                // Get current block timestamp
                const block = await this.contracts.battleSystem.provider.getBlock("latest");
                const now = block.timestamp;
                
                // Calculate time remaining
                const startTime = Number(battleStartTime);
                const duration = Number(battleDuration);
                const timeLeft = (startTime + duration) - now;

                if (timeLeft <= 0) {
                    battleTimer.textContent = 'Battle can be resolved!';
                    battleTimer.style.display = 'none';
                    resolveBattleBtn.style.display = 'inline-flex';
                    return;
                }

                const hours = Math.floor(timeLeft / 3600);
                const minutes = Math.floor((timeLeft % 3600) / 60);
                const seconds = timeLeft % 60;
                battleTimer.textContent = `Time until battle resolution: ${hours}h ${minutes}m`;
            } catch (error) {
                Logger.error('Error updating battle timer:', error);
            }
        };

        // Update immediately and then every second
        await updateTimer();
        this.battleTimerInterval = setInterval(updateTimer, 5000);
    }

    updateTroopDeploymentSection(searchStatus, infantryCount, cavalryCount, siegeCount, activeBattle) {
        const deploymentSection = this.element.querySelector('.troop-deployment-section');
        const deployButton = deploymentSection.querySelector('.deploy-troops-btn');
        const infantryInput = deploymentSection.querySelector('#deploy-infantry');
        const cavalryInput = deploymentSection.querySelector('#deploy-cavalry');
        const siegeInput = deploymentSection.querySelector('#deploy-siege');

        // Enable/disable deployment section based on search status and active battle
        if (activeBattle.startTime > 0n) {
            deploymentSection.style.display = 'none';
            deployButton.disabled = true;
        } else if (searchStatus.completed && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
            deploymentSection.style.display = 'block';
            deployButton.disabled = false;
        } else {
            deploymentSection.style.display = 'none';
            deployButton.disabled = true;
        }

        // Set max values for inputs and update display
        infantryInput.max = Number(infantryCount);
        cavalryInput.max = Number(cavalryCount);
        siegeInput.max = Number(siegeCount);

        // Update max-troops display spans
        deploymentSection.querySelector('#max-infantry').textContent = infantryCount.toString();
        deploymentSection.querySelector('#max-cavalry').textContent = cavalryCount.toString();
        deploymentSection.querySelector('#max-siege').textContent = siegeCount.toString();
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
                    <h2>Battle Status</h2>
                    <div class="status-display">
                        <div class="status-text">No Active Search</div>
                        <div class="status-details">Visit the Scout Guild to search for opponents</div>
                        <div class="battle-timer" style="display: none;"></div>
                        <button class="btn btn-primary resolve-battle-btn" style="display: none;">
                            Resolve Battle
                        </button>
                    </div>
                </div>

                <div class="page-section troop-deployment-section" style="display: none;">
                    <h2>Deploy Troops</h2>
                    <div class="deployment-form">
                        <div class="troop-input-group">
                            <label for="deploy-infantry">Infantry:</label>
                            <input type="number" id="deploy-infantry" min="0" value="0" class="input input-sm">
                            <span class="max-troops">/ <span id="max-infantry">0</span></span>
                        </div>
                        <div class="troop-input-group">
                            <label for="deploy-cavalry">Cavalry:</label>
                            <input type="number" id="deploy-cavalry" min="0" value="0" class="input input-sm">
                            <span class="max-troops">/ <span id="max-cavalry">0</span></span>
                        </div>
                        <div class="troop-input-group">
                            <label for="deploy-siege">Siege:</label>
                            <input type="number" id="deploy-siege" min="0" value="0" class="input input-sm">
                            <span class="max-troops">/ <span id="max-siege">0</span></span>
                        </div>
                        <button class="btn btn-primary deploy-troops-btn" disabled>
                            Deploy Troops
                        </button>
                    </div>
                </div>

                <div class="page-section battle-history-section">
                    <h2>Battle History</h2>
                    <div class="battle-history-list">
                        <!-- Battle history items will be added here -->
                    </div>
                </div>
            </div>
        `;
    }

    async loadBattleHistory() {
        try {
            const address = await this.contracts.battleSystem.getAddress();
            const battleHistory = await this.contracts.battleSystem.getPlayerBattleHistory(address);
            
            const historyList = this.element.querySelector('.battle-history-list');
            historyList.innerHTML = '';

            if (battleHistory.length === 0) {
                historyList.innerHTML = '<div class="no-history">No battles fought yet</div>';
                return;
            }

            // Sort battles by timestamp in descending order (newest first)
            battleHistory.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

            battleHistory.forEach(battle => {
                const battleDate = new Date(Number(battle.timestamp) * 1000);
                const isAttacker = battle.attacker.toLowerCase() === address.toLowerCase();
                const won = isAttacker ? battle.attackerWon : !battle.attackerWon;
                
                const battleItem = document.createElement('div');
                battleItem.className = `battle-history-item ${won ? 'victory' : 'defeat'}`;
                battleItem.innerHTML = `
                    <div class="battle-date">${battleDate.toLocaleString()}</div>
                    <div class="battle-result">
                        ${won ? 'Victory' : 'Defeat'} against ${isAttacker ? battle.defender : battle.attacker}
                    </div>
                    <div class="battle-details">
                        <div>Power: ${battle.attackerPower} vs ${battle.defenderPower}</div>
                        ${battle.treasuryBurned > 0 ? `<div>Gold Stolen: ${battle.treasuryBurned}</div>` : ''}
                        ${battle.repPoints > 0 ? `<div>REP Earned: ${battle.repPoints}</div>` : ''}
                        ${battle.gridBuildingsDamaged > 0 ? `<div>Grid Buildings Damaged: ${battle.gridBuildingsDamaged}</div>` : ''}
                        ${battle.districtBuildingsDamaged > 0 ? `<div>District Buildings Damaged: ${battle.districtBuildingsDamaged}</div>` : ''}
                    </div>
                `;
                historyList.appendChild(battleItem);
            });
        } catch (error) {
            Logger.error('Error loading battle history:', error);
        }
    }

    setupEventListeners() {
        const deployButton = this.element.querySelector('.deploy-troops-btn');
        const resolveBattleBtn = this.element.querySelector('.resolve-battle-btn');
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

        resolveBattleBtn.addEventListener('click', async () => {
            try {
                const signer = await this.contracts.gameState.getSigner();
                const address = await signer.getAddress();
                
                await this.contracts.battleSystem.resolveBattle(address);
                
                // Clear the battle timer interval
                if (this.battleTimerInterval) {
                    clearInterval(this.battleTimerInterval);
                    this.battleTimerInterval = null;
                }
                
                // Get the battle result
                const battleHistory = await this.contracts.battleSystem.getPlayerBattleHistory(address);
                const lastBattle = battleHistory[battleHistory.length - 1];
                const isAttacker = lastBattle.attacker.toLowerCase() === address.toLowerCase();
                const won = isAttacker ? lastBattle.attackerWon : !lastBattle.attackerWon;
                
                // Show appropriate message
                if (won) {
                    this.modal.success(`Victory! You won the battle against ${isAttacker ? lastBattle.defender : lastBattle.attacker}!\n\nGold Stolen: ${lastBattle.treasuryBurned}\nREP Earned: ${lastBattle.repPoints}`);
                } else {
                    this.modal.info(`Defeat! You lost the battle against ${isAttacker ? lastBattle.defender : lastBattle.attacker}.`);
                }
                
                await this.loadCommandCenterData();
            } catch (error) {
                Logger.error('Error resolving battle:', error);
                this.modal.error('Failed to resolve battle: ' + error.message);
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
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
        }
        this.element.remove();
    }
} 