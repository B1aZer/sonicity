import { BasePage } from './BasePage.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { HeroNFTContract } from '../js/contracts/HeroNFTContract.js';

import('../styles/shop-page.css');

export class TavernPage extends BasePage {
    constructor() {
        super();
        
        Logger.info('TavernPage constructor called');
        
        this.element.className = 'base-page';
        
        // Initialize state
        this.setState({
            gold: 0,
            food: 0,
            diamonds: 0,
            heroCosts: {},
            ownedHeroes: {}
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('TavernPage onInitialized called with wallet:', walletResult);
        try {
            // Load hero costs and player data
            await this.loadHeroCosts();
            await this.loadTavernData();
            this.setupMintHandlers();
            Logger.info('Tavern page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing tavern page:', error);
            this.modal.error('Failed to initialize tavern page. Please try refreshing the page.');
        }
    }

    async loadHeroCosts() {
        try {
            // Load costs for each hero class
            const heroClasses = Object.keys(HeroNFTContract.HERO_CLASSES);
            const heroCosts = {};
            for (const className of heroClasses) {
                const heroClassValue = HeroNFTContract.HERO_CLASSES[className];
                heroCosts[className] = await this.contracts.heroNFT.getHeroCost(heroClassValue);
            }
            
            this.setState({ heroCosts });
        } catch (error) {
            Logger.error('Error loading hero costs:', error);
            throw error;
        }
    }

    updateWalletStatus(address) {
        Logger.info('Updating wallet status with address:', address);
        if (address) {
            this.loadTavernData().catch(error => {
                Logger.error('Error loading tavern data after wallet update:', error);
            });
        }
    }

    async loadTavernData() {
        try {
            const signer = await this.contracts.gameState.getSigner();
            const address = await signer.getAddress();

            // Load resources
            const [gold, food, diamonds] = await Promise.all([
                this.contracts.gameState.getPlayerGold(),
                this.contracts.gameState.getPlayerFood(),
                this.contracts.gameState.getPlayerDiamonds()
            ]);

            Logger.info('Tavern data loaded:', { gold, food, diamonds });

            // Load owned heroes
            const heroClasses = Object.keys(HeroNFTContract.HERO_CLASSES);
            const ownedHeroes = {};
            for (const className of heroClasses) {
                const heroClassValue = HeroNFTContract.HERO_CLASSES[className];
                ownedHeroes[className] = await this.contracts.heroNFT.hasHero(address, heroClassValue);
            }

            this.setState({
                gold,
                food,
                diamonds,
                ownedHeroes
            });

            this.updateDisplay();
        } catch (error) {
            Logger.error('Error loading tavern data:', error);
            throw error;
        }
    }

    updateDisplay() {
        // Update resource displays
        this.element.querySelector('#gold-amount').textContent = this.state.gold.toString();
        this.element.querySelector('#food-amount').textContent = this.state.food.toString();
        this.element.querySelector('#diamonds-amount').textContent = this.state.diamonds.toString();

        // Update hero cards
        const heroClasses = Object.keys(HeroNFTContract.HERO_CLASSES);
        heroClasses.forEach(className => {
            const heroCard = this.element.querySelector(`#hero-${className.toLowerCase()}`);
            if (heroCard) {
                const isOwned = this.state.ownedHeroes[className];
                const cost = this.state.heroCosts[className];
                


                // Update mint button
                const mintButton = heroCard.querySelector('.mint-hero-btn');
                if (mintButton) {
                    if (isOwned) {
                        mintButton.textContent = 'Already Owned';
                        mintButton.disabled = true;
                        mintButton.className = 'btn btn-secondary mint-hero-btn';
                    } else {
                        mintButton.textContent = 'Mint Hero';
                        mintButton.disabled = false;
                        mintButton.className = 'btn btn-primary mint-hero-btn';
                    }
                }

                // Update cost display
                if (cost) {
                    const costElement = heroCard.querySelector('.cost-component');
                    if (costElement) {
                        costElement.innerHTML = `
                            <div class="cost-item">
                                <i class="fas fa-coins cost-icon"></i>
                                <span class="cost-value">${cost.goldCost}</span>
                            </div>
                            <div class="cost-item">
                                <i class="fas fa-wheat-awn cost-icon"></i>
                                <span class="cost-value">${cost.foodCost}</span>
                            </div>
                            <div class="cost-item">
                                <i class="fas fa-gem cost-icon"></i>
                                <span class="cost-value">${cost.diamondCost}</span>
                            </div>
                        `;
                    }
                }
            }
        });
    }

    setupMintHandlers() {
        // Use BasePage event management system to prevent duplicate handlers
        this.addEventListener('.mint-hero-btn', 'click', async (event) => {
            const btn = event.currentTarget;
            const heroClass = btn.getAttribute('data-hero-class');
                if (!heroClass) return;

                const heroClassValue = HeroNFTContract.HERO_CLASSES[heroClass];
                const cost = this.state.heroCosts[heroClass];

                if (!cost) {
                    this.modal.error('Unable to load hero cost information');
                    return;
                }

                // Check if player has enough resources
                if (this.state.gold < cost.goldCost) {
                    this.modal.error(`Insufficient Gold. You need ${cost.goldCost} Gold to mint this hero.`);
                    return;
                }

                if (this.state.food < cost.foodCost) {
                    this.modal.error(`Insufficient Food. You need ${cost.foodCost} Food to mint this hero.`);
                    return;
                }

                if (this.state.diamonds < cost.diamondCost) {
                    this.modal.error(`Insufficient Diamonds. You need ${cost.diamondCost} Diamonds to mint this hero.`);
                    return;
                }

                // Confirm minting
                const result = await this.modal.confirm(
                    `Mint <b>${heroClass}</b> hero for <b>${cost.goldCost} Gold, ${cost.foodCost} Food, and ${cost.diamondCost} Diamonds</b>?`,
                    { title: 'Confirm Hero Minting' }
                );

                if (result.isConfirmed) {
                    await this.mintHero(heroClassValue, heroClass);
                }
        });
    }

    async mintHero(heroClassValue, heroClassName) {
        const mintButton = this.element.querySelector(`[data-hero-class="${heroClassName}"]`);
        
        // Show loading modal IMMEDIATELY to prevent multiple clicks and provide feedback
        const loadingModal = this.modal.loading('Minting hero...');
        
        try {
            // Mint the hero
            const receipt = await this.contracts.heroNFT.mintHero(heroClassValue);
            
            // Reload data (keep loading modal open during this)
            await this.loadTavernData();
            
            // Close loading modal after data reload
            loadingModal.close();
            
            // Track successful hero mint in analytics
            if (window.gameAnalytics) {
                window.gameAnalytics.track('hero_minted', {
                    hero_class: heroClassName,
                    hero_class_value: heroClassValue
                });
            }
            
            // Show success message
            this.modal.success(`${heroClassName} hero minted successfully! Your hero is ready for battle.`);
            
        } catch (error) {
            // Close loading modal on error
            loadingModal.close();
            
            // Track hero mint error in analytics
            if (window.gameAnalytics) {
                window.gameAnalytics.trackError('hero_mint_failed', error.message || 'Unknown error');
            }
            
            Logger.error('Error minting hero:', error);
            this.modal.error('Failed to mint hero: ' + error.message);
        }
    }



    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Tavern</h1>
                <p class="page-description">
                    <strong>Welcome to the Tavern!</strong> Here you can recruit legendary heroes to aid you in battle. 
                    <em>Each hero provides unique bonuses to your troops and can turn the tide of war.</em>
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
                            <span class="status-label">Food:</span>
                            <span id="food-amount" class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Diamonds:</span>
                            <span id="diamonds-amount" class="status-value">0</span>
                        </div>
                    </div>
                </div>



                <!-- Heroes Section -->
                <div class="page-section">
                    <h2>Available Heroes</h2>
                    <div class="buildings-grid-rows">
                        <!-- WARRIOR -->
                        <div class="shop-item-card" id="hero-warrior">
                            <div class="shop-item-image">
                                <img src="/images/heroes/warrior.png" alt="Warrior" onerror="this.src='/images/heroes/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>Iron Guardian (WARRIOR)</h3>
                                </div>
                                <div class="shop-item-desc">
                                    A mighty warrior who boosts Infantry power by +20 per troop. 
                                    Perfect for players who prefer overwhelming force with large infantry armies.
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">1500</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-wheat-awn cost-icon"></i>
                                        <span class="cost-value">1000</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">40</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-hero-btn" data-hero-class="WARRIOR">
                                    Mint Hero
                                </button>
                            </div>
                        </div>

                        <!-- STRATEGIST -->
                        <div class="shop-item-card" id="hero-strategist">
                            <div class="shop-item-image">
                                <img src="/images/heroes/strategist.png" alt="Strategist" onerror="this.src='/images/heroes/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>Shadow Tactician (STRATEGIST)</h3>
                                </div>
                                <div class="shop-item-desc">
                                    A cunning strategist who boosts Siege power by +20 per troop. 
                                    Ideal for players who rely on powerful siege weapons to break enemy defenses.
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">1200</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-wheat-awn cost-icon"></i>
                                        <span class="cost-value">1200</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">35</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-hero-btn" data-hero-class="STRATEGIST">
                                    Mint Hero
                                </button>
                            </div>
                        </div>

                        <!-- SCOUT -->
                        <div class="shop-item-card" id="hero-scout">
                            <div class="shop-item-image">
                                <img src="/images/heroes/scout.png" alt="Scout" onerror="this.src='/images/heroes/default.png'" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>Swift Scout (SCOUT)</h3>
                                </div>
                                <div class="shop-item-desc">
                                    A swift scout who boosts Cavalry power by +20 per troop. 
                                    Perfect for players who prefer fast, mobile cavalry tactics.
                                </div>
                                <div class="cost-component">
                                    <div class="cost-item">
                                        <i class="fas fa-coins cost-icon"></i>
                                        <span class="cost-value">1000</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-wheat-awn cost-icon"></i>
                                        <span class="cost-value">1000</span>
                                    </div>
                                    <div class="cost-item">
                                        <i class="fas fa-gem cost-icon"></i>
                                        <span class="cost-value">30</span>
                                    </div>
                                </div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary mint-hero-btn" data-hero-class="SCOUT">
                                    Mint Hero
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}