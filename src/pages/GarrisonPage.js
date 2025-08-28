import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { WalletManager } from '../js/utils/wallet.js';
import { TacticsNFTContract } from '../js/contracts/TacticsNFTContract.js';
import { BattleProgressBar } from '../components/BattleProgressBar.js';

import('../styles/command-center-page.css');
import('../styles/battle-progress-bar.css');


export class GarrisonPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('GarrisonPage constructor called');
        
        this.element.className = 'base-page garrison-page';
        
        // Initialize Battle Progress Bar
        this.battleProgressBar = new BattleProgressBar();
        
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
            const address = WalletManager.getCurrentWallet();

            // Load troop counts and battle data
            const [infantryCount, cavalryCount, siegeCount, activeBattle, battleDuration] = await Promise.all([
                this.contracts.battleSystem.playerTroops(address, 0), // INFANTRY
                this.contracts.battleSystem.playerTroops(address, 1), // CAVALRY
                this.contracts.battleSystem.playerTroops(address, 2),  // SIEGE
                this.contracts.battleSystem.activeBattles(address),
                this.contracts.battleSystem.battleDuration()
            ]);

            // Load owned tactics for battle deployment
            const ownedTactics = {};
            for (let tacticId = 1; tacticId <= 9; tacticId++) {
                ownedTactics[tacticId] = await this.contracts.tacticsNFT.hasTactic(address, tacticId);
            }
            Logger.info('Owned tactics loaded:', ownedTactics);

            Logger.info('Garrison data loaded:', { infantryCount, cavalryCount, siegeCount, activeBattle, battleDuration });

            // Update troop displays
            this.element.querySelector('#infantry-count').textContent = infantryCount.toString();
            this.element.querySelector('#cavalry-count').textContent = cavalryCount.toString();
            this.element.querySelector('#siege-count').textContent = siegeCount.toString();

            // Update deployed troops display
            await this.updateDeployedTroopsDisplay(activeBattle);

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

                    // Render Battle Progress Bar
        await this.renderBattleProgressBar(activeBattle, address);

            // Load and update tactics deployment section if in battle
            if (activeBattle.startTime > 0n) {
                Logger.info('Active battle detected, loading tactics deployment section');
                await this.loadTacticsDeploymentSection(ownedTactics, activeBattle);
            } else {
                Logger.info('No active battle, tactics deployment section will be hidden');
            }
        } catch (error) {
            Logger.error('Error loading garrison data:', error);
            this.modal.error('Failed to load garrison data: ' + error.message);
        }
    }

    async updateDeployedTroopsDisplay(activeBattle) {
        Logger.info('Garrison: Updating deployed troops display...');
        Logger.info('Garrison: Active battle data:', {
            startTime: activeBattle.startTime?.toString(),
            attacker: activeBattle.attacker,
            defender: activeBattle.defender,
            attackerTroops: {
                infantry: activeBattle.attackerTroops?.infantry?.toString(),
                cavalry: activeBattle.attackerTroops?.cavalry?.toString(),
                siege: activeBattle.attackerTroops?.siege?.toString()
            },
            defenderTroops: {
                infantry: activeBattle.defenderTroops?.infantry?.toString(),
                cavalry: activeBattle.defenderTroops?.cavalry?.toString(),
                siege: activeBattle.defenderTroops?.siege?.toString()
            }
        });
        
        const deployedInfantry = this.element.querySelector('#deployed-infantry');
        const deployedCavalry = this.element.querySelector('#deployed-cavalry');
        const deployedSiege = this.element.querySelector('#deployed-siege');
        const deployedHero = this.element.querySelector('#deployed-hero');
        const deployedSection = this.element.querySelector('.deployed-troops-section');
        const tacticsSection = this.element.querySelector('.tactics-deployment-section');

        if (activeBattle.startTime > 0n) {
            Logger.info('Garrison: Active battle detected');
            
            // Check if player is attacker or defender
            const address = WalletManager.getCurrentWallet();
            const isAttacker = activeBattle.attacker.toLowerCase() === address.toLowerCase();
            Logger.info('Garrison: Player role check:', { address, attacker: activeBattle.attacker, isAttacker });
            
            // Show deployed troops from battle data
            if (isAttacker) {
                // Player is attacker, show attacker troops
                const infantry = Number(activeBattle.attackerTroops?.infantry || 0);
                const cavalry = Number(activeBattle.attackerTroops?.cavalry || 0);
                const siege = Number(activeBattle.attackerTroops?.siege || 0);
                
                Logger.info('Garrison: Setting attacker troops:', { infantry, cavalry, siege });
                deployedInfantry.textContent = infantry.toString();
                deployedCavalry.textContent = cavalry.toString();
                deployedSiege.textContent = siege.toString();
            } else {
                // Player is defender, show defender troops
                const infantry = Number(activeBattle.defenderTroops?.infantry || 0);
                const cavalry = Number(activeBattle.defenderTroops?.cavalry || 0);
                const siege = Number(activeBattle.defenderTroops?.siege || 0);
                
                Logger.info('Garrison: Setting defender troops:', { infantry, cavalry, siege });
                deployedInfantry.textContent = infantry.toString();
                deployedCavalry.textContent = cavalry.toString();
                deployedSiege.textContent = siege.toString();
            }
            
            // Show deployed hero
            try {
                const heroTactics = await this.contracts.battleSystem.battleHeroTactics(address);
                Logger.info('Garrison: Hero tactics data:', heroTactics);
                const heroId = isAttacker ? heroTactics.attackerHeroId : heroTactics.defenderHeroId;
                Logger.info('Garrison: Hero ID for player:', { heroId: heroId.toString(), isAttacker });
                
                if (heroId > 0) {
                    // Get hero name from hero ID using contract helper
                    const heroName = await this.contracts.heroNFT.getHeroNameByHeroId(heroId);
                    deployedHero.textContent = heroName;
                } else {
                    deployedHero.textContent = 'None';
                }
            } catch (error) {
                Logger.error('Garrison: Error getting hero tactics:', error);
                deployedHero.textContent = 'Error';
            }
            
            deployedSection.style.display = 'block';
            tacticsSection.style.display = 'block';
            Logger.info('Garrison: Deployed troops and tactics sections are now visible');
        } else {
            Logger.info('Garrison: No active battle, hiding deployed troops and tactics sections');
            // No active battle, no deployed troops
            deployedInfantry.textContent = '0';
            deployedCavalry.textContent = '0';
            deployedSiege.textContent = '0';
            deployedHero.textContent = 'None';
            deployedSection.style.display = 'none';
            tacticsSection.style.display = 'none';
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
        if (activeBattle.startTime > 0n && activeBattle.defender.toLowerCase() === playerAddress.toLowerCase()) {
            // Player is defender in active battle
            deploymentSection.style.display = 'block';
            
            // Check if troops are already deployed
            const deployedInfantry = Number(activeBattle.defenderTroops.infantry || 0);
            const deployedCavalry = Number(activeBattle.defenderTroops.cavalry || 0);
            const deployedSiege = Number(activeBattle.defenderTroops.siege || 0);
            
            if (deployedInfantry > 0 || deployedCavalry > 0 || deployedSiege > 0) {
                // Troops already deployed - disable deployment
                deployButton.disabled = true;
                deployButton.textContent = 'Troops Already Deployed';
                deployButton.title = 'You can only deploy troops once per battle';
                
                // Disable inputs
                infantryInput.disabled = true;
                cavalryInput.disabled = true;
                siegeInput.disabled = true;
            } else {
                // No troops deployed yet - enable deployment
                deployButton.disabled = false;
                deployButton.textContent = 'Deploy to Garrison';
                deployButton.title = '';
                
                // Enable inputs
                infantryInput.disabled = false;
                cavalryInput.disabled = false;
                siegeInput.disabled = false;
            }
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

    async renderBattleProgressBar(activeBattle, playerAddress) {
        const container = this.element.querySelector('#battle-progress-container');
        if (!container) return;

        // Determine player role
        let playerRole = 'none';
        if (activeBattle && activeBattle.startTime > 0n) {
            if (activeBattle.attacker.toLowerCase() === playerAddress.toLowerCase()) {
                playerRole = 'attacker';
            } else if (activeBattle.defender.toLowerCase() === playerAddress.toLowerCase()) {
                playerRole = 'defender';
            }
        }

        // Render the battle progress bar
        const progressBarElement = await this.battleProgressBar.render(activeBattle, playerRole, this.contracts);
        
        // Clear container and append progress bar
        container.innerHTML = '';
        container.appendChild(progressBarElement);
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container garrison-container">
                <h1 class="page-title">Garrison</h1>
                
                <!-- Battle Progress Bar Container -->
                <div id="battle-progress-container"></div>
                
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

                <div class="page-section deployed-troops-section" style="display: none;">
                    <h2>Deployed Troops</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Deployed Infantry:</span>
                            <span id="deployed-infantry" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Deployed Cavalry:</span>
                            <span id="deployed-cavalry" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Deployed Siege:</span>
                            <span id="deployed-siege" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Deployed Hero:</span>
                            <span id="deployed-hero" class="status-value">None</span>
                        </div>
                    </div>
                </div>

                <div class="page-section tactics-deployment-section" style="display: none;">
                    <h2>Deploy Tactics <span class="deployed-tactics-count">0/3</span></h2>
                    <p class="section-description">
                        Deploy up to 3 tactics during battle to gain strategic advantages. 
                        Each tactic provides unique bonuses to your defensive forces.
                    </p>
                    <div class="tactics-grid">
                        <!-- Tactic cards will be dynamically added here -->
                    </div>
                </div>

                <div class="page-section troop-deployment-section" style="display: none;">
                    <h2>Deploy to Garrison</h2>
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
                        <div class="troop-input-group">
                            <label for="deploy-hero">Deploy Hero (Optional):</label>
                            <select id="deploy-hero" class="input input-md">
                                <option value="">No Hero</option>
                            </select>
                        </div>
                        <button class="btn btn-primary deploy-troops-btn" disabled>
                            Deploy to Garrison
                        </button>
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

            // Process battles sequentially to handle async power calculations
            for (const battle of battleHistory) {
                const battleDate = new Date(Number(battle.timestamp) * 1000);
                const isAttacker = battle.attacker.toLowerCase() === address.toLowerCase();
                const won = isAttacker ? battle.attackerWon : !battle.attackerWon;
                
                // Calculate current power using the new getter functions
                const attackerPower = await this.contracts.battleSystem.getAttackerPowerWithTactics(battle.attacker);
                const defenderPower = await this.contracts.battleSystem.getDefenderPowerWithTactics(battle.attacker);
                
                const battleItem = document.createElement('div');
                battleItem.className = `battle-history-item ${won ? 'victory' : 'defeat'}`;
                battleItem.innerHTML = `
                    <div class="battle-date">${battleDate.toLocaleString()}</div>
                    <div class="battle-result">
                        ${won ? 'Victory' : 'Defeat'} against ${isAttacker ? battle.defender : battle.attacker}
                    </div>
                    <div class="battle-details">
                        <div>Power: ${attackerPower} vs ${defenderPower}</div>
                        ${battle.treasuryBurned > 0 ? `<div>Gold Stolen: ${battle.treasuryBurned}</div>` : ''}
                        ${battle.repPoints > 0 ? `<div>REP Earned: ${battle.repPoints}</div>` : ''}
                        ${battle.gridBuildingsDamaged > 0 ? `<div>Grid Buildings Damaged: ${battle.gridBuildingsDamaged}</div>` : ''}
                        ${battle.districtBuildingsDamaged > 0 ? `<div>District Buildings Damaged: ${battle.districtBuildingsDamaged}</div>` : ''}
                    </div>
                `;
                historyList.appendChild(battleItem);
            }
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
                
                // Provide more specific error messages
                let errorMessage = 'Failed to deploy to garrison';
                if (error.message.includes('Troops already deployed')) {
                    errorMessage = 'Troops are already deployed to garrison. You can only deploy once per battle.';
                } else if (error.message.includes('Not enough')) {
                    errorMessage = 'You don\'t have enough troops available for deployment.';
                } else if (error.message.includes('Not in battle')) {
                    errorMessage = 'You are not currently in a battle.';
                } else if (error.message.includes('Not the defender')) {
                    errorMessage = 'Only the defender can deploy troops to garrison.';
                } else {
                    errorMessage += ': ' + error.message;
                }
                
                this.modal.error(errorMessage);
            }
        });

        resolveBattleBtn.addEventListener('click', async () => {
            try {
                const address = WalletManager.getCurrentWallet();
                
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
                
                // Show detailed battle results
                const opponent = isAttacker ? lastBattle.defender : lastBattle.attacker;
                const shortOpponent = opponent.substring(0, 6) + '...' + opponent.substring(opponent.length - 4);
                
                let message = `${won ? '🏆 VICTORY!' : '💀 DEFEAT!'}\n\n`;
                message += `Opponent: ${shortOpponent}\n`;
                message += `Your Power: ${isAttacker ? lastBattle.attackerPower : lastBattle.defenderPower}\n`;
                message += `Opponent Power: ${isAttacker ? lastBattle.defenderPower : lastBattle.attackerPower}\n\n`;
                
                if (lastBattle.treasuryBurned > 0) {
                    message += `💰 Treasury Burned: ${lastBattle.treasuryBurned}\n`;
                }
                if (lastBattle.gridBuildingsDamaged > 0) {
                    message += `🏠 Grid Buildings Damaged: ${lastBattle.gridBuildingsDamaged}\n`;
                }
                if (lastBattle.districtBuildingsDamaged > 0) {
                    message += `🏛️ District Buildings Damaged: ${lastBattle.districtBuildingsDamaged}\n`;
                }
                if (lastBattle.repPoints > 0) {
                    message += `⭐ REP Earned: ${lastBattle.repPoints}\n`;
                }
                
                if (won) {
                    this.modal.success(message);
                } else {
                    this.modal.info(message);
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

    async loadTacticsDeploymentSection(ownedTactics, activeBattle) {
        const tacticsSection = this.element.querySelector('.tactics-deployment-section');
        if (!tacticsSection) return;

        // Get deployed tactics for this battle
        const deployedTactics = await this.getDeployedTacticsForBattle(activeBattle);
        
        // Update tactics display
        this.updateTacticsDisplay(ownedTactics, deployedTactics);
        
        // Setup tactics deployment event listeners
        this.setupTacticsEventListeners(ownedTactics, deployedTactics);
    }

    async getDeployedTacticsForBattle(activeBattle) {
        try {
            const address = WalletManager.getCurrentWallet();
            
            // Get deployed tactics from battle system
            const battleHeroTactics = await this.contracts.battleSystem.battleHeroTactics(address);

            
            const deployedTactics = [];
            
            // Check which tactics are deployed (defender tactics)
            if (battleHeroTactics.defenderTactic1 > 0) deployedTactics.push(Number(battleHeroTactics.defenderTactic1));
            if (battleHeroTactics.defenderTactic2 > 0) deployedTactics.push(Number(battleHeroTactics.defenderTactic2));
            if (battleHeroTactics.defenderTactic3 > 0) deployedTactics.push(Number(battleHeroTactics.defenderTactic3));
            

            return deployedTactics;
        } catch (error) {
            Logger.error('Error getting deployed tactics:', error);
            return [];
        }
    }

    updateTacticsDisplay(ownedTactics, deployedTactics) {
        const tacticsGrid = this.element.querySelector('.tactics-grid');
        if (!tacticsGrid) return;

        tacticsGrid.innerHTML = '';
        
        // Create tactic cards for owned tactics
        for (let tacticId = 1; tacticId <= 9; tacticId++) {
            if (ownedTactics[tacticId]) {
                const tacticCard = this.createTacticCard(tacticId, deployedTactics.includes(tacticId));
                tacticsGrid.appendChild(tacticCard);
            }
        }

        // Update deployed count
        const deployedCount = this.element.querySelector('.deployed-tactics-count');
        if (deployedCount) {
            deployedCount.textContent = `${deployedTactics.length}/3`;
        }
    }

    createTacticCard(tacticId, isDeployed) {
        const tacticName = TacticsNFTContract.getTacticName(tacticId);
        const tacticType = TacticsNFTContract.getTacticType(tacticId);
        const tacticEffect = TacticsNFTContract.getTacticEffect(tacticId);



        const card = document.createElement('div');
        card.className = `shop-item-card ${isDeployed ? 'deployed' : ''}`;
        card.innerHTML = `
            <div class="shop-item-image">
                <img src="/images/tactics/tactic${tacticId}.png" alt="${tacticName}" onerror="this.src='/images/tactics/default.png'" />
            </div>
            <div class="shop-item-info">
                <div class="shop-item-title-row">
                    <h3>${tacticName}</h3>
                </div>
                <div class="shop-item-desc">
                    <strong>${tacticType}</strong> - ${tacticEffect}. Deploy during combat to gain tactical superiority.
                </div>
            </div>
            <div class="shop-item-action-row">
                <button class="btn ${isDeployed ? 'btn-secondary' : 'btn-primary'}" 
                        data-tactic-id="${tacticId}" 
                        ${isDeployed ? 'disabled' : ''}>
                    ${isDeployed ? 'Deployed' : 'Deploy'}
                </button>
            </div>
        `;

        return card;
    }

    setupTacticsEventListeners(ownedTactics, deployedTactics) {
        const deployButtons = this.element.querySelectorAll('[data-tactic-id]');
        
        deployButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tacticId = parseInt(btn.getAttribute('data-tactic-id'));
                
                if (deployedTactics.length >= 3) {
                    this.modal.error('You can only deploy up to 3 tactics per battle');
                    return;
                }

                if (deployedTactics.includes(tacticId)) {
                    this.modal.error('This tactic is already deployed');
                    return;
                }

                const result = await this.modal.confirm(
                    `Deploy ${TacticsNFTContract.getTacticName(tacticId)} to this battle?`,
                    { title: 'Confirm Tactic Deployment' }
                );

                if (result.isConfirmed) {
                    await this.deployTactic(tacticId);
                }
            });
        });
    }



    async deployTactic(tacticId) {
        try {
            const address = WalletManager.getCurrentWallet();
            Logger.info(`Deploying tactic ${tacticId} (${TacticsNFTContract.getTacticName(tacticId)})`);
            
            const tx = await this.contracts.battleSystem.deployTacticToBattle(tacticId);
            await tx.wait();
            
            this.modal.success(`${TacticsNFTContract.getTacticName(tacticId)} deployed successfully!`);
            
            // Reload tactics section
            const activeBattle = await this.contracts.battleSystem.activeBattles(address);
            const ownedTactics = {};
            for (let id = 1; id <= 9; id++) {
                ownedTactics[id] = await this.contracts.tacticsNFT.hasTactic(address, id);
            }
            await this.loadTacticsDeploymentSection(ownedTactics, activeBattle);
            
        } catch (error) {
            Logger.error('Error deploying tactic:', error);
            this.modal.error('Failed to deploy tactic: ' + error.message);
        }
    }

    unmount() {
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
        }
        if (this.battleProgressBar) {
            this.battleProgressBar.destroy();
        }
        this.element.remove();
    }
} 