import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { GridBuildingsContract } from '../js/contracts/GridBuildingsContract.js';

export class RepForgePage extends BasePage {
    constructor() {
        super();
        this.element.className = 'base-page rep-forge-page';
        this.statusComponent = new StatusComponent();
        this.modal = new Modal();
        this.buildingId = null;
        this.buildingData = null;
        
        // Initialize state
        this.state = {
            playerRep: 'Loading...',
            forgeStatus: 'Loading...',
            nftCount: 0,
            buildingId: '-',
            buildingLevel: '-',
            buildingStatus: '-',
            canCreateNFT: false
        };
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('RepForgePage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadBuildingData();
            this.setupEventListeners();
            this.startAutoRefresh();
            Logger.info('REP Forge page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing RepForgePage:', error);
            this.modal.error('Failed to initialize REP Forge page. Please try refreshing the page.');
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        // This method is called by WalletButton but we don't need to load data here
        // Data loading is handled by onInitialized which is called once during page setup
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Use the new event listener system like other pages
        this.addEventListener('.create-nft-btn', 'click', () => {
            this.createYieldNFT().catch(error => {
                Logger.error('Error in createYieldNFT:', error);
            });
        });
        
        this.addEventListener('.recharge-btn', 'click', () => {
            this.rechargeBuilding().catch(error => {
                Logger.error('Error in rechargeBuilding:', error);
            });
        });
        
        // Add input validation for REP amount
        this.addEventListener('#rep-amount', 'input', (event) => {
            const repAmount = parseInt(event.target.value);
            const currentRep = parseInt(this.state.playerRep);
            const canCreate = repAmount > 0 && repAmount <= currentRep && !isNaN(currentRep);
            
            this.setState({ canCreateNFT: canCreate });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>REP Forge Management</h1>
                <p class="page-description">
                    <strong>Convert your REP Points into valuable dynamic NFTs.</strong> Your REP Forge transforms earned reputation into tradeable SonicityYieldNFTs with on-chain metadata. 
                    <em>These NFTs can generate ongoing yields and unlock special features.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Forge Statistics</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Your REP Points:</span>
                            <span class="status-value" data-state="playerRep">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Forge Status:</span>
                            <span class="status-value" data-state="forgeStatus">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Yield NFTs Owned:</span>
                            <span class="status-value" data-state="nftCount">0</span>
                        </div>
                    </div>
                </div>

                <!-- Forge Details Section -->
                <div class="page-section">
                    <h2>Forge Details</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Building Info</h3>
                            <p>Your REP Forge building details</p>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Building ID:</span>
                                    <span class="detail-value" data-state="buildingId">-</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Level:</span>
                                    <span class="detail-value" data-state="buildingLevel">-</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Status:</span>
                                    <span class="detail-value" data-state="buildingStatus">-</span>
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
                                <span class="detail-value">Dynamic metadata, yield generation, tradeable</span>
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
                        <button class="recharge-btn btn btn-secondary btn-lg">
                            <span class="button-text">Recharge Forge</span>
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

    async loadBuildingData() {
        try {
            Logger.info('Starting to load REP Forge data...');
            
            // Get the player's address
            const playerAddress = await this.contracts.gameState.getAddress();
            
            // Get all active buildings
            const activeBuildingIds = await this.contracts.gridBuildings.getActiveBuildings(playerAddress);
            Logger.info('Retrieved active building IDs:', activeBuildingIds);

            // Get building details for each ID and filter for REP Forges
            const repForges = [];
            for (const buildingId of activeBuildingIds) {
                const building = await this.contracts.gridBuildings.getBuilding(buildingId);
                if (building.buildingType === GridBuildingsContract.BuildingType.REP_FORGE) {
                    repForges.push(building);
                }
            }
            Logger.info('Filtered REP Forges:', repForges);

            // Use the first REP Forge found
            if (repForges.length > 0) {
                this.buildingData = repForges[0];
                this.buildingId = this.buildingData.id;
                Logger.info('Using REP Forge with ID:', this.buildingId);
                
                // Update state with building info
                this.setState({
                    buildingId: this.buildingId,
                    buildingLevel: this.buildingData.level || 1,
                    buildingStatus: this.buildingData.isActive ? 'Active' : (this.buildingData.damaged ? 'Damaged - Needs Repair' : 'Inactive'),
                    forgeStatus: this.buildingData.isActive ? 'Ready to Convert' : 'Inactive'
                });
                
                // Load additional data
                await this.loadPlayerRep();
                await this.loadUserYieldNFTs();
            } else {
                this.setState({
                    forgeStatus: 'No REP Forge Found',
                    buildingStatus: 'Build a REP Forge first'
                });
                throw new Error('No REP Forge found. Please build and stake a REP Forge first.');
            }
            
        } catch (error) {
            Logger.error('Error loading REP Forge data:', error);
            this.setState({
                forgeStatus: 'Error',
                buildingStatus: error.message
            });
        }
    }

    async loadPlayerRep() {
        try {
            const userAddress = await this.contracts.gameState.getAddress();
            const repPoints = await this.contracts.gameState.getPlayerRep(userAddress);
            
            this.setState({
                playerRep: repPoints.toString(),
                canCreateNFT: repPoints > 0
            });
        } catch (error) {
            Logger.error('Error loading player REP:', error);
            this.setState({
                playerRep: 'Error loading',
                canCreateNFT: false
            });
        }
    }

    async loadUserYieldNFTs() {
        try {
            Logger.info('Starting to load user Yield NFTs...');
            
            const nftCollectionElement = document.getElementById('nft-collection');
            const userAddress = await this.contracts.gameState.getAddress();
            
            // TODO: Load SonicityYieldNFTs from the contract
            // For now, show placeholder
            nftCollectionElement.innerHTML = `
                <h3>Your Yield NFT Collection</h3>
                <p>Dynamic NFTs created from your REP Points with on-chain metadata.</p>
                
                <div class="building-details">
                    <div class="detail-item">
                        <span class="detail-label">Coming Soon:</span>
                        <span class="detail-value">SonicityYieldNFT integration</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Features:</span>
                        <span class="detail-value">Dynamic SVG artwork, yield generation, tradeable</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Metadata:</span>
                        <span class="detail-value">On-chain with timestamp and REP amount</span>
                    </div>
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

    async rechargeBuilding() {
        try {
            this.modal.loading('Recharging REP Forge...', 'This may take a few moments');
            
            // REP Forges have free recharging
            await this.contracts.gridBuildings.rechargeBuilding(this.buildingId, { value: 0 });
            
            this.modal.success('REP Forge recharged successfully!', 'Your building is now producing again');
            
            // Refresh data
            await this.loadBuildingData();
            
        } catch (error) {
            Logger.error('Error recharging building:', error);
            this.modal.error(error.message || 'Failed to recharge building', { title: 'Recharge Failed' });
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
            // For now, show what would happen
            this.modal.success(
                'Yield NFT Creation Ready!', 
                `This feature will convert ${repAmount} REP Points into a SonicityYieldNFT with dynamic metadata and yield generation capabilities.`
            );
            
            // Clear the input
            repAmountInput.value = '';
            
            // Refresh data
            await this.loadPlayerRep();
            await this.loadUserYieldNFTs();
            
        } catch (error) {
            Logger.error('Error creating Yield NFT:', error);
            this.modal.error(error.message || 'Failed to create Yield NFT', { title: 'Creation Failed' });
        }
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadBuildingData(); // Refresh all relevant data
        }, 30000);
    }

    onUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Set a global reference for button clicks
        if (window.currentPage === this) {
            window.currentPage = null;
        }
    }

    onMount() {
        // Set a global reference for button clicks
        window.currentPage = this;
    }
} 