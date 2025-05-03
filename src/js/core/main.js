import * as THREE from 'three';
import { Game } from './game.js';
import { Navbar } from '../../components/Navbar.js';
import { GamePage } from '../../pages/GamePage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { MapPage } from '../../pages/MapPage.js';
import { MintPage } from '../../pages/MintPage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import { appState } from './state.js';
import { AccessControl } from '../utils/accessControl.js';
import { Toast } from '../utils/toast.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import '../../styles/access-page.css';
import '../../styles/dashboard-page.css';
import '../../styles/map-page.css';

class App {
    constructor() {
        this.navbar = new Navbar();
        this.currentPage = null;
        this.game = null;
        this.container = document.getElementById('app');
        this.init();
    }

    async init() {
        // Mount navbar
        this.navbar.mount(this.container);

        // Try to fetch user's city ID from contract if wallet is connected
        await this.initializePlayerCityId();

        // Handle initial route
        this.handleRoute();

        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRoute());

        // Handle state changes
        appState.subscribe(() => this.handleStateChange());
    }

    async initializePlayerCityId() {
        try {
            const state = appState.getState();
            // Only try to get the city ID if wallet is connected
            if (state.walletConnected && state.currentWallet) {
                const gameStateContract = new GameStateContract();
                await gameStateContract.initialize();
                const cityId = await gameStateContract.getPlayerCity();
                // Update appState with the cityId (will be 0 if not in a city)
                appState.setCurrentCityId(cityId);
            }
        } catch (error) {
            console.error('Error initializing player city ID:', error);
            // Don't show error to user, just log it
        }
    }

    handleStateChange() {
        const state = appState.getState();
        if (state.hasVerifiedNFT && window.location.pathname === '/access') {
            this.handleRoute('dashboard');
        }
    }

    async handleRoute(page = window.location.pathname.slice(1) || '') {
        // Clean up current page
        if (this.currentPage) {
            this.currentPage.unmount();
        }

        // Clean up game if it exists and we're not going to the overview page
        if (this.game && page !== 'overview') {
            this.game.dispose();
            this.game = null;
        }

        const state = appState.getState();

        // Handle protected routes
        if (page === 'dashboard' || page === 'overview') {
            if (!AccessControl.canAccessDashboard()) {
                if (AccessControl.hasVerifiedNFT() && !AccessControl.isInCity()) {
                    // User is verified but not in a city: send to map to join a city
                    page = '';
                    Toast.warning('Please join a city first to access the dashboard.');
                } else {
                    // Not verified: send to access page
                    page = 'access';
                }
            }
        }

        // Create and mount new page
        switch (page) {
            case '':
                this.currentPage = new MapPage();
                this.currentPage.mount(this.container);
                break;
            case 'dashboard':
                this.currentPage = new DashboardPage();
                this.currentPage.mount(this.container);
                break;
            case 'overview':
                this.currentPage = new GamePage();
                this.currentPage.mount(this.container);
                
                // Initialize game if it doesn't exist
                if (!this.game) {
                    const renderDiv = document.getElementById('renderDiv');
                    if (renderDiv) {
                        this.game = new Game(renderDiv);
                        await this.game.init();
                    } else {
                        console.error('Render div not found');
                    }
                }
                break;
            case 'mint':
                this.currentPage = new MintPage();
                this.currentPage.mount(this.container);
                break;
            case 'access':
                this.currentPage = new AccessPage();
                this.currentPage.mount(this.container);
                break;
            default:
                window.history.pushState({}, '', '/access');
                this.handleRoute('access');
        }
    }
}

// Initialize app
const app = new App();