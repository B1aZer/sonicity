import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

import('../styles/city-page.css');
import('../styles/stake-hub-page.css');

export class RevenueHubPage extends BasePage {
    constructor() {
        super();
        Logger.info('RevenueHubPage constructor called');
        
        this.element.className = 'base-page';
        
        // Initialize state with dummy data for now
        this.setState({
            totalTreasury: 150,
            yourRepPoints: 320,
            currentTier: 1,
            totalYieldNFTs: 3,
            tier1NFTs: 2,
            tier2NFTs: 1,
            tier3NFTs: 0,
            tier4NFTs: 0,
            tier1NFTValue: 200,
            // Dummy yield NFT data
            yieldNFTs: {
                1: [
                    {
                        tokenId: 1001,
                        name: "SILVER [DIAMOND]",
                        tier: "SILVER",
                        repStaked: 120,
                        mintedAt: 1754859632,
                        dailyYield: 0.5,
                        status: "Tradeable",
                        image: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZ0dyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxZjI5Mzc7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojYzBjMGMwO3N0b3Atb3BhY2l0eTowLjMiIC8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJvcmRlckdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNjMGMwYzA7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjNmNGY2O3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYmdHcmFkKSIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIzODAiIHJ4PSIyMCIgcnk9IjIwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjYm9yZGVyR3JhZCkiIHN0cm9rZS13aWR0aD0iNCIvPjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjM0MCIgaGVpZ2h0PSI4MCIgcng9IjEwIiByeT0iMTAiIGZpbGw9IiNjMGMwYzAiIG9wYWNpdHk9IjAuMiIvPjx0ZXh0IHg9IjIwMCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2U1ZTdlYiI+U09OSUNJVFkgWUlFTEQgTkZUPC90ZXh0Pjx0ZXh0IHg9IjIwMCIgeT0iODUiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2YzZjRmNiI+U0lMVkVSIFtESUFNT05EXTwvdGV4dD48cmVjdCB4PSIzMCIgeT0iMTMwIiB3aWR0aD0iMzQwIiBoZWlnaHQ9IjEwMCIgcng9IjEwIiByeT0iMTAiIGZpbGw9IiNlNWU3ZWIiIG9wYWNpdHk9IjAuMSIvPjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2U1ZTdlYiIgb3BhY2l0eT0iMC44Ij5SRVAgU1RBS0VEPC90ZXh0Pjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmM2Y0ZjYiPjEyMDwvdGV4dD48cmVjdCB4PSIzMCIgeT0iMjUwIiB3aWR0aD0iMzQwIiBoZWlnaHQ9IjEyMCIgcng9IjEwIiByeT0iMTAiIGZpbGw9IiMxZjI5MzciIG9wYWNpdHk9IjAuNSIvPjx0ZXh0IHg9IjUwIiB5PSIyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZTVlN2ViIj5NaW50ZWQ6IEJsb2NrIDE3NTQ4NTk2MzI8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjMwNSIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNlNWU3ZWIiPlN0YXR1czogVHJhZGVhYmxlPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIzMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCxzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZTVlN2ViIj5UaWVyOiBTSUxWRVI8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjM1NSIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNlNWU3ZWIiIG9wYWNpdHk9IjAuNyI+UHJlc3RpZ2UgTkZUIHwgT24tY2hhaW4gTWV0YWRhdGE8L3RleHQ+PHJlY3QgeD0iNTUiIHk9IjU1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjZjNmNGY2IiBvcGFjaXR5PSIwLjQiLz48cmVjdCB4PSIzMzUiIHk9IjU1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjZjNmNGY2IiBvcGFjaXR5PSIwLjQiLz48cmVjdCB4PSI1NSIgeT0iMzM1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjZjNmNGY2IiBvcGFjaXR5PSIwLjQiLz48cmVjdCB4PSIzMzUiIHk9IjMzNSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiByeD0iMiIgZmlsbD0iI2YzZjRmNiIgb3BhY2l0eT0iMC40Ii8+PC9zdmc+"
                    },
                    {
                        tokenId: 1002,
                        name: "BRONZE [DIAMOND]",
                        tier: "BRONZE",
                        repStaked: 100,
                        mintedAt: 1754859800,
                        dailyYield: 0.4,
                        status: "Tradeable",
                        image: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZ0dyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM4QjQ1MTM7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojQ0Q3RjMyO3N0b3Atb3BhY2l0eTowLjMiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNiZ0dyYWQpIi8+PHRleHQgeD0iMjAwIiB5PSI4NSIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjZjNmNGY2Ij5CUk9OWkUgW0RJQU1PTkRdPC90ZXh0Pjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIzNiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmM2Y0ZjYiPjEwMDwvdGV4dD48L3N2Zz4="
                    }
                ],
                2: [
                    {
                        tokenId: 2001,
                        name: "GOLD [EMERALD]",
                        tier: "GOLD",
                        repStaked: 250,
                        mintedAt: 1754860000,
                        dailyYield: 1.0,
                        status: "Tradeable",
                        image: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZ0dyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRkQ3MDA7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojRkY4QzAwO3N0b3Atb3BhY2l0eTowLjMiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNiZ0dyYWQpIi8+PHRleHQgeD0iMjAwIiB5PSI4NSIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIj5HT0xEIFtFTUVSQUxEXTwvdGV4dD48dGV4dCB4PSIyMDAiIHk9IjIwMCIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIGZvbnQtd2VpZ2h0PSJib2xkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIj4yNTA8L3RleHQ+PC9zdmc+"
                    }
                ],
                3: [],
                4: []
            }
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
                    tier1NFTs: 0,
                    tier2NFTs: 0,
                    tier3NFTs: 0,
                    tier4NFTs: 0
                });
            }
        } catch (error) {
            Logger.error('Error loading revenue data:', error);
        }
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
                this.renderTierContent(tier);
            }
            
            Logger.info('Switched to tier:', tier);
        });
        
        // Render initial tier content
        this.renderTierContent(1);
        
        // Mint NFT buttons (placeholder for now)
        this.addEventListener('.building-button', 'click', async (event) => {
            if (!event.target.disabled) {
                const modal = new Modal();
                modal.info('NFT minting functionality will be implemented soon!');
            }
        });
    }

    renderTierContent(tier) {
        const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
        if (!tierContent) return;

        if (tier === 0) {
            // Tier 0 - Introduction content
            tierContent.innerHTML = this.renderTier0Content();
        } else {
            // Tier 1-4 - NFT content
            tierContent.innerHTML = this.renderTierNFTContent(tier);
        }
    }

    renderTier0Content() {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>Welcome to Revenue Hub</h3>
                    <p>Learn about the yield NFT system and revenue distribution</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Unlock Requirement:</span>
                            <span class="detail-value">Reach Tier 1 to start minting</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Revenue Source:</span>
                            <span class="detail-value">Building recharges → Treasury</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Distribution:</span>
                            <span class="detail-value">Governance decides % to distribute</span>
                        </div>
                    </div>
                </div>
                <div class="building-card">
                    <h3>How Yield NFTs Work</h3>
                    <p>Understanding the revenue generation system</p>
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
        `;
    }

    renderTierNFTContent(tier) {
        const tierNames = ['', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
        const repRequirements = ['', '100+', '250+', '500+', '1000+'];
        const projectedYields = ['', '~0.5', '~1.0', '~1.5', '~2.5'];
        const nfts = this.state.yieldNFTs[tier] || [];

        return `
            <!-- Actions Section -->
            <div class="page-section tier-actions-section">
                <h3>${tierNames[tier]} Actions</h3>
                <button class="btn btn-md btn-primary mint-nft-btn" disabled>
                    Mint ${tierNames[tier]} NFT (Coming Soon)
                </button>
            </div>

            <!-- Tier Info Section -->
            <div class="page-section tier-info-section">
                <h3>${tierNames[tier]} Information</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">REP Required:</span>
                        <span class="status-value">${repRequirements[tier]} REP</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Projected Yield:</span>
                        <span class="status-value">${projectedYields[tier]} per day</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Your NFTs:</span>
                        <span class="status-value">${nfts.length}</span>
                    </div>
                </div>
            </div>

            <!-- NFT Showcase Section -->
            <div class="page-section nft-showcase-section">
                <h3>Your Yield NFTs</h3>
                <div class="buildings-grid">
                    ${nfts.length === 0 ? 
                        `<div class="empty-state">
                            <div class="empty-icon">💎</div>
                            <h3>No ${tierNames[tier]} NFTs yet</h3>
                            <p>Mint your first ${tierNames[tier]} yield NFT to start earning!</p>
                        </div>` :
                        nfts.map(nft => this.renderYieldNFTCard(nft)).join('')
                    }
                </div>
            </div>
        `;
    }

    renderYieldNFTCard(nft) {
        const mintDate = new Date(nft.mintedAt * 1000).toLocaleDateString();
        const icon = this.getYieldNFTIcon(nft.tier);
        return `
            <div class="building-card yield-nft-card" data-token-id="${nft.tokenId}" style="
                background-image: url('${nft.image}'); 
                background-size: cover; 
                background-position: center; 
                background-repeat: no-repeat;
                position: relative;
                overflow: hidden;
            ">
                <div class="nft-artwork-overlay" style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        135deg,
                        rgba(0, 0, 0, 0.7) 0%,
                        rgba(0, 0, 0, 0.5) 50%,
                        rgba(0, 0, 0, 0.7) 100%
                    );
                    pointer-events: none;
                    z-index: 1;
                "></div>
                <div class="building-header" style="position: relative; z-index: 2;">
                    <div class="building-icon">
                        ${icon}
                    </div>
                    <div class="building-info">
                        <h3>${nft.name}</h3>
                        <p class="building-description">${nft.tier} Tier Yield NFT</p>
                    </div>
                    <div class="building-status tradeable">
                        <span class="status-indicator"></span>
                        <span class="status-text">${nft.status}</span>
                    </div>
                </div>
                <div class="building-details" style="position: relative; z-index: 2;">
                    <div class="detail-item">
                        <span class="detail-label">REP Staked:</span>
                        <span class="detail-value">${nft.repStaked}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Daily Yield:</span>
                        <span class="detail-value">${nft.dailyYield}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Minted:</span>
                        <span class="detail-value">${mintDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Token ID:</span>
                        <span class="detail-value">#${nft.tokenId}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getYieldNFTIcon(tier) {
        switch (tier.toUpperCase()) {
            case 'BRONZE': return '🥉';
            case 'SILVER': return '🥈';
            case 'GOLD': return '🥇';
            case 'PLATINUM': return '💎';
            case 'DIAMOND': return '💍';
            default: return '��';
        }
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
                            <span class="status-value" data-state="totalTreasury">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Your Rep Points:</span>
                            <span class="status-value" data-state="yourRepPoints">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Current Tier:</span>
                            <span class="status-value" data-state="currentTier">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Yield NFTs:</span>
                            <span class="status-value" data-state="totalYieldNFTs">0</span>
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
                                    <span class="detail-value" data-state="claimableRevenue">0</span>
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

                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <div class="tier-tabs">
                        <button class="tier-tab" data-tier="0">Tier 0</button>
                        <button class="tier-tab active" data-tier="1">Tier 1</button>
                        <button class="tier-tab" data-tier="2">Tier 2</button>
                        <button class="tier-tab" data-tier="3">Tier 3</button>
                        <button class="tier-tab" data-tier="4">Tier 4</button>
                    </div>

                    <!-- Tier 0 Content - Introduction -->
                    <div class="tier-content" data-tier="0">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 1 Content -->
                    <div class="tier-content active" data-tier="1">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 2 Content -->
                    <div class="tier-content" data-tier="2">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 3 Content -->
                    <div class="tier-content" data-tier="3">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 4 Content -->
                    <div class="tier-content" data-tier="4">
                        <!-- Content will be rendered dynamically -->
                    </div>
                </div>
            </div>
        `;
    }
} 