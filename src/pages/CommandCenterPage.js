import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { WalletManager } from '../js/utils/wallet.js';
import { TacticsNFTContract } from '../js/contracts/TacticsNFTContract.js';
import { BattleProgressBar } from '../components/BattleProgressBar.js';
import { musicManager } from '../js/managers/musicManager.js';

import('../styles/command-center-page.css');
import('../styles/battle-progress-bar.css');


export class CommandCenterPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('CommandCenterPage constructor called');
        
        this.element.className = 'base-page command-center-page';
        
        // Initialize Battle Progress Bar
        this.battleProgressBar = new BattleProgressBar();
        
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
            this.handleContractError(error, 'initialize command center page');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadCommandCenterData().catch(error => {
                Logger.error('Error loading command center data after wallet update:', error);
                this.handleContractError(error, 'load command center data after wallet update');
            });
        }
    }

    async loadCommandCenterData() {
        try {
            const address = WalletManager.getCurrentWallet();

            // Load resources, command center level, and troop counts
            const [gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount, searchStatus, activeBattle, battleDuration] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.districtBuildings.getBuildingLevel("Command Center"),
                this.contracts.battleSystem.playerTroops(address, 0), // INFANTRY
                this.contracts.battleSystem.playerTroops(address, 1), // CAVALRY
                this.contracts.battleSystem.playerTroops(address, 2),  // SIEGE
                this.contracts.battleSystem.checkSearchStatus(),
                this.contracts.battleSystem.getActiveBattle(address), // Only returns truly active battles
                this.contracts.battleSystem.battleDuration()
            ]);

            // Load owned tactics for battle deployment
            const ownedTactics = {};
            for (let tacticId = 1; tacticId <= 9; tacticId++) {
                ownedTactics[tacticId] = await this.contracts.tacticsNFT.hasTactic(address, tacticId);
            }
            const ownedTacticsCount = Object.values(ownedTactics).filter(owned => owned).length;
            Logger.info('Owned tactics loaded:', ownedTactics);
            Logger.info(`Player owns ${ownedTacticsCount} tactics total`);

            Logger.info('Command center data loaded:', { gold, commandCenterLevel, infantryCount, cavalryCount, siegeCount, searchStatus, activeBattle, battleDuration });

            // Determine player role in battle
            let playerRole = 'none';
            if (activeBattle) {
                if (activeBattle.attacker.toLowerCase() === address.toLowerCase()) {
                    playerRole = 'attacker';
                } else if (activeBattle.defender.toLowerCase() === address.toLowerCase()) {
                    playerRole = 'defender';
                }
            }

            // Update troop displays
            this.element.querySelector('#infantry-count').textContent = infantryCount.toString();
            this.element.querySelector('#cavalry-count').textContent = cavalryCount.toString();
            this.element.querySelector('#siege-count').textContent = siegeCount.toString();

            // Update opponent status section (with defender message if applicable)
            this.updateOpponentStatus(searchStatus, activeBattle, playerRole);

            // Update troop deployment section
            this.updateTroopDeploymentSection(searchStatus, infantryCount, cavalryCount, siegeCount, activeBattle, playerRole);

            // Update deployed troops display
            await this.updateDeployedTroopsDisplay(activeBattle, playerRole);

            // Load and update hero selection dropdown
            await this.updateHeroSelectionDropdown(address);

            // Start battle timer if there's an active battle
            if (activeBattle) {
                await this.startBattleTimer(Number(activeBattle.startTime), Number(battleDuration));
            }

            // Load battle history
            await this.loadBattleHistory();

            // Render Battle Progress Bar only if battle is active
            if (activeBattle) {
                await this.renderBattleProgressBar(activeBattle, address);
            } else {
                // Clear battle progress bar when no active battle
                const container = this.element.querySelector('#battle-progress-container');
                if (container) {
                    container.innerHTML = '';
                }
            }

            // Load and update tactics deployment section if in battle
            if (activeBattle) {
                Logger.info('Active battle detected, loading tactics deployment section');
                await this.loadTacticsDeploymentSection(ownedTactics, activeBattle, playerRole);
            } else {
                Logger.info('No active battle, tactics deployment section will be hidden');
            }
        } catch (error) {
            Logger.error('Error loading command center data:', error);
            this.handleContractError(error, 'load command center data');
        }
    }

    updateOpponentStatus(searchStatus, activeBattle, playerRole = 'none') {
        const statusSection = this.element.querySelector('.opponent-status-section');
        const statusText = statusSection.querySelector('.status-text');
        const statusDetails = statusSection.querySelector('.status-details');
        const battleTimer = statusSection.querySelector('.battle-timer');
        const resolveBattleBtn = statusSection.querySelector('.resolve-battle-btn');

        if (activeBattle) {
            if (playerRole === 'defender') {
                statusText.textContent = 'Your District Is Under Attack!';
                statusDetails.textContent = 'Deploy troops and tactics at the Garrison to defend your territory.';
            } else {
                statusText.textContent = 'Battle in Progress!';
                const battleTime = new Date(Number(activeBattle.startTime) * 1000);
                statusDetails.textContent = `Battle started at: ${battleTime.toLocaleString()}`;
            }
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
                // Don't show modal for timer update errors - just log them
            }
        };

        // Update immediately and then every second
        await updateTimer();
        this.battleTimerInterval = setInterval(updateTimer, 5000);
    }

    updateTroopDeploymentSection(searchStatus, infantryCount, cavalryCount, siegeCount, activeBattle, playerRole = 'none') {
        const deploymentSection = this.element.querySelector('.troop-deployment-section');
        const deployButton = deploymentSection.querySelector('.deploy-troops-btn');
        const infantryInput = deploymentSection.querySelector('#deploy-infantry');
        const cavalryInput = deploymentSection.querySelector('#deploy-cavalry');
        const siegeInput = deploymentSection.querySelector('#deploy-siege');

        // Enable/disable deployment section based on search status and active battle
        if (activeBattle) {
            // Hide deployment section for defenders
            if (playerRole === 'defender') {
                deploymentSection.style.display = 'none';
                return;
            }
            // Battle is active - check if troops are already deployed
            const deployedInfantry = Number(activeBattle.attackerTroops?.infantry || 0);
            const deployedCavalry = Number(activeBattle.attackerTroops?.cavalry || 0);
            const deployedSiege = Number(activeBattle.attackerTroops?.siege || 0);
            
            if (deployedInfantry > 0 || deployedCavalry > 0 || deployedSiege > 0) {
                // Troops already deployed - show section but disable deployment
                deploymentSection.style.display = 'block';
                deployButton.disabled = true;
                deployButton.textContent = 'Troops Already Deployed';
                deployButton.title = 'You can only deploy troops once per battle';
                
                // Disable inputs
                infantryInput.disabled = true;
                cavalryInput.disabled = true;
                siegeInput.disabled = true;
            } else {
                // No troops deployed yet - hide deployment section
                deploymentSection.style.display = 'none';
                deployButton.disabled = true;
            }
        } else if (searchStatus.completed && searchStatus.foundOpponent !== '0x0000000000000000000000000000000000000000') {
            // Search completed with opponent found - enable deployment
            deploymentSection.style.display = 'block';
            deployButton.disabled = false;
            deployButton.textContent = 'Start Battle';
            deployButton.title = '';
            
            // Enable inputs
            infantryInput.disabled = false;
            cavalryInput.disabled = false;
            siegeInput.disabled = false;
        } else {
            // No search or no opponent found - hide deployment section
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
        if (activeBattle) {
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

    async updateDeployedTroopsDisplay(activeBattle, playerRole = 'none') {
        Logger.info('Updating deployed troops display...');
        Logger.info('Active battle data:', {
            startTime: activeBattle?.startTime?.toString(),
            attacker: activeBattle?.attacker,
            defender: activeBattle?.defender,
            attackerTroops: {
                infantry: activeBattle?.attackerTroops?.infantry?.toString(),
                cavalry: activeBattle?.attackerTroops?.cavalry?.toString(),
                siege: activeBattle?.attackerTroops?.siege?.toString()
            },
            defenderTroops: {
                infantry: activeBattle?.defenderTroops?.infantry?.toString(),
                cavalry: activeBattle?.defenderTroops?.cavalry?.toString(),
                siege: activeBattle?.defenderTroops?.siege?.toString()
            }
        });
        
        const deployedInfantry = this.element.querySelector('#deployed-infantry');
        const deployedCavalry = this.element.querySelector('#deployed-cavalry');
        const deployedSiege = this.element.querySelector('#deployed-siege');
        const deployedHero = this.element.querySelector('#deployed-hero');
        const deployedSection = this.element.querySelector('.deployed-troops-section');
        const tacticsSection = this.element.querySelector('.tactics-deployment-section');

        if (activeBattle) {
            Logger.info('Active battle detected, showing deployed troops and tactics sections');
            
            // Check if player is attacker or defender
            const address = WalletManager.getCurrentWallet();
            const isAttacker = activeBattle.attacker.toLowerCase() === address.toLowerCase();
            Logger.info('Player role check:', { address, attacker: activeBattle.attacker, isAttacker });
            
            // Show deployed troops from battle data
            if (isAttacker) {
                // Player is attacker, show attacker troops
                const infantry = Number(activeBattle.attackerTroops?.infantry || 0);
                const cavalry = Number(activeBattle.attackerTroops?.cavalry || 0);
                const siege = Number(activeBattle.attackerTroops?.siege || 0);
                
                Logger.info('Setting attacker troops:', { infantry, cavalry, siege });
                deployedInfantry.textContent = infantry.toString();
                deployedCavalry.textContent = cavalry.toString();
                deployedSiege.textContent = siege.toString();
                Logger.info('Set deployed troops display to:', { 
                    infantry: deployedInfantry.textContent, 
                    cavalry: deployedCavalry.textContent, 
                    siege: deployedSiege.textContent 
                });
            } else {
                // Player is defender, show defender troops
                const infantry = Number(activeBattle.defenderTroops?.infantry || 0);
                const cavalry = Number(activeBattle.defenderTroops?.cavalry || 0);
                const siege = Number(activeBattle.defenderTroops?.siege || 0);
                
                Logger.info('Setting defender troops:', { infantry, cavalry, siege });
                deployedInfantry.textContent = infantry.toString();
                deployedCavalry.textContent = cavalry.toString();
                deployedSiege.textContent = siege.toString();
                Logger.info('Set deployed troops display to:', { 
                    infantry: deployedInfantry.textContent, 
                    cavalry: deployedCavalry.textContent, 
                    siege: deployedSiege.textContent 
                });
            }
            
            // Show deployed hero
            try {
                const heroTactics = await this.contracts.battleSystem.battleHeroTactics(address);
                Logger.info('Hero tactics data:', heroTactics);
                const heroId = isAttacker ? heroTactics.attackerHeroId : heroTactics.defenderHeroId;
                Logger.info('Hero ID for player:', { heroId: heroId.toString(), isAttacker });
                
                if (heroId > 0) {
                    // Get hero name from hero ID using contract helper
                    const heroName = await this.contracts.heroNFT.getHeroNameByHeroId(heroId);
                    deployedHero.textContent = heroName;
                } else {
                    deployedHero.textContent = 'None';
                }
            } catch (error) {
                Logger.error('Error getting hero tactics:', error);
                deployedHero.textContent = 'Error loading hero data';
                // Don't show modal for non-critical display errors
            }
            
            deployedSection.style.display = 'block';
            
            // Hide tactics section for defenders
            if (playerRole === 'defender') {
                tacticsSection.style.display = 'none';
                Logger.info('Player is defender - hiding tactics section');
            } else {
                tacticsSection.style.display = 'block';
                Logger.info('Player is attacker - showing tactics section');
            }
        } else {
            Logger.info('No active battle, hiding deployed troops and tactics sections');
            deployedSection.style.display = 'none';
            tacticsSection.style.display = 'none';
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container command-center-container">
                <h1 class="page-title">Command Center</h1>
                <p class="page-description">
                    <strong>Launch coordinated attacks on enemy districts.</strong> 
                    <em>Deploy your forces strategically and command them in battle to claim victory and resources.</em>
                </p>
                
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
                        Each tactic provides unique bonuses to your forces.
                    </p>
                    <div class="tactics-grid">
                        <!-- Tactic cards will be dynamically added here -->
                    </div>
                </div>

                <div class="page-section troop-deployment-section" style="display: none;">
                    <h2>Deploy to Battle</h2>
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
                            Start Battle
                        </button>
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
            const address = WalletManager.getCurrentWallet();
            const battleHistory = await this.contracts.battleSystem.getPlayerBattleHistory(address);
            
            const historyList = this.element.querySelector('.battle-history-list');
            historyList.innerHTML = '';

            if (battleHistory.length === 0) {
                historyList.innerHTML = '<div class="no-history">No battles fought yet</div>';
                return;
            }

            // Sort battles by timestamp in descending order (newest first)
            // Create a new array to avoid "read only property" error
            const sortedBattles = [...battleHistory].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

            // Process battles sequentially to handle async power calculations
            for (const battle of sortedBattles) {
                const battleDate = new Date(Number(battle.timestamp) * 1000);
                const isAttacker = battle.attacker.toLowerCase() === address.toLowerCase();
                const won = isAttacker ? battle.attackerWon : !battle.attackerWon;
                
                // Use stored power values from battle history (these were calculated when battle was resolved)
                const attackerPower = Number(battle.attackerPower || 0);
                const defenderPower = Number(battle.defenderPower || 0);
                
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
                        ${(battle.repPoints > 0 && won) ? `<div>REP Earned: ${battle.repPoints}</div>` : ''}
                        ${battle.gridBuildingsDamaged > 0 ? `<div>Grid Buildings Damaged: ${battle.gridBuildingsDamaged}</div>` : ''}
                        ${battle.districtBuildingsDamaged > 0 ? `<div>District Buildings Damaged: ${battle.districtBuildingsDamaged}</div>` : ''}
                    </div>
                `;
                historyList.appendChild(battleItem);
            }
        } catch (error) {
            Logger.error('Error loading battle history:', error);
            // Don't show modal for battle history errors - just log them
        }
    }

    async updateHeroSelectionDropdown(playerAddress) {
        try {
            const heroSelect = this.element.querySelector('#deploy-hero');
            if (!heroSelect) return;
            heroSelect.innerHTML = '<option value="">No Hero</option>';
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
            // Don't show modal for dropdown update errors - just log them
        }
    }

    setupEventListeners() {
        // Use BasePage event management system to prevent duplicate handlers
        this.addEventListener('.deploy-troops-btn', 'click', async () => {
            const infantryInput = this.element.querySelector('#deploy-infantry');
            const cavalryInput = this.element.querySelector('#deploy-cavalry');
            const siegeInput = this.element.querySelector('#deploy-siege');
            const heroSelect = this.element.querySelector('#deploy-hero');
            try {
                const infantryCount = parseInt(infantryInput.value) || 0;
                const cavalryCount = parseInt(cavalryInput.value) || 0;
                const siegeCount = parseInt(siegeInput.value) || 0;
                const heroClass = heroSelect.value === "" ? 255 : parseInt(heroSelect.value);

                // Validate input values
                if (infantryCount < 0 || cavalryCount < 0 || siegeCount < 0) {
                    this.modal.error('Troop counts cannot be negative', { title: 'Invalid Input' });
                    return;
                }

                if (infantryCount === 0 && cavalryCount === 0 && siegeCount === 0) {
                    this.modal.error('Please select at least one troop type to start battle', { title: 'Invalid Battle Setup' });
                    return;
                }

                // Check if search result has expired (using blockchain time)
                const playerAddress = await this.contracts.battleSystem.getAddress();
                const playerSearch = await this.contracts.battleSystem.getPlayerSearch(playerAddress);
                
                if (playerSearch.foundOpponent !== '0x0000000000000000000000000000000000000000') {
                    const searchDuration = await this.contracts.battleSystem.searchDuration();
                    const searchExpiration = 24 * 60 * 60; // 24 hours in seconds
                    const currentBlock = await this.contracts.battleSystem.provider.getBlock("latest");
                    const currentTime = currentBlock.timestamp;
                    
                    // Calculate when search expires: search start + duration + 24h expiration
                    const searchStartTime = Number(playerSearch.startTime);
                    const searchCompleteTime = searchStartTime + Number(searchDuration);
                    const searchExpiresAt = searchCompleteTime + searchExpiration;
                    
                    if (currentTime > searchExpiresAt) {
                        this.modal.error('Your search result has expired. Please start a new search to find a fresh opponent.', { 
                            title: 'Search Expired' 
                        });
                        return;
                    }
                }

                // Use combined function for troops and hero deployment
                await this.contracts.battleSystem.startBattleWithHero(
                    infantryCount,
                    cavalryCount,
                    siegeCount,
                    heroClass
                );

                // Switch to battle music when player starts a battle
                Logger.info('Player started battle - switching to battle music');
                musicManager.playBattleMusic();

                const heroText = heroClass !== 255 ? ` with hero` : '';
                this.modal.success(`Battle started${heroText}! Your troops are marching to battle.`);
                await this.loadCommandCenterData();
            } catch (error) {
                this.handleContractError(error, 'start battle');
            }
        });

        this.addEventListener('.resolve-battle-btn', 'click', async () => {
            try {
                const address = WalletManager.getCurrentWallet();
                
                await this.contracts.battleSystem.resolveBattle(address);
                
                // Switch back to normal music when battle is resolved
                Logger.info('Battle resolved - returning to normal music');
                await musicManager.returnToPageMusic();
                
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
                
                let message = `${won ? 'VICTORY!' : 'DEFEAT!'}\n\n`;
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
                if (lastBattle.repPoints > 0 && won) {
                    message += `⭐ REP Earned: ${lastBattle.repPoints}\n`;
                }
                
                if (won) {
                    this.modal.success(message);
                } else {
                    this.modal.info(message);
                }
                
                await this.loadCommandCenterData();
            } catch (error) {
                this.handleContractError(error, 'resolve battle');
            }
        });

        // Add input validation
        // Use BasePage event management for input validation
        this.addEventListener('#deploy-infantry, #deploy-cavalry, #deploy-siege', 'input', (event) => {
            const input = event.currentTarget;
            const value = parseInt(input.value) || 0;
            const max = parseInt(input.max) || 0;
            if (value < 0) input.value = 0;
            if (value > max) input.value = max;
        });
    }

    mount(container) {
        Logger.info('Mounting command center page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during command center page initialization:', error);
            this.handleContractError(error, 'initialize command center page');
        });
    }

    async loadTacticsDeploymentSection(ownedTactics, activeBattle, playerRole = 'none') {
        // Don't load tactics for defenders
        if (playerRole === 'defender') {
            Logger.info('Player is defender - skipping tactics deployment section');
            return;
        }
        
        Logger.info('Loading tactics deployment section...');
        const tacticsSection = this.element.querySelector('.tactics-deployment-section');
        if (!tacticsSection) {
            Logger.error('Tactics deployment section not found in DOM');
            return;
        }
        Logger.info('Tactics deployment section found in DOM');

        // Get deployed tactics for this battle
        const deployedTactics = await this.getDeployedTacticsForBattle(activeBattle);
        Logger.info('Deployed tactics:', deployedTactics);
        
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
            
            Logger.info('Raw battleHeroTactics data:', battleHeroTactics);
            
            // Check which tactics are deployed - the struct has individual fields, not arrays
            // Determine if player is attacker or defender
            const isAttacker = activeBattle && activeBattle.attacker.toLowerCase() === address.toLowerCase();
            Logger.info('Player role check for tactics:', { isAttacker, address, attacker: activeBattle?.attacker });
            
            if (isAttacker) {
                // Check attacker tactic slots
                const tacticIds = [
                    Number(battleHeroTactics.attackerTactic1),
                    Number(battleHeroTactics.attackerTactic2), 
                    Number(battleHeroTactics.attackerTactic3)
                ];
                
                for (const tacticId of tacticIds) {
                    if (tacticId > 0) {
                        deployedTactics.push(tacticId);
                        Logger.info(`Found deployed attacker tactic: ${tacticId}`);
                    }
                }
            } else {
                // Check defender tactic slots
                const tacticIds = [
                    Number(battleHeroTactics.defenderTactic1),
                    Number(battleHeroTactics.defenderTactic2),
                    Number(battleHeroTactics.defenderTactic3)
                ];
                
                for (const tacticId of tacticIds) {
                    if (tacticId > 0) {
                        deployedTactics.push(tacticId);
                        Logger.info(`Found deployed defender tactic: ${tacticId}`);
                    }
                }
            }
            
            Logger.info('Final deployed tactics:', deployedTactics);
            return deployedTactics;
        } catch (error) {
            Logger.error('Error getting deployed tactics:', error);
            // Return empty array for non-critical errors
            return [];
        }
    }

    updateTacticsDisplay(ownedTactics, deployedTactics) {
        Logger.info('Updating tactics display...');
        const tacticsGrid = this.element.querySelector('.tactics-grid');
        if (!tacticsGrid) {
            Logger.error('Tactics grid not found in DOM');
            return;
        }
        Logger.info('Tactics grid found in DOM');

        tacticsGrid.innerHTML = '';
        
        // Create tactic cards for owned tactics
        let tacticCardsCreated = 0;
        for (let tacticId = 1; tacticId <= 9; tacticId++) {
            if (ownedTactics[tacticId]) {
                Logger.info(`Creating tactic card for tactic ${tacticId}`);
                const tacticCard = this.createTacticCard(tacticId, deployedTactics.includes(tacticId));
                tacticsGrid.appendChild(tacticCard);
                tacticCardsCreated++;
            }
        }
        Logger.info(`Created ${tacticCardsCreated} tactic cards`);

        // Update deployed count
        const deployedCount = this.element.querySelector('.deployed-tactics-count');
        if (deployedCount) {
            deployedCount.textContent = `${deployedTactics.length}/3`;
            Logger.info(`Updated deployed tactics count: ${deployedTactics.length}/3`);
        } else {
            Logger.error('Deployed tactics count element not found');
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
                try {
                    const tacticId = parseInt(btn.getAttribute('data-tactic-id'));
                    
                    // Validate tactic ID
                    if (isNaN(tacticId) || tacticId < 1 || tacticId > 9) {
                        this.modal.error('Invalid tactic selected', { title: 'Invalid Selection' });
                        return;
                    }
                    
                    if (deployedTactics.length >= 3) {
                        this.modal.error('You can only deploy up to 3 tactics per battle', { title: 'Tactic Limit Reached' });
                        return;
                    }

                    if (deployedTactics.includes(tacticId)) {
                        this.modal.error('This tactic is already deployed', { title: 'Tactic Already Deployed' });
                        return;
                    }

                const result = await this.modal.confirm(
                    `Deploy ${TacticsNFTContract.getTacticName(tacticId)} to this battle?`,
                    { title: 'Confirm Tactic Deployment' }
                );

                if (result.isConfirmed) {
                    await this.deployTactic(tacticId);
                }
                } catch (error) {
                    Logger.error('Error in tactics deployment event handler:', error);
                    this.handleContractError(error, 'deploy tactic');
                }
            });
        });
    }



    async deployTactic(tacticId) {
        try {
            const address = WalletManager.getCurrentWallet();
            Logger.info(`Deploying tactic ${tacticId} (${TacticsNFTContract.getTacticName(tacticId)})`);

            // Deploy tactic to battle
            await this.contracts.battleSystem.deployTacticToBattle(tacticId);
            
            this.modal.success(`${TacticsNFTContract.getTacticName(tacticId)} deployed successfully!`);
            
            // Reload full page data to update battle progress bar and all sections
            await this.loadCommandCenterData();
            
        } catch (error) {
            Logger.error('Error deploying tactic:', error);
            this.handleContractError(error, 'deploy tactic');
        }
    }

    unmount() {
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
        }
        if (this.battleProgressBar) {
            this.battleProgressBar.destroy();
        }
        // Call parent unmount to properly clean up event listeners
        super.unmount();
    }
} 