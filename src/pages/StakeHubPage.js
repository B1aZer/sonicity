import { formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { NFTCard } from '../components/NFTCard.js';
import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { ethers } from 'ethers';

import('../styles/stake-hub-page.css');

/**
 * @typedef {Object} StakedBuilding
 * @property {number} id - Building ID
 * @property {number} buildingType - Building type (0: House, 1: Farm, 2: Diamond Station, 3: REP Forge)
 * @property {number} level - Building level
 * @property {number} lastCollectionTime - Last collection timestamp
 * @property {boolean} isAtCap - Whether building is at production cap
 * @property {number} claimable - Claimable resources
 * @property {number} progressCurrent - Current production progress
 * @property {number} progressMax - Maximum production progress
 * @property {number} progressPercent - Production progress percentage
 * @property {Object} config - Building configuration
 * @property {number} productionRate - Current production rate
 * @property {Object} upgradeInfo - Upgrade information
 * @property {number} tokenId - Staked NFT token ID
 * @property {string} contractAddress - NFT contract address
 * @property {Object} metadata - NFT metadata
 * @property {boolean} isStaked - Whether building is staked
 * @property {string} formattedRechargeCost - Formatted recharge cost for display
 */

export class StakePage extends BasePage {
    constructor() {
        super();
        
        Logger.info('StakePage (GridHub style) constructor called');
        
        this.element.className = 'base-page stake-hub-page';
        
        this.statusComponent = new StatusComponent();
        this.state = {
            usedSlots: 0,
            totalSlots: 0,
            totalStaked: 0,
            atCap: 0,
            damaged: 0,
            availableNFTs: [],
            stakedBuildings: [],
            byTier: { 0: [], 1: [], 2: [], 3: [], 4: [] },
            selectedTier: 0,
            // Resource values
            gold: 0,
            food: 0,
            diamonds: 0,
            repPoints: 0,
            buildingSlotsReached: false // New state variable
        };
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('StakePage (GridHub style) onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        try {
            await this.loadUserData();
            this.setupEventListeners();
            Logger.info('Stake page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing stake page:', error);
            this.modal.error('Failed to initialize stake page. Please try refreshing the page.');
        }
    }

    render() {
        this.element.innerHTML = `
        <div class="page-container-outer">
            <div class="page-container">
                <h1>Grid Building Management</h1>
                <p class="page-description">
                    Stake your NFTs to create grid buildings. Manage, upgrade, and recharge your buildings here.
                </p>
                
                <!-- Status Grid -->
                <div class="page-section status-section">
                    <h2>Grid Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Buildings Constructed:</span>
                            <span class="status-value buildings-constructed-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Slots Available:</span>
                            <span class="status-value slots-available-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Capped:</span>
                            <span class="status-value at-cap-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Damaged:</span>
                            <span class="status-value damaged-value">0</span>
                        </div>
                    </div>
                </div>
                <!-- Resources Status Section -->
                <div class="page-section resources-status-section">
                    <h2>Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value gold-value" style="color: #FFD700; font-weight: bold;">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Food:</span>
                            <span class="status-value food-value" style="color: #90EE90; font-weight: bold;">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Diamonds:</span>
                            <span class="status-value diamonds-value" style="color: #00BCD4; font-weight: bold;">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Rep Points:</span>
                            <span class="status-value rep-points-value" style="color: #4CAF50; font-weight: bold;">0</span>
                        </div>
                    </div>
                </div>
                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <div class="tabs">
                        <button class="tab active" data-tier="0">
                            <span class="tab-label">Tier 0 (Houses)</span>
                            <span class="tab-count">0</span>
                        </button>
                        <button class="tab" data-tier="1">
                            <span class="tab-label">Tier 1 (Farms)</span>
                            <span class="tab-count">0</span>
                        </button>
                        <button class="tab" data-tier="2">
                            <span class="tab-label">Tier 2 (Diamond Stations)</span>
                            <span class="tab-count">0</span>
                        </button>
                        <button class="tab" data-tier="3">
                            <span class="tab-label">Tier 3 (REP Forges)</span>
                            <span class="tab-count">0</span>
                        </button>
                        <button class="tab" data-tier="4">
                            <span class="tab-label">Tier 4 (Yield Stations)</span>
                            <span class="tab-count">0</span>
                        </button>
                    </div>
                    <div class="tier-content active" data-tier="0"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="1"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="2"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="3"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="4"><div class="buildings-grid"></div></div>
                </div>
            </div>
        </div>
        `;
    }

    setupEventListeners() {
        // Tier tab switching
        const tierTabs = this.element.querySelectorAll('.tab');
        tierTabs.forEach(tab => {
            tab.addEventListener('click', async () => {
                this.element.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.element.querySelectorAll('.tier-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tier = tab.dataset.tier;
                this.element.querySelector(`.tier-content[data-tier="${tier}"]`).classList.add('active');
                this.state.selectedTier = Number(tier);
                await this.renderTierContent(Number(tier));
            });
        });
    }

    async loadUserData() {
        const userAddress = await this.contracts.nft.getAddress();
        let usedSlots = 0, totalSlots = 0;
        try {
            const stakedBuildings = await this.getStakedBuildings(userAddress);
            usedSlots = stakedBuildings.length;
            totalSlots = Number(await this.contracts.gameState.getBuildingSlots());
        } catch (e) {
            usedSlots = 0;
            totalSlots = 0;
        }
        
        // Get player resources
        let gold = 0, food = 0, diamonds = 0, repPoints = 0;
        
        try {
            [gold, food, repPoints] = await Promise.all([
                this.contracts.gameState.getPlayerGold(userAddress),
                this.contracts.gameState.getPlayerFood(userAddress),
                this.contracts.gameState.getPlayerRep(userAddress)
            ]);
            
            // Get diamonds balance
            diamonds = await this.contracts.gameState.getPlayerDiamonds(userAddress);
        } catch (error) {
            Logger.error('Error fetching player resources:', error);
        }
        
        const stakedBuildings = await this.getStakedBuildings(userAddress);
        const availableNFTs = await this.getAvailableNFTs(userAddress);
        // Group by buildingType (0: House, 1: Farm, 2: Diamond Station, 3: REP Forge)
        const byTier = { 0: [], 1: [], 2: [], 3: [], 4: [] };
        let atCap = 0, damaged = 0;
        stakedBuildings.forEach(b => {
            byTier[b.buildingType]?.push(b);
            if (b.isAtCap) atCap++;
            if (b.damaged) damaged++;
        });
        availableNFTs.forEach(nft => {
            byTier[nft.tier]?.push(nft);
        });
        
        // Check if player has reached building slot limit
        const buildingSlotsReached = usedSlots >= totalSlots;
        
        this.state = {
            ...this.state,
            usedSlots,
            totalSlots,
            totalStaked: stakedBuildings.length,
            atCap,
            damaged,
            availableNFTs,
            stakedBuildings,
            byTier,
            gold: Number(gold),
            food: Number(food),
            diamonds: Number(diamonds),
            repPoints: Number(repPoints),
            buildingSlotsReached
        };
        this.updateStatusSection();
        await this.updateTierTabs();
        this.renderTierContent(this.state.selectedTier);
    }

    updateStatusSection() {
        this.element.querySelector('.buildings-constructed-value').textContent = this.state.usedSlots;
        this.element.querySelector('.slots-available-value').textContent = this.state.totalSlots - this.state.usedSlots;
        this.element.querySelector('.at-cap-value').textContent = this.state.atCap;
        this.element.querySelector('.damaged-value').textContent = this.state.damaged;
        
        // Update resource values
        this.element.querySelector('.gold-value').textContent = this.state.gold.toLocaleString();
        this.element.querySelector('.food-value').textContent = this.state.food.toLocaleString();
        this.element.querySelector('.diamonds-value').textContent = this.state.diamonds.toLocaleString();
        this.element.querySelector('.rep-points-value').textContent = this.state.repPoints.toLocaleString();
    }

    async updateTierTabs() {
        // Get the player's tier (not city tier)
        let playerTier = 0;
        try {
            const userAddress = await this.contracts.nft.getAddress();
            playerTier = Number(await this.contracts.gameState.getPlayerTier(userAddress));
            Logger.info('Player tier:', playerTier);
        } catch (error) {
            Logger.warn('Error getting player tier:', error);
            // Default to tier 0 if error
            playerTier = 0;
        }
        
        for (let tier = 0; tier <= 4; tier++) {
            const tab = this.element.querySelector(`.tab[data-tier="${tier}"]`);
            const count = this.state.byTier[tier].length;
            tab.querySelector('.tab-count').textContent = count;
            
            // Tier unlocking logic based on player tier:
            // - Tier 0 (Houses): Always unlocked
            // - Tier 1 (Farms): Requires player tier 1+
            // - Tier 2 (Diamond Stations): Requires player tier 2+
            // - Tier 3 (Rep Stations): Requires player tier 3+
            // - Tier 4 (Yield Stations): Requires player tier 4+
            const isUnlocked = tier === 0 || tier <= playerTier;
            
            Logger.info(`Tier ${tier}: playerTier=${playerTier}, isUnlocked=${isUnlocked}`);
            
            // Enable tab if tier is unlocked, regardless of building count
            tab.disabled = !isUnlocked;
            if (!isUnlocked) {
                tab.classList.add('locked');
            } else {
                tab.classList.remove('locked');
            }
        }
        
    }

    async renderTierContent(tier) {
        const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
        const items = this.state.byTier[tier];
        const staked = items.filter(i => i.isStaked);
        
        // Get upgrade progress for this tier
        const upgradeProgress = await this.contracts.gameState.getUpgradeProgress(tier);
        const formattedProgress = this.contracts.gameState.formatUpgradeProgress(upgradeProgress);
        
        // --- Per-Tier Section ---
        const tierStatus = this.getTierStatus(tier, staked);
        const claimable = tierStatus.claimable.toLocaleString();
        const buildingCount = tierStatus.count;
        
        // Recharge input default
        const rechargeDefault = buildingCount;
        
        // Get the correct recharge cost for this tier
        let rechargePrice = '0';
        try {
            const rechargeCost = await this.contracts.gridBuildings.getRechargeFeeForBuildingType(tier);
            rechargePrice = this.contracts.gridBuildings.formatRechargeFee(rechargeCost);
        } catch (error) {
            Logger.warn(`Failed to get recharge cost for tier ${tier}:`, error);
            rechargePrice = '0.01'; // fallback
        }
        
        // Get mint pricing for this tier
        let mintPrice = '0';
        let mintPriceRaw = 0n; // Raw cost for transactions
        let mintResourceType = '';
        let mintResourceName = '';
        try {
            const [cost, resourceType] = await this.contracts.gridBuildings.getBuildingCost(tier);
            console.log(`[DEBUG] getBuildingCost for tier ${tier}:`, { cost: cost.toString(), resourceType });
            mintPriceRaw = cost;
            mintResourceType = resourceType;
            
            // Format price based on resource type
            if (resourceType === 4n) { // SONIC
                mintPrice = this.contracts.gridBuildings.formatRechargeFee(cost);
                mintResourceName = 'SONIC';
            } else if (resourceType === 0n) { // Gold
                mintPrice = cost.toString();
                mintResourceName = 'Gold';
            } else if (resourceType === 1n) { // Food
                mintPrice = cost.toString();
                mintResourceName = 'Food';
            } else if (resourceType === 2n) { // REP
                mintPrice = cost.toString();
                mintResourceName = 'REP';
            } else if (resourceType === 3n) { // Diamonds
                mintPrice = cost.toString();
                mintResourceName = 'Diamonds';
            }
            
            console.log(`[DEBUG] Final price values for tier ${tier}:`, { 
                mintPrice, 
                mintPriceRaw: mintPriceRaw.toString(), 
                mintResourceType, 
                mintResourceName 
            });
        } catch (error) {
            Logger.warn(`Failed to get mint cost for tier ${tier}:`, error);
            mintPrice = '0';
            mintPriceRaw = 0n;
            mintResourceName = 'Unknown';
        }
        
        // Status section (like CityPage)
        const tierNames = ['House', 'Farm', 'Diamond Station', 'REP Forge', 'Yield Station'];
        const tierNamesPlural = ['Houses', 'Farms', 'Diamond Stations', 'REP Forges', 'Yield Stations'];
        const rechargeHeader = buildingCount === 1 ? `Charge ${tierNames[tier]}` : `Charge ${tierNamesPlural[tier]}`;
        
        // Format upgrade progress for display
        let upgradeStatusText = '';
        if (formattedProgress.isMaxLevel) {
            upgradeStatusText = 'Maximum level reached';
        } else {
            upgradeStatusText = ''; // Remove redundant text, progress bar shows the info
        }
        
        // Build the complete tier content HTML
        const tierHTML = `
            <div class="page-section tier-status-section">
                <h3>${tierNames[tier]} Status</h3>
                <div class="status-grid">
                    <div class="status-item"><span class="status-label">Buildings:</span><span class="status-value">${buildingCount}</span></div>
                    <div class="status-item"><span class="status-label">Claimable:</span><span class="status-value">${claimable}</span></div>
                    <div class="status-item"><span class="status-label">Unlocked Level:</span><span class="status-value">${formattedProgress.currentLevel}</span></div>
                </div>
            </div>
            
            <div class="page-section tier-progress-section">
                <h3>${rechargeHeader}</h3>
                <div class="donation-form" style="margin-top:16px; align-items: center;">
                    <input type="number" class="input input-lg recharge-amount" min="1" max="${buildingCount}" value="${rechargeDefault}" />
                    <button class="btn btn-primary btn-md recharge-tier-btn">
                        <i class="fas fa-bolt"></i> Charge
                    </button>
                </div>
                <div class="upgrade-info" style="display: none; margin-top: 16px;">
                    ${formattedProgress.isMaxLevel ? `
                        <div class="upgrade-status">${upgradeStatusText}</div>
                    ` : `
                        <div class="progress-container" title="Upgrade progress: ${formattedProgress.formattedCurrent} / ${formattedProgress.formattedNext} SONIC">
                            <div class="progress-bar upgrade-progress" style="width:${formattedProgress.progressPercent}%"></div>
                        </div>
                    `}
                </div>
            </div>
            
            <div class="page-section tier-actions-section">
                <h3>${tierNames[tier]} Actions</h3>
                ${tier === 4 ? 
                    `<button class="btn btn-md btn-secondary" disabled title="Create Yield NFTs in Arcanum building first">
                        Mint ${tierNames[tier]}
                    </button>` :
                    this.state.buildingSlotsReached ? 
                    `<button class="btn btn-md btn-secondary" disabled title="Building slot limit reached for current tier. Upgrade your tier to get more slots.">
                        Mint ${tierNames[tier]}
                    </button>` :
                    `<button class="btn btn-md btn-primary mint-building-btn" data-tier="${tier}" data-price="${mintPrice}" data-price-raw="${mintPriceRaw.toString()}" data-resource-type="${mintResourceType}" data-resource-name="${mintResourceName}" title="Mint ${tierNames[tier]} for ${mintPrice} ${mintResourceName}">
                        <span class="mint-price">${mintPrice}<span class="mint-resource-icon">${this.getResourceIcon(mintResourceType)}</span></span> Mint ${tierNames[tier]}
                    </button>`
                }
                <button class="btn btn-md btn-primary claim-all-btn"><i class="fas fa-coins"></i> Claim All</button>
            </div>
            
            <div class="buildings-grid">
                ${!items || items.length === 0 ? 
                    `<div class="empty-state"><h3>No Buildings in this tier</h3></div>` :
                    items.map(item => this.renderCard(item)).join('')
                }
            </div>
        `;
        
        // Replace the entire tier content
        tierContent.innerHTML = tierHTML;
        
        // Attach event listeners for action buttons
        if (items && items.length > 0) {
            const grid = tierContent.querySelector('.buildings-grid');
            Array.from(grid.children).forEach((card, i) => {
                this.attachCardListeners(card, items[i]);
            });
        }
        
        // Attach per-tier action listeners
        tierContent.querySelector('.claim-all-btn')?.addEventListener('click', () => this.claimAllInTier(tier));
        tierContent.querySelector('.mint-building-btn')?.addEventListener('click', (e) => {
            const button = e.target.closest('.mint-building-btn') || e.target;
            const tier = Number(button.dataset.tier);
            const price = button.dataset.price;
            const priceRaw = button.dataset.priceRaw;
            const resourceType = BigInt(button.dataset.resourceType);
            const resourceName = button.dataset.resourceName;
            this.mintBuilding(tier, price, priceRaw, resourceType, resourceName);
        });
        tierContent.querySelector('.recharge-tier-btn')?.addEventListener('click', () => {
            const input = tierContent.querySelector('.recharge-amount');
            const n = Math.max(1, Math.min(Number(input.value), buildingCount));
            this.rechargeNInTier(tier, n);
        });
    }

    getTierStatus(tier, staked) {
        // Calculate number of buildings and total claimable
        let claimable = 0;
        staked.forEach(b => { claimable += b.claimable || 0; });
        return { count: staked.length, claimable };
    }

    async claimAllInTier(tier) {
        try {
            // Show loading modal
            const loadingModal = this.modal.loading('Claiming resources...');
            
            await this.contracts.gridBuildings.collectResourcesByType(tier);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('Resources claimed successfully!', { title: 'Resources Collected!' });
        } catch (e) {
            Logger.error('Error claiming resources:', e);
            this.modal.error(e.message || 'Failed to claim resources', { title: 'Collection Failed' });
        }
    }

    async rechargeNInTier(tier, n) {
        try {
            // Show loading modal
            const loadingModal = this.modal.loading(`Charging ${n} building(s)...`);
            
            // Find N staked buildings in this tier, prioritize at cap, then oldest
            const items = this.state.byTier[tier].filter(i => i.isStaked && !i.damaged);
            const atCap = items.filter(b => b.isAtCap);
            const notAtCap = items.filter(b => !b.isAtCap);
            notAtCap.sort((a, b) => (a.lastCollection || '').localeCompare(b.lastCollection || ''));
            const selected = [...atCap, ...notAtCap].slice(0, n);
            if (selected.length === 0) throw new Error('No buildings to charge');
            
            await this.contracts.gridBuildings.rechargeBuildings(selected.map(b => b.id));
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('Buildings charged successfully!', { title: 'Buildings Charged!' });
        } catch (e) {
            Logger.error('Error charging buildings:', e);
            this.modal.error(e.message || 'Failed to charge buildings', { title: 'Charge Failed' });
        }
    }

    renderCard(item) {
        if (item.isStaked) {
            // Staked building card (GridHub style)
            let statusClass = item.damaged ? 'damaged' : item.isAtCap ? 'at-cap' : 'normal';
            let statusText = item.damaged ? 'Damaged' : item.isAtCap ? 'At Cap' : 'Operating';
            
            // Check if building has been charged (lastRechargeTime > 0)
            const hasBeenCharged = item.lastRechargeTime && item.lastRechargeTime > 0;
            if (!item.damaged && !item.isAtCap && !hasBeenCharged) {
                statusText = 'Idle';
                statusClass = 'not-charged';
            }
            
            // Map buildingType to name/icon
            const tierNames = ['House', 'Farm', 'Diamond Station', 'REP Forge', 'Yield Station'];
            const icons = ['🏠', '🌾', '💎', '🔨', '⚡']; // Added Yield Station icon
            const name = tierNames[item.buildingType] || 'Building';
            const icon = icons[item.buildingType] || '🏗️';
            
            // Calculate production rate correctly for each building type
            let productionRate = 0;
            let resourceType = '';
            let productionDurationHours = 24;
            
            if (item.buildingType === 0) { // House
                productionRate = item.config.baseProductionRate * item.level;
                resourceType = 'Gold';
                productionDurationHours = 24;
            } else if (item.buildingType === 1) { // Farm
                productionRate = item.config.baseProductionRate * item.level;
                resourceType = 'Food';
                productionDurationHours = 24;
            } else if (item.buildingType === 2) { // Diamond Station
                // Diamond Stations: 1 diamond per 72 hours at level 1
                productionRate = item.level / 72; // diamonds per hour
                resourceType = 'Diamonds';
                productionDurationHours = 72;
            } else if (item.buildingType === 3) { // REP Forge
                // REP Forges: 1 rep NFT per 168 hours at level 1
                productionRate = item.level / 168; // rep per hour
                resourceType = 'Rep';
                productionDurationHours = 168;
            } else if (item.buildingType === 4) { // Yield Station
                // Yield Stations have dynamic revenue rates based on weight and pool
                // The actual rate is calculated in getStakedBuildings and stored in item.yieldRate
                productionRate = item.yieldRate || 0; // Use stored rate from building data
                resourceType = 'SONIC';
                productionDurationHours = 24; // Yield stations last 24 hours
            }
            
            // Format production rate for display
            let productionRateDisplay = '';
            if (item.buildingType === 2 || item.buildingType === 3) {
                // For Diamond Stations and REP Forges, show as "X per Y hours"
                const hoursPerUnit = item.buildingType === 2 ? 72 : 168;
                const unitsPerCycle = item.level;
                productionRateDisplay = `${unitsPerCycle} per ${hoursPerUnit}h`;
            } else if (item.buildingType === 4) {
                // For Yield Stations, show dynamic rate in SONIC per hour
                if (productionRate > 0) {
                    const ratePerHour = productionRate * 3600; // Convert per-second to per-hour
                    productionRateDisplay = `${ratePerHour.toFixed(2)} SONIC/hr`;
                    console.log(`[DEBUG] Yield Station productionRate: ${productionRate} SONIC/sec, ratePerHour: ${ratePerHour}, display: ${productionRateDisplay}`);
                } else {
                    productionRateDisplay = '0.00 SONIC/hr';
                }
            } else {
                // For Houses and Farms, show as "X per hour"
                productionRateDisplay = `${productionRate}/hr`;
            }
            
            // Format progress information
            const progressPercent = item.progressPercent || 0;
            
            // Calculate time remaining with proper bounds checking
            let hoursRemaining = 0;
            let minutesRemaining = 0;
            let progressText = 'At Cap';
            
            if (!item.isAtCap) {
                if (hasBeenCharged && item.progressCurrent !== undefined && item.progressMax !== undefined && item.progressMax > 0) {
                    const timeRemaining = Math.max(0, item.progressMax - item.progressCurrent);
                    hoursRemaining = Math.floor(timeRemaining / 3600);
                    minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
                    progressText = `${hoursRemaining}h ${minutesRemaining}m remaining`;
                } else {
                    // Building hasn't been charged yet
                    progressText = 'Not Charged';
                }
            }
            
            // Get upgrade information from item (will be populated by getStakedBuildings)
            const upgradeInfo = item.upgradeInfo;
            const canUpgrade = upgradeInfo?.canUpgrade || false;
            const upgradeCost = upgradeInfo?.upgradeCost || 0n;
            const maxLevel = upgradeInfo?.maxLevel || 1;
            const currentLevel = item.level || 0;
            
            // Format upgrade button text and determine if disabled
            let upgradeButtonText = 'Upgrade';
            // Only disable if damaged or if upgrade level is not unlocked (not for diamond shortage)
            let upgradeDisabled = item.damaged || currentLevel >= maxLevel;
            let upgradeTooltip = '';
            
            if (currentLevel >= maxLevel) {
                upgradeButtonText = 'Max Level';
                upgradeDisabled = true;
                upgradeTooltip = 'Building has reached maximum level';
            } else if (item.damaged) {
                upgradeTooltip = 'Building is damaged and needs repair before upgrading';
            } else {
                upgradeTooltip = `Upgrade to level ${currentLevel + 1} for ${upgradeCost} diamonds`;
            }
            
            return `
                <div class="building-card ${statusClass}" data-building-id="${item.id}">
                    <div class="building-header">
                        <div class="building-icon">
                            ${item.metadata?.image ? 
                                `<img src="${item.metadata.image}" onerror="this.src='/images/placeholder.jpg'" alt="NFT" />` : 
                                icon
                            }
                        </div>
                        <div class="building-info">
                            <h3>${name} #${item.id}</h3>
                            <p class="building-description">Level ${currentLevel}${maxLevel > 1 ? ` / ${maxLevel}` : ''}</p>
                        </div>
                        <div class="building-status ${statusClass}">
                            <span class="status-indicator"></span>
                            <span class="status-text">${statusText}</span>
                        </div>
                    </div>
                    <div class="building-details">
                        <div class="detail-item"><span class="detail-label">Level:</span><span class="detail-value">${currentLevel}${maxLevel > 1 ? ` / ${maxLevel}` : ''}</span></div>
                        <div class="detail-item"><span class="detail-label">Production Rate:</span><span class="detail-value">${productionRateDisplay}</span></div>
                        <div class="detail-item"><span class="detail-label">Charge Price:</span><span class="detail-value">${item.formattedRechargeCost || '0'} SONIC</span></div>
                        <div class="detail-item"><span class="detail-label">Claimable:</span><span class="detail-value">${item.claimable || 0}</span></div>
                        <div class="building-progress">
                            <div class="progress-info">
                                <span class="progress-label">Production Progress</span>
                                <span class="progress-time">${progressText}</span>
                            </div>
                            <div class="progress-container" title="${Math.floor(item.progressCurrent / 3600)}h / ${productionDurationHours}h production">
                                <div class="progress-bar" style="width:${progressPercent}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="building-actions">
                        <button class="btn btn-full btn-primary recharge-btn" ${item.damaged ? 'disabled' : ''}><i class="fas fa-bolt"></i> Charge</button>
                        <button class="btn btn-full btn-secondary claim-btn" ${item.damaged || item.claimable <= 0 ? 'disabled' : ''}><i class="fas fa-coins"></i> Claim</button>
                        <button class="btn btn-full btn-primary upgrade-btn" ${upgradeDisabled ? 'disabled' : ''} title="${upgradeTooltip}"><i class="fas fa-arrow-up"></i> ${upgradeButtonText}</button>
                        <button class="btn btn-full btn-warning destroy-btn"><i class="fas fa-undo"></i> Unstake</button>
                    </div>
                </div>
            `;
        } else {
            // Unstaked NFT card (now styled like staked)
            const statusClass = 'unstaked';
            const statusText = 'Unstaked';
            const tokenId = item.tokenId ? item.tokenId : '-';
            const contract = item.contractAddress ? item.contractAddress : '-';
            const contractShort = contract !== '-' ? `...${contract.slice(-6)}` : '-';
            const tierName = this.getTierName(item.tier);
            return `
                <div class="building-card" data-nft-id="${item.tokenId}">
                    <div class="building-header">
                        <div class="building-icon">
                            ${item.metadata?.image ? 
                                `<img src="${item.metadata.image}" onerror="this.src='/images/placeholder.jpg'" alt="NFT" />` : 
                                this.getBuildingIcon(item.tier)
                            }
                        </div>
                        <div class="building-info">
                            <h3>${item.metadata?.name || 'NFT'}</h3>
                            <p class="building-description">${item.metadata?.description || ''}</p>
                        </div>
                        <div class="building-status ${statusClass}">
                            <span class="status-indicator"></span>
                            <span class="status-text">${statusText}</span>
                        </div>
                    </div>
                    <div class="building-details">
                        <div class="detail-item"><span class="detail-label">Token ID:</span><span class="detail-value">${tokenId}</span></div>
                        <div class="detail-item"><span class="detail-label">Contract:</span><span class="detail-value">${contractShort}</span></div>
                        <div class="detail-item"><span class="detail-label">Tier:</span><span class="detail-value">${tierName}</span></div>
                    </div>
                    <div class="building-actions">
                        <button class="btn btn-full btn-primary stake-btn">Stake</button>
                        <button class="btn btn-full btn-danger burn-btn"><i class="fas fa-fire"></i> Burn</button>
                    </div>
                </div>
            `;
        }
    }

    attachCardListeners(card, item) {
        if (item.isStaked) {
            card.querySelector('.recharge-btn')?.addEventListener('click', () => this.rechargeBuilding(item));
            card.querySelector('.upgrade-btn')?.addEventListener('click', () => this.upgradeBuilding(item));
            card.querySelector('.claim-btn')?.addEventListener('click', () => this.claimBuilding(item));
            card.querySelector('.destroy-btn')?.addEventListener('click', () => {
                this.destroyBuilding(item);
            });
        } else {
            card.querySelector('.stake-btn')?.addEventListener('click', () => this.stakeNFT(item.tokenId, item.contractAddress));
            card.querySelector('.burn-btn')?.addEventListener('click', () => this.burnNFT(item.tokenId, item.contractAddress));
        }
    }

    // --- Helpers and contract calls ---
    getBuildingIcon(tier) {
        switch (Number(tier)) {
            case 0: return '🏠';
            case 1: return '🌾';
            case 2: return '💎';
            case 3: return '🔨';
            case 4: return '⚡'; // Yield Station icon
            default: return '🏗️';
        }
    }

    getTierName(tier) {
        switch (Number(tier)) {
            case 0: return 'House';
            case 1: return 'Farm';
            case 2: return 'Diamond Station';
            case 3: return 'REP Forge';
            case 4: return 'Yield Station';
            default: return 'Unknown';
        }
    }

    getResourceIcon(resourceType) {
        switch (Number(resourceType)) {
            case 0: return '<i class="fas fa-coins"></i>'; // Gold
            case 1: return '<i class="fas fa-wheat-awn"></i>'; // Food
            case 2: return '<i class="fas fa-star"></i>'; // REP
            case 3: return '<i class="fas fa-gem"></i>'; // Diamonds
            case 4: return '<i class="fas fa-dollar-sign"></i>'; // SONIC
            default: return '<i class="fas fa-question"></i>';
        }
    }

    // --- Replace dummy implementations below with real contract calls ---
    async getStakedBuildings(userAddress) {
        // console.log('[DEBUG] getStakedBuildings for address:', userAddress);
        const buildings = await this.contracts.gridBuildings.getActiveBuildingsWithData(userAddress);
        // console.log('[DEBUG] getActiveBuildingsWithData returned:', buildings);
        
        for (const building of buildings) {
            // console.log(`[DEBUG] Processing building ${building.id}:`, building);
            
            // Add staked flag
            building.isStaked = true;
            
            // Get building configuration for production rate and other details
            const config = await this.contracts.gridBuildings.getBuildingConfig(building.buildingType);
            building.config = {
                name: config.name,
                baseProductionRate: Number(config.baseProductionRate),
                upgradeCost: Number(config.upgradeCost),
                maxLevel: Number(config.maxLevel),
                description: config.description,
                tier: Number(config.tier),
                rechargeCost: config.rechargeCost // Add recharge cost to config
            };
            
            // Get formatted recharge cost for display
            building.formattedRechargeCost = this.contracts.gridBuildings.formatRechargeFee(config.rechargeCost);
            
            // Add extra info for UI
            building.isAtCap = await this.contracts.gridBuildings.isBuildingAtCap(building.id);
            building.claimable = Number(await this.contracts.gridBuildings.calculateClaimableResources(building.id));

            // Use contract method for production progress
            const [progressCurrent, progressMax, progressPercent] = await this.contracts.gridBuildings.calculateProductionProgress(building.id);
            building.progressCurrent = Number(progressCurrent);
            building.progressMax = Number(progressMax);
            building.progressPercent = Number(progressPercent);
            
            // Get upgrade info for this building
            try {
                building.upgradeInfo = await this.contracts.gridBuildings.getBuildingUpgradeInfo(building.id);
            } catch (error) {
                console.warn(`Failed to get upgrade info for building ${building.id}:`, error);
                // Provide fallback upgrade info
                building.upgradeInfo = {
                    canUpgrade: false,
                    currentLevel: building.level || 0,
                    maxLevel: 1,
                    upgradeCost: 0n,
                    errorMessage: 'Failed to load upgrade info',
                    buildingType: building.buildingType || 0,
                    damaged: building.damaged || false
                };
            }

            // For Yield Stations, get the actual revenue rate
            if (building.buildingType === 4) {
                try {
                    const yieldInfo = await this.contracts.gridBuildings.getYieldStationInfo(userAddress, building.id);
                    // Convert from wei per second to SONIC per second
                    building.yieldRate = Number(yieldInfo.revenueRate) / 1e18;
                    console.log(`[DEBUG] Building ${building.id} yieldRate: ${building.yieldRate} SONIC/sec, ${building.yieldRate * 3600} SONIC/hr`);
                } catch (error) {
                    console.error(`[ERROR] Failed to get yield rate for building ${building.id}:`, error);
                    building.yieldRate = 0; // Fallback to 0 if error
                }
            }
        }
        
        return buildings;
    }

    async getNFTInfoForBuilding(buildingId) {
        // console.log(`[DEBUG] Looking for NFT info for building ${buildingId}`);
        
        const nftContracts = [this.contracts.nft, this.contracts.farmNft, this.contracts.diamondNft, this.contracts.repNft, this.contracts.yieldNft];
        
        for (const contract of nftContracts) {
            try {
                const contractAddress = await contract.getContractAddress();
                // console.log(`[DEBUG] Checking contract: ${contractAddress}`);
                
                const userStakes = await this.contracts.altar.getUserStakesByCollection(await this.contracts.gameState.getAddress(), contractAddress);
                // console.log(`[DEBUG] User stakes for ${contractAddress}:`, userStakes);
                
                for (const tokenId of userStakes) {
                    const stakedBuildingId = await this.contracts.altar.getStakedBuilding(contractAddress, tokenId);
                    // console.log(`[DEBUG] Token ${tokenId} is staked to building ${stakedBuildingId}`);
                    // console.log(`[DEBUG] Comparing: Number(${stakedBuildingId}) === Number(${buildingId})`);
                    // console.log(`[DEBUG] Values: ${Number(stakedBuildingId)} === ${Number(buildingId)}`);
                    
                    if (Number(stakedBuildingId) === Number(buildingId)) {
                        // console.log(`[DEBUG] Found NFT! Token ${tokenId} from ${contractAddress} is staked to building ${buildingId}`);
                        return {
                            contractAddress,
                            tokenId: Number(tokenId),
                            isStaked: true
                        };
                    }
                }
            } catch (error) {
                // console.log(`[DEBUG] Error checking contract ${contract.constructor.name}:`, error);
            }
        }
        
        return {
            contractAddress: null,
            tokenId: null,
            isStaked: false
        };
    }

    async getAvailableNFTs(userAddress) {
        // Get unstaked NFTs from all contracts
        const nftContracts = [this.contracts.nft, this.contracts.farmNft, this.contracts.diamondNft, this.contracts.repNft, this.contracts.yieldNft];
        const available = [];
        for (const contract of nftContracts) {
            const balance = await contract.balanceOf(userAddress);
            for (let i = 0; i < balance; i++) {
                const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
                
                // Check if staked
                let isStaked = false;
                try {
                    isStaked = await this.contracts.altar.isStaked(await contract.getContractAddress(), tokenId);
                } catch (e) {}
                if (isStaked) continue;
                
                // Get token URI and metadata
                let tokenURI, metadata = {};
                try {
                    tokenURI = await contract.tokenURI(tokenId);
                    const response = await fetch(tokenURI);
                    metadata = await response.json();
                } catch (e) {}
                
                // Determine tier from contract type
                let tier = 0;
                if (contract === this.contracts.farmNft) tier = 1;
                else if (contract === this.contracts.diamondNft) tier = 2;
                else if (contract === this.contracts.repNft) tier = 3;
                else if (contract === this.contracts.yieldNft) tier = 4;
                
                available.push({
                    tokenId,
                    tier,
                    metadata,
                    contractAddress: await contract.getContractAddress(),
                    isStaked: false
                });
            }
        }
        return available;
    }

    // --- Action handlers ---
    async stakeNFT(tokenId, collection) {
        try {
            // Phase 1: Approve NFT transfer
            const loadingModal = this.modal.loading('Approving NFT transfer...');
            
            // Determine tier from UI or NFT
            let tier = 0;
            if (collection.toLowerCase() === (await this.contracts.farmNft.getContractAddress()).toLowerCase()) tier = 1;
            else if (collection.toLowerCase() === (await this.contracts.diamondNft.getContractAddress()).toLowerCase()) tier = 2;
            else if (collection.toLowerCase() === (await this.contracts.repNft.getContractAddress()).toLowerCase()) tier = 3;
            else if (collection.toLowerCase() === (await this.contracts.yieldNft.getContractAddress()).toLowerCase()) tier = 4;
            
            // Approve NFT transfer
            const altarAddress = await this.contracts.altar.getContractAddress();
            let nftContract = this.contracts.nft; // default
            if (collection.toLowerCase() === (await this.contracts.farmNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.farmNft;
            } else if (collection.toLowerCase() === (await this.contracts.diamondNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.diamondNft;
            } else if (collection.toLowerCase() === (await this.contracts.repNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.repNft;
            } else if (collection.toLowerCase() === (await this.contracts.yieldNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.yieldNft;
            }
            
            await nftContract.approve(altarAddress, tokenId);
            
            // Close approval loading modal
            loadingModal.close();
            
            // Phase 2: Stake NFT
            const stakingModal = this.modal.loading('Staking NFT...');
            
            // Stake NFT - use specialized function for yield stations
            if (tier === 4) {
                // Yield stations use specialized staking function
                await this.contracts.altar.stakeYieldNFT(tokenId);
            } else {
                // Regular buildings use generic stake function
                await this.contracts.altar.stake(tokenId, tier, collection);
            }
            
            // Close staking loading modal
            stakingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('NFT staked successfully!', { title: 'NFT Staked!' });
        } catch (e) {
            Logger.error('Error staking NFT:', e);
            this.modal.error(e.message || 'Failed to stake NFT', { title: 'Staking Failed' });
        }
    }
    
    async unstakeNFT(tokenId, collection) {
        try {
            // Show loading modal
            const loadingModal = this.modal.loading('Unstaking NFT...');
            
            // Unstake NFT
            await this.contracts.altar.unstake(collection, tokenId);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('NFT unstaked successfully!', { title: 'NFT Unstaked!' });
        } catch (error) {
            Logger.error('Error unstaking NFT:', error);
            
            // Check for specific error patterns
            if (error.message && error.message.includes('missing revert data')) {
                this.modal.error('Cannot unstake yet: NFT must be staked for at least 7 days before unstaking.', { title: 'Cannot Unstake Yet' });
            } else {
                this.modal.error(error.message || 'Failed to unstake NFT', { title: 'Unstaking Failed' });
            }
        }
    }
    
    async rechargeBuilding(item) {
        try {
            // Show loading modal
            const loadingModal = this.modal.loading('Charging building...');
            
            await this.contracts.gridBuildings.rechargeBuilding(item.id);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('Building charged successfully!', { title: 'Building Charged!' });
        } catch (e) {
            Logger.error('Error charging building:', e);
            this.modal.error(e.message || 'Failed to charge building', { title: 'Charge Failed' });
        }
    }
    
    async upgradeBuilding(item) {
        try {
            // Get upgrade info first to show appropriate error messages
            let upgradeInfo = null;
            try {
                upgradeInfo = await this.contracts.gridBuildings.getBuildingUpgradeInfo(item.id);
            } catch (e) {
                console.warn(`Could not get upgrade info for building ${item.id}:`, e);
            }
            
            // Check if upgrade is possible and show specific error if not
            if (upgradeInfo && !upgradeInfo.canUpgrade) {
                this.modal.error(upgradeInfo.errorMessage || 'Cannot upgrade building', { title: 'Upgrade Not Available' });
                return;
            }
            
            // Show loading modal
            let loadingMessage = 'Upgrading building...';
            
            const loadingModal = this.modal.loading(loadingMessage);
            
            await this.contracts.gridBuildings.upgradeBuilding(item.id);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('Building upgraded successfully!', { title: 'Building Upgraded!' });
        } catch (e) {
            Logger.error('Error upgrading building:', e);
            
            // Show specific error messages based on common failure reasons
            let errorMessage = e.message || 'Failed to upgrade building';
            if (errorMessage.includes('Insufficient SONIC balance')) {
                errorMessage = 'Insufficient SONIC balance for upgrade';
            } else if (errorMessage.includes('Cannot upgrade')) {
                errorMessage = 'Building cannot be upgraded at this time';
            } else if (errorMessage.includes('maximum level')) {
                errorMessage = 'Building is already at maximum level';
            } else if (errorMessage.includes('Upgrade level not unlocked')) {
                errorMessage = 'Upgrade level not unlocked. Charge more buildings to unlock higher levels.';
            }
            
            this.modal.error(errorMessage, { title: 'Upgrade Failed' });
        }
    }

    async claimBuilding(item) {
        try {
            // Show loading modal
            const loadingModal = this.modal.loading('Claiming resources...');
            
            await this.contracts.gridBuildings.collectResources(item.id);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('Resources claimed successfully!', { title: 'Resources Collected!' });
        } catch (e) {
            Logger.error('Error claiming resources:', e);
            this.modal.error(e.message || 'Failed to claim resources', { title: 'Collection Failed' });
        }
    }

    async mintBuilding(tier, price, priceRaw, resourceType, resourceName) {
        console.log(`[DEBUG] mintBuilding called with:`, { tier, price, priceRaw, resourceType, resourceName });
        const tierNames = ['House', 'Farm', 'Diamond Station', 'Rep Station', 'Yield Station'];
        
        try {
            const tierName = tierNames[tier];
            
            // Check if user has enough resources
            if (resourceType === 4n) { // SONIC
                // Check SONIC balance (native token balance)
                const userAddress = await this.contracts.nft.getAddress();
                const provider = this.contracts.nft.provider;
                const balance = await provider.getBalance(userAddress);
                console.log(`[DEBUG] SONIC balance check:`, {
                    userAddress,
                    balance: balance.toString(),
                    requiredAmount: priceRaw,
                    hasEnough: balance >= BigInt(priceRaw)
                });
                
                if (balance < BigInt(priceRaw)) {
                    this.modal.error(`Insufficient SONIC balance. You have ${ethers.formatEther(balance)} SONIC, but need ${ethers.formatEther(BigInt(priceRaw))} SONIC.`, { title: 'Insufficient Resources' });
                    return;
                }
            } else {
                // Check resource balance
                const userAddress = await this.contracts.nft.getAddress();
                let userBalance = 0;
                
                if (resourceType === 0n) { // Gold
                    userBalance = Number(await this.contracts.gameState.getPlayerGold(userAddress));
                } else if (resourceType === 1n) { // Food
                    userBalance = Number(await this.contracts.gameState.getPlayerFood(userAddress));
                } else if (resourceType === 2n) { // REP
                    userBalance = Number(await this.contracts.gameState.getPlayerRep(userAddress));
                } else if (resourceType === 3n) { // Diamonds
                    userBalance = Number(await this.contracts.gameState.getPlayerDiamonds(userAddress));
                }
                
                if (userBalance < Number(price)) {
                    this.modal.error(`Insufficient ${resourceName} balance. You have ${userBalance.toLocaleString()} ${resourceName}, but need ${Number(price).toLocaleString()} ${resourceName}.`, { title: 'Insufficient Resources' });
                    return;
                }
            }
            
            const loadingModal = this.modal.loading(`Minting ${tierName.toLowerCase()}...`);
            
            // Determine which NFT contract to use based on tier
            let nftContract, contractAddress;
            if (tier === 0) {
                // House - use SonicityNFT
                nftContract = this.contracts.nft;
                contractAddress = await nftContract.getContractAddress();
            } else if (tier === 1) {
                // Farm - use SonicityFarm
                nftContract = this.contracts.farmNft;
                contractAddress = await nftContract.getContractAddress();
            } else if (tier === 2) {
                // Diamond Station - use SonicityDiamond
                nftContract = this.contracts.diamondNft;
                contractAddress = await nftContract.getContractAddress();
            } else if (tier === 3) {
                // Rep Station - use SonicityRep
                nftContract = this.contracts.repNft;
                contractAddress = await nftContract.getContractAddress();
            } else if (tier === 4) { // Yield Station
                // Yield Stations can no longer be created directly in Stake Hub
                // Users must first create NFTs in Revenue Hub, then stake them manually
                throw new Error('Yield Stations must be created in Revenue Hub first. Go to Revenue Hub → Create Yield NFT → Return here to stake it.');
            } else {
                throw new Error(`Unsupported tier: ${tier}`);
            }
            
            // Get the next token ID to mint
            const totalSupply = await nftContract.totalSupply();
            const tokenId = totalSupply + 1n;
            
            // Use the mint function instead of mintAndStake
            if (resourceType === 4n) { // SONIC payment
                const sonicAmount = BigInt(priceRaw);
                console.log(`[DEBUG] Minting House with SONIC payment:`, {
                    contractAddress,
                    tokenId: tokenId.toString(),
                    tier,
                    sonicAmount: sonicAmount.toString(),
                    priceRaw,
                    price
                });
                await this.contracts.altar.mint(contractAddress, tokenId, tier, { value: sonicAmount });
            } else {
                // Resource-based payment
                console.log(`[DEBUG] Minting building with resource payment:`, {
                    contractAddress,
                    tokenId: tokenId.toString(),
                    tier,
                    resourceType,
                    resourceName,
                    price
                });
                await this.contracts.altar.mint(contractAddress, tokenId, tier);
            }
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success(`${tierName} minted successfully!`, { title: 'Building Minted!' });
        } catch (error) {
            this.modal.error(error.message || `Failed to mint ${tierNames[tier].toLowerCase()}`, { title: 'Minting Failed' });
        }
    }

    async createBuilding(tier) {
        // This function is now deprecated - use mintBuilding instead
        await this.mintBuilding(tier, '0', '0', 0, 'Unknown');
    }

    async burnNFT(tokenId, contractAddress) {
        try {
            // Show confirmation dialog
            const result = await this.modal.confirm(
                'Are you sure you want to burn this NFT?<br><br>This will permanently destroy the NFT. This action cannot be undone.',
                {
                    title: 'Confirm Burn',
                    confirmButtonText: 'Burn NFT',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d'
                }
            );
            
            if (!result.isConfirmed) {
                return; // User cancelled
            }
            
            const loadingModal = this.modal.loading('Burning NFT...');
            
            // Determine which NFT contract to use based on contract address
            let nftContract;
            if (contractAddress.toLowerCase() === (await this.contracts.nft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.nft;
            } else if (contractAddress.toLowerCase() === (await this.contracts.farmNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.farmNft;
            } else if (contractAddress.toLowerCase() === (await this.contracts.diamondNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.diamondNft;
            } else if (contractAddress.toLowerCase() === (await this.contracts.repNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.repNft;
            } else if (contractAddress.toLowerCase() === (await this.contracts.yieldNft.getContractAddress()).toLowerCase()) {
                nftContract = this.contracts.yieldNft;
            } else {
                throw new Error('Unknown NFT contract address');
            }
            
            // Burn the NFT directly using the contract's burn function
            await nftContract.burn(tokenId);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success('NFT burned successfully!', { title: 'NFT Burned!' });
        } catch (error) {
            Logger.error('Error burning NFT:', error);
            this.modal.error(error.message || 'Failed to burn NFT', { title: 'Burn Failed' });
        }
    }

    async destroyBuilding(item) {
        try {
            // Show confirmation dialog for unstaking
            const result = await this.modal.confirm(
                'Are you sure you want to unstake this building?<br><br>This will unstake the NFT and preserve the building data.<br><br><strong>WARNING: Any unclaimed resources will be lost!</strong>',
                {
                    title: 'Confirm Unstake',
                    confirmButtonText: 'Unstake Building',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#ffc107',
                    cancelButtonColor: '#6c757d'
                }
            );
            
            if (!result.isConfirmed) {
                return; // User cancelled
            }
            
            const loadingModal = this.modal.loading('Unstaking building...');
            
            // Get NFT info for this building
            const nftInfo = await this.getNFTInfoForBuilding(item.id);
            
            if (nftInfo.isStaked && nftInfo.contractAddress && nftInfo.tokenId) {
                // Add debugging information
                Logger.info('NFT Info:', nftInfo);
                Logger.info('Building level:', item.level);
                
                // Check staking duration for unstaking (if required)
                const minStakingDuration = await this.contracts.altar.getMinStakingDuration();
                Logger.info('Minimum staking duration:', minStakingDuration);
                
                // Get stake data to check staking time
                const stakeData = await this.contracts.altar.getStakeDataWithCollection(nftInfo.contractAddress, nftInfo.tokenId);
                Logger.info('Stake data:', stakeData);
                
                // Use blockchain time instead of browser time for testing compatibility
                const currentBlock = await this.contracts.gameState.provider.getBlock('latest');
                const currentTime = currentBlock.timestamp;
                const stakedAt = Number(stakeData.stakedAt);
                const timeStaked = currentTime - stakedAt;
                Logger.info('Current blockchain time:', currentTime);
                Logger.info('Staked at:', stakedAt);
                Logger.info('Time staked:', timeStaked);
                Logger.info('Time remaining:', Math.max(0, Number(minStakingDuration) - timeStaked));
                
                // Check if staking period is completed (for unstaking)
                if (timeStaked < 0) {
                    throw new Error(`Invalid staking time detected. The NFT appears to have been staked in the future. This might be due to a time synchronization issue. Please try again later.`);
                }
                
                if (timeStaked < Number(minStakingDuration)) {
                    const remainingTime = Number(minStakingDuration) - timeStaked;
                    const remainingHours = Math.ceil(remainingTime / 3600);
                    throw new Error(`Staking period not completed. You must wait ${remainingHours} more hours before unstaking this NFT.`);
                }
                
                // Unstake the NFT (preserves building data)
                await this.contracts.altar.unstake(nftInfo.contractAddress, nftInfo.tokenId);
                loadingModal.close();
                this.modal.success('Building unstaked successfully!', { title: 'Success!' });
            } else {
                // Fallback to direct destruction if no NFT found
                await this.contracts.altar.destroyBuilding(item.id);
                loadingModal.close();
                this.modal.success('Building destroyed successfully!', { title: 'Success!' });
            }
            
            await this.loadUserData();
        } catch (error) {
            Logger.error('Error unstaking building:', error);
            this.modal.error(error.message || 'Failed to unstake building', { title: 'Action Failed' });
        }
    }

    showStatus(type, message, title = '') {
        const statusElement = this.statusComponent.show(message, type);
        const pageContainer = this.element.querySelector('.page-container');
        if (pageContainer) {
            const firstSection = pageContainer.querySelector('.page-section');
            if (firstSection) {
                firstSection.after(statusElement);
            } else {
                pageContainer.appendChild(statusElement);
            }
        } else {
            this.element.appendChild(statusElement);
        }
    }
}