import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

import('../styles/command-center-page.css');


export class GarrisonPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('GarrisonPage constructor called');
        
        this.element.className = 'base-page garrison-page';
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('GarrisonPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadGarrisonData();
            this.setupEventListeners();
            Logger.info('Garrison page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing garrison page:', error);
            this.modal.error('Failed to initialize garrison page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadGarrisonData().catch(error => {
                Logger.error('Error loading garrison data after wallet update:', error);
            });
        }
    }

    async loadGarrisonData() {
        try {
            const signer = await this.contracts.gameState.getSigner();
            const address = await signer.getAddress();

            // Load troop counts and battle data
            const [infantryCount, cavalryCount, siegeCount, activeBattle, battleDuration] = await Promise.all([
                this.contracts.battleSystem.playerTroops(address, 0), // INFANTRY
                this.contracts.battleSystem.playerTroops(address, 1), // CAVALRY
                this.contracts.battleSystem.playerTroops(address, 2),  // SIEGE
                this.contracts.battleSystem.activeBattles(address),
                this.contracts.battleSystem.battleDuration()
            ]);

            Logger.info('Garrison data loaded:', { infantryCount, cavalryCount, siegeCount, activeBattle, battleDuration });

            // Update troop displays
            this.element.querySelector('#infantry-count').textContent = infantryCount.toString();
            this.element.querySelector('#cavalry-count').textContent = cavalryCount.toString();
            this.element.querySelector('#siege-count').textContent = siegeCount.toString();

            // Update deployed troops display
            this.updateDeployedTroopsDisplay(activeBattle);

            // Update battle status section
            this.updateBattleStatus(activeBattle);

            // Update troop deployment section
            await this.updateTroopDeploymentSection(infantryCount, cavalryCount, siegeCount, activeBattle);

            // Load and update hero selection dropdown
            await this.updateHeroSelectionDropdown(address);

            // Start battle timer if there's an active battle
            if (activeBattle.startTime > 0n) {
                await this.startBattleTimer(Number(activeBattle.startTime), Number(battleDuration));
            }

            // Load battle history
            await this.loadBattleHistory();
        } catch (error) {
            Logger.error('Error loading garrison data:', error);
            this.modal.error('Failed to load garrison data: ' + error.message);
        }
    }

    updateDeployedTroopsDisplay(activeBattle) {
        const deployedInfantry = this.element.querySelector('#deployed-infantry');
        const deployedCavalry = this.element.querySelector('#deployed-cavalry');
        const deployedSiege = this.element.querySelector('#deployed-siege');
        const deployedHero = this.element.querySelector('#deployed-hero');

        if (activeBattle.startTime > 0n) {
            // Show deployed troops from battle data
            deployedInfantry.textContent = Number(activeBattle[11][0] || 0).toString();
            deployedCavalry.textContent = Number(activeBattle[11][1] || 0).toString();
            deployedSiege.textContent = Number(activeBattle[11][2] || 0).toString();
            
            // Show deployed hero
            const defenderHeroId = Number(activeBattle[9] || 0); // defenderHeroId
            if (defenderHeroId > 0) {
                // We need to get hero class from hero ID - for now show the ID
                deployedHero.textContent = `Hero ID: ${defenderHeroId}`;
            } else {
                deployedHero.textContent = 'None';
            }
        } else {
            // No active battle, no deployed troops
            deployedInfantry.textContent = '0';
            deployedCavalry.textContent = '0';
            deployedSiege.textContent = '0';
            deployedHero.textContent = 'None';
        }
    }

    updateBattleStatus(activeBattle) {
        const statusSection = this.element.querySelector('.battle-status-section');
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
        } else {
            statusText.textContent = 'No Active Battle';
            statusDetails.textContent = 'Deploy troops to garrison when under attack';
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

    async updateTroopDeploymentSection(infantryCount, cavalryCount, siegeCount, activeBattle) {
        const deploymentSection = this.element.querySelector('.troop-deployment-section');
        const deployButton = deploymentSection.querySelector('.deploy-troops-btn');
        const infantryInput = deploymentSection.querySelector('#deploy-infantry');
        const cavalryInput = deploymentSection.querySelector('#deploy-cavalry');
        const siegeInput = deploymentSection.querySelector('#deploy-siege');

        // Enable/disable deployment section based on active battle and defender status
        const playerAddress = await this.contracts.gameState.getAddress();
        if (activeBattle.startTime > 0n && activeBattle[1] === playerAddress) {
            // Player is defender in active battle
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
            <div class="page-container garrison-container">
                <h1 class="page-title">Garrison</h1>
                
                <div class="page-section deployed-troops-section">
                    <h2>Deployed Troops</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Infantry Deployed:</span>
                            <span id="deployed-infantry" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Cavalry Deployed:</span>
                            <span id="deployed-cavalry" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Siege Deployed:</span>
                            <span id="deployed-siege" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Hero Deployed:</span>
                            <span id="deployed-hero" class="status-value">None</span>
                        </div>
                    </div>
                </div>

                <div class="page-section troops-section">
                    <h2>Available Troops</h2>
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

                <div class="page-section battle-status-section">
                    <h2>Battle Status</h2>
                    <div class="status-display">
                        <div class="status-text">No Active Battle</div>
                        <div class="status-details">Deploy troops to garrison when under attack</div>
                        <div class="battle-timer" style="display: none;"></div>
                        <button class="btn btn-primary resolve-battle-btn" style="display: none;">
                            Resolve Battle
                        </button>
                    </div>
                </div>

                <div class="page-section troop-deployment-section" style="display: none;">
                    <h2>Deploy to Garrison</h2>
                    <div class="deployment-form">
                        <div class="hero-selection-group">
                            <label for="deploy-hero">Deploy Hero (Optional):</label>
                            <select id="deploy-hero" class="input input-md">
                                <option value="">No Hero</option>
                                <option value="0">WARRIOR - Infantry Bonus</option>
                                <option value="1">STRATEGIST - Cavalry Bonus</option>
                                <option value="2">SCOUT - Siege Bonus</option>
                            </select>
                        </div>
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
                            Deploy to Garrison
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

    async updateHeroSelectionDropdown(playerAddress) {
        try {
            const heroSelect = this.element.querySelector('#deploy-hero');
            if (!heroSelect) return;

            // Clear existing options except "No Hero"
            heroSelect.innerHTML = '<option value="">No Hero</option>';

            // Check which heroes the player owns
            const heroClasses = [
                { value: 0, name: 'WARRIOR', description: 'Infantry Bonus' },
                { value: 1, name: 'STRATEGIST', description: 'Cavalry Bonus' },
                { value: 2, name: 'SCOUT', description: 'Siege Bonus' }
            ];

            for (const heroClass of heroClasses) {
                const hasHero = await this.contracts.heroNFT.hasHero(playerAddress, heroClass.value);
                if (hasHero) {
                    const option = document.createElement('option');
                    option.value = heroClass.value;
                    option.textContent = `${heroClass.name} - ${heroClass.description}`;
                    heroSelect.appendChild(option);
                }
            }

            Logger.info('Hero selection dropdown updated');
        } catch (error) {
            Logger.error('Error updating hero selection dropdown:', error);
        }
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
        const heroSelect = this.element.querySelector('#deploy-hero');

        deployButton.addEventListener('click', async () => {
            try {
                const infantryCount = parseInt(infantryInput.value) || 0;
                const cavalryCount = parseInt(cavalryInput.value) || 0;
                const siegeCount = parseInt(siegeInput.value) || 0;
                const heroClass = heroSelect.value !== '' ? parseInt(heroSelect.value) : 255;

                if (infantryCount === 0 && cavalryCount === 0 && siegeCount === 0) {
                    this.modal.error('Please select at least one troop type to deploy to garrison');
                    return;
                }

                // Deploy troops and hero in a single transaction
                await this.contracts.battleSystem.deployToGarrison(
                    infantryCount,
                    cavalryCount,
                    siegeCount,
                    heroClass
                );

                const heroText = heroClass !== 255 ? ` and hero deployed` : '';
                this.modal.success(`Troops deployed to garrison${heroText}! Your defenses are strengthened.`);
                await this.loadGarrisonData();
            } catch (error) {
                Logger.error('Error deploying to garrison:', error);
                this.modal.error('Failed to deploy to garrison: ' + error.message);
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
                
                await this.loadGarrisonData();
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
        Logger.info('Mounting garrison page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during garrison page initialization:', error);
            this.modal.error('Failed to initialize garrison page. Please try refreshing the page.');
        });
    }

    unmount() {
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
        }
        this.element.remove();
    }
} 