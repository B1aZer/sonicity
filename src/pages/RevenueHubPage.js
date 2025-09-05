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
            // Global stats
            totalHouses: 0,
            totalFarms: 0,
            totalDiamonds: 0,
            totalYield: 0,
            totalRep: 0,
            revenuePool: 0,
            
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
            // Load global stats from NFT contracts and GameState
            const [totalHouses, totalFarms, totalDiamonds, totalYield, totalRep, revenuePool] = await Promise.all([
                this.contracts.nft.totalSupply(),
                this.contracts.farmNft.totalSupply(),
                this.contracts.diamondNft.totalSupply(),
                this.contracts.yieldNft.totalSupply(),
                this.contracts.repNft.totalSupply(),
                this.contracts.gridBuildings.getRevenuePool()
            ]);
            
            this.setState({
                totalHouses: Number(totalHouses),
                totalFarms: Number(totalFarms),
                totalDiamonds: Number(totalDiamonds),
                totalYield: Number(totalYield),
                totalRep: Number(totalRep),
                revenuePool: ethers.formatEther(revenuePool) // Convert from wei to SONIC
            });
            
            // Update the display with the new data
            this.updateStatusDisplay();
            
            Logger.info('Global game data loaded:', this.state);
        } catch (error) {
            Logger.error('Error loading global game data:', error);
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
            case 5:
                contentElement.innerHTML = this.renderTier5Content();
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
                    <p>Deploy up to 3 tactics per battle using RPS mechanics</p>
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
                            <span class="detail-value">REP points (varies by rarity)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Staking:</span>
                            <span class="detail-value">Available on Tier 4</span>
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

    renderTier5Content() {
        return `
            <div class="page-section">
                <h2>Tier 5+ Roadmap</h2>
                <p class="page-description">
                    <strong>Where the real game begins - Game-changing features coming soon!</strong> 
                    <em>This is where Sonicity transforms from a resource management game into a complex, multi-faction strategy game.</em>
                </p>
            </div>

            <div class="buildings-grid revenue-hub-page-grid">
                <div class="building-card">
                    <h3>Faction System</h3>
                    <p>Choose your faction and unlock unique gameplay paths</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Economicus:</span>
                            <span class="detail-value">Masters of wealth and resource generation</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Militaris:</span>
                            <span class="detail-value">Warriors and conquerors</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Technologica:</span>
                            <span class="detail-value">Innovators and researchers</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Socialis:</span>
                            <span class="detail-value">Community builders and diplomats</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Mysticus:</span>
                            <span class="detail-value">Masters of rare and mystical abilities</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>City Life & Social Features</h3>
                    <p>Rich social interactions and community building</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">City Chats:</span>
                            <span class="detail-value">Real-time communication within cities</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Quests:</span>
                            <span class="detail-value">Dynamic quests and challenges</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Research:</span>
                            <span class="detail-value">Technology trees and advancement</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Alliances:</span>
                            <span class="detail-value">Deep alliance mechanics and governance</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>Advanced PvP & Conquest</h3>
                    <p>Epic battles and territory control</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">PvP Cities:</span>
                            <span class="detail-value">Direct city vs city battles</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Territory Control:</span>
                            <span class="detail-value">Conquer and control regions</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Pool Ownership:</span>
                            <span class="detail-value">Compete for revenue pool control</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Faction Wars:</span>
                            <span class="detail-value">Epic faction vs faction conflicts</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>Marketplace & Economy</h3>
                    <p>Advanced trading and economic systems</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">NFT Marketplace:</span>
                            <span class="detail-value">Trade buildings, NFTs, and resources</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ERC20 Token:</span>
                            <span class="detail-value">Game token with LP donations</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Resource Trading:</span>
                            <span class="detail-value">Player-driven economy</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Unique NFTs:</span>
                            <span class="detail-value">Rare and special collectibles</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>Lottery & Special Events</h3>
                    <p>Exciting rewards and community events</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Lottery System:</span>
                            <span class="detail-value">Win rare rewards and NFTs</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Seasonal Events:</span>
                            <span class="detail-value">Limited-time special content</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Tournaments:</span>
                            <span class="detail-value">Competitive events with prizes</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Challenges:</span>
                            <span class="detail-value">Collective goals and rewards</span>
                        </div>
                    </div>
                </div>

                <div class="building-card">
                    <h3>Unique Buildings & Specialization</h3>
                    <p>Advanced building system with unique structures</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Unique Buildings:</span>
                            <span class="detail-value">Faction-specific and rare structures</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Specialization:</span>
                            <span class="detail-value">Deep skill trees and progression</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Building Evolution:</span>
                            <span class="detail-value">Buildings that grow and change</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">City Customization:</span>
                            <span class="detail-value">Personalize your city layout</span>
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
                            <span class="detail-value">Primary currency for building progression</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Food:</span>
                            <span class="detail-value">Required for troop training</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Diamonds:</span>
                            <span class="detail-value">Required for building upgrades and purchases</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">REP Points:</span>
                            <span class="detail-value">Required for Yield NFTs</span>
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
                <h1>Guidance Portal</h1>
                <p class="page-description">
                    <strong>Real-time statistics for the entire Sonicity game economy.</strong> 
                    <em>Get guidance on buildings, resources, and game progression to optimize your strategy.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Global Game Stats</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Houses:</span>
                            <span class="status-value" data-state="totalHouses">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Farms:</span>
                            <span class="status-value" data-state="totalFarms">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Diamond Stations:</span>
                            <span class="status-value" data-state="totalDiamonds">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Yield NFTs:</span>
                            <span class="status-value" data-state="totalYield">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total REP Forges:</span>
                            <span class="status-value" data-state="totalRep">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Revenue Pool:</span>
                            <span class="status-value" data-state="revenuePool">0</span>
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
                        <button class="tier-tab" data-tier="5">
                            Tier 5+
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

                    <!-- Tier 5+ Content - Roadmap Preview -->
                    <div class="tier-content" data-tier="5">
                        <!-- Content will be rendered dynamically -->
                    </div>
                </div>
            </div>
        `;
    }
}