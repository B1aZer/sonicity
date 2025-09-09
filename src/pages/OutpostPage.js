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
            Logger.info('🔍 Starting threat intelligence check for:', playerAddress);
            
            // Ensure battleSystem contract is initialized
            if (!this.contracts.battleSystem.initialized) {
                Logger.info('🔄 Initializing battleSystem contract...');
                await this.contracts.battleSystem.initialize();
            }
            
            // First, let's check ALL recent SearchCompleted events to see what's happening
            const filters = await this.contracts.battleSystem.getFilters();
            Logger.info('✅ Filters obtained:', filters);
            
            // Get current block info for debugging
            try {
                const currentBlock = await this.contracts.battleSystem.provider.getBlock("latest");
                Logger.info(`📦 Current block: ${currentBlock.number}, timestamp: ${currentBlock.timestamp}`);
            } catch (error) {
                Logger.warn('Could not get current block:', error);
            }
            
            // Check all SearchCompleted events (no filter) - use a wider range
            const currentBlock = await this.contracts.battleSystem.provider.getBlock("latest");
            const fromBlock = Math.max(0, currentBlock.number - 20000);
            const allEvents = await this.contracts.battleSystem.queryFilter(filters.SearchCompleted(), fromBlock);
            Logger.info(`📊 Found ${allEvents.length} total SearchCompleted events (last 20000 blocks)`);
            
            // Also check for SearchStarted events to compare
            const searchStartedFromBlock = Math.max(0, currentBlock.number - 5000);
            const searchStartedEvents = await this.contracts.battleSystem.queryFilter(filters.SearchStarted(), searchStartedFromBlock);
            Logger.info(`🚀 Found ${searchStartedEvents.length} total SearchStarted events (last 5000 blocks)`);
            
            // Also check for ANY events from the battle system contract
            try {
                const contractAddress = await this.contracts.battleSystem.getContractAddress();
                Logger.info(`🏗️ BattleSystem contract address: ${contractAddress}`);
                
                // Get current block for the range
                const currentBlock = await this.contracts.battleSystem.provider.getBlock("latest");
                
                // Get all events from the contract (not just SearchCompleted)
                const allContractEvents = await this.contracts.battleSystem.provider.getLogs({
                    address: contractAddress,
                    fromBlock: currentBlock.number - 5000,
                    toBlock: 'latest'
                });
                Logger.info(`📋 Found ${allContractEvents.length} total events from BattleSystem contract`);
                
                // Log recent events
                for (let i = 0; i < Math.min(allContractEvents.length, 5); i++) {
                    const log = allContractEvents[i];
                    Logger.info(`📋 Event ${i}: topics=${log.topics}, data=${log.data}, block=${log.blockNumber}`);
                }
            } catch (error) {
                Logger.warn('Could not get contract events:', error);
            }
            
            // Log all recent SearchCompleted events for debugging
            for (let i = 0; i < Math.min(allEvents.length, 10); i++) {
                const event = allEvents[i];
                const block = await event.getBlock();
                Logger.info(`📅 Recent SearchCompleted event ${i}: player=${event.args.player}, target=${event.args.target}, block=${block.number}, time=${block.timestamp}`);
                
                // Check if this event is relevant to our player
                if (event.args.target.toLowerCase() === playerAddress.toLowerCase()) {
                    Logger.info(`🎯 FOUND RELEVANT EVENT: ${event.args.player} found ${event.args.target} at block ${block.number}`);
                }
            }
            
            // Now filter for our specific player
            const filter = filters.SearchCompleted(null, playerAddress);
            Logger.info('🔍 Created filter for player:', filter);
            Logger.info('🔍 Filter details:', {
                address: filter.address,
                topics: filter.topics,
                fromBlock: filter.fromBlock,
                toBlock: filter.toBlock
            });
            Logger.info('🔍 Looking for events where ANY player found:', playerAddress);
            
            const events = await this.contracts.battleSystem.queryFilter(filter, fromBlock); // Last ~20000 blocks
            Logger.info(`📊 Found ${events.length} SearchCompleted events for this player`);
            
            // Process events to get recent threats (last 24 hours)
            const currentTime = Math.floor(Date.now() / 1000);
            const oneDayAgo = currentTime - (24 * 60 * 60);
            Logger.info(`⏰ Current time: ${currentTime}, 24h ago: ${oneDayAgo}`);
            
            const threats = [];
            const seenAttackers = new Set(); // Avoid duplicates
            
            // Process events from most recent to oldest
            for (let i = events.length - 1; i >= 0; i--) {
                const event = events[i];
                const block = await event.getBlock();
                
                Logger.info(`📅 Event ${i}: block ${block.number}, timestamp ${block.timestamp}, attacker ${event.args.player}`);
                
                // Skip if too old
                if (block.timestamp < oneDayAgo) {
                    Logger.info(`⏰ Event too old: ${block.timestamp} < ${oneDayAgo}`);
                    continue;
                }
                
                const attacker = event.args.player;
                
                // Skip if we've already seen this attacker (keep most recent)
                if (seenAttackers.has(attacker)) {
                    Logger.info(`👀 Already seen attacker: ${attacker}`);
                    continue;
                }
                seenAttackers.add(attacker);
                
                // Check if there's an active battle with this attacker
                try {
                    const activeBattle = await this.contracts.battleSystem.activeBattles(attacker);
                    Logger.info(`⚔️ Active battle check for ${attacker}:`, activeBattle);
                    
                    if (activeBattle && activeBattle.defender.toLowerCase() === playerAddress.toLowerCase()) {
                        Logger.info(`⚔️ Battle already started with ${attacker}, skipping`);
                        continue; // Skip if battle already started
                    }
                } catch (error) {
                    Logger.debug(`Error checking active battle for ${attacker}:`, error);
                }
                
                const shortAddress = attacker.substring(0, 6) + '...' + attacker.substring(attacker.length - 4);
                
                const threat = {
                    attacker,
                    shortAddress,
                    foundTime: block.timestamp,
                    threatLevel: this.calculateThreatLevel(block.timestamp)
                };
                
                Logger.info(`🚨 Adding threat:`, threat);
                threats.push(threat);
            }
            
            Logger.info(`🎯 Final threats found: ${threats.length}`, threats);
            return threats.sort((a, b) => b.foundTime - a.foundTime);
        } catch (error) {
            Logger.error('❌ Threat intelligence error:', error);
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
