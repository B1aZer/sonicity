import * as THREE from 'three';
import { Game } from './game.js';
import { Navbar } from '../../components/Navbar.js';
import { GamePage } from '../../pages/GamePage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { MapPage } from '../../pages/MapPage.js';
import { MintPage } from '../../pages/MintPage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import { StakePage } from '../../pages/StakePage.js';
import { appState } from './state.js';
import { AccessControl } from '../utils/accessControl.js';
import { Modal } from '../utils/modal.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import '../../styles/access-page.css';
import '../../styles/dashboard-page.css';
import '../../styles/map-page.css';
import '../../styles/stake-page.css';
import '../../styles/toastr.css';

class App {
    constructor() {
        this.navbar = new Navbar();
        this.currentPage = null;
        this.game = null;
        this.container = document.getElementById('app');
        this.modal = new Modal();
        this.init();
    }

    async init() {
        // Mount navbar
        this.navbar.mount(this.container);

        // Handle initial route
        this.handleRoute();

        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRoute());

        // Handle state changes
        appState.subscribe(() => this.handleStateChange());
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

        // Handle protected routes
        if (page === 'dashboard' || page === 'overview') {
            if (!await AccessControl.checkCityAccess()) {
                page = AccessControl.hasVerifiedNFT() ? '' : 'access';
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
                break;
            case 'mint':
                this.currentPage = new MintPage();
                this.currentPage.mount(this.container);
                break;
            case 'access':
                this.currentPage = new AccessPage();
                this.currentPage.mount(this.container);
                break;
            case 'stake':
                this.currentPage = new StakePage();
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