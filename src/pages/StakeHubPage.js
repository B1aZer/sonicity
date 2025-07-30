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
            byTier: { 0: [], 1: [], 2: [], 3: [] },
            selectedTier: 0,
            // Resource values
            gold: 0,
            food: 0,
            diamonds: 0,
            repPoints: 0
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
                    </div>
                </div>
                <!-- NFT Status Section -->
                <div class="page-section nft-status-section">
                    <h2>NFT Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Unstaked:</span>
                            <span class="status-value total-nfts-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Staked:</span>
                            <span class="status-value total-staked-value">0</span>
                        </div>
                    </div>
                </div>
                <!-- Buildings Status Section -->
                <div class="page-section buildings-status-section">
                    <h2>Buildings Status</h2>
                    <div class="status-grid">
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
                    </div>
                    <div class="tier-content active" data-tier="0"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="1"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="2"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="3"><div class="buildings-grid"></div></div>
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
        
        // Load resource values
        let gold = 0, food = 0, diamonds = 0, repPoints = 0;
        try {
            [gold, food, repPoints] = await Promise.all([
                this.contracts.gameState.getPlayerGold(userAddress),
                this.contracts.gameState.getPlayerFood(userAddress),
                this.contracts.gameState.getPlayerRep(userAddress)
            ]);
            
            // TODO: Implement diamonds when the contract function is available
            // diamonds = await this.contracts.gameState.getPlayerDiamonds(userAddress);
        } catch (e) {
            Logger.warn('Failed to load resource values:', e);
        }
        
        const stakedBuildings = await this.getStakedBuildings(userAddress);
        const availableNFTs = await this.getAvailableNFTs(userAddress);
        // Group by buildingType (0: House, 1: Farm, 2: Diamond Station, 3: REP Forge)
        const byTier = { 0: [], 1: [], 2: [], 3: [] };
        let atCap = 0, damaged = 0;
        stakedBuildings.forEach(b => {
            byTier[b.buildingType]?.push(b);
            if (b.isAtCap) atCap++;
            if (b.damaged) damaged++;
        });
        availableNFTs.forEach(nft => {
            byTier[nft.tier]?.push(nft);
        });
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
            repPoints: Number(repPoints)
        };
        this.updateStatusSection();
        await this.updateTierTabs();
        this.renderTierContent(this.state.selectedTier);
    }

    updateStatusSection() {
        this.element.querySelector('.buildings-constructed-value').textContent = this.state.usedSlots;
        this.element.querySelector('.slots-available-value').textContent = this.state.totalSlots - this.state.usedSlots;
        this.element.querySelector('.total-nfts-value').textContent = this.state.availableNFTs.length;
        this.element.querySelector('.total-staked-value').textContent = this.state.totalStaked;
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
        
        for (let tier = 0; tier <= 3; tier++) {
            const tab = this.element.querySelector(`.tab[data-tier="${tier}"]`);
            const count = this.state.byTier[tier].length;
            tab.querySelector('.tab-count').textContent = count;
            
            // Tier unlocking logic based on player tier:
            // - Tier 0 (Houses): Always unlocked
            // - Tier 1 (Farms): Requires player tier 1+
            // - Tier 2 (Diamond Stations): Requires player tier 2+
            // - Tier 3 (Rep Stations): Requires player tier 3+
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
        const rechargePrice = ethers.formatEther(GridBuildingsContract.RECHARGE_FEE);
        
        // Status section (like CityPage)
        const tierNames = ['House', 'Farm', 'Diamond Station', 'REP Forge'];
        const tierNamesPlural = ['Houses', 'Farms', 'Diamond Stations', 'REP Forges'];
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
                <div class="upgrade-info" style="margin-top: 16px;">
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
                <button class="btn btn-md btn-primary create-building-btn">Create ${tierNames[tier]}</button>
                <button class="btn btn-md btn-primary claim-all-btn"><i class="fas fa-coins"></i> Claim All</button>
            </div>
            
            <div class="buildings-grid">
                ${!items || items.length === 0 ? 
                    `<div class="empty-state"><div class="empty-icon">🏗️</div><h3>No Buildings or NFTs in this tier</h3></div>` :
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
        tierContent.querySelector('.create-building-btn')?.addEventListener('click', () => this.createBuilding(tier));
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
            const tierNames = ['House', 'Farm', 'Diamond Station', 'REP Forge'];
            const icons = ['🏠', '🌾', '💎', '🔨'];
            const name = tierNames[item.buildingType] || 'Building';
            const icon = icons[item.buildingType] || '🏗️';
            
            // Format production rate
            const productionRate = item.productionRate || 0;
            const resourceType = item.buildingType === 0 ? 'Gold' : item.buildingType === 1 ? 'Food' : 'Rep';
            
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
            let upgradeDisabled = item.damaged || !canUpgrade;
            
            if (currentLevel >= maxLevel) {
                upgradeButtonText = 'Max Level';
                upgradeDisabled = true;
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
                        <div class="detail-item"><span class="detail-label">Production Rate:</span><span class="detail-value">${productionRate} ${resourceType}/hr</span></div>
                        <div class="detail-item"><span class="detail-label">Claimable:</span><span class="detail-value">${item.claimable || 0}</span></div>
                        <div class="building-progress">
                            <div class="progress-info">
                                <span class="progress-label">Production Progress</span>
                                <span class="progress-time">${progressText}</span>
                            </div>
                            <div class="progress-container" title="${Math.floor(item.progressCurrent / 3600)}h / 24h production">
                                <div class="progress-bar" style="width:${progressPercent}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="building-actions">
                        <button class="btn btn-full btn-primary recharge-btn" ${item.damaged ? 'disabled' : ''}><i class="fas fa-bolt"></i> Charge</button>
                        <button class="btn btn-full btn-secondary claim-btn" ${item.damaged || item.claimable <= 0 ? 'disabled' : ''}><i class="fas fa-coins"></i> Claim</button>
                        <button class="btn btn-full btn-primary upgrade-btn" ${upgradeDisabled ? 'disabled' : ''}><i class="fas fa-arrow-up"></i> ${upgradeButtonText}</button>
                        <button class="btn btn-full btn-danger destroy-btn"><i class="fas fa-trash"></i> Destroy</button>
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
        }
    }

    // --- Helpers and contract calls ---
    getBuildingIcon(tier) {
        switch (Number(tier)) {
            case 0: return '🏠';
            case 1: return '🌾';
            case 2: return '💎';
            case 3: return '🔨';
            default: return '🏗️';
        }
    }

    getTierName(tier) {
        switch (Number(tier)) {
            case 0: return 'House';
            case 1: return 'Farm';
            case 2: return 'Diamond Station';
            case 3: return 'REP Forge';
            default: return 'Unknown';
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
                tier: Number(config.tier)
            };
            
            // Calculate production rate (base rate * level)
            building.productionRate = building.config.baseProductionRate * building.level;
            
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
            } catch (e) {
                console.warn(`Could not get upgrade info for building ${building.id}:`, e);
                building.upgradeInfo = {
                    canUpgrade: false,
                    currentLevel: building.level,
                    maxLevel: 1,
                    upgradeCost: 0n,
                    errorMessage: 'Failed to get upgrade information',
                    buildingType: building.buildingType,
                    damaged: building.damaged
                };
            }
            
            // Get NFT info for this building
            building.nftInfo = await this.getNFTInfoForBuilding(building.id);
        }
        
        return buildings;
    }

    async getNFTInfoForBuilding(buildingId) {
        // console.log(`[DEBUG] Looking for NFT info for building ${buildingId}`);
        
        const nftContracts = [this.contracts.nft, this.contracts.farmNft, this.contracts.repNft];
        
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
        const nftContracts = [this.contracts.nft, this.contracts.farmNft, this.contracts.repNft];
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
                const tokenURI = await contract.tokenURI(tokenId);
                let metadata = {};
                try {
                    const response = await fetch(tokenURI);
                    metadata = await response.json();
                } catch (e) {}
                // Determine tier from contract type
                let tier = 0;
                if (contract === this.contracts.farmNft) tier = 1;
                else if (contract === this.contracts.repNft) tier = 3;
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
            
            // Approve NFT transfer
            const altarAddress = await this.contracts.altar.getContractAddress();
            const nftContract = collection.toLowerCase() === (await this.contracts.farmNft.getContractAddress()).toLowerCase()
                ? this.contracts.farmNft
                : this.contracts.nft;
            
            await nftContract.approve(altarAddress, tokenId);
            
            // Close approval loading modal
            loadingModal.close();
            
            // Phase 2: Stake NFT
            const stakingModal = this.modal.loading('Staking NFT...');
            
            // Stake NFT
            await this.contracts.altar.stake(tokenId, tier, collection);
            
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
                this.modal.error(`Failed to unstake NFT: ${error.message}`, { title: 'Unstaking Failed' });
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
            
            // Show loading modal with upgrade cost if available
            let loadingMessage = 'Upgrading building...';
            if (upgradeInfo && upgradeInfo.upgradeCost) {
                const costInSonic = this.contracts.gridBuildings.formatUpgradeCost(upgradeInfo.upgradeCost);
                loadingMessage = `Upgrading building (${costInSonic} SONIC)...`;
            }
            
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

    async createBuilding(tier) {
        const tierNames = ['House', 'Farm', 'Diamond Station', 'Rep Station'];
        
        try {
            const tierName = tierNames[tier];
            
            const loadingModal = this.modal.loading(`Creating ${tierName.toLowerCase()}...`);
            
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
            } else {
                throw new Error(`Unsupported tier: ${tier}`);
            }
            
            // Get the next token ID to mint
            const totalSupply = await nftContract.totalSupply();
            const tokenId = totalSupply + 1n;
            
            // Use the new mintAndStake function for atomic mint + stake
            await this.contracts.altar.mintAndStake(contractAddress, tokenId, tier);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadUserData();
            
            // Show success modal
            this.modal.success(`${tierName} created successfully!`, { title: 'Building Created!' });
        } catch (error) {
            this.modal.error(`Failed to create ${tierNames[tier].toLowerCase()}: ` + error.message, { title: 'Creation Failed' });
        }
    }

    async destroyBuilding(item) {
        try {
            this.showLoading("Destroying building...");
            
            // Get NFT info for this building
            const nftInfo = await this.getNFTInfoForBuilding(item.id);
            
            if (nftInfo.isStaked && nftInfo.contractAddress && nftInfo.tokenId) {
                // Unstake the NFT (this will destroy the building and preserve data)
                await this.contracts.altar.unstake(nftInfo.contractAddress, nftInfo.tokenId);
                this.showSuccess("Building destroyed successfully!");
            } else {
                // Fallback to direct destruction if no NFT found
                await this.contracts.altar.destroyBuilding(item.id);
                this.showSuccess("Building destroyed successfully!");
            }
            
            await this.loadUserData();
        } catch (error) {
            this.showError("Failed to destroy building: " + error.message);
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