import '../styles/map-page.css';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { BasePage } from './BasePage.js';

export class MapPage extends BasePage {
    constructor() {
        super();
        Logger.info('MapPage constructor called');
        
        this.element.className = 'map-page';
        
        this.gameStateContract = new GameStateContract();
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('MapPage onInitialized called with wallet:', walletResult.address);
        try {
            this.setupEventListeners();
            Logger.info('Map page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing map page:', error);
            this.modal.error('Failed to initialize map page. Please try refreshing the page.');
        }
    }

    setupEventListeners() {
        // Add click event listeners for all cities
        const cities = this.element.querySelectorAll('.city');
        cities.forEach(city => {
            city.addEventListener('click', async () => {
                try {
                    // Check if wallet is connected
                    if (!window.ethereum) {
                        this.modal.error('Please install MetaMask to interact with cities');
                        return;
                    }

                    // Initialize contract with user's wallet
                    await this.gameStateContract.initialize();

                    const cityId = this.getCityIdFromElement(city);
                    Logger.info('Attempting to join city with ID:', cityId);
                    const currentCity = await this.gameStateContract.getPlayerCity();
                    Logger.info('Current player city:', currentCity);

                    if (currentCity) {
                        // Player is already in a city, just navigate to dashboard
                        window.history.pushState({}, '', '/dashboard');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                        return;
                    }

                    // Show loading message
                    this.modal.loading('Joining city...');

                    // Join the city
                    await this.gameStateContract.joinCity(cityId);

                    // Close loading modal
                    this.modal.close();

                    // Show success message
                    this.modal.success('Successfully joined city!');

                    // Navigate to dashboard
                    window.history.pushState({}, '', '/dashboard');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                } catch (error) {
                    Logger.error('Error joining city:', error);
                    this.modal.error(error.message || 'Failed to join city');
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
        Logger.info('Mounting map page...');
        container.appendChild(this.element);
        // Initialize using base class method
        this.initialize().catch(error => {
            Logger.error('Error during map page initialization:', error);
            this.modal.error('Failed to initialize map page. Please try refreshing the page.');
        });
    }

    unmount() {
        this.element.remove();
    }
} 