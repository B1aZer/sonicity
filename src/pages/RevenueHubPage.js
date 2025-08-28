import { BasePage } from './BasePage.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
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
            const userAddress = await this.contracts.gameState.getAddress();
            
            // Load comprehensive player data
            const [playerState, playerGold, playerFood, playerRep, playerTier, treasury] = await Promise.all([
                this.contracts.gameState.call('playerState', userAddress),
                this.contracts.gameState.getPlayerGold(userAddress),
                this.contracts.gameState.getPlayerFood(userAddress),
                this.contracts.gameState.getPlayerRep(userAddress),
                this.contracts.gameState.getPlayerTier(userAddress),
                this.contracts.gameState.getPlayerTreasury(userAddress)
            ]);
            
            // Load game status data
            const [totalBuildings, activeBattles, totalTroops] = await Promise.all([
                this.contracts.gridBuildings.getTotalBuildingCount(userAddress),
                this.contracts.battleSystem.getActiveBattlesCount(userAddress),
                this.getTotalTroops(userAddress)
            ]);
            
            this.setState({
                playerGold: Number(playerGold),
                playerFood: Number(playerFood),
                playerRep: Number(playerRep),
                playerTier: Number(playerTier),
                treasury: Number(treasury),
                buildingSlots: Number(playerState.buildingSlots),
                totalBuildings: Number(totalBuildings),
                activeBattles: Number(activeBattles),
                totalTroops: Number(totalTroops)
            });
            
            Logger.info('Game data loaded:', this.state);
        } catch (error) {
            Logger.error('Error loading game data:', error);
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

        // For now, show resources content for tier 0, and placeholder content for other tiers
        if (tier === 0) {
            contentElement.innerHTML = this.renderResourcesContent();
        } else {
            contentElement.innerHTML = this.renderTierPlaceholderContent(tier);
        }
    }

    renderTierPlaceholderContent(tier) {
        return `
            <div class="buildings-grid">
                <div class="building-card">
                    <h3>Tier ${tier} Content</h3>
                    <p>Content for tier ${tier} will be implemented according to your plan.</p>
                    <div class="building-details">
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value">Coming Soon</span>
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
                    <h3>Resources Guide</h3>
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
                            <span class="detail-label">REP Points:</span>
                            <span class="detail-value">Earned from battles and donations, used for progression</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Treasury:</span>
                            <span class="detail-value">Donated gold, affects city tier progression</span>
                        </div>
                    </div>
                </div>
                <div class="building-card">
                    <h3>Resource Management</h3>
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