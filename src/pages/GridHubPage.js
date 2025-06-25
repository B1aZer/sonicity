import { BasePage } from './BasePage.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class GridHubPage extends BasePage {
    constructor() {
        super();
        Logger.info('GridHubPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        
        // Initialize state
        this.setState({
            // Grid Building Status
            totalBuildings: 0,
            damagedBuildings: 0,
            buildingsAtCap: 0,
            
            // Building counts by tier
            buildingsByTier: {
                0: 0, // Houses
                1: 0, // Farms
                2: 0  // Rep Stations
            },
            
            // Treasury tracking
            treasurySubmitted: 0,
            treasuryGoal: 10000, // Example goal
            treasuryProgress: 0,
            
            // Resources
            playerGold: 0,
            playerFood: 0,
            playerRep: 0,
            
            // Staking status
            stakedNFTs: [],
            availableNFTs: [],
            
            // Recharge costs
            rechargeCost: 50, // SONIC tokens for recharge
            
            // UI states
            canRecharge: false,
            canSubmitTreasury: false
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('GridHubPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadGridHubData();
            this.setupEventListeners();
            Logger.info('Grid Hub page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing grid hub page:', error);
            this.modal.error('Failed to initialize grid hub page. Please try refreshing the page.');
        }
    }

    async loadGridHubData() {
        try {
            Logger.info('Starting to load grid hub data...');
            
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Load player resources
            const playerGold = await this.contracts.gameState.getPlayerGold(playerAddress);
            const playerFood = await this.contracts.gameState.getPlayerFood(playerAddress);
            const playerRep = await this.contracts.gameState.getPlayerRep(playerAddress);
            
            // Load building data
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            const buildingsByTier = { 0: 0, 1: 0, 2: 0 };
            let damagedBuildings = 0;
            let buildingsAtCap = 0;
            
            // Analyze each building
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                const config = await this.contracts.gridBuildings.getBuildingConfig(building.buildingType);
                
                // Count by tier
                buildingsByTier[config.tier]++;
                
                // Check if damaged
                if (building.damaged) {
                    damagedBuildings++;
                }
                
                // Check if at production cap (24 hours)
                const timeSinceCollection = Date.now() / 1000 - Number(building.lastCollectionTime);
                if (timeSinceCollection >= 24 * 3600) {
                    buildingsAtCap++;
                }
            }
            
            // Load staking data
            const stakedNFTs = await this.loadStakedNFTs(playerAddress);
            const availableNFTs = await this.loadAvailableNFTs(playerAddress);
            
            // Load treasury data (this would need to be implemented in contracts)
            const treasurySubmitted = 0; // Placeholder - would come from contract
            const treasuryGoal = 10000; // Placeholder - would come from contract
            const treasuryProgress = Math.min((treasurySubmitted / treasuryGoal) * 100, 100);
            
            // Update state
            this.setState({
                totalBuildings: activeBuildingIds.length,
                damagedBuildings: damagedBuildings,
                buildingsAtCap: buildingsAtCap,
                buildingsByTier: buildingsByTier,
                treasurySubmitted: treasurySubmitted,
                treasuryGoal: treasuryGoal,
                treasuryProgress: treasuryProgress,
                playerGold: playerGold.toString(),
                playerFood: playerFood.toString(),
                playerRep: playerRep.toString(),
                stakedNFTs: stakedNFTs,
                availableNFTs: availableNFTs,
                canRecharge: buildingsAtCap > 0,
                canSubmitTreasury: playerGold > 0
            });

        } catch (error) {
            Logger.error('Error loading grid hub data:', error);
            this.modal.error('Failed to load grid hub data. Please try refreshing the page.');
        }
    }

    async loadStakedNFTs(playerAddress) {
        try {
            // This would need to be implemented based on your Altar contract
            // For now, returning empty array
            return [];
        } catch (error) {
            Logger.error('Error loading staked NFTs:', error);
            return [];
        }
    }

    async loadAvailableNFTs(playerAddress) {
        try {
            // This would need to be implemented based on your NFT contracts
            // For now, returning empty array
            return [];
        } catch (error) {
            Logger.error('Error loading available NFTs:', error);
            return [];
        }
    }

    async handleRechargeAll() {
        try {
            Logger.info('Starting recharge of all buildings at cap...');
            
            if (this.state.buildingsAtCap === 0) {
                this.modal.error('No buildings need recharging.');
                return;
            }
            
            // Show confirmation
            const confirmed = await this.modal.confirm(
                `Recharge all ${this.state.buildingsAtCap} buildings at production cap?<br><br>
                Cost: ${this.state.rechargeCost} SONIC tokens<br>
                This will reset production timers and allow immediate collection.`,
                { title: 'Confirm Recharge' }
            );
            
            if (!confirmed.isConfirmed) return;
            
            // Show loading modal
            const loadingModal = this.modal.loading('Recharging buildings...');
            
            // This would call the recharge contract function
            // await this.contracts.gridBuildings.rechargeAllBuildings();
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadGridHubData();
            
            // Show success message
            this.modal.success(`Successfully recharged ${this.state.buildingsAtCap} buildings!`);
            
        } catch (error) {
            Logger.error('Error recharging buildings:', error);
            this.modal.error('Failed to recharge buildings. Please try again.');
        }
    }

    async handleSubmitTreasury() {
        try {
            const amount = parseInt(this.element.querySelector('.treasury-amount-input').value);
            
            if (!amount || amount <= 0) {
                this.modal.error('Please enter a valid amount.');
                return;
            }
            
            if (amount > parseInt(this.state.playerGold)) {
                this.modal.error('Insufficient gold balance.');
                return;
            }
            
            // Show confirmation
            const confirmed = await this.modal.confirm(
                `Submit ${amount} gold to the Grid Treasury?<br><br>
                This will contribute to the treasury goal and unlock new features.`,
                { title: 'Confirm Treasury Submission' }
            );
            
            if (!confirmed.isConfirmed) return;
            
            // Show loading modal
            const loadingModal = this.modal.loading('Submitting to treasury...');
            
            // This would call the treasury submission contract function
            // await this.contracts.gameState.submitToGridTreasury(amount);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadGridHubData();
            
            // Show success message
            this.modal.success(`Successfully submitted ${amount} gold to the Grid Treasury!`);
            
        } catch (error) {
            Logger.error('Error submitting to treasury:', error);
            this.modal.error('Failed to submit to treasury. Please try again.');
        }
    }

    async handleStakeNFT(tokenId, collection, buildingType) {
        try {
            Logger.info(`Staking NFT ${tokenId} from collection ${collection} as building type ${buildingType}`);
            
            // Show loading modal
            const loadingModal = this.modal.loading('Staking NFT...');
            
            // Call the altar contract to stake
            await this.contracts.altar.stake(tokenId, buildingType, collection);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadGridHubData();
            
            // Show success message
            this.modal.success('Successfully staked NFT!');
            
        } catch (error) {
            Logger.error('Error staking NFT:', error);
            this.modal.error('Failed to stake NFT. Please try again.');
        }
    }

    async handleUnstakeNFT(tokenId, collection) {
        try {
            Logger.info(`Unstaking NFT ${tokenId} from collection ${collection}`);
            
            // Show loading modal
            const loadingModal = this.modal.loading('Unstaking NFT...');
            
            // Call the altar contract to unstake
            await this.contracts.altar.unstake(collection, tokenId);
            
            // Close loading modal
            loadingModal.close();
            
            // Reload data
            await this.loadGridHubData();
            
            // Show success message
            this.modal.success('Successfully unstaked NFT!');
            
        } catch (error) {
            Logger.error('Error unstaking NFT:', error);
            this.modal.error('Failed to unstake NFT. Please try again.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Recharge button
        this.addEventListener('.recharge-all-button', 'click', () => {
            this.handleRechargeAll().catch(error => {
                Logger.error('Error in handleRechargeAll:', error);
            });
        });

        // Treasury submission
        this.addEventListener('.submit-treasury-button', 'click', () => {
            this.handleSubmitTreasury().catch(error => {
                Logger.error('Error in handleSubmitTreasury:', error);
            });
        });

        // Building type selector for staking
        this.addEventListener('.building-type-select', 'change', () => {
            this.filterNFTsForStaking().catch(error => {
                Logger.error('Error in filterNFTsForStaking:', error);
            });
        });
    }

    async filterNFTsForStaking() {
        // This would filter available NFTs based on selected building type
        // Implementation would depend on your NFT contracts
        Logger.info('Filtering NFTs for staking...');
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Grid Hub</h1>
                <p class="page-description">
                    <strong>Central hub for all grid building operations.</strong> 
                    Manage your staked NFTs, recharge production, and contribute to the treasury. 
                    <em>All grid buildings are managed from this central location.</em>
                </p>
                
                <!-- Grid Status Section -->
                <div class="page-section">
                    <h2>Grid Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total Buildings:</span>
                            <span class="status-value" data-state="totalBuildings">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Damaged Buildings:</span>
                            <span class="status-value" data-state="damagedBuildings">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">At Production Cap:</span>
                            <span class="status-value" data-state="buildingsAtCap">0</span>
                        </div>
                    </div>
                </div>

                <!-- Resources Section -->
                <div class="page-section">
                    <h2>Resources</h2>
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
                            <span class="status-label">Reputation:</span>
                            <span class="status-value" data-state="playerRep">0</span>
                        </div>
                    </div>
                </div>

                <!-- Buildings by Tier Section -->
                <div class="page-section">
                    <h2>Buildings by Tier</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Tier 0 (Houses):</span>
                            <span class="status-value" data-state="buildingsByTier.0">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 1 (Farms):</span>
                            <span class="status-value" data-state="buildingsByTier.1">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Tier 2 (Rep Stations):</span>
                            <span class="status-value" data-state="buildingsByTier.2">0</span>
                        </div>
                    </div>
                </div>

                <!-- Treasury Section -->
                <div class="page-section">
                    <h2>Grid Treasury</h2>
                    <div class="treasury-info">
                        <div class="status-item">
                            <span class="status-label">Submitted:</span>
                            <span class="status-value" data-state="treasurySubmitted">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Goal:</span>
                            <span class="status-value" data-state="treasuryGoal">10000</span>
                        </div>
                    </div>
                    <div class="treasury-progress">
                        <div class="progress-container">
                            <div class="progress-bar" data-state="treasuryProgress" style="width: 0%"></div>
                        </div>
                        <div class="progress-text" data-state="treasuryProgress">0%</div>
                    </div>
                    <div class="treasury-form">
                        <input type="number" class="treasury-amount-input" placeholder="Amount to submit" min="1">
                        <button class="submit-treasury-button btn btn-primary" data-state="canSubmitTreasury" disabled>
                            Submit to Treasury
                        </button>
                    </div>
                </div>

                <!-- Recharge Section -->
                <div class="page-section">
                    <h2>Production Recharge</h2>
                    <p>Recharge buildings that have reached their 24-hour production cap.</p>
                    <div class="recharge-info">
                        <div class="status-item">
                            <span class="status-label">Recharge Cost:</span>
                            <span class="status-value">${this.state.rechargeCost} SONIC</span>
                        </div>
                    </div>
                    <div class="building-actions">
                        <button class="recharge-all-button btn btn-secondary btn-lg" data-state="canRecharge" disabled>
                            Recharge All Buildings
                        </button>
                    </div>
                </div>

                <!-- Staking Section -->
                <div class="page-section">
                    <h2>NFT Staking</h2>
                    
                    <!-- Building Type Selector -->
                    <div class="building-type-selector">
                        <select class="building-type-select">
                            <option value="0">House (Tier 0)</option>
                            <option value="1">Farm (Tier 1)</option>
                            <option value="2">Rep Station (Tier 2)</option>
                        </select>
                    </div>

                    <!-- Staking Status -->
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Staked NFTs:</span>
                            <span class="status-value">${this.state.stakedNFTs.length}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Available NFTs:</span>
                            <span class="status-value">${this.state.availableNFTs.length}</span>
                        </div>
                    </div>

                    <!-- NFT Lists -->
                    <div class="nft-sections">
                        <div class="nft-section">
                            <h3>Available NFTs</h3>
                            <div class="nft-list" id="available-nft-list">
                                <div class="loading-spinner">Loading...</div>
                            </div>
                        </div>
                        
                        <div class="nft-section">
                            <h3>Staked NFTs</h3>
                            <div class="nft-list" id="staked-nft-list">
                                <div class="loading-spinner">Loading...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateUI(oldState, newState) {
        // Call parent updateUI first
        super.updateUI(oldState, newState);
        
        // Update treasury progress bar
        const progressBar = this.element.querySelector('.progress-bar[data-state="treasuryProgress"]');
        const progressText = this.element.querySelector('.progress-text[data-state="treasuryProgress"]');
        
        if (progressBar && progressText) {
            const progress = newState.treasuryProgress || 0;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress.toFixed(1)}%`;
        }
    }
} 