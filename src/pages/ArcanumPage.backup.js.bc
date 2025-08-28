import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class ArcanumPage extends BasePage {
    constructor() {
        super();
        this.element.className = 'base-page arcanum-page';
        this.statusComponent = new StatusComponent();
        this.modal = new Modal();
        
        // Initialize state
        this.state = {
            playerRep: 'Loading...',
            arcanumStatus: 'Loading...',
            nftCount: 0,
            buildingLevel: '-',
            canCreateNFT: false
        };
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('ArcanumPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadArcanumData();
            this.setupEventListeners();
            this.startAutoRefresh();
            Logger.info('Arcanum page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing ArcanumPage:', error);
            this.modal.error('Failed to initialize Arcanum page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    async loadArcanumData() {
        try {
            Logger.info('Starting to load Arcanum data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Check if player has built Arcanum of Names (district building)
            // ARCANUM_OF_NAMES = 17 in DistrictBuildingType enum
            const isArcanumBuilt = await this.contracts.districtBuildings.isDistrictBuildingBuilt(playerAddress, 17);
            const isArcanumActive = isArcanumBuilt ? await this.contracts.districtBuildings.isDistrictBuildingActive(playerAddress, 17) : false;
            
            Logger.info('Arcanum status:', { isBuilt: isArcanumBuilt, isActive: isArcanumActive });
            
            if (!isArcanumBuilt) {
                this.setState({
                    arcanumStatus: 'Not Built',
                    buildingLevel: 'Build Required',
                    canCreateNFT: false
                });
                return;
            }
            
            // Get building level if built
            const buildingLevel = isArcanumBuilt ? 1 : 0; // Arcanum is maxLevel 1
            
            // Get player's current REP points
            const repPoints = await this.contracts.gameState.getPlayerRep(playerAddress);
            Logger.info('Player REP points:', repPoints.toString());
            
            // Load user's Yield NFTs
            await this.loadUserYieldNFTs();
            
            // Update state
            this.setState({
                playerRep: repPoints.toString(),
                arcanumStatus: isArcanumActive ? 'Active' : (isArcanumBuilt ? 'Built but Inactive' : 'Not Built'),
                buildingLevel: buildingLevel.toString(),
                canCreateNFT: isArcanumActive && repPoints > 0
            });

        } catch (error) {
            Logger.error('Error loading Arcanum data:', error);
            this.setState({
                arcanumStatus: 'Error',
                buildingLevel: 'Error loading'
            });
            this.modal.error('Failed to load Arcanum data. Please try refreshing the page.');
        }
    }

    async loadUserYieldNFTs() {
        try {
            Logger.info('Starting to load user Yield NFTs...');
            
            const nftCollectionElement = document.getElementById('nft-collection');
            const userAddress = await this.contracts.gameState.getAddress();
            
            // TODO: Load SonicityYieldNFTs from the contract
            // For now, show placeholder with proper structure
            nftCollectionElement.innerHTML = `
                <h3>Your Yield NFT Collection</h3>
                <p>Dynamic NFTs created from your REP Points with on-chain metadata and yield generation capabilities.</p>
                
                <div class="building-details">
                    <div class="detail-item">
                        <span class="detail-label">Collection Status:</span>
                        <span class="detail-value">Coming Soon - SonicityYieldNFT Integration</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">NFT Features:</span>
                        <span class="detail-value">Dynamic SVG artwork, yield generation, tradeable</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Metadata:</span>
                        <span class="detail-value">On-chain with timestamp and REP amount</span>
                    </div>
                </div>
                
                <div class="placeholder-info">
                    <p><strong>NFT Benefits:</strong></p>
                    <ul>
                        <li>✨ Dynamic artwork based on REP amount staked</li>
                        <li>📈 Future yield generation capabilities</li>
                        <li>🔄 Fully tradeable on secondary markets</li>
                        <li>⏰ Permanent record of REP commitment</li>
                        <li>🎯 Potential Tier 4 grid building utility</li>
                    </ul>
                </div>
            `;
            
            // Update NFT count in state (for now showing 0)
            this.setState({ nftCount: 0 });
            
        } catch (error) {
            Logger.error('Error loading Yield NFTs:', error);
            document.getElementById('nft-collection').innerHTML = `
                <div class="error-message">Failed to load Yield NFT collection. Please try refreshing the page.</div>
            `;
        }
    }

    async createYieldNFT() {
        try {
            const repAmountInput = document.getElementById('rep-amount');
            const repAmount = parseInt(repAmountInput.value);
            const currentRep = parseInt(this.state.playerRep);
            
            if (!repAmount || repAmount < 1) {
                this.modal.error('Please enter a valid REP amount (minimum 1)');
                return;
            }

            if (repAmount > currentRep) {
                this.modal.error(`Insufficient REP Points. You have ${currentRep}, need ${repAmount}`);
                return;
            }

            this.modal.loading('Creating Yield NFT...', 'Converting your REP Points into a dynamic NFT');
            
            // TODO: Implement the actual REP -> NFT conversion
            // This will need to:
            // 1. Call SonicityYieldNFT.mint(repAmount) 
            // 2. Which should call GameState.deductResources(player, 0, 0, repAmount)
            // 3. Mint NFT with stakeInfo containing repAmount and timestamp
            
            // For now, show what would happen
            this.modal.success(
                'Yield NFT Creation Ready!', 
                `This feature will convert ${repAmount} REP Points into a SonicityYieldNFT with dynamic metadata and yield generation capabilities. The NFT will contain ${repAmount} staked REP and can be used for future Tier 4 grid building functionality.`
            );
            
            // Clear the input
            repAmountInput.value = '';
            
            // Refresh data
            await this.loadArcanumData();
            
        } catch (error) {
            Logger.error('Error creating Yield NFT:', error);
            this.modal.error(error.message || 'Failed to create Yield NFT', { title: 'Creation Failed' });
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system like other pages
        this.addEventListener('.create-nft-btn', 'click', () => {
            this.createYieldNFT().catch(error => {
                Logger.error('Error in createYieldNFT:', error);
            });
        });
        
        // Add input validation for REP amount
        this.addEventListener('#rep-amount', 'input', (event) => {
            const repAmount = parseInt(event.target.value);
            const currentRep = parseInt(this.state.playerRep);
            const isArcanumActive = this.state.arcanumStatus === 'Active';
            const canCreate = repAmount > 0 && repAmount <= currentRep && !isNaN(currentRep) && isArcanumActive;
            
            this.setState({ canCreateNFT: canCreate });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Arcanum of Names</h1>
                <p class="page-description">
                    <strong>Transform your REP Points into powerful dynamic NFTs.</strong> The Arcanum of Names allows you to convert earned reputation into tradeable SonicityYieldNFTs with on-chain metadata. 
                    <em>These NFTs preserve your REP investment and unlock future Tier 4 grid building capabilities.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Arcanum Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Your REP Points:</span>
                            <span class="status-value" data-state="playerRep">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Building Status:</span>
                            <span class="status-value" data-state="arcanumStatus">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Yield NFTs Owned:</span>
                            <span class="status-value" data-state="nftCount">0</span>
                        </div>
                    </div>
                </div>

                <!-- Building Details Section -->
                <div class="page-section">
                    <h2>Building Details</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Arcanum Info</h3>
                            <p>Your Arcanum of Names building details</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Building Level:</span>
                                    <span class="detail-value" data-state="buildingLevel">-</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Unlock Cost:</span>
                                    <span class="detail-value">7,000 Gold</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Build Cost:</span>
                                    <span class="detail-value">450 Gold</span>
                                </div>
                            </div>
                        </div>
                        <div class="building-card">
                            <h3>Conversion Rules</h3>
                            <p>REP to NFT conversion details</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Conversion Rate:</span>
                                    <span class="detail-value">1:1 REP to NFT</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Minimum REP:</span>
                                    <span class="detail-value">1 REP Point</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Processing Time:</span>
                                    <span class="detail-value">Instant</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Conversion Section -->
                <div class="page-section">
                    <h2>Create Yield NFT</h2>
                    <div class="building-card">
                        <h3>REP to NFT Conversion</h3>
                        <p>Convert your REP Points into dynamic SonicityYieldNFTs</p>
                        <div class="building-details">
                            <div class="detail-item">
                                <span class="detail-label">REP Amount:</span>
                                <input type="number" id="rep-amount" class="detail-input" min="1" placeholder="Enter REP amount..." />
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">NFT Benefits:</span>
                                <span class="detail-value">Dynamic metadata, yield generation, tradeable, Tier 4 utility</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Actions Section -->
                <div class="page-section">
                    <h2>Actions</h2>
                    <div class="building-actions">
                        <button class="create-nft-btn btn btn-primary btn-lg" data-state="canCreateNFT" disabled>
                            <span class="button-text">Create Yield NFT</span>
                        </button>
                    </div>
                </div>

                <!-- NFT Collection Section -->
                <div class="page-section">
                    <h2>Your Yield NFTs</h2>
                    <div id="nft-collection" class="building-card">
                        <div class="loading-message">Loading your Yield NFT collection...</div>
                    </div>
                </div>
            </div>
        `;
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadArcanumData();
        }, 30000);
    }

    onUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
} 