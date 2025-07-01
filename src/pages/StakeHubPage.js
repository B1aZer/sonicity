import { formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { NFTCard } from '../components/NFTCard.js';
import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';

export class StakePage extends BasePage {
    constructor() {
        super();
        import('../styles/stake-hub-page.css');
        Logger.info('StakePage (GridHub style) constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        this.statusComponent = new StatusComponent();
        this.state = {
            usedSlots: 0,
            totalSlots: 0,
            totalStaked: 0,
            atCap: 0,
            damaged: 0,
            availableNFTs: [],
            stakedBuildings: [],
            byTier: { 0: [], 1: [], 2: [] },
            selectedTier: 0
        };
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('StakePage onInitialized called with wallet:', walletResult);
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
                            <span class="status-label">Total NFTs:</span>
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
                            <span class="status-label">At Cap:</span>
                            <span class="status-value at-cap-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Damaged:</span>
                            <span class="status-value damaged-value">0</span>
                        </div>
                    </div>
                </div>
                <!-- Tier Tabs -->
                <div class="page-section tier-tabs-section">
                    <div class="tier-tabs">
                        <button class="tier-tab active" data-tier="0">Tier 0 (Houses)<span class="tier-count">0</span></button>
                        <button class="tier-tab" data-tier="1">Tier 1 (Farms)<span class="tier-count">0</span></button>
                        <button class="tier-tab" data-tier="2">Tier 2 (Rep Stations)<span class="tier-count">0</span></button>
                    </div>
                    <div class="tier-content active" data-tier="0"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="1"><div class="buildings-grid"></div></div>
                    <div class="tier-content" data-tier="2"><div class="buildings-grid"></div></div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tier tab switching
        const tierTabs = this.element.querySelectorAll('.tier-tab');
        tierTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.element.querySelectorAll('.tier-tab').forEach(t => t.classList.remove('active'));
                this.element.querySelectorAll('.tier-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tier = tab.dataset.tier;
                this.element.querySelector(`.tier-content[data-tier="${tier}"]`).classList.add('active');
                this.state.selectedTier = Number(tier);
                this.renderTierContent(Number(tier));
            });
        });
    }

    async loadUserData() {
        // Load slots, staked, cap, damaged, available NFTs, and group by tier
        // This is a simplified version; you may need to adapt contract calls
        const userAddress = await this.contracts.nft.getAddress();
        // Assume getSlotInfo, getStakedBuildings, getAvailableNFTs are implemented
        // You may need to adapt this to your actual contract API
        const [usedSlots, totalSlots] = [3, 5]; // TODO: Replace with contract call
        const stakedBuildings = await this.getStakedBuildings(userAddress);
        const availableNFTs = await this.getAvailableNFTs(userAddress);
        // Group by tier
        const byTier = { 0: [], 1: [], 2: [] };
        let atCap = 0, damaged = 0;
        stakedBuildings.forEach(b => {
            byTier[b.tier].push(b);
            if (b.isAtCap) atCap++;
            if (b.damaged) damaged++;
        });
        availableNFTs.forEach(nft => {
            byTier[nft.tier].push(nft);
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
            byTier
        };
        this.updateStatusSection();
        this.updateTierTabs();
        this.renderTierContent(this.state.selectedTier);
    }

    updateStatusSection() {
        this.element.querySelector('.buildings-constructed-value').textContent = this.state.usedSlots;
        this.element.querySelector('.slots-available-value').textContent = this.state.totalSlots - this.state.usedSlots;
        this.element.querySelector('.total-nfts-value').textContent = this.state.availableNFTs.length;
        this.element.querySelector('.total-staked-value').textContent = this.state.totalStaked;
        this.element.querySelector('.at-cap-value').textContent = this.state.atCap;
        this.element.querySelector('.damaged-value').textContent = this.state.damaged;
    }

    updateTierTabs() {
        for (let tier = 0; tier <= 2; tier++) {
            const tab = this.element.querySelector(`.tier-tab[data-tier="${tier}"]`);
            const count = this.state.byTier[tier].length;
            tab.querySelector('.tier-count').textContent = count;
            tab.disabled = count === 0;
        }
    }

    renderTierContent(tier) {
        const grid = this.element.querySelector(`.tier-content[data-tier="${tier}"] .buildings-grid`);
        const items = this.state.byTier[tier];
        const staked = items.filter(i => i.isStaked);
        // --- Per-Tier Section ---
        const tierStatus = this.getTierStatus(tier, staked);
        const progress = this.getTierProgress(tier, staked);
        const claimable = tierStatus.claimable.toLocaleString();
        const buildingCount = tierStatus.count;
        // Recharge input default
        const rechargeDefault = buildingCount;
        // Status section (like CityPage)
        const tierNames = ['House', 'Farm', 'Rep Station'];
        const statusSection = `
            <div class="page-section tier-status-section">
                <h3>${tierNames[tier]} Status</h3>
                <div class="status-grid">
                    <div class="status-item"><span class="status-label">Buildings:</span><span class="status-value">${buildingCount}</span></div>
                    <div class="status-item"><span class="status-label">Claimable:</span><span class="status-value">${claimable}</span></div>
                </div>
            </div>
        `;
        // Progress + recharge section (input, button, progress bar in a row)
        const progressSection = `
            <div class="page-section tier-progress-section">
                <h3>Recharge ${tierNames[tier]}${buildingCount !== 1 ? 's' : ''}</h3>
                <div class="donation-form" style="margin-top:16px; align-items: center;">
                    <input type="number" class="donation-amount recharge-amount" min="1" max="${buildingCount}" value="${rechargeDefault}" style="max-width: 100px;" />
                    <button class="donate-button recharge-tier-btn">Recharge</button>
                    <div class="tier-progress" title="${progress.current} / ${progress.next} recharge" style="flex:1; min-width:120px; margin-left:16px;">
                        <div class="tier-progress-bar" style="width:${progress.percent}%"></div>
                    </div>
                </div>
                <div class="tier-progress-text" style="margin-left: 0.5em;">Progress to next upgrade: ${progress.percent}%</div>
            </div>
        `;
        // Claim all section
        const actionsSection = `
            <div class="page-section tier-actions-section">
                <h3>${tierNames[tier]} Actions</h3>
                <button class="btn btn-primary claim-all-btn">Claim All</button>
            </div>
        `;
        // --- Buildings grid ---
        if (!items || items.length === 0) {
            grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🏗️</div><h3>No Buildings or NFTs in this tier</h3></div>`;
        } else {
            grid.innerHTML = items.map(item => this.renderCard(item)).join('');
        }
        // Render status, progress/recharge, and actions sections above grid
        grid.insertAdjacentHTML('beforebegin', statusSection + progressSection + actionsSection);
        // Attach event listeners for action buttons
        if (items && items.length > 0) {
            Array.from(grid.children).forEach((card, i) => {
                this.attachCardListeners(card, items[i]);
            });
        }
        // Attach per-tier action listeners
        const tierContent = this.element.querySelector(`.tier-content[data-tier="${tier}"]`);
        tierContent.querySelector('.claim-all-btn')?.addEventListener('click', () => this.claimAllInTier(tier));
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

    getTierProgress(tier, staked) {
        // Dummy: use sum of collected/cap for all buildings in tier
        let current = 0, next = 0;
        staked.forEach(b => { current += b.collected || 0; next += b.cap || 0; });
        const percent = next > 0 ? Math.floor((current / next) * 100) : 0;
        return { current, next, percent };
    }

    async claimAllInTier(tier) {
        // Call contract to claim all resources for this tier
        this.showStatus('loading', 'Claiming resources...');
        try {
            await this.contracts.gridBuildings.collectResourcesByType(tier);
            this.showStatus('success', 'Resources claimed!');
            await this.loadUserData();
        } catch (e) {
            this.showStatus('error', e.message || 'Failed to claim resources');
        }
    }

    async rechargeNInTier(tier, n) {
        // Find N staked buildings in this tier, prioritize at cap, then oldest
        const items = this.state.byTier[tier].filter(i => i.isStaked && !i.damaged);
        // At cap first
        const atCap = items.filter(b => b.isAtCap);
        const notAtCap = items.filter(b => !b.isAtCap);
        // Sort notAtCap by lastCollection (oldest first, dummy: as string)
        notAtCap.sort((a, b) => (a.lastCollection || '').localeCompare(b.lastCollection || ''));
        const selected = [...atCap, ...notAtCap].slice(0, n);
        if (selected.length === 0) {
            this.showStatus('error', 'No buildings to recharge');
            return;
        }
        this.showStatus('loading', `Recharging ${selected.length} building(s)...`);
        try {
            await this.contracts.gridBuildings.rechargeBuildings(selected.map(b => b.id));
            this.showStatus('success', 'Buildings recharged!');
            await this.loadUserData();
        } catch (e) {
            this.showStatus('error', e.message || 'Failed to recharge buildings');
        }
    }

    renderCard(item) {
        if (item.isStaked) {
            // Staked building card (GridHub style)
            const statusClass = item.damaged ? 'damaged' : item.isAtCap ? 'at-cap' : 'normal';
            const statusText = item.damaged ? 'Damaged' : item.isAtCap ? 'At Cap' : 'Operating';
            const progress = Math.min(100, Math.floor((item.collected / item.cap) * 100));
            return `
                <div class="building-card ${statusClass}" data-building-id="${item.id}">
                    <div class="building-header">
                        <div class="building-icon">${this.getBuildingIcon(item.tier)}</div>
                        <div class="building-info">
                            <h3>${item.name}</h3>
                            <p class="building-description">${item.description || ''}</p>
                        </div>
                        <div class="building-status ${statusClass}">
                            <span class="status-indicator"></span>
                            <span class="status-text">${statusText}</span>
                        </div>
                    </div>
                    <div class="building-details">
                        <div class="detail-item"><span class="detail-label">Level:</span><span class="detail-value">${item.level} / ${item.maxLevel}</span></div>
                        <div class="detail-item"><span class="detail-label">Production Rate:</span><span class="detail-value">${item.productionRate}/hr</span></div>
                        <div class="detail-item"><span class="detail-label">Last Collection:</span><span class="detail-value">${item.lastCollection || 'N/A'}</span></div>
                        <div class="detail-item"><span class="detail-label">Claimable:</span><span class="detail-value">${item.claimable || 0}</span></div>
                        <div class="detail-item"><span class="detail-label">Cap Progress:</span><span class="detail-value"><div class="tier-progress" style="height:8px;"><div class="tier-progress-bar" style="width:${progress}%"></div></div></span></div>
                    </div>
                    <div class="building-actions">
                        <button class="building-button btn-info recharge-btn" ${item.damaged ? 'disabled' : ''}>Recharge</button>
                        <button class="building-button btn-primary upgrade-btn" ${item.damaged ? 'disabled' : ''}>Upgrade</button>
                        <button class="building-button btn-warning unstake-btn">Unstake</button>
                    </div>
                </div>
            `;
        } else {
            // Unstaked NFT card (match original logic)
            return `
                <div class="building-card" data-nft-id="${item.tokenId}">
                    <div class="building-header">
                        <div class="building-icon">${this.getBuildingIcon(item.tier)}</div>
                        <div class="building-info">
                            <h3>${item.metadata?.name || 'NFT'}</h3>
                            <p class="building-description">${item.metadata?.description || ''}</p>
                        </div>
                    </div>
                    <div class="nft-image"><img src="${item.metadata?.image}" onerror="this.src='/images/placeholder.jpg'" alt="NFT" /></div>
                    <div class="building-actions">
                        <button class="building-button btn-primary stake-btn">Stake</button>
                    </div>
                </div>
            `;
        }
    }

    attachCardListeners(card, item) {
        if (item.isStaked) {
            card.querySelector('.recharge-btn')?.addEventListener('click', () => this.rechargeBuilding(item));
            card.querySelector('.upgrade-btn')?.addEventListener('click', () => this.upgradeBuilding(item));
            card.querySelector('.unstake-btn')?.addEventListener('click', () => this.unstakeNFT(item.tokenId, item.contractAddress));
        } else {
            card.querySelector('.stake-btn')?.addEventListener('click', () => this.stakeNFT(item.tokenId, item.contractAddress));
        }
    }

    // --- Helpers and contract calls ---
    getBuildingIcon(tier) {
        switch (Number(tier)) {
            case 0: return '🏠';
            case 1: return '🌾';
            case 2: return '⭐';
            default: return '🏗️';
        }
    }

    // Dummy implementations for demo; replace with real contract calls
    async getStakedBuildings(userAddress) {
        // Return array of {id, tier, name, level, maxLevel, productionRate, lastCollection, claimable, cap, collected, isAtCap, damaged, isStaked, description}
        return [
            { id: 1, tier: 0, name: 'House #1', level: 2, maxLevel: 5, productionRate: 10, lastCollection: '2h ago', claimable: 20, cap: 100, collected: 40, isAtCap: false, damaged: false, isStaked: true, description: 'A cozy house.' },
            { id: 2, tier: 1, name: 'Farm #1', level: 1, maxLevel: 5, productionRate: 15, lastCollection: '1h ago', claimable: 10, cap: 100, collected: 80, isAtCap: true, damaged: false, isStaked: true, description: 'A productive farm.' },
            { id: 3, tier: 2, name: 'Rep Station #1', level: 1, maxLevel: 3, productionRate: 5, lastCollection: '5h ago', claimable: 0, cap: 50, collected: 50, isAtCap: true, damaged: true, isStaked: true, description: 'A rep station.' }
        ];
    }
    async getAvailableNFTs(userAddress) {
        // Return array of {tokenId, tier, metadata, contractAddress, isStaked: false}
        return [
            { tokenId: 101, tier: 0, metadata: { name: 'House NFT', image: '/images/house-nft.jpg', description: 'Stake to build a house.' }, contractAddress: '0x...', isStaked: false },
            { tokenId: 102, tier: 1, metadata: { name: 'Farm NFT', image: '/images/farm-nft.jpg', description: 'Stake to build a farm.' }, contractAddress: '0x...', isStaked: false }
        ];
    }

    // --- Action handlers ---
    async stakeNFT(tokenId, collection) {
        // TODO: Implement staking logic
        this.showStatus('loading', 'Staking NFT...');
        setTimeout(() => {
            this.showStatus('success', 'NFT staked!');
            this.loadUserData();
        }, 1000);
    }
    async unstakeNFT(tokenId, collection) {
        // TODO: Implement unstaking logic
        this.showStatus('loading', 'Unstaking NFT...');
        setTimeout(() => {
            this.showStatus('success', 'NFT unstaked!');
            this.loadUserData();
        }, 1000);
    }
    async rechargeBuilding(item) {
        // TODO: Implement recharge logic
        this.showStatus('loading', 'Recharging building...');
        setTimeout(() => {
            this.showStatus('success', 'Building recharged!');
            this.loadUserData();
        }, 1000);
    }
    async upgradeBuilding(item) {
        // TODO: Implement upgrade logic
        this.showStatus('loading', 'Upgrading building...');
        setTimeout(() => {
            this.showStatus('success', 'Building upgraded!');
            this.loadUserData();
        }, 1000);
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