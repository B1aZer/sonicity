import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

import('../styles/city-page.css');
import('../styles/stake-hub-page.css');

export class RevenueHubPage extends BasePage {
    constructor() {
        super();
        Logger.info('RevenueHubPage constructor called');
        
        this.element.className = 'base-page revenue-hub-page';
        
        // Initialize state with real data structure
        this.setState({
            // Player data
            totalTreasury: 0,
            yourRepPoints: 0,
            currentTier: 0,
            totalYieldNFTs: 0,
            
            // Yield NFT data organized by rarity tier
            yieldNFTsByRarity: {
                1: [], // Bronze (1-10 REP)
                2: [], // Silver (11-50 REP)  
                3: [], // Gold (51-100 REP)
                4: []  // Legendary (101+ REP)
            },
            
            // UI state
            selectedTier: 1,
            isLoading: false,
            canMint: true
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
            this.updateTierTabs();
            Logger.info('Revenue hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing revenue hub page:', error);
        }
    }

    async loadRevenueData() {
        try {
            const userAddress = await this.contracts.gameState.getAddress();
            
            // Load player data from GameState
            const [treasury, repPoints, playerTier] = await Promise.all([
                this.contracts.gameState.getPlayerTreasury(userAddress),
                this.contracts.gameState.getPlayerRep(userAddress),
                this.contracts.gameState.getPlayerTier(userAddress)
            ]);
            
            // Load yield NFTs
            const yieldNFTs = await this.loadYieldNFTs(userAddress);
            const yieldNFTsByRarity = this.organizeNFTsByRarity(yieldNFTs);
            
            this.setState({
                totalTreasury: Number(treasury),
                yourRepPoints: Number(repPoints),
                currentTier: Number(playerTier),
                totalYieldNFTs: yieldNFTs.length,
                yieldNFTsByRarity
            });
            
            Logger.info('Revenue data loaded:', this.state);
        } catch (error) {
            Logger.error('Error loading revenue data:', error);
        }
    }

    async loadYieldNFTs(userAddress) {
        try {
            const balance = await this.contracts.yieldNft.balanceOf(userAddress);
            const nfts = [];
            
            for (let i = 0; i < balance; i++) {
                const tokenId = await this.contracts.yieldNft.tokenOfOwnerByIndex(userAddress, i);
                const stakeInfo = await this.contracts.yieldNft.getStakeInfo(tokenId);
                const tokenURI = await this.contracts.yieldNft.tokenURI(tokenId);
                
                let metadata = {};
                try {
                    // Try to fetch metadata if it's a URL
                    if (tokenURI.startsWith('http')) {
                        const response = await fetch(tokenURI);
                        metadata = await response.json();
                    } else if (tokenURI.startsWith('data:')) {
                        // Handle base64 encoded metadata
                        const base64Data = tokenURI.split(',')[1];
                        const jsonString = atob(base64Data);
                        metadata = JSON.parse(jsonString);
                    }
                } catch (e) {
                    Logger.warn('Could not load metadata for token', tokenId);
                }
                
                nfts.push({
                    tokenId: Number(tokenId),
                    repStaked: Number(stakeInfo.repStaked),
                    mintedAt: Number(stakeInfo.mintedAt),
                    metadata,
                    tier: this.calculateNFTTier(Number(stakeInfo.repStaked))
                });
            }
            
            return nfts;
        } catch (error) {
            Logger.error('Error loading yield NFTs:', error);
            return [];
        }
    }

    calculateNFTTier(repStaked) {
        if (repStaked >= 101) return 4; // Legendary
        if (repStaked >= 51) return 3;  // Gold
        if (repStaked >= 11) return 2;  // Silver
        return 1; // Bronze
    }

    organizeNFTsByRarity(nfts) {
        const organized = { 1: [], 2: [], 3: [], 4: [] };
        
        nfts.forEach(nft => {
            organized[nft.tier].push(nft);
        });
        
        return organized;
    }

    setupEventListeners() {
        // Tab switching functionality
        this.addEventListener('.tier-tab', 'click', (event) => {
            const clickedTab = event.target;
            const tier = parseInt(clickedTab.dataset.tier);
            
            // Check if tier is unlocked
            if (tier > 0 && tier > this.state.currentTier) {
                this.modal.warning(`You need to reach Gold Tier ${tier} to access this tab.`);
                return;
            }
            
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
        
        // Mint NFT functionality
        this.addEventListener('.mint-nft-btn', 'click', async (event) => {
            await this.handleMintNFT();
        });
        
        // Render initial tier content
        this.renderTierContent(this.state.selectedTier);
    }

    async handleMintNFT() {
        try {
            const repInput = this.element.querySelector('.rep-input');
            const repAmount = parseInt(repInput.value);
            
            if (!repAmount || repAmount <= 0) {
                this.modal.warning('Please enter a valid REP amount.');
                return;
            }
            
            // Validate player has enough REP
            if (repAmount > this.state.yourRepPoints) {
                this.modal.warning(`You don't have enough REP. You have ${this.state.yourRepPoints} REP.`);
                return;
            }
            
            // Validate gold tier restrictions
            const nftTier = this.calculateNFTTier(repAmount);
            if (this.state.currentTier < nftTier) {
                const tierNames = ['', 'Bronze', 'Silver', 'Gold', 'Legendary'];
                this.modal.warning(`You need Gold Tier ${nftTier} to mint ${tierNames[nftTier]} yield NFTs. You are currently Gold Tier ${this.state.currentTier}.`);
                return;
            }
            
            this.setState({ isLoading: true, canMint: false });
            
            // Call the Altar contract to mint the yield NFT
            Logger.info('Minting yield NFT with REP amount:', repAmount);
            const result = await this.contracts.altar.mintYieldNFT(repAmount);
            
            // Wait for transaction confirmation
            const receipt = await result.wait();
            Logger.info('Yield NFT minted successfully:', receipt);
            
            // Extract token ID from transaction logs if available
            const tokenId = receipt.logs && receipt.logs.length > 0 ? 'New NFT' : 'Unknown';
            
            // Show success message
            this.modal.success(`Successfully minted ${this.getNFTTierName(nftTier)} yield NFT! Token ID: ${tokenId}`);
            
            // Clear the input
            repInput.value = '';
            
            // Reload the page data to show the new NFT
            await this.loadRevenueData();
            this.updateTierTabs();
            this.renderTierContent(this.state.selectedTier);
            
        } catch (error) {
            Logger.error('Error minting NFT:', error);
            this.modal.error('Failed to mint yield NFT. Please try again.');
        } finally {
            this.setState({ isLoading: false, canMint: true });
        }
    }

    getNFTTierName(tier) {
        const names = ['', 'Bronze', 'Silver', 'Gold', 'Legendary'];
        return names[tier] || 'Unknown';
    }

    updateTierTabs() {
        // Update tier tabs based on player's gold tier (similar to StakeHub)
        for (let tier = 0; tier <= 4; tier++) {
            const tab = this.element.querySelector(`.tier-tab[data-tier="${tier}"]`);
            if (!tab) continue;
            
            const isUnlocked = tier === 0 || tier <= this.state.currentTier;
            
            // Enable/disable tab based on gold tier
            tab.disabled = !isUnlocked;
            if (!isUnlocked) {
                tab.classList.add('locked');
                tab.title = `Requires Gold Tier ${tier}`;
            } else {
                tab.classList.remove('locked');
                tab.title = '';
            }
        }
    }

    renderTierContent(tier) {
        const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
        if (!tierContent) return;

        if (tier === 0) {
            // Tier 0 - Introduction content
            tierContent.innerHTML = this.renderTier0Content();
        } else {
            // Tier 1-4 - NFT content filtered by rarity
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
                            <span class="detail-value">Reach Gold Tier 1 to start minting</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">NFT Tiers:</span>
                            <span class="detail-value">Bronze, Silver, Gold, Legendary</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Bronze Tier</span>
                            <span class="detail-value">1-10 REP</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Silver Tier</span>
                            <span class="detail-value">11-50 REP</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Gold Tier</span>
                            <span class="detail-value">51-100 REP</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Legendary Tier</span>
                            <span class="detail-value">101+ REP</span>
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
                            <span class="detail-label">REP Source:</span>
                            <span class="detail-value">Earned by donating gold to treasury</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Yield:</span>
                            <span class="detail-value">Future revenue distribution</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTierNFTContent(tier) {
        const tierNames = ['', 'Bronze', 'Silver', 'Gold', 'Legendary'];
        const repRanges = ['', '1-10 REP', '11-50 REP', '51-100 REP', '101+ REP'];
        const nfts = this.state.yieldNFTsByRarity[tier] || [];

        return `
            <div class="buildings-grid">
                ${nfts.length === 0 ? 
                    `<div class="empty-state">
                        <h3>No ${tierNames[tier]} NFTs yet</h3>
                        <p>Mint your first ${tierNames[tier]} yield NFT by staking ${repRanges[tier]}!</p>
                    </div>` :
                    nfts.map(nft => this.renderYieldNFTCard(nft)).join('')
                }
            </div>
        `;
    }

    renderYieldNFTCard(nft) {
        const mintDate = new Date(nft.mintedAt * 1000).toLocaleDateString();
        const tierName = this.getNFTTierName(nft.tier);
        const icon = this.getYieldNFTIcon(tierName);
        
        // Use metadata image if available, otherwise show placeholder
        const image = nft.metadata?.image || '';
        
        return `
            <div class="building-card yield-nft-card" data-token-id="${nft.tokenId}" style="
                ${image ? `background-image: url('${image}'); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}
                position: relative;
                overflow: hidden;
            ">
                ${image ? `
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
                "></div>` : ''}
                
                <div class="building-header" style="position: relative; z-index: 2;">
                    <div class="building-icon">
                        ${icon}
                    </div>
                    <div class="building-info">
                        <h3>${tierName} Yield NFT #${nft.tokenId}</h3>
                        <p class="building-description">${tierName} Tier Yield NFT</p>
                    </div>
                    <div class="building-status tradeable">
                        <span class="status-indicator"></span>
                        <span class="status-text">Tradeable</span>
                    </div>
                </div>
                <div class="building-details" style="position: relative; z-index: 2;">
                    <div class="detail-item">
                        <span class="detail-label">REP Staked:</span>
                        <span class="detail-value">${nft.repStaked}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tier:</span>
                        <span class="detail-value">${tierName}</span>
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
            case 'LEGENDARY': return '👑';
            default: return '💎';
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

                <!-- Mint Section -->
                <div class="page-section mint-section">
                    <h2>Mint Yield NFT</h2>
                    <div class="donation-form">
                        <input 
                            type="number" 
                            id="rep-input"
                            class="input input-lg rep-input" 
                            placeholder="Enter REP amount"
                            min="1"
                            max="999999"
                        />
                        <button class="btn btn-primary btn-md mint-nft-btn" data-state="canMint">
                            <span class="button-text">Mint Yield NFT</span>
                        </button>
                    </div>
                </div>

                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <div class="tier-tabs">
                        <button class="tier-tab" data-tier="0">
                            Tier 0
                        </button>
                        <button class="tier-tab active" data-tier="1">
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
                    <div class="tier-content" data-tier="0">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Tier 1 Content - Bronze NFTs -->
                    <div class="tier-content active" data-tier="1">
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