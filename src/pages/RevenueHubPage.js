import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class RevenueHubPage extends BasePage {
    constructor() {
        super();
        Logger.info('RevenueHubPage constructor called');
        
        this.element.className = 'base-page';
        
        // Initialize state with dummy data for now
        this.setState({
            totalTreasury: 0,
            yourRepPoints: 0,
            currentTier: 0,
            totalYieldNFTs: 0,
            claimableRevenue: 0,
            canClaim: false
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
            await this.loadRevenueData();
            this.setupEventListeners();
            Logger.info('Revenue hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing revenue hub page:', error);
        }
    }

    async loadRevenueData() {
        try {
            const gameStateContract = new GameStateContract();
            
            // Load player data
            const playerData = await gameStateContract.getPlayerData();
            if (playerData) {
                this.setState({
                    totalTreasury: playerData.treasury || 0,
                    yourRepPoints: playerData.rep || 0,
                    currentTier: playerData.tier || 0,
                    // TODO: Get actual yield NFTs count from SonicityYieldNFT contract
                    totalYieldNFTs: 0, // Placeholder
                    claimableRevenue: 0, // Placeholder
                    canClaim: false // Placeholder
                });
            }
        } catch (error) {
            Logger.error('Error loading revenue data:', error);
        }
    }

    setupEventListeners() {
        // Claim revenue button
        this.addEventListener('.claim-revenue-button', 'click', async () => {
            try {
                Logger.info('Claim revenue clicked');
                // TODO: Implement revenue claiming logic
                const modal = new Modal();
                modal.info('Revenue claiming functionality will be implemented soon!');
            } catch (error) {
                Logger.error('Error claiming revenue:', error);
                const modal = new Modal();
                modal.error('Failed to claim revenue. Please try again.');
            }
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Revenue Hub</h1>
                <p class="page-description">
                    <strong>Manage your yield-generating NFTs and claim revenue from the treasury.</strong> 
                    <em>Stake REP points to mint yield NFTs and participate in revenue distribution.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Revenue Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Treasury:</span>
                            <span class="status-value" data-state="totalTreasury" style="color: #FFD700; font-weight: bold;">0 Sonic</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Your Rep Points:</span>
                            <span class="status-value" data-state="yourRepPoints" style="color: #4CAF50; font-weight: bold;">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Current Tier:</span>
                            <span class="status-value" data-state="currentTier" style="color: #00BCD4; font-weight: bold;">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Yield NFTs:</span>
                            <span class="status-value" data-state="totalYieldNFTs" style="color: #9C27B0; font-weight: bold;">0</span>
                        </div>
                    </div>
                </div>

                <!-- Yield NFTs Section -->
                <div class="page-section">
                    <h2>Yield NFT Management</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Mint Yield NFTs</h3>
                            <p>Convert your REP points into tradable yield-generating NFTs</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">REP Required:</span>
                                    <span class="detail-value">100+ REP</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Yield Rate:</span>
                                    <span class="detail-value">Based on treasury</span>
                                </div>
                            </div>
                            <button class="building-button btn btn-secondary" disabled>
                                Coming Soon
                            </button>
                        </div>
                        <div class="building-card">
                            <h3>Revenue Distribution</h3>
                            <p>Claim your share of revenue from yield NFTs</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Claimable Revenue:</span>
                                    <span class="detail-value" data-state="claimableRevenue">0 Sonic</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Distribution:</span>
                                    <span class="detail-value">Proportional to NFT weight</span>
                                </div>
                            </div>
                            <button class="claim-revenue-button btn btn-primary" data-state="canClaim" disabled>
                                <span class="button-text">Claim Revenue</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Treasury Information Section -->
                <div class="page-section">
                    <h2>Treasury Information</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>How Revenue Works</h3>
                            <p>Understanding the revenue distribution system</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Source:</span>
                                    <span class="detail-value">Building recharges → Treasury</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Distribution:</span>
                                    <span class="detail-value">Governance decides % to distribute</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Weight:</span>
                                    <span class="detail-value">Based on REP amount & hold time</span>
                                </div>
                            </div>
                        </div>
                        <div class="building-card">
                            <h3>Yield NFT Benefits</h3>
                            <p>Advantages of holding yield NFTs</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Tradable:</span>
                                    <span class="detail-value">Can be sold on marketplaces</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Passive Income:</span>
                                    <span class="detail-value">Earn from treasury growth</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Governance:</span>
                                    <span class="detail-value">Vote on distribution %</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
} 