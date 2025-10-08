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
        
        // Initialize state
        this.setState({
            // Player resources
            gold: 0,
            food: 0,
            diamonds: 0,
            rep: 0,
            tier: 0,
            
            // Adventure state
            hasActiveAdventure: false,
            hasScout: false,
            scoutAvailable: false,
            scoutCost: '0',
            
            // Grid state
            gridSize: 9,
            gridRows: 3,
            gridCols: 3,
            tilesRevealed: 0,
            revealedTilesMap: {},
            
            // Adventure rewards
            goldCollected: 0,
            foodCollected: 0,
            diamondsCollected: 0,
            repCollected: 0,
            relicsFound: 0,
            
            // Hero state
            heroCooldown: 0,
            selectedHeroId: 0,
            useScout: true,
            ownedHeroes: [],
            ownedRelics: [],
            
            // Loading state
            isLoading: true
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('AdventureHubPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            this.setState({ isLoading: true });
            
            // Load initial data
            await this.loadAdventureData();
            
            // Setup event listeners after UI is rendered
            this.setupEventListeners();
            
            Logger.info('Adventure Hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing adventure hub page:', error);
            this.modal.error('Failed to initialize adventure hub. Please try refreshing the page.');
            this.setState({ isLoading: false });
        }
    }

    async loadAdventureData() {
        try {
            Logger.info('Starting to load adventure data...');
            const address = await this.contracts.adventureSystem.getAddress();
            Logger.info('Got address:', address);
            
            // Load player resources first (needed for tier)
            Logger.info('Loading player resources...');
            await this.loadPlayerResources();
            Logger.info('Player resources loaded, tier:', this.state.tier);
            
            // Load remaining data in parallel
            Logger.info('Loading remaining data in parallel...');
            await Promise.all([
                this.loadScoutData(address),
                this.loadAdventureStatus(address),
                this.loadOwnedHeroes(address),
                this.loadOwnedRelics(address)
            ]);
            Logger.info('All data loaded successfully');
            
            // Set loading to false and update UI after all data is loaded
            this.setState({ isLoading: false });
            this.updateAdventureUI();
        } catch (error) {
            Logger.error('Error loading adventure data:', error);
            this.setState({ isLoading: false });
            throw error;
        }
    }

    async loadPlayerResources() {
        try {
            Logger.info('loadPlayerResources: Starting...');
            const [gold, food, diamonds, rep, tier] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerFood(),
                this.contracts.gameState.getPlayerDiamonds(),
                this.contracts.gameState.getPlayerRep(),
                this.contracts.gameState.getPlayerTier()
            ]);
            
            Logger.info('loadPlayerResources: Got values:', { gold: gold.toString(), food: food.toString(), diamonds: diamonds.toString(), rep: rep.toString(), tier: Number(tier) });
            
            this.setState({
                gold: gold.toString(),
                food: food.toString(),
                diamonds: diamonds.toString(),
                rep: rep.toString(),
                tier: Number(tier)
            });
            
            Logger.info('loadPlayerResources: State updated successfully');
        } catch (error) {
            Logger.error('Error loading player resources:', error);
            throw error;
        }
    }

    async loadScoutData(address) {
        try {
            Logger.info('loadScoutData: Starting with address:', address);
            const [scout, scoutCost, scoutAvailable] = await Promise.all([
                this.contracts.adventureSystem.getPlayerScout(address),
                this.contracts.adventureSystem.getStartingScoutCost(),
                this.contracts.adventureSystem.isScoutAvailable(address)
            ]);
            
            Logger.info('loadScoutData: Got scout data:', { scout, scoutCost: scoutCost.toString(), scoutAvailable });
            
            this.setState({
                hasScout: scout.purchased,
                scoutAvailable,
                scoutCost: ethers.formatEther(scoutCost)
            });
            
            Logger.info('loadScoutData: State updated successfully');
        } catch (error) {
            Logger.error('Error loading scout data:', error);
            throw error;
        }
    }

    async loadAdventureStatus(address) {
        try {
            Logger.info('loadAdventureStatus: Starting with address:', address);
            const adventureStatus = await this.contracts.adventureSystem.getAdventureStatus(address);
            Logger.info('loadAdventureStatus: Got adventure status:', adventureStatus);
            
            // Get player tier first (should be loaded by loadPlayerResources)
            const tier = this.state.tier || 0;
            Logger.info('loadAdventureStatus: Using tier:', tier);
            const gridDimensions = await this.contracts.adventureSystem.getGridDimensions(tier);
            Logger.info('loadAdventureStatus: Got grid dimensions:', gridDimensions);
            
            // Load revealed tiles map if adventure is active
            const revealedTilesMap = {};
            if (adventureStatus.active) {
                Logger.info('loadAdventureStatus: Adventure is active, loading revealed tiles...');
                for (let i = 0; i < Number(gridDimensions.total); i++) {
                    revealedTilesMap[i] = await this.contracts.adventureSystem.isTileRevealed(address, i);
                }
                Logger.info('loadAdventureStatus: Loaded revealed tiles map:', revealedTilesMap);
            }
            
            this.setState({
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
                revealedTilesMap
            });
            
            Logger.info('loadAdventureStatus: State updated successfully');
        } catch (error) {
            Logger.error('Error loading adventure status:', error);
            throw error;
        }
    }

    async loadOwnedHeroes(address) {
        try {
            Logger.info('loadOwnedHeroes: Starting with address:', address);
            const ownedHeroes = [];
            const heroClasses = [0, 1, 2]; // WARRIOR, STRATEGIST, SCOUT
            
            for (const heroClass of heroClasses) {
                Logger.info(`loadOwnedHeroes: Checking hero class ${heroClass}`);
                const hasHero = await this.contracts.heroNFT.hasHero(address, heroClass);
                Logger.info(`loadOwnedHeroes: Hero class ${heroClass} hasHero:`, hasHero);
                
                if (hasHero) {
                    const tokenId = await this.contracts.heroNFT.getHeroIdByClass(address, heroClass);
                    const isAvailable = await this.contracts.adventureSystem.isHeroAvailable(Number(tokenId));
                    const availableAt = await this.contracts.adventureSystem.getHeroAvailableAt(Number(tokenId));
                    
                    const heroData = {
                        id: Number(tokenId),
                        class: heroClass,
                        available: isAvailable,
                        availableAt: Number(availableAt)
                    };
                    
                    Logger.info(`loadOwnedHeroes: Hero class ${heroClass} data:`, heroData);
                    ownedHeroes.push(heroData);
                }
            }
            
            Logger.info('loadOwnedHeroes: Final owned heroes:', ownedHeroes);
            this.setState({ ownedHeroes });
            Logger.info('loadOwnedHeroes: State updated successfully');
        } catch (error) {
            Logger.error('Error loading owned heroes:', error);
            throw error;
        }
    }

    async loadOwnedRelics(address) {
        try {
            Logger.info('loadOwnedRelics: Starting with address:', address);
            const ownedRelics = await this.contracts.relicNFT.getOwnedRelics(address);
            Logger.info('loadOwnedRelics: Got owned relics:', ownedRelics);
            this.setState({ ownedRelics });
            Logger.info('loadOwnedRelics: State updated successfully');
        } catch (error) {
            Logger.error('Error loading owned relics:', error);
            throw error;
        }
    }

    setupEventListeners() {
        Logger.info('Setting up declarative event handlers');
        
        // Use new declarative approach - works with dynamic content automatically
        // No more conditional checks, no more manual re-attachment needed!
        
        // Purchase scout button - works automatically when element appears
        this.on('.purchase-scout-btn', 'click', async (e) => {
            await this.handlePurchaseScout();
        });
        
        // Start adventure button - works automatically when element appears
        this.on('.start-adventure-btn', 'click', async (e) => {
            await this.handleStartAdventure();
        });
        
        // Complete adventure button - works automatically when element appears
        this.on('.complete-adventure-btn', 'click', async (e) => {
            await this.handleCompleteAdventure();
        });
        
        // Hero selection - works automatically when elements appear
        this.on('.hero-select-radio', 'change', (e) => {
            const useScout = e.target.value === 'scout';
            const heroId = useScout ? 0 : parseInt(e.target.dataset.heroId);
            this.setState({ useScout, selectedHeroId: heroId });
        });
        
        // Tile clicks - works automatically with dynamic grid
        this.on('.grid-tile.can-reveal', 'click', async (e) => {
            const tileIndex = parseInt(e.currentTarget.dataset.tileIndex, 10);
            if (!isNaN(tileIndex)) {
                Logger.info('Tile clicked:', {
                    tileIndex: tileIndex,
                    tileClasses: e.currentTarget.className,
                    hasActiveAdventure: this.state.hasActiveAdventure
                });
                await this.handleRevealTile(tileIndex);
            } else {
                Logger.warn('Invalid tile index:', e.currentTarget.dataset.tileIndex);
            }
        });
        
        // Contract event listeners
        // Listen for adventure started events
        this.contracts.adventureSystem.onAdventureStarted((data) => {
            Logger.info('Adventure started event:', data);
            this.loadAdventureData(); // No need to re-setup event handlers!
        });
        
        // Note: All transaction results are now handled directly in the respective methods
        // following the same simple pattern as other pages (StakeHubPage, ShopPage, CityPage)
        
        Logger.info('Event listeners setup complete');
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
        // Show loading modal IMMEDIATELY to prevent multiple clicks and provide feedback
        const loadingModal = this.modal.loading('Purchasing starting scout...');
        
        try {
            Logger.info('Purchasing starting scout...');
            await this.contracts.adventureSystem.purchaseStartingScout();
            
            // Close loading modal
            loadingModal.close();
            
            // Show success modal
            this.modal.success('Starting scout purchased successfully!');
            
            // Reload data - event handlers automatically work with new content!
            await this.loadAdventureData();
        } catch (error) {
            // Close loading modal on error
            loadingModal.close();
            this.handleContractError(error, 'purchase scout');
        }
    }

    async handleStartAdventure() {
        // Show loading modal IMMEDIATELY to prevent multiple clicks and provide feedback
        const loadingModal = this.modal.loading('Starting adventure...');
        
        try {
            const { useScout, selectedHeroId } = this.state;
            Logger.info('Starting adventure:', { useScout, selectedHeroId });
            
            await this.contracts.adventureSystem.startAdventure(selectedHeroId, useScout);
            
            // Close loading modal
            loadingModal.close();
            
            // Show success modal
            this.modal.success('Adventure started! Reveal tiles to discover what awaits...');
            
            // Reload data - event handlers automatically work with new content!
            await this.loadAdventureData();
        } catch (error) {
            // Close loading modal on error
            loadingModal.close();
            this.handleContractError(error, 'start adventure');
        }
    }

    async handleRevealTile(tileIndex) {
        // Show loading modal IMMEDIATELY to prevent multiple clicks and provide feedback
        const loadingModal = this.modal.loading('Revealing tile...');
        
        try {
            Logger.info('Revealing tile:', tileIndex);
            const result = await this.contracts.adventureSystem.revealTile(tileIndex);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data to get updated state and re-setup event listeners
            await this.loadAdventureData();
            this.setupEventListeners();
            
            // Show result based on tile type
            this.showTileResult(result);
        } catch (error) {
            // Close loading modal on error
            loadingModal.close();
            this.handleContractError(error, 'reveal tile');
        }
    }

    async handleCompleteAdventure() {
        // Show loading modal IMMEDIATELY to prevent multiple clicks and provide feedback
        const loadingModal = this.modal.loading('Completing adventure...');
        
        try {
            Logger.info('Completing adventure...');
            const result = await this.contracts.adventureSystem.completeAdventure();
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data to get updated state and re-setup event listeners
            await this.loadAdventureData();
            this.setupEventListeners();
            
            // Show success modal with earned rewards
            this.modal.success(`Adventure complete! Earned: ${ethers.formatUnits(result.goldEarned, 0)} Gold, ${ethers.formatUnits(result.foodEarned, 0)} Food, ${ethers.formatUnits(result.diamondsEarned, 0)} Diamonds, ${ethers.formatUnits(result.repEarned, 0)} REP, ${result.relicsFound} Relics!`);
        } catch (error) {
            // Close loading modal on error
            loadingModal.close();
            this.handleContractError(error, 'complete adventure');
        }
    }

    updateAdventureUI() {
        Logger.info('updateAdventureUI: Starting...');
        const { hasActiveAdventure, isLoading } = this.state;
        Logger.info('updateAdventureUI: State values:', { hasActiveAdventure, isLoading });
        
        if (isLoading) {
            Logger.info('updateAdventureUI: Still loading, returning early');
            return; // Keep loading state
        }
        
        // Update rewards collected display
        this.updateRewardsDisplay();
        
        const container = this.element.querySelector('.adventure-content');
        Logger.info('updateAdventureUI: Found container:', !!container);
        if (!container) return;
        
        if (hasActiveAdventure) {
            Logger.info('updateAdventureUI: Has active adventure, showing active adventure HTML');
            const html = this.getActiveAdventureHTML();
            Logger.info('updateAdventureUI: Active adventure HTML length:', html.length);
            container.innerHTML = html;
        } else {
            Logger.info('updateAdventureUI: No active adventure, showing start adventure HTML');
            const html = this.getStartAdventureHTML();
            Logger.info('updateAdventureUI: Start adventure HTML length:', html.length);
            container.innerHTML = html;
        }
        
        // Show cooldown info if needed and update button states AFTER HTML is rendered
        this.updateCooldownInfo();
        this.updateButtonStates();
        
        Logger.info('updateAdventureUI: HTML updated successfully');
    }

    updateRewardsDisplay() {
        const { goldCollected, foodCollected, diamondsCollected, repCollected, relicsFound, tier } = this.state;
        
        // Update adventure mechanics display
        const tierElement = this.element.querySelector('[data-state="tier"]');
        
        if (tierElement) {
            tierElement.textContent = tier || 0;
        }
        
        // Update the status values in the adventure rewards section
        const goldElement = this.element.querySelector('[data-state="goldCollected"]');
        const foodElement = this.element.querySelector('[data-state="foodCollected"]');
        const diamondsElement = this.element.querySelector('[data-state="diamondsCollected"]');
        const repElement = this.element.querySelector('[data-state="repCollected"]');
        const relicsElement = this.element.querySelector('[data-state="relicsFound"]');
        
        if (goldElement) goldElement.textContent = ethers.formatUnits(goldCollected, 0);
        if (foodElement) foodElement.textContent = ethers.formatUnits(foodCollected, 0);
        if (diamondsElement) diamondsElement.textContent = ethers.formatUnits(diamondsCollected, 0);
        if (repElement) repElement.textContent = ethers.formatUnits(repCollected, 0);
        if (relicsElement) relicsElement.textContent = relicsFound;
    }

    updateCooldownInfo() {
        const { hasActiveAdventure, hasScout, scoutAvailable, ownedHeroes } = this.state;

        // Safety check - don't show cooldown info if data isn't loaded yet
        if (ownedHeroes === undefined) {
            return;
        }

        // Remove existing info box
        const existingInfoBox = this.element.querySelector('.adventure-cooldown-info');
        if (existingInfoBox) {
            existingInfoBox.remove();
        }

        // Check if any heroes are available (not on cooldown)
        const now = Math.floor(Date.now() / 1000);
        const availableHeroes = ownedHeroes.filter(hero => hero.availableAt <= now);

        // Show info if on cooldown (no active adventure, no scout available, no available heroes)
        if (!hasActiveAdventure && !scoutAvailable && availableHeroes.length === 0) {
            this.addCooldownInfo();
        }
    }

    updateButtonStates() {
        const { hasActiveAdventure, hasScout, scoutAvailable, ownedHeroes } = this.state;

        Logger.info('updateButtonStates: State values:', { 
            hasActiveAdventure, 
            hasScout,
            scoutAvailable,
            ownedHeroesCount: ownedHeroes?.length 
        });

        // Safety check - don't update buttons if data isn't loaded yet
        if (ownedHeroes === undefined) {
            Logger.info('updateButtonStates: Data not loaded yet, skipping');
            return;
        }

        // Check if any heroes are available (not on cooldown)
        const now = Math.floor(Date.now() / 1000);
        const availableHeroes = ownedHeroes.filter(hero => hero.availableAt <= now);

        // Update start adventure button
        const startAdventureBtn = this.element.querySelector('.start-adventure-btn');
        Logger.info('updateButtonStates: Found button:', !!startAdventureBtn);
        
        if (startAdventureBtn) {
            // Check if we can start adventure (has scout available OR has available heroes)
            const canStartAdventure = !hasActiveAdventure && 
                                    ((hasScout && scoutAvailable) || availableHeroes.length > 0);
            
            Logger.info('updateButtonStates: Can start adventure:', canStartAdventure, {
                hasScout,
                scoutAvailable,
                ownedHeroesCount: ownedHeroes.length,
                availableHeroesCount: availableHeroes.length
            });
            
            startAdventureBtn.disabled = !canStartAdventure;
            
            if (!canStartAdventure) {
                if (hasActiveAdventure) {
                    startAdventureBtn.textContent = 'Adventure in Progress';
                } else if (!scoutAvailable && availableHeroes.length === 0) {
                    startAdventureBtn.textContent = 'On Cooldown';
                }
            } else {
                startAdventureBtn.textContent = 'Start Adventure';
            }
            
            Logger.info('updateButtonStates: Button updated - disabled:', startAdventureBtn.disabled, 'text:', startAdventureBtn.textContent);
        }
    }

    addCooldownInfo() {
        const infoBox = document.createElement('div');
        infoBox.className = 'adventure-cooldown-info info-box';
        infoBox.style.display = 'block';
        
        infoBox.innerHTML = `
            <p>
            <i class="fa fa-info-circle"></i>
            Your heroes are on cooldown. Wait 3 hours after completing an adventure before starting a new one.
            </p>
        `;
        
        // Insert in the Start Adventure section, right after the button
        const startBtn = this.element.querySelector('.start-adventure-btn');
        if (startBtn) {
            startBtn.insertAdjacentElement('afterend', infoBox);
        }
    }

    getStartAdventureHTML() {
        const { hasScout, scoutAvailable, scoutCost, ownedHeroes, tier, gridRows, gridCols } = this.state;
        
        return `
       
            
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
                    <button class="btn btn-primary purchase-scout-btn">
                        <i class="fas fa-shopping-cart"></i> Purchase Scout
                    </button>
                </div>
            ` : ''}
            
            <div class="page-section">
                <h2>Start Adventure</h2>
                <button class="btn btn-primary btn-large start-adventure-btn" ${!hasScout && ownedHeroes.length === 0 ? 'disabled' : ''}>
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
                <div class="adventure-grid" data-rows="${gridRows}" data-cols="${gridCols}">
                    ${this.getAdventureGridHTML()}
                </div>
            </div>
            
            <div class="page-section">
                <div class="adventure-actions">
                    <button class="btn btn-md btn-secondary complete-adventure-btn">
                        Complete Adventure
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
            <div class="page-container">
                <h1 class="page-title">Adventure Hub</h1>
                <p class="page-description">
                    Embark on dangerous expeditions to discover <strong>resources</strong>, <em>rare relics</em>, and face potential disasters. 
                    Each tile reveals new surprises - choose wisely when to continue or return!
                </p>
                
                <div class="page-section">
                    <h2>Adventure Mechanics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Current Tier:</span>
                            <span class="status-value" data-state="tier">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Disaster Chance:</span>
                            <span class="status-value">15%</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Special Chance:</span>
                            <span class="status-value">5%</span>
                        </div>
                    </div>
                </div>
                
                <div class="page-section">
                    <h2>Adventure Rewards</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value" data-state="goldCollected">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Food:</span>
                            <span class="status-value" data-state="foodCollected">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Diamonds:</span>
                            <span class="status-value" data-state="diamondsCollected">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">REP:</span>
                            <span class="status-value" data-state="repCollected">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Relics:</span>
                            <span class="status-value" data-state="relicsFound">0</span>
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

