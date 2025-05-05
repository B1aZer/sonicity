import '../styles/dashboard-page.css';
import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { ethers } from 'ethers';

export class DashboardPage {
    constructor() {
        Logger.info('DashboardPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'dashboard-page';
        this.gameState = new GameStateContract();
        this.render();
        this.setupEventListeners();
        this.loadPlayerData();
    }

    async loadPlayerData() {
        try {
            const [gold, buildingSlots] = await Promise.all([
                this.gameState.getPlayerGold(),
                this.gameState.getBuildingSlots()
            ]);

            // Update gold display
            const goldValue = this.element.querySelector('.status-value');
            if (goldValue) {
                goldValue.textContent = ethers.formatEther(gold);
            }

            // Update building slots display
            const slotsItem = this.element.querySelector('.status-item:last-child .status-value');
            if (slotsItem) {
                slotsItem.textContent = buildingSlots.toString();
            }
        } catch (error) {
            Logger.error('Error loading player data:', error);
        }
    }

    async handleBuildingAction(buildingType) {
        try {
            Logger.info(`Attempting to build: ${buildingType}`);
            
            // Create the building
            const tx = await this.gameState.createBuilding(buildingType);
            
            // Wait for transaction to be mined
            await tx.wait();
            
            // Reload player data to update UI
            await this.loadPlayerData();
            
            Logger.info(`Successfully built: ${buildingType}`);
        } catch (error) {
            Logger.error(`Error building ${buildingType}:`, error);
            // You might want to show an error message to the user here
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Add click event listeners for building buttons
        const buildingButtons = this.element.querySelectorAll('.building-button');
        buildingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buildingType = button.getAttribute('data-building');
                if (buildingType) {
                    this.handleBuildingAction(buildingType);
                }
            });
        });

        // Add click event listener for the bottom left city
        const bottomLeftCity = this.element.querySelector('.city-bottom-left');
        if (bottomLeftCity) {
            bottomLeftCity.addEventListener('click', () => {
                window.history.pushState({}, '', '/dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }
    }

    render() {
        Logger.info('Rendering dashboard page');
        this.element.innerHTML = `
            <div class="dashboard-container">
                <h1>City Dashboard</h1>
                
                <!-- Status Section -->
                <div class="dashboard-section status-section">
                    <h2>Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span class="status-value">Loading...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Rep Points:</span>
                            <span class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Building Slots:</span>
                            <span class="status-value">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <!-- District Buildings Section -->
                <div class="dashboard-section district-buildings-section">
                    <h2>District Buildings</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>House</h3>
                            <p>Basic residential building for citizens</p>
                            <button class="building-button" data-building="house">Build House</button>
                        </div>
                        <div class="building-card">
                            <h3>Water Supply</h3>
                            <p>Provides water infrastructure for the district</p>
                            <button class="building-button" data-building="water-supply">Build Water Supply</button>
                        </div>
                        <div class="building-card">
                            <h3>Workshop</h3>
                            <p>Produces goods and provides employment</p>
                            <button class="building-button" data-building="workshop">Build Workshop</button>
                        </div>
                    </div>
                </div>
                
                <!-- City Buildings Section -->
                <div class="dashboard-section city-buildings-section">
                    <h2>City Buildings</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Town Hall</h3>
                            <p>Increase of gold production for all homes</p>
                            <p>Rep Point increase</p>
                            <button class="building-button" data-building="town-hall">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Treasury</h3>
                            <p>Allows gold imports with heavy taxes</p>
                            <p>Limited amounts weekly</p>
                            <button class="building-button" data-building="treasury">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Barracks</h3>
                            <p>Buy units for future arena battles (cool PvP later)</p>
                            <button class="building-button" data-building="barracks">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Diplomacy Center</h3>
                            <p>Start negotiations: alliances, trades, non-aggression</p>
                            <button class="building-button" data-building="diplomacy">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Bank</h3>
                            <p>Allows gold trade</p>
                            <button class="building-button" data-building="bank">Build/Upgrade</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 