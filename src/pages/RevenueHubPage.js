import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { WalletManager } from '../js/utils/wallet.js';
import { ethers } from 'ethers';

import('../styles/city-page.css');
import('../styles/stake-hub-page.css');

export class RevenueHubPage extends BasePage {
    constructor() {
        super();
        Logger.info('RevenueHubPage constructor called');
        
        this.element.className = 'base-page revenue-hub-page';
        
        // Initialize state with game data
        this.setState({
            // Player data
            playerGold: 0,
            playerFood: 0,
            playerRep: 0,
            playerTier: 0,
            treasury: 0,
            buildingSlots: 0,
            
            // Game status
            totalBuildings: 0,
            activeBattles: 0,
            totalTroops: 0,
            
            // UI state
            selectedTier: 0,
            isLoading: false
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('RevenueHubPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            return;
        }
        try {
            await this.loadGameData();
            this.setupEventListeners();
            Logger.info('Revenue hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing revenue hub page:', error);
        }
    }

    async loadGameData() {
        try {
            const userAddress = WalletManager.getCurrentWallet();
            
            // Load player state data
            const playerState = await this.contracts.gameState.playerState(userAddress);
            
            // Load additional data
            const [totalBuildings, activeBattles, totalTroops] = await Promise.all([
                this.getTotalBuildings(userAddress),
                this.getActiveBattlesCount(userAddress),
                this.getTotalTroops(userAddress)
            ]);
            
            this.setState({
                playerGold: Number(playerState.gold),
                playerFood: Number(playerState.food),
                playerRep: Number(playerState.rep),
                playerTier: Number(playerState.tier),
                treasury: Number(playerState.treasury),
                buildingSlots: Number(playerState.buildingSlots),
                totalBuildings: Number(totalBuildings),
                activeBattles: Number(activeBattles),
                totalTroops: Number(totalTroops)
            });
            
            // Update the display with the new data
            this.updateStatusDisplay();
            
            Logger.info('Game data loaded:', this.state);
        } catch (error) {
            Logger.error('Error loading game data:', error);
        }
    }

    async getTotalBuildings(userAddress) {
        try {
            // Try to get building count from grid buildings contract
            const buildingCount = await this.contracts.gridBuildings.getTotalBuildingCount(userAddress);
            return Number(buildingCount);
        } catch (error) {
            Logger.error('Error getting total buildings:', error);
            return 0;
        }
    }

    async getActiveBattlesCount(userAddress) {
        try {
            // Check if player has an active battle
            const activeBattle = await this.contracts.battleSystem.activeBattles(userAddress);
            return activeBattle.startTime > 0n ? 1 : 0;
        } catch (error) {
            Logger.error('Error getting active battles count:', error);
            return 0;
        }
    }

    async getTotalTroops(userAddress) {
        try {
            const [infantry, cavalry, siege] = await Promise.all([
                this.contracts.battleSystem.playerTroops(userAddress, 0),
                this.contracts.battleSystem.playerTroops(userAddress, 1),
                this.contracts.battleSystem.playerTroops(userAddress, 2)
            ]);
            return Number(infantry) + Number(cavalry) + Number(siege);
        } catch (error) {
            Logger.error('Error getting total troops:', error);
            return 0;
        }
    }

    updateStatusDisplay() {
        // Update all status values with current state data
        const statusElements = this.element.querySelectorAll('[data-state]');
        statusElements.forEach(element => {
            const stateKey = element.getAttribute('data-state');
            if (this.state[stateKey] !== undefined) {
                element.textContent = this.state[stateKey].toLocaleString();
            }
        });
    }



    setupEventListeners() {
        // Tab switching functionality
        this.addEventListener('.tier-tab', 'click', (event) => {
            const clickedTab = event.target;
            const tier = parseInt(clickedTab.dataset.tier);
            
            // Remove active class from all tabs and contents
            const allTabs = this.element.querySelectorAll('.tier-tab');
            const allContents = this.element.querySelectorAll('.tier-content');
            
            allTabs.forEach(tab => tab.classList.remove('active'));
            allContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            clickedTab.classList.add('active');
            const targetContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
                this.setState({ selectedTier: tier });
                this.renderTierContent(tier);
            }
            
            Logger.info('Switched to tier:', tier);
        });
        
        // Render initial tier content
        this.renderTierContent(this.state.selectedTier);
    }



    renderTierContent(tier) {
        const contentElement = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
        if (!contentElement) return;

        switch (tier) {
            case 0:
                contentElement.innerHTML = this.renderResourcesContent();
                break;
            case 1:
                contentElement.innerHTML = this.renderTier1Content();
                break;
            case 2:
                contentElement.innerHTML = this.renderTier2Content();
                break;
            case 3:
                contentElement.innerHTML = this.renderTier3Content();
                break;
            case 4:
                contentElement.innerHTML = this.renderTier4Content();
                break;
        }
    }

    renderTier1Content() {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>⚔️ PvP Combat Unlocked</h3>
                    <p>Battle system becomes available - you can now attack other players and be attacked</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Treasury Required:</span>
                            <span class="detail-value">1,000 Gold</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Building Slots:</span>
                            <span class="detail-value">6 (2x3 grid)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">New Grid Building:</span>
                            <span class="detail-value">Farm (Food production)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">REP Earnings:</span>
                            <span class="detail-value">Win battles to earn REP points</span>
                        </div>
                    </div>
                </div>
                
                <div class="building-card">
                    <h3>🎖️ Troop System</h3>
                    <p>Train and deploy different types of military units</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Infantry:</span>
                            <span class="detail-value">Basic ground troops, balanced stats</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cavalry:</span>
                            <span class="detail-value">Fast mounted units, high mobility</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Siege:</span>
                            <span class="detail-value">Heavy units, building damage specialists</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Training:</span>
                            <span class="detail-value">Use Food and Gold to train troops</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTier2Content() {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>🏛️ Heroes & Tactics</h3>
                    <p>Unlock advanced combat features with heroes and tactical cards</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Treasury Required:</span>
                            <span class="detail-value">2,500 Gold</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Building Slots:</span>
                            <span class="detail-value">9 (3x3 grid)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Hero Classes:</span>
                            <span class="detail-value">Warrior, Strategist, Scout</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Hero Bonus:</span>
                            <span class="detail-value">+20 power per specific troop type</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>📚 Tactics System</h3>
                    <p>Deploy up to 3 tactics per battle using rock-paper-scissors mechanics</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Tactic Types:</span>
                            <span class="detail-value">STRIKE, SHIELD, TRICK</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">RPS Rules:</span>
                            <span class="detail-value">STRIKE > SHIELD > TRICK > STRIKE</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Power Bonus:</span>
                            <span class="detail-value">+30% power for winning matchups</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Total Tactics:</span>
                            <span class="detail-value">9 different tactics available</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTier3Content() {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>📜 Yield NFTs</h3>
                    <p>Convert your REP points into dynamic on-chain NFTs</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Treasury Required:</span>
                            <span class="detail-value">5,000 Gold</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Building Slots:</span>
                            <span class="detail-value">12 (3x4 grid)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">NFT Tiers:</span>
                            <span class="detail-value">Bronze, Silver, Gold, Legendary</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Dynamic Images:</span>
                            <span class="detail-value">SVG-based, stored on-chain</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>💎 NFT Features</h3>
                    <p>Yield NFTs represent your reputation and achievements</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Minting Cost:</span>
                            <span class="detail-value">REP points (varies by tier)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Staking:</span>
                            <span class="detail-value">Not available yet (Tier 4 feature)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Governance:</span>
                            <span class="detail-value">Future DAO voting rights</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Collection:</span>
                            <span class="detail-value">Build your reputation portfolio</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTier4Content() {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>💰 Yield Station</h3>
                    <p>Stake your Yield NFTs to earn from the treasury pool</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Treasury Required:</span>
                            <span class="detail-value">10,000 Gold</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Building Slots:</span>
                            <span class="detail-value">16 (4x4 grid)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Staking:</span>
                            <span class="detail-value">Stake Yield NFTs as grid buildings</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Revenue Source:</span>
                            <span class="detail-value">Treasury pool from grid building charges</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>🏦 Treasury Pool</h3>
                    <p>Earn yield from all players' grid building operations</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Pool Source:</span>
                            <span class="detail-value">Grid building upgrade fees</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Distribution:</span>
                            <span class="detail-value">Proportional to staked NFT value</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Yield Rate:</span>
                            <span class="detail-value">Based on NFT tier and pool size</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">End Game:</span>
                            <span class="detail-value">Passive income from game economy</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }



    renderResourcesContent() {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>⭐ Resources Guide</h3>
                    <p>Understanding the core resources</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Gold:</span>
                            <span class="detail-value">Primary currency, earned from Houses</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Food:</span>
                            <span class="detail-value">Required for troop training, earned from Farms</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Diamonds:</span>
                            <span class="detail-value">Required for building upgrades</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">REP Points:</span>
                            <span class="detail-value">Earned from battles and donations, used for minting NFTs</span>
                        </div>
                    </div>
                </div>
                <div class="building-card">
                    <h3>⚙️ Resource Management</h3>
                    <p>Tips for efficient resource usage</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Priority:</span>
                            <span class="detail-value">Focus on Gold production first</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Balance:</span>
                            <span class="detail-value">Maintain Food for troop training</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Donations:</span>
                            <span class="detail-value">Donate Gold to advance city tier</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Efficiency:</span>
                            <span class="detail-value">Upgrade buildings for better production</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }



    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Guidance Altar</h1>
                <p class="page-description">
                    <strong>Your comprehensive guide to Sonicity game mechanics.</strong> 
                    <em>Learn about resources, combat, buildings, and progression strategies.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Game Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value" data-state="playerGold">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Food:</span>
                            <span class="status-value" data-state="playerFood">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">REP Points:</span>
                            <span class="status-value" data-state="playerRep">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">City Tier:</span>
                            <span class="status-value" data-state="playerTier">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Buildings:</span>
                            <span class="status-value" data-state="totalBuildings">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Troops:</span>
                            <span class="status-value" data-state="totalTroops">0</span>
                        </div>
                    </div>
                </div>

                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <div class="tier-tabs">
                        <button class="tier-tab active" data-tier="0">
                            Tier 0
                        </button>
                        <button class="tier-tab" data-tier="1">
                            Tier 1
                        </button>
                        <button class="tier-tab" data-tier="2">
                            Tier 2
                        </button>
                        <button class="tier-tab" data-tier="3">
                            Tier 3
                        </button>
                        <button class="tier-tab" data-tier="4">
                            Tier 4
                        </button>
                    </div>

                    <!-- Tier 0 Content - Introduction -->
                    <div class="tier-content active" data-tier="0">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 1 Content - Bronze NFTs -->
                    <div class="tier-content" data-tier="1">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 2 Content - Silver NFTs -->
                    <div class="tier-content" data-tier="2">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 3 Content - Gold NFTs -->
                    <div class="tier-content" data-tier="3">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 4 Content - Legendary NFTs -->
                    <div class="tier-content" data-tier="4">
                        <!-- Content will be rendered dynamically -->
                    </div>
                </div>
            </div>
        `;
    }
}