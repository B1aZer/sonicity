export class BattleProgressBar {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'battle-progress-container';
        this.battleTimerInterval = null;
    }

    render(battleData, playerRole) {
        if (!battleData || battleData.startTime === 0n) {
            this.element.style.display = 'none';
            return this.element;
        }

        const now = Math.floor(Date.now() / 1000);
        const battleStartTime = Number(battleData.startTime);
        const battleDuration = 24 * 60 * 60; // 24 hours in seconds
        const elapsed = now - battleStartTime;
        const remaining = Math.max(0, battleDuration - elapsed);
        const progress = Math.min(100, (elapsed / battleDuration) * 100);

        // Calculate power comparison without revealing exact numbers
        const attackerPower = Number(battleData.attackerPower || 0);
        const defenderPower = Number(battleData.defenderPower || 0);
        const totalPower = attackerPower + defenderPower;
        
        let powerComparison = 'Even';
        let attackerAdvantage = 0;
        let defenderAdvantage = 0;
        
        if (totalPower > 0) {
            const attackerPercentage = (attackerPower / totalPower) * 100;
            const defenderPercentage = (defenderPower / totalPower) * 100;
            
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
                        <i class="fas fa-crosshairs"></i>
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

        // Update timer every second
        this.battleTimerInterval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const battleStartTime = Number(battleData.startTime);
            const battleDuration = 24 * 60 * 60;
            const elapsed = now - battleStartTime;
            const remaining = Math.max(0, battleDuration - elapsed);
            const progress = Math.min(100, (elapsed / battleDuration) * 100);

            // Update timer display
            const hours = Math.floor(remaining / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            const timeElement = this.element.querySelector('.time-remaining');
            const progressElement = this.element.querySelector('.progress-bar');
            const progressLabel = this.element.querySelector('.progress-label');

            if (timeElement) timeElement.textContent = timeString;
            if (progressElement) progressElement.style.width = `${progress}%`;
            if (progressLabel) progressLabel.textContent = `Battle Progress: ${Math.round(progress)}%`;

            // Stop timer when battle is complete
            if (remaining <= 0) {
                clearInterval(this.battleTimerInterval);
                this.battleTimerInterval = null;
            }
        }, 1000);
    }

    destroy() {
        if (this.battleTimerInterval) {
            clearInterval(this.battleTimerInterval);
            this.battleTimerInterval = null;
        }
        this.element.remove();
    }
} 