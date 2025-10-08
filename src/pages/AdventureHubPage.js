import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { AdventureSystemContract } from '../js/contracts/AdventureSystemContract.js';
import { RelicNFTContract } from '../js/contracts/RelicNFTContract.js';
import { ethers } from 'ethers';

import('../styles/adventure-hub-page.css');

export class AdventureHubPage extends BasePage {
    constructor() {
        super();
        Logger.info('AdventureHubPage constructor called');
        
        this.element.className = 'base-page adventure-hub-page';
        
        // Initialize adventure-specific contracts
        this.contracts.adventureSystem = new AdventureSystemContract();
        this.contracts.relicNFT = new RelicNFTContract();
        
        // Initialize state
        this.setState({
            gold: 0,
            food: 0,
            diamonds: 0,
            rep: 0,
            tier: 0,
            hasActiveAdventure: false,
            isLoading: true,
            hasScout: false,
            scoutAvailable: false,
            scoutCost: '0',
            gridSize: 9,
            gridRows: 3,
            gridCols: 3,
            tilesRevealed: 0,
            goldCollected: 0,
            foodCollected: 0,
            diamondsCollected: 0,
            repCollected: 0,
            relicsFound: 0,
            heroCooldown: 0,
            selectedHeroId: 0,
            useScout: true,
            ownedHeroes: [],
            ownedRelics: []
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('AdventureHubPage onInitialized called with wallet:', walletResult);
        try {
            // Initialize adventure contracts
            await this.contracts.adventureSystem.initialize();
            await this.contracts.relicNFT.initialize();
            
            // Load initial data
            await this.loadAdventureData();
            this.setupEventListeners();
            
            Logger.info('Adventure Hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing adventure hub page:', error);
            this.modal.error('Failed to initialize adventure hub. Please try refreshing the page.');
        }
    }

    async loadAdventureData() {
        try {
            const address = await this.contracts.adventureSystem.getAddress();
            
            // Load player resources
            const [gold, food, diamonds, rep, tier] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerFood(),
                this.contracts.gameState.getPlayerDiamonds(),
                this.contracts.gameState.getPlayerRep(),
                this.contracts.gameState.getPlayerTier()
            ]);
            
            // Load scout info
            const [scout, scoutCost] = await Promise.all([
                this.contracts.adventureSystem.getPlayerScout(address),
                this.contracts.adventureSystem.getStartingScoutCost()
            ]);
            
            const scoutAvailable = await this.contracts.adventureSystem.isScoutAvailable(address);
            
            // Load adventure status
            const adventureStatus = await this.contracts.adventureSystem.getAdventureStatus(address);
            
            // Load grid dimensions for player tier
            const gridDimensions = await this.contracts.adventureSystem.getGridDimensions(Number(tier));
            
            // Load revealed tiles map if adventure is active
            const revealedTilesMap = {};
            if (adventureStatus.active) {
                for (let i = 0; i < Number(gridDimensions.total); i++) {
                    revealedTilesMap[i] = await this.contracts.adventureSystem.isTileRevealed(address, i);
                }
            }
            
            // Load owned heroes (check each hero class)
            const ownedHeroes = [];
            const heroClasses = [0, 1, 2]; // WARRIOR, STRATEGIST, SCOUT
            
            for (const heroClass of heroClasses) {
                const hasHero = await this.contracts.heroNFT.hasHero(address, heroClass);
                if (hasHero) {
                    const tokenId = await this.contracts.heroNFT.getHeroIdByClass(address, heroClass);
                    const isAvailable = await this.contracts.adventureSystem.isHeroAvailable(Number(tokenId));
                    const availableAt = await this.contracts.adventureSystem.getHeroAvailableAt(Number(tokenId));
                    ownedHeroes.push({
                        id: Number(tokenId),
                        class: heroClass,
                        available: isAvailable,
                        availableAt: Number(availableAt)
                    });
                }
            }
            
            // Load owned relics
            const ownedRelics = await this.contracts.relicNFT.getOwnedRelics(address);
            
            Logger.info('Adventure data loaded:', {
                gold: gold.toString(),
                food: food.toString(),
                diamonds: diamonds.toString(),
                rep: rep.toString(),
                tier: Number(tier),
                scout,
                scoutCost: ethers.formatEther(scoutCost),
                adventureStatus,
                gridDimensions,
                ownedHeroes,
                ownedRelics
            });
            
            // Update state
            this.setState({
                gold: gold.toString(),
                food: food.toString(),
                diamonds: diamonds.toString(),
                rep: rep.toString(),
                tier: Number(tier),
                hasScout: scout.purchased,
                scoutAvailable,
                scoutCost: ethers.formatEther(scoutCost),
                hasActiveAdventure: adventureStatus.active,
                gridSize: Number(gridDimensions.total),
                gridRows: gridDimensions.rows,
                gridCols: gridDimensions.cols,
                tilesRevealed: Number(adventureStatus.tilesRevealed),
                goldCollected: adventureStatus.goldCollected.toString(),
                foodCollected: adventureStatus.foodCollected.toString(),
                diamondsCollected: adventureStatus.diamondsCollected.toString(),
                repCollected: adventureStatus.repCollected.toString(),
                relicsFound: Number(adventureStatus.relicsFound),
                revealedTilesMap,
                ownedHeroes,
                ownedRelics,
                isLoading: false
            });
            
            // Render the appropriate view
            this.updateAdventureUI();
        } catch (error) {
            Logger.error('Error loading adventure data:', error);
            this.setState({ isLoading: false });
            throw error;
        }
    }

    setupEventListeners() {
        // Use BasePage event management system to prevent duplicate handlers
        
        // Purchase scout button
        this.addEventListener('#purchase-scout-btn', 'click', async (e) => {
            await this.handlePurchaseScout();
        });
        
        // Start adventure button
        this.addEventListener('#start-adventure-btn', 'click', async (e) => {
            await this.handleStartAdventure();
        });
        
        // Reveal tile button
        this.addEventListener('#reveal-tile-btn', 'click', async (e) => {
            await this.handleRevealTile();
        });
        
        // Complete adventure button
        this.addEventListener('#complete-adventure-btn', 'click', async (e) => {
            await this.handleCompleteAdventure();
        });
        
        // Hero selection
        this.addEventListener('.hero-select-radio', 'change', (e) => {
            const useScout = e.target.value === 'scout';
            const heroId = useScout ? 0 : parseInt(e.target.dataset.heroId);
            this.setState({ useScout, selectedHeroId: heroId });
        });
        
        // Tile click handlers (using event delegation on base element)
        // This works even after HTML updates since it's attached to this.element
        this.element.addEventListener('click', async (e) => {
            const tile = e.target.closest('.grid-tile.can-reveal');
            if (tile) {
                Logger.info('Tile clicked:', {
                    tileIndex: tile.dataset.tileIndex,
                    tileClasses: tile.className,
                    hasActiveAdventure: this.state.hasActiveAdventure
                });
                
                const tileIndex = parseInt(tile.dataset.tileIndex, 10);
                if (!isNaN(tileIndex)) {
                    await this.handleRevealTile(tileIndex);
                } else {
                    Logger.warn('Invalid tile index:', tile.dataset.tileIndex);
                }
            } else {
                // Debug: log what was clicked
                const clickedTile = e.target.closest('.grid-tile');
                if (clickedTile) {
                    Logger.info('Clicked non-revealable tile:', {
                        tileIndex: clickedTile.dataset.tileIndex,
                        tileClasses: clickedTile.className,
                        hasActiveAdventure: this.state.hasActiveAdventure
                    });
                }
            }
        });
        
        // Contract event listeners
        // Listen for adventure started events
        this.contracts.adventureSystem.onAdventureStarted((data) => {
            Logger.info('Adventure started event:', data);
            this.loadAdventureData();
        });
        
        // Listen for tile revealed events
        this.contracts.adventureSystem.onTileRevealed((data) => {
            Logger.info('Tile revealed event:', data);
            this.loadAdventureData();
            this.showTileResult(data);
        });
        
        // Listen for adventure completed events
        this.contracts.adventureSystem.onAdventureCompleted((data) => {
            Logger.info('Adventure completed event:', data);
            this.modal.success(`Adventure complete! Earned: ${ethers.formatUnits(data.goldEarned, 0)} Gold, ${ethers.formatUnits(data.foodEarned, 0)} Food, ${ethers.formatUnits(data.diamondsEarned, 0)} Diamonds, ${ethers.formatUnits(data.repEarned, 0)} REP, ${data.relicsFound} Relics!`);
            this.loadAdventureData();
        });
        
        // Listen for disaster events
        this.contracts.adventureSystem.onAdventureDisaster((data) => {
            Logger.info('Adventure disaster event:', data);
            this.modal.error('DISASTER! Your hero/scout was lost and rewards were forfeited.');
            this.loadAdventureData();
        });
        
        // Listen for scout purchased events
        this.contracts.adventureSystem.onStartingScoutPurchased((data) => {
            Logger.info('Scout purchased event:', data);
            this.modal.success('Starting scout purchased successfully!');
            this.loadAdventureData();
        });
    }

    showTileResult(data) {
        const tileTypes = ['Safe', 'Reward', 'Disaster', 'Special', 'Diamond'];
        const tileType = tileTypes[data.tileType] || 'Unknown';
        
        let message = `Tile revealed: ${tileType}!`;
        
        if (data.goldReward > 0n) {
            message += `\n+${ethers.formatUnits(data.goldReward, 0)} Gold`;
        }
        if (data.foodReward > 0n) {
            message += `\n+${ethers.formatUnits(data.foodReward, 0)} Food`;
        }
        if (data.diamondReward > 0n) {
            message += `\n+${ethers.formatUnits(data.diamondReward, 0)} Diamonds`;
        }
        if (data.repReward > 0n) {
            message += `\n+${ethers.formatUnits(data.repReward, 0)} REP`;
        }
        if (data.relicFound) {
            message += `\n🎉 RELIC FOUND!`;
        }
        
        if (data.tileType === 0) {
            // Safe tile
            this.modal.info(message);
        } else if (data.tileType === 2) {
            // Disaster
            this.modal.error(message);
        } else {
            // Reward/Diamond/Special
            this.modal.success(message);
        }
    }

    async handlePurchaseScout() {
        try {
            Logger.info('Purchasing starting scout...');
            await this.contracts.adventureSystem.purchaseStartingScout();
            this.modal.success('Starting scout purchased! You can now embark on adventures.');
        } catch (error) {
            this.handleContractError(error, 'purchase scout');
        }
    }

    async handleStartAdventure() {
        try {
            const { useScout, selectedHeroId } = this.state;
            Logger.info('Starting adventure:', { useScout, selectedHeroId });
            
            await this.contracts.adventureSystem.startAdventure(selectedHeroId, useScout);
            this.modal.success('Adventure started! Reveal tiles to discover what awaits...');
        } catch (error) {
            this.handleContractError(error, 'start adventure');
        }
    }

    async handleRevealTile(tileIndex) {
        try {
            Logger.info('Revealing tile:', tileIndex);
            await this.contracts.adventureSystem.revealTile(tileIndex);
            // Result will be shown via event listener
        } catch (error) {
            this.handleContractError(error, 'reveal tile');
        }
    }

    async handleCompleteAdventure() {
        try {
            Logger.info('Completing adventure...');
            await this.contracts.adventureSystem.completeAdventure();
            // Success will be shown via event listener
        } catch (error) {
            this.handleContractError(error, 'complete adventure');
        }
    }

    updateAdventureUI() {
        const { hasActiveAdventure, isLoading } = this.state;
        
        if (isLoading) {
            return; // Keep loading state
        }
        
        const container = this.element.querySelector('.adventure-content');
        if (!container) return;
        
        if (hasActiveAdventure) {
            container.innerHTML = this.getActiveAdventureHTML();
        } else {
            container.innerHTML = this.getStartAdventureHTML();
        }
    }

    getStartAdventureHTML() {
        const { hasScout, scoutAvailable, scoutCost, ownedHeroes, tier, gridRows, gridCols } = this.state;
        
        return `
            <div class="page-section">
                <h2>Start New Adventure</h2>
                <div class="adventure-info">
                    <p><i class="fas fa-map"></i> Grid Size: ${gridRows}×${gridCols} (Tier ${tier})</p>
                    <p><i class="fas fa-exclamation-triangle"></i> 15% chance of disaster per tile</p>
                    <p><i class="fas fa-gem"></i> 5% chance of special rewards (Relics/REP)</p>
                </div>
            </div>
            
            <div class="page-section">
                <h2>Choose Explorer</h2>
                ${this.getExplorerSelectionHTML()}
            </div>
            
            ${!hasScout ? `
                <div class="page-section scout-purchase">
                    <h3><i class="fas fa-user-plus"></i> Purchase Starting Scout</h3>
                    <p class="scout-description">Don't have heroes? Purchase a starting scout to begin exploring!</p>
                    <div class="scout-cost">
                        <i class="fas fa-coins"></i> Cost: ${scoutCost} SONIC
                    </div>
                    <button id="purchase-scout-btn" class="btn btn-primary">
                        <i class="fas fa-shopping-cart"></i> Purchase Scout
                    </button>
                </div>
            ` : ''}
            
            <div class="page-section">
                <button id="start-adventure-btn" class="btn btn-primary btn-large" ${!hasScout && ownedHeroes.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-play"></i> Start Adventure
                </button>
            </div>
        `;
    }

    getExplorerSelectionHTML() {
        const { hasScout, scoutAvailable, ownedHeroes } = this.state;
        
        let html = '<div class="explorer-selection">';
        
        // Scout option
        if (hasScout) {
            html += `
                <label class="explorer-option ${!scoutAvailable ? 'disabled' : ''}">
                    <input type="radio" name="explorer" value="scout" class="hero-select-radio" ${scoutAvailable ? 'checked' : 'disabled'}>
                    <div class="explorer-card">
                        <div class="explorer-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="explorer-info">
                            <h4>Starting Scout</h4>
                            <p class="explorer-status">${scoutAvailable ? '✓ Available' : '⏰ On Cooldown'}</p>
                        </div>
                    </div>
                </label>
            `;
        }
        
        // Hero options
        if (ownedHeroes.length > 0) {
            ownedHeroes.forEach(hero => {
                const now = Math.floor(Date.now() / 1000);
                const cooldownRemaining = hero.availableAt > now ? hero.availableAt - now : 0;
                const cooldownText = cooldownRemaining > 0 ? `⏰ ${this.formatTime(cooldownRemaining)}` : '✓ Available';
                
                html += `
                    <label class="explorer-option ${!hero.available ? 'disabled' : ''}">
                        <input type="radio" name="explorer" value="hero" data-hero-id="${hero.id}" class="hero-select-radio" ${hero.available ? '' : 'disabled'}>
                        <div class="explorer-card">
                            <div class="explorer-icon">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <div class="explorer-info">
                                <h4>Hero #${hero.id}</h4>
                                <p class="explorer-status">${cooldownText}</p>
                            </div>
                        </div>
                    </label>
                `;
            });
        }
        
        if (!hasScout && ownedHeroes.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-user-slash fa-2x"></i>
                    <p>No explorers available. Purchase a scout or mint a hero!</p>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    getActiveAdventureHTML() {
        const { gridRows, gridCols, tilesRevealed, gridSize, goldCollected, foodCollected, diamondsCollected, repCollected, relicsFound } = this.state;
        
        return `
            <div class="page-section">
                <h2>Active Adventure</h2>
                <div class="adventure-progress">
                    <p><i class="fas fa-map-marked-alt"></i> Tiles Revealed: ${tilesRevealed} / ${gridSize}</p>
                </div>
            </div>
            
            <div class="page-section">
                <h2>Rewards Collected</h2>
                <div class="rewards-display">
                    <div class="reward-item">
                        <i class="fas fa-coins"></i>
                        <span>${goldCollected}</span> Gold
                    </div>
                    <div class="reward-item">
                        <i class="fas fa-seedling"></i>
                        <span>${foodCollected}</span> Food
                    </div>
                    <div class="reward-item">
                        <i class="fas fa-gem"></i>
                        <span>${diamondsCollected}</span> Diamonds
                    </div>
                    <div class="reward-item">
                        <i class="fas fa-star"></i>
                        <span>${repCollected}</span> REP
                    </div>
                    <div class="reward-item">
                        <i class="fas fa-crown"></i>
                        <span>${relicsFound}</span> Relics
                    </div>
                </div>
            </div>
            
            <div class="page-section">
                <div class="adventure-grid" data-rows="${gridRows}" data-cols="${gridCols}">
                    ${this.getAdventureGridHTML()}
                </div>
            </div>
            
            <div class="page-section">
                <div class="adventure-actions">
                    <button id="reveal-tile-btn" class="btn btn-primary" ${tilesRevealed >= gridSize ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i> Reveal Tile
                    </button>
                    <button id="complete-adventure-btn" class="btn btn-success">
                        <i class="fas fa-flag-checkered"></i> Complete Adventure
                    </button>
                </div>
            </div>
        `;
    }

    getAdventureGridHTML() {
        const { gridRows, gridCols, gridSize, hasActiveAdventure, revealedTilesMap } = this.state;
        
        if (!gridRows || !gridCols) {
            Logger.warn('Grid dimensions not set:', { gridRows, gridCols });
            return '<div class="grid-tile">Loading grid...</div>';
        }
        
        let html = '';
        const totalTiles = gridRows * gridCols;
        
        for (let i = 0; i < totalTiles; i++) {
            const isRevealed = revealedTilesMap && revealedTilesMap[i];
            const canReveal = hasActiveAdventure && !isRevealed;
            
            html += `
                <div class="grid-tile ${isRevealed ? 'revealed' : ''} ${canReveal ? 'can-reveal' : ''}" 
                     data-tile-index="${i}">
                    ${isRevealed ? '<i class="fas fa-check"></i>' : '<i class="fas fa-question"></i>'}
                </div>
            `;
        }
        
        return html;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container container-min-width-1000">
                <h1><i class="fas fa-map-marked-alt"></i> Adventure Hub</h1>
                <div class="page-description">
                    Embark on dangerous expeditions to discover <strong>resources</strong>, <em>rare relics</em>, and face potential disasters. 
                    Each tile reveals new surprises - choose wisely when to continue or return!
                </div>
                
                <div class="page-section">
                    <div class="resource-display">
                        <div class="resource-item">
                            <i class="fas fa-coins"></i>
                            <span data-state="gold">0</span>
                        </div>
                        <div class="resource-item">
                            <i class="fas fa-seedling"></i>
                            <span data-state="food">0</span>
                        </div>
                        <div class="resource-item">
                            <i class="fas fa-gem"></i>
                            <span data-state="diamonds">0</span>
                        </div>
                        <div class="resource-item">
                            <i class="fas fa-star"></i>
                            <span data-state="rep">0</span>
                        </div>
                    </div>
                </div>
                
                <div class="adventure-content">
                    ${this.getLoadingContainerHTML('Loading adventure data...')}
                </div>
                
                ${this.getRelicsDisplayHTML()}
            </div>
        `;
    }

    getRelicsDisplayHTML() {
        const { ownedRelics } = this.state;
        
        if (!ownedRelics || ownedRelics.length === 0) {
            return '';
        }
        
        return `
            <div class="page-section">
                <h2><i class="fas fa-crown"></i> Your Relics (${ownedRelics.length})</h2>
                <div class="relics-grid">
                    ${ownedRelics.map(relic => `
                        <div class="relic-card rarity-${relic.rarity}">
                            <img src="${relic.metadata?.image || '/images/relics/common.png'}" alt="Relic #${relic.tokenId}">
                            <div class="relic-info">
                                <h4>${relic.metadata?.name || `Relic #${relic.tokenId}`}</h4>
                                <span class="relic-rarity">${relic.rarityName}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    onUnmount() {
        Logger.info('AdventureHubPage unmounting...');
        // Cleanup adventure event listeners
        if (this.contracts.adventureSystem) {
            this.contracts.adventureSystem.cleanup();
        }
    }
}

export default AdventureHubPage;

