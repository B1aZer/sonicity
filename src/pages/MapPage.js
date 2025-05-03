import '../styles/map-page.css';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { showMessage } from '../js/utils/uiUtils.js';

export class MapPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'map-page';
        this.gameStateContract = new GameStateContract();
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add click event listeners for all cities
        const cities = this.element.querySelectorAll('.city');
        cities.forEach(city => {
            city.addEventListener('click', async () => {
                try {
                    // Check if wallet is connected
                    if (!window.ethereum) {
                        showMessage('Please install MetaMask to interact with cities', this.element);
                        return;
                    }

                    // Initialize contract with user's wallet
                    await this.gameStateContract.initialize();

                    const cityId = this.getCityIdFromElement(city);
                    
                    // Show loading message
                    showMessage('Joining city...', this.element);
                    
                    // Join the city
                    await this.gameStateContract.joinCity(cityId);
                    
                    // Navigate to dashboard
                    window.history.pushState({}, '', '/dashboard');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } catch (error) {
                    console.error('Error joining city:', error);
                    showMessage(error.message || 'Failed to join city', this.element);
                }
            });
        });
    }

    getCityIdFromElement(cityElement) {
        // Convert city position to ID (1-4)
        const position = cityElement.dataset.city;
        switch(position) {
            case 'bottom-left': return 1;
            case 'bottom-right': return 2;
            case 'top-left': return 3;
            case 'top-right': return 4;
            default: throw new Error('Invalid city position');
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="map-container">
                <img src="/images/map1.png" alt="City Map" class="city-map" />
                <div class="city city-bottom-left" data-city="bottom-left" title="Click to join city"></div>
                <div class="city city-bottom-right" data-city="bottom-right" title="Click to join city"></div>
                <div class="city city-top-left" data-city="top-left" title="Click to join city"></div>
                <div class="city city-top-right" data-city="top-right" title="Click to join city"></div>
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