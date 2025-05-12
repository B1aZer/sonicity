import * as THREE from 'three';
import { Game } from './game.js';
import { Layout } from '../../components/Layout.js';
import { GamePage } from '../../pages/GamePage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { MapPage } from '../../pages/MapPage.js';
import { MintPage } from '../../pages/MintPage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import { StakePage } from '../../pages/StakePage.js';
import { HousePage } from '../../pages/HousePage.js';
import { CityPage } from '../../pages/CityPage.js';
import { DistrictPage } from '../../pages/DistrictPage.js';
import { appState } from './state.js';
import { AccessControl } from '../utils/accessControl.js';
import { Modal } from '../utils/modal.js';
import { GameStateContract } from '../contracts/GameStateContract.js';

class App {
    constructor() {
        this.layout = new Layout();
        this.currentPage = null;
        this.game = null;
        this.container = document.getElementById('app');
        this.modal = new Modal();
        this.init();
    }

    async init() {
        // Mount layout
        this.layout.mount(this.container);

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
        if (page === 'dashboard' || page === 'overview' || page === 'house' || page === 'city' || page === 'district') {
            if (!await AccessControl.checkCityAccess()) {
                page = AccessControl.hasVerifiedNFT() ? '' : 'access';
            }
        }

        // Create and mount new page
        switch (page) {
            case '':
                this.currentPage = new MapPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'dashboard':
                this.currentPage = new DashboardPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'overview':
                this.currentPage = new GamePage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'mint':
                this.currentPage = new MintPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'access':
                this.currentPage = new AccessPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'stake':
                this.currentPage = new StakePage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'house':
                this.currentPage = new HousePage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'city':
                this.currentPage = new CityPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'district':
                this.currentPage = new DistrictPage();
                this.currentPage.mount(this.layout.content);
                break;
            default:
                window.history.pushState({}, '', '/access');
                this.handleRoute('access');
        }
    }
}

// Initialize app
const app = new App();