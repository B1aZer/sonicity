import Logger from '../js/utils/logger.js';

export class BattleProgressBar {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'battle-progress-container';
        this.battleTimerInterval = null;
        this.battleSystemContract = null;
    }

    async render(battleData, playerRole, contracts = null) {
        if (!battleData || battleData.startTime === 0n) {
            this.element.style.display = 'none';
            return this.element;
        }

        // Use blockchain time instead of JavaScript time
        const battleStartTime = Number(battleData.startTime);
        const battleDuration = 24 * 60 * 60; // 24 hours in seconds
        
        // For now, we'll use JavaScript time as a fallback
        // The timer updates will use actual blockchain time
        const currentTime = Math.floor(Date.now() / 1000);
        const elapsed = currentTime - battleStartTime;
        const remaining = Math.max(0, battleDuration - elapsed);
        const progress = Math.min(100, Math.max(0, (elapsed / battleDuration) * 100));

        // Calculate power comparison using the new getter functions
        let attackerPower = 0;
        let defenderPower = 0;
        
        try {
            if (contracts && contracts.battleSystem) {
                attackerPower = Number(await contracts.battleSystem.getAttackerPowerWithTactics(battleData.attacker));
                defenderPower = Number(await contracts.battleSystem.getDefenderPowerWithTactics(battleData.attacker));
                
                // Log significant power changes
                const storedAttackerPower = Number(battleData.attackerPower || 0);
                const storedDefenderPower = Number(battleData.defenderPower || 0);
                
                if (Math.abs(attackerPower - storedAttackerPower) > 5 || 
                    Math.abs(defenderPower - storedDefenderPower) > 5) {
                    Logger.info('Power values updated:', {
                        attacker: `${storedAttackerPower} → ${attackerPower}`,
                        defender: `${storedDefenderPower} → ${defenderPower}`
                    });
                }
                
            } else {
                // Fallback to stored values if contracts not available
                attackerPower = Number(battleData.attackerPower || 0);
                defenderPower = Number(battleData.defenderPower || 0);
                Logger.info('Using stored power values (no contracts available)');
            }
        } catch (error) {
            Logger.warn('BattleProgressBar - Error getting power from contracts, using stored values:', error);
            attackerPower = Number(battleData.attackerPower || 0);
            defenderPower = Number(battleData.defenderPower || 0);
            Logger.warn('Error getting power values, using stored values as fallback');
        }
        const totalPower = attackerPower + defenderPower;
        
        // Log power values for debugging (only when there's an issue)
        if (attackerPower === 0 && defenderPower === 0) {
            Logger.warn('BattleProgressBar - Both powers are 0, this might indicate an issue');
        }
        
        let powerComparison = 'Even';
        let attackerAdvantage = 0;
        let defenderAdvantage = 0;
        
        if (totalPower > 0) {
            const attackerPercentage = (attackerPower / totalPower) * 100;
            const defenderPercentage = (defenderPower / totalPower) * 100;
            
            // Only log if there's an extreme imbalance (for debugging)
            if (attackerPercentage > 90 || defenderPercentage > 90) {
                Logger.info('BattleProgressBar - Extreme power imbalance:', {
                    attackerPercentage: Math.round(attackerPercentage),
                    defenderPercentage: Math.round(defenderPercentage)
                });
            }
            
            if (attackerPercentage > 60) {
                powerComparison = 'Attacker Dominating';
                attackerAdvantage = 3;
            } else if (attackerPercentage > 55) {
                powerComparison = 'Attacker Advantaged';
                attackerAdvantage = 2;
            } else if (attackerPercentage > 52) {
                powerComparison = 'Attacker Slightly Ahead';
                attackerAdvantage = 1;
            } else if (defenderPercentage > 60) {
                powerComparison = 'Defender Dominating';
                defenderAdvantage = 3;
            } else if (defenderPercentage > 55) {
                powerComparison = 'Defender Advantaged';
                defenderAdvantage = 2;
            } else if (defenderPercentage > 52) {
                powerComparison = 'Defender Slightly Ahead';
                defenderAdvantage = 1;
            }
        }
        
        // Only log the final comparison if it's interesting
        if (powerComparison !== 'Even') {
            Logger.info('BattleProgressBar - Power comparison:', powerComparison);
        }

        // Format time remaining
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        this.element.style.display = 'block';
        this.element.innerHTML = `
            <div class="battle-progress-banner">
                <div class="battle-status">
                    <div class="battle-indicator">
                        <i class="fas fa-crosshairs"></i>
                        <span class="battle-text">BATTLE IN PROGRESS</span>
                    </div>
                    <div class="battle-timer">
                        <i class="fas fa-clock"></i>
                        <span class="time-remaining">${timeString} remaining</span>
                    </div>
                </div>
                
                <div class="battle-progress-section">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                        <div class="progress-label">Battle Progress: ${Math.round(progress)}%</div>
                    </div>
                </div>
                
                <div class="power-comparison-section">
                    <div class="power-indicator">
                        <div class="power-label">Power Balance</div>
                        <div class="power-visual">
                            <div class="attacker-side ${playerRole === 'attacker' ? 'player-side' : ''}">
                                <div class="power-bars">
                                    ${this.generatePowerBars(attackerAdvantage, 'attacker')}
                                </div>
                                <div class="side-label">Attacker</div>
                            </div>
                            <div class="vs-indicator">VS</div>
                            <div class="defender-side ${playerRole === 'defender' ? 'player-side' : ''}">
                                <div class="power-bars">
                                    ${this.generatePowerBars(defenderAdvantage, 'defender')}
                                </div>
                                <div class="side-label">Defender</div>
                            </div>
                        </div>
                        <div class="power-status">${powerComparison}</div>
                    </div>
                </div>
            </div>
        `;

        // Store contracts for timer updates
        this.contracts = contracts;
        
        // Start timer updates
        this.startTimerUpdates(battleData);
        
        return this.element;
    }

    generatePowerBars(advantage, side) {
        const bars = [];
        for (let i = 0; i < 3; i++) {
            const isActive = i < advantage;
            const barClass = isActive ? 'power-bar active' : 'power-bar';
            const color = side === 'attacker' ? 'attacker-color' : 'defender-color';
            bars.push(`<div class="${barClass} ${color}"></div>`);
        }
        return bars.join('');
    }

    startTimerUpdates(battleData) {
        // Clear existing interval
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
        }

        // Update timer every 5 seconds (same as other pages)
        this.battleTimerInterval = setInterval(async () => {
            try {
                const battleStartTime = Number(battleData.startTime);
                const battleDuration = 24 * 60 * 60;
                
                // Get current blockchain time if contracts are available
                let currentTime;
                if (this.contracts && this.contracts.battleSystem) {
                    try {
                        const block = await this.contracts.battleSystem.provider.getBlock("latest");
                        currentTime = block.timestamp;
                    } catch (error) {
                        Logger.warn('BattleProgressBar - Failed to get blockchain time, using JavaScript time:', error);
                        currentTime = Math.floor(Date.now() / 1000);
                    }
                } else {
                    // Fallback to JavaScript time
                    currentTime = Math.floor(Date.now() / 1000);
                }
                
                const elapsed = currentTime - battleStartTime;
                const remaining = Math.max(0, battleDuration - elapsed);
                const progress = Math.min(100, Math.max(0, (elapsed / battleDuration) * 100));

                // Update timer display
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                // Only log significant time milestones (every hour)
                if (Math.floor(remaining / 3600) !== Math.floor((remaining + 300) / 3600)) { // Log when hour changes
                    Logger.info('BattleProgressBar - Time milestone:', `${Math.floor(remaining / 3600)}h remaining`);
                }

                const timeElement = this.element.querySelector('.time-remaining');
                const progressElement = this.element.querySelector('.progress-bar');
                const progressLabel = this.element.querySelector('.progress-label');

                if (timeElement) timeElement.textContent = timeString;
                if (progressElement) progressElement.style.width = `${progress}%`;
                if (progressLabel) progressLabel.textContent = `Battle Progress: ${Math.round(progress)}%`;

                // Stop timer when battle is complete
                if (remaining <= 0) {
                    Logger.info('BattleProgressBar - Battle complete');
                    clearInterval(this.battleTimerInterval);
                    this.battleTimerInterval = null;
                }
            } catch (error) {
                Logger.error('BattleProgressBar - Error updating battle timer:', error);
            }
        }, 5000); // Update every 5 seconds like other pages
    }

    destroy() {
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
            this.battleTimerInterval = null;
        }
        this.element.remove();
    }
} 