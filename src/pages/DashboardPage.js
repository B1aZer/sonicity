import '../styles/dashboard-page.css';
import Logger from '../js/utils/logger.js';

export class DashboardPage {
    constructor() {
        Logger.info('DashboardPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'dashboard-page';
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
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
                            <span class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Rep Points:</span>
                            <span class="status-value">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Town Hall Tier:</span>
                            <span class="status-value">Bronze</span>
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
                            <button class="building-button" data-building="house">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Water Supply</h3>
                            <p>Provides water infrastructure for the district</p>
                            <button class="building-button" data-building="water-supply">Build/Upgrade</button>
                        </div>
                        <div class="building-card">
                            <h3>Workshop</h3>
                            <p>Produces goods and provides employment</p>
                            <button class="building-button" data-building="workshop">Build/Upgrade</button>
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