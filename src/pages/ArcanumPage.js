import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { ethers } from 'ethers';

import('../styles/city-page.css');
import('../styles/stake-hub-page.css');

export class ArcanumPage extends BasePage {
    constructor() {
        super();
        Logger.info('ArcanumPage constructor called');
        
        this.element.className = 'base-page arcanum-page';
        
        // Initialize state with real data structure
        this.setState({
            // Player data
            totalTreasury: 0,
            yourRepPoints: 0,
            currentTier: 0,
            
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
        Logger.info('ArcanumPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            return;
        }
        try {
            await this.loadArcanumData();
            this.setupEventListeners();
            this.updateTierTabs();
            Logger.info('Arcanum page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing Arcanum page:', error);
        }
    }

    async loadArcanumData() {
        try {
            const userAddress = await this.contracts.gameState.getAddress();
            
            // Load player data from GameState and revenue pool from GridBuildings
            const [revenuePool, repPoints, playerTier] = await Promise.all([
                this.contracts.gridBuildings.getRevenuePool(),
                this.contracts.gameState.getPlayerRep(userAddress),
                this.contracts.gameState.getPlayerTier(userAddress)
            ]);
            
            // Load yield NFTs
            const yieldNFTs = await this.loadYieldNFTs(userAddress);
            const yieldNFTsByRarity = this.organizeNFTsByRarity(yieldNFTs);
            
            // Format revenue pool from wei to SONIC
            const formattedRevenuePool = ethers.formatEther(revenuePool);
            
            this.setState({
                totalTreasury: formattedRevenuePool,
                yourRepPoints: Number(repPoints),
                currentTier: Number(playerTier),
                yieldNFTsByRarity
            });
            
            Logger.info('Arcanum data loaded:', this.state);
        } catch (error) {
            Logger.error('Error loading Arcanum data:', error);
        }
    }

    async loadYieldNFTs(userAddress) {
        try {
            const nfts = await this.contracts.yieldNft.getAllNFTsWithDetails(userAddress);
            
            // Convert to the format expected by the UI
            return nfts.map(nft => ({
                tokenId: nft.tokenId,
                repStaked: Number(nft.repStaked),
                mintedAt: nft.mintedAt,
                metadata: nft.metadata,
                tier: this.calculateNFTTier(Number(nft.repStaked))
            }));
            
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
                this.modal.error(`You need to reach Gold Tier ${tier} to access this tab.`);
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
                this.modal.error('Please enter a valid REP amount.');
                return;
            }
            
            // Validate player has enough REP
            if (repAmount > this.state.yourRepPoints) {
                this.modal.error(`You don't have enough REP. You have ${this.state.yourRepPoints} REP.`);
                return;
            }
            
            // Validate gold tier restrictions
            const nftTier = this.calculateNFTTier(repAmount);
            if (this.state.currentTier < nftTier) {
                const tierNames = ['', 'Bronze', 'Silver', 'Gold', 'Legendary'];
                this.modal.error(`You need Gold Tier ${nftTier} to mint ${tierNames[nftTier]} yield NFTs. You are currently Gold Tier ${this.state.currentTier}.`);
                return;
            }
            
            this.setState({ isLoading: true, canMint: false });
            
            // Call the Altar contract to mint the yield NFT
            Logger.info('Minting yield NFT with REP amount:', repAmount);
            await this.contracts.altar.mintYieldNFT(repAmount);
            Logger.info('Yield NFT minted successfully');
            
            // Show success message
            this.modal.success(`Successfully minted ${this.getNFTTierName(nftTier)} yield NFT!`);
            
            // Clear the input
            repInput.value = '';
            
            // Reload the page data to show the new NFT
            await this.loadArcanumData();
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
        // Update tier tabs based on player's gold tier
        for (let tier = 1; tier <= 4; tier++) {
            const tab = this.element.querySelector(`.tier-tab[data-tier="${tier}"]`);
            if (!tab) continue;
            
            const isUnlocked = tier <= this.state.currentTier;
            
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

        // All tiers now show NFT content filtered by rarity
        tierContent.innerHTML = this.renderTierNFTContent(tier);
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
                <h1>Arcanum of Names</h1>
                <p class="page-description">
                    <strong>Transform your REP Points into powerful dynamic NFTs.</strong> 
                    <em>Mint yield NFTs and participate in revenue distribution from the treasury.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Arcanum Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Revenue Pool:</span>
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
                        <button class="tier-tab active" data-tier="1">
                            Bronze
                        </button>
                        <button class="tier-tab" data-tier="2">
                            Silver
                        </button>
                        <button class="tier-tab" data-tier="3">
                            Gold
                        </button>
                        <button class="tier-tab" data-tier="4">
                            Legendary
                        </button>
                    </div>

                    <!-- Bronze Content -->
                    <div class="tier-content active" data-tier="1">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Silver Content -->
                    <div class="tier-content" data-tier="2">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Gold Content -->
                    <div class="tier-content" data-tier="3">
                        <!-- Content will be rendered dynamically -->
                    </div>

                    <!-- Legendary Content -->
                    <div class="tier-content" data-tier="4">
                        <!-- Content will be rendered dynamically -->
                    </div>
                </div>
            </div>
        `;
    }
} 