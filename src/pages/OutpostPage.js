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
        
        this.element.className = 'base-page outpost-page';
        
        // Initialize state
        this.setState({
            threats: [],
            activeBattle: null,
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
            
            // Load threat intelligence and active battle status
            const [threats, activeBattle] = await Promise.all([
                this.loadThreatIntelligence(address),
                this.contracts.battleSystem.activeBattles(address)
            ]);

            this.setState({
                threats,
                activeBattle,
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
            Logger.info('Starting threat intelligence check for:', playerAddress);
            
            // Ensure battleSystem contract is initialized
            if (!this.contracts.battleSystem.initialized) {
                await this.contracts.battleSystem.initialize();
            }
            
            // Get filters and search for events
            const filters = await this.contracts.battleSystem.getFilters();
            const currentBlock = await this.contracts.battleSystem.provider.getBlock("latest");
            const fromBlock = Math.max(0, currentBlock.number - 20000);
            
            // Filter for events where any player found the current player
            const filter = filters.SearchCompleted(null, playerAddress);
            const events = await this.contracts.battleSystem.queryFilter(filter, fromBlock);
            Logger.info(`Found ${events.length} SearchCompleted events for this player`);
            
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
                if (block.timestamp < oneDayAgo) {
                    continue;
                }
                
                const attacker = event.args.player;
                
                // Skip if we've already seen this attacker (keep most recent)
                if (seenAttackers.has(attacker)) {
                    continue;
                }
                seenAttackers.add(attacker);
                
                // Check if there's an active battle with this attacker
                try {
                    const activeBattle = await this.contracts.battleSystem.activeBattles(attacker);
                    if (activeBattle && activeBattle.defender.toLowerCase() === playerAddress.toLowerCase()) {
                        continue; // Skip if battle already started
                    }
                } catch (error) {
                    // Ignore errors checking active battles
                }
                
                const shortAddress = attacker.substring(0, 6) + '...' + attacker.substring(attacker.length - 4);
                
                const threat = {
                    attacker,
                    shortAddress,
                    foundTime: block.timestamp
                };
                
                threats.push(threat);
            }
            
            Logger.info(`Final threats found: ${threats.length}`);
            return threats.sort((a, b) => b.foundTime - a.foundTime);
        } catch (error) {
            Logger.error('Threat intelligence error:', error);
            return [];
        }
    }


    updateThreatDisplay() {
        const threatList = this.element.querySelector('.threat-list');
        if (!threatList) return;

        // Check if currently under attack
        const isUnderAttack = this.state.activeBattle && this.state.activeBattle.startTime > 0n;
        
        if (isUnderAttack) {
            threatList.innerHTML = `
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">Status:</span>
                        <span class="status-value" style="color: #ff4444;">Under Attack</span>
                    </div>
                </div>
            `;
            return;
        }

        if (this.state.threats.length === 0) {
            threatList.innerHTML = `
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">Status:</span>
                        <span class="status-value">All Clear</span>
                    </div>
                </div>
            `;
            return;
        }

        threatList.innerHTML = `
            <div class="status-grid">
                ${this.state.threats.map(threat => `
                    <div class="status-item">
                        <span class="status-label">
                            ${threat.shortAddress}
                        </span>
                        <span class="status-value">
                            Found ${this.formatTimeAgo(threat.foundTime)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
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
            <div class="page-container outpost-container">
                <h1 class="page-title">Outpost</h1>
                <p class="page-description">
                    <strong>Monitor potential attackers.</strong> 
                    <em>Track players who have found your district and may be planning an attack.</em>
                </p>

                <div class="page-section">
                    <h2>Intelligence Report</h2>
                    <p class="section-description">
                        Players listed below have recently found your district through scouting and may be potential attackers.
                    </p>
                    
                    <div class="threat-list">
                        <!-- Threats will be populated by updateThreatDisplay() -->
                    </div>
                </div>

                <div class="page-section">
                    <h2>Defense Information</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Detection Range:</span>
                            <span class="status-value">Last 24 hours</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Auto-Refresh:</span>
                            <span class="status-value">Every 30 seconds</span>
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
