import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { TacticsNFTContract } from '../js/contracts/TacticsNFTContract.js';

import('../styles/shop-page.css');

export class TacticsCenterPage extends BasePage {
    constructor() {
        super();
        this.requiredDistrictBuilding = 'Tactics Center';
        
        Logger.info('TacticsCenterPage constructor called');
        
        this.element.className = 'base-page';
        
        // Initialize state
        this.setState({
            gold: 0,
            diamonds: 0,
            tacticCosts: {},
            ownedTactics: {}
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('TacticsCenterPage onInitialized called with wallet:', walletResult);
        try {
            // Load tactic costs and player data
            await this.loadTacticCosts();
            await this.loadTacticsCenterData();
            this.setupMintHandlers();
            Logger.info('Tactics Center page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing tactics center page:', error);
            this.modal.error('Failed to initialize tactics center page. Please try refreshing the page.');
        }
    }

    async loadTacticCosts() {
        try {
            // Load costs for each tactic (1-9)
            const tacticCosts = {};
            for (let tacticId = 1; tacticId <= 9; tacticId++) {
                tacticCosts[tacticId] = await this.contracts.tacticsNFT.getTacticCost(tacticId);
            }
            
            this.setState({ tacticCosts });
        } catch (error) {
            Logger.error('Error loading tactic costs:', error);
            throw error;
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadTacticsCenterData().catch(error => {
                Logger.error('Error loading tactics center data after wallet update:', error);
            });
        }
    }

    async loadTacticsCenterData() {
        try {
            const signer = await this.contracts.gameState.getSigner();
            const address = await signer.getAddress();

            // Load resources
            const [gold, diamonds] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerDiamonds()
            ]);

            Logger.info('Tactics center data loaded:', { gold, diamonds });

            // Load owned tactics
            const ownedTactics = {};
            for (let tacticId = 1; tacticId <= 9; tacticId++) {
                ownedTactics[tacticId] = await this.contracts.tacticsNFT.hasTactic(address, tacticId);
            }

            this.setState({
                gold,
                diamonds,
                ownedTactics
            });

            this.updateDisplay();
        } catch (error) {
            Logger.error('Error loading tactics center data:', error);
            throw error;
        }
    }

    updateDisplay() {
        // Update resource displays
        this.element.querySelector('#gold-amount').textContent = this.state.gold.toString();
        this.element.querySelector('#diamonds-amount').textContent = this.state.diamonds.toString();

        // Update tactic cards
        for (let tacticId = 1; tacticId <= 9; tacticId++) {
            const tacticCard = this.element.querySelector(`#tactic-${tacticId}`);
            if (tacticCard) {
                const isOwned = this.state.ownedTactics[tacticId];
                const cost = this.state.tacticCosts[tacticId];
                
                // Update ownership status
                const statusElement = tacticCard.querySelector('.shop-item-stock');
                if (statusElement) {
                    if (isOwned) {
                        statusElement.innerHTML = '<i class="fas fa-check-circle"></i>Owned';
                        statusElement.className = 'shop-item-stock in-stock';
                    } else {
                        statusElement.innerHTML = '<i class="fas fa-plus-circle"></i>Available';
                        statusElement.className = 'shop-item-stock in-stock';
                    }
                }

                // Update mint button
                const mintButton = tacticCard.querySelector('.mint-tactic-btn');
                if (mintButton) {
                    if (isOwned) {
                        mintButton.textContent = 'Already Owned';
                        mintButton.disabled = true;
                        mintButton.className = 'btn btn-secondary mint-tactic-btn';
                    } else {
                        mintButton.textContent = 'Mint Tactic';
                        mintButton.disabled = false;
                        mintButton.className = 'btn btn-primary mint-tactic-btn';
                    }
                }

                // Update cost display
                if (cost) {
                    const costElement = tacticCard.querySelector('.cost-component');
                    if (costElement) {
                        costElement.innerHTML = `
                            <div class="cost-item">
                                <i class="fas fa-coins cost-icon"></i>
                                <span class="cost-value">${cost.goldCost}</span>
                            </div>
                            <div class="cost-item">
                                <i class="fas fa-gem cost-icon"></i>
                                <span class="cost-value">${cost.diamondCost}</span>
                            </div>
                        `;
                    }
                }
            }
        }
    }

    setupMintHandlers() {
        // Use BasePage event management system to prevent duplicate handlers
        this.addEventListener('.mint-tactic-btn', 'click', async (event) => {
            const btn = event.currentTarget;
            const tacticId = parseInt(btn.getAttribute('data-tactic-id'));
                if (!tacticId) return;

                const cost = this.state.tacticCosts[tacticId];

                if (!cost) {
                    this.modal.error('Unable to load tactic cost information');
                    return;
                }

                // Check if player has enough resources
                if (this.state.gold < cost.goldCost) {
                    this.modal.error(`Insufficient Gold. You need ${cost.goldCost} Gold to mint this tactic.`);
                    return;
                }

                if (this.state.diamonds < cost.diamondCost) {
                    this.modal.error(`Insufficient Diamonds. You need ${cost.diamondCost} Diamonds to mint this tactic.`);
                    return;
                }

                // Get tactic info for confirmation
                const tacticInfo = await this.contracts.tacticsNFT.getTactic(tacticId);
                const tacticTypeNames = ['STRIKE', 'SHIELD', 'TRICK'];
                const tacticTypeName = tacticTypeNames[tacticInfo.tacticType];

                // Confirm minting
                const result = await this.modal.confirm(
                    `Mint <b>${tacticInfo.name}</b> (${tacticTypeName}) for <b>${cost.goldCost} Gold and ${cost.diamondCost} Diamonds</b>?`,
                    { title: 'Confirm Tactic Minting' }
                );

                if (result.isConfirmed) {
                    await this.mintTactic(tacticId, tacticInfo.name);
                }
        });
    }

    async mintTactic(tacticId, tacticName) {
        const mintButton = this.element.querySelector(`[data-tactic-id="${tacticId}"]`);
        
        // Show loading modal IMMEDIATELY to prevent multiple clicks and provide feedback
        const loadingModal = this.modal.loading('Minting tactic...');
        
        try {
            // Mint the tactic
            const receipt = await this.contracts.tacticsNFT.mintTactic(tacticId);
            
            // Reload data (keep loading modal open during this)
            await this.loadTacticsCenterData();
            
            // Close loading modal after data reload
            loadingModal.close();
            
            // Track successful tactic mint in analytics
            if (window.gameAnalytics) {
                window.gameAnalytics.track('tactic_minted', {
                    tactic_id: tacticId,
                    tactic_name: tacticName
                });
            }
            
            // Show success message
            this.modal.success(`${tacticName} minted successfully! Your tactic is ready for deployment.`);
            
        } catch (error) {
            // Close loading modal on error
            loadingModal.close();
            
            // Track tactic mint error in analytics
            if (window.gameAnalytics) {
                window.gameAnalytics.trackError('tactic_mint_failed', error.message || 'Unknown error');
            }
            
            Logger.error('Error minting tactic:', error);
            this.modal.error('Failed to mint tactic: ' + error.message);
        }
    }



    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Tactics Center</h1>
                <p class="page-description">
                    <strong>Welcome to the Tactics Center!</strong> Here you can acquire powerful battle tactics to enhance your combat effectiveness.
                    <em>Each tactic provides unique bonuses during battles and can turn the tide of war.</em>
                </p>
                
                <!-- Status Section -->
                <div class="page-section">
                    <h2>Your Resources</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span id="gold-amount" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Diamonds:</span>
                            <span id="diamonds-amount" class="status-value">0</span>
                        </div>
                    </div>
                </div>



                <!-- Tactics Section -->
                <div class="page-section">
                    <h2>Available Tactics</h2>
                    <div class="buildings-grid-rows">
                        <!-- STRIKE Tactics -->
                        <div class="shop-item-card" id="tactic-1">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(1)}" alt="${TacticsNFTContract.getTacticName(1)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(1)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(1)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="1">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-2">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(2)}" alt="${TacticsNFTContract.getTacticName(2)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(2)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(2)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="2">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-3">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(3)}" alt="${TacticsNFTContract.getTacticName(3)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(3)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(3)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="3">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-4">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(4)}" alt="${TacticsNFTContract.getTacticName(4)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(4)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(4)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="4">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-5">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(5)}" alt="${TacticsNFTContract.getTacticName(5)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(5)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(5)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="5">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-6">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(6)}" alt="${TacticsNFTContract.getTacticName(6)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(6)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(6)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="6">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-7">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(7)}" alt="${TacticsNFTContract.getTacticName(7)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(7)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(7)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="7">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-8">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(8)}" alt="${TacticsNFTContract.getTacticName(8)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(8)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(8)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="8">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>

                        <div class="shop-item-card" id="tactic-9">
                            <div class="shop-item-image">
                                <img src="/images/tactics/${TacticsNFTContract.getTacticImageName(9)}" alt="${TacticsNFTContract.getTacticName(9)}" onerror="this.src='/images/tactics/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${TacticsNFTContract.getTacticTitle(9)}</h3>
                                    <span class="shop-item-stock in-stock"><i class="fas fa-plus-circle"></i>Available</span>
                                </div>
                                <div class="shop-item-desc">
                                    ${TacticsNFTContract.getTacticDescription(9)}
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">100</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">16</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-tactic-btn" data-tactic-id="9">
                                    Mint Tactic
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
} 