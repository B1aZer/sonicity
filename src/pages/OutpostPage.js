import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { WalletManager } from '../js/utils/wallet.js';

import('../styles/command-center-page.css');

export class OutpostPage extends BasePage {
    constructor() {
        super();
        
        this.requiredDistrictBuilding = 'Outpost';
        Logger.info('OutpostPage constructor called');
        
        this.element.className = 'base-page command-center-page';
        
        // Initialize state
        this.setState({
            threats: [],
            isLoading: true
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('OutpostPage onInitialized called with wallet:', walletResult);
        try {
            await this.loadOutpostData();
            this.setupEventListeners();
            Logger.info('Outpost page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing outpost page:', error);
            this.modal.error('Failed to initialize outpost page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadOutpostData().catch(error => {
                Logger.error('Error loading outpost data after wallet update:', error);
            });
        }
    }

    async loadOutpostData() {
        try {
            const address = WalletManager.getCurrentWallet();
            
            // Load threat intelligence 
            const threats = await this.loadThreatIntelligence(address);

            this.setState({
                threats,
                isLoading: false
            });

            this.updateThreatDisplay();
            
        } catch (error) {
            Logger.error('Error loading outpost data:', error);
            this.modal.error('Failed to load outpost data: ' + error.message);
            this.setState({ isLoading: false });
        }
    }

    async loadThreatIntelligence(playerAddress) {
        try {
            // Query SearchCompleted events where this player is the target
            const filters = await this.contracts.battleSystem.getFilters();
            const filter = filters.SearchCompleted(null, playerAddress);
            const events = await this.contracts.battleSystem.queryFilter(filter, -2000); // Last ~2000 blocks
            
            // Process events to get recent threats (last 24 hours)
            const currentTime = Math.floor(Date.now() / 1000);
            const oneDayAgo = currentTime - (24 * 60 * 60);
            
            const threats = [];
            const seenAttackers = new Set(); // Avoid duplicates
            
            // Process events from most recent to oldest
            for (let i = events.length - 1; i >= 0; i--) {
                const event = events[i];
                const block = await event.getBlock();
                
                // Skip if too old
                if (block.timestamp < oneDayAgo) continue;
                
                const attacker = event.args.player;
                
                // Skip if we've already seen this attacker (keep most recent)
                if (seenAttackers.has(attacker)) continue;
                seenAttackers.add(attacker);
                
                // Check if there's an active battle with this attacker
                try {
                    const activeBattle = await this.contracts.battleSystem.activeBattles(attacker);
                    if (activeBattle && activeBattle.defender.toLowerCase() === playerAddress.toLowerCase()) {
                        continue; // Skip if battle already started
                    }
                } catch (error) {
                    Logger.debug(`Error checking active battle for ${attacker}:`, error);
                }
                
                const shortAddress = attacker.substring(0, 6) + '...' + attacker.substring(attacker.length - 4);
                
                threats.push({
                    attacker,
                    shortAddress,
                    foundTime: block.timestamp,
                    threatLevel: this.calculateThreatLevel(block.timestamp)
                });
            }
            
            return threats.sort((a, b) => b.foundTime - a.foundTime);
        } catch (error) {
            Logger.warn('Threat intelligence not available yet:', error);
            return [];
        }
    }

    calculateThreatLevel(foundTime) {
        const hoursOld = (Date.now() / 1000 - foundTime) / 3600;
        
        if (hoursOld < 1) return 'Critical';
        if (hoursOld < 6) return 'High';
        if (hoursOld < 24) return 'Medium';
        return 'Low';
    }

    updateThreatDisplay() {
        const threatList = this.element.querySelector('.threat-list');
        if (!threatList) return;

        if (this.state.threats.length === 0) {
            threatList.innerHTML = `
                <div class="status-display">
                    <div class="status-text">🛡️ All Clear</div>
                    <div class="status-details">No active threats detected. Your district appears secure.</div>
                </div>
            `;
            return;
        }

        threatList.innerHTML = `
            <div class="status-grid">
                ${this.state.threats.map(threat => `
                    <div class="status-item">
                        <span class="status-label">
                            ${this.getThreatIcon(threat.threatLevel)} ${threat.shortAddress}
                        </span>
                        <span class="status-value">
                            ${threat.threatLevel} - ${this.formatTimeAgo(threat.foundTime)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getThreatIcon(threatLevel) {
        switch(threatLevel) {
            case 'Critical': return '🚨';
            case 'High': return '⚠️';
            case 'Medium': return '🟡';
            case 'Low': return '🟢';
            default: return '❓';
        }
    }

    formatTimeAgo(timestamp) {
        const now = Date.now() / 1000;
        const diff = now - timestamp;
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    setupEventListeners() {
        // Auto-refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!this.state.isLoading) {
                this.loadOutpostData().catch(error => {
                    Logger.error('Error in auto-refresh:', error);
                });
            }
        }, 30000);
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container command-center-container">
                <h1 class="page-title">Outpost</h1>
                <p class="page-description">
                    <strong>Gather intelligence on incoming threats.</strong> 
                    <em>Monitor enemy scout activity and prepare your defenses before attacks.</em>
                </p>

                <div class="page-section">
                    <h2>Threat Intelligence</h2>
                    <p class="section-description">
                        Monitor enemy scout activity targeting your district. Active threats indicate players who have found you in their searches.
                    </p>
                    
                    <div class="threat-list">
                        <!-- Threats will be populated by updateThreatDisplay() -->
                    </div>
                </div>

                <div class="page-section">
                    <h2>Intelligence Tips</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">🛡️ Critical Threats:</span>
                            <span class="status-value">Recently detected scouts pose immediate risk</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">⏰ Threat Aging:</span>
                            <span class="status-value">Older intelligence may be outdated</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">👁️ Proactive Defense:</span>
                            <span class="status-value">Deploy troops before attacks begin</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Update display after render
        setTimeout(() => this.updateThreatDisplay(), 0);
    }

    mount(container) {
        Logger.info('Mounting outpost page...');
        container.appendChild(this.element);
        this.initialize().catch(error => {
            Logger.error('Error during outpost page initialization:', error);
            this.modal.error('Failed to initialize outpost page. Please try refreshing the page.');
        });
    }

    unmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        super.unmount();
    }
}
