import * as THREE from 'three';
import { Game } from './game.js';
import { Layout } from '../../components/Layout.js';
import { GamePage } from '../../pages/GamePage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { StartPage } from '../../pages/StartPage.js';
import { MintPage } from '../../pages/MintPage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import { StakePage } from '../../pages/StakePage.js';
import { HousePage } from '../../pages/HousePage.js';
import { FarmPage } from '../../pages/FarmPage.js';
import { CityPage } from '../../pages/CityPage.js';
import { DistrictPage } from '../../pages/DistrictPage.js';
import { ShopPage } from '../../pages/ShopPage.js';
import { WorkshopPage } from '../../pages/WorkshopPage.js';
import { BarracksPage } from '../../pages/BarracksPage.js';
import { ScoutGuildPage } from '../../pages/ScoutGuildPage.js';
import { CommandCenterPage } from '../../pages/CommandCenterPage.js';
import { appState } from './state.js';
import { AccessControl } from '../utils/accessControl.js';
import { Modal } from '../utils/modal.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import { WalletManager } from '../utils/wallet.js';
import Logger from '../utils/logger.js';

class App {
    constructor() {
        this.layout = new Layout();
        this.currentPage = null;
        this.game = null;
        this.container = document.getElementById('app');
        this.modal = new Modal();
        this.init();
    }

    init() {
        // Mount layout
        this.layout.mount(this.container);

        // Setup navigation
        window.addEventListener('popstate', () => this.handleRoute());
        // Initial route will be handled by popstate event
        window.dispatchEvent(new PopStateEvent('popstate'));

        // Setup wallet connection listener
        window.addEventListener('walletConnected', (event) => {
            this.handleRoute();
        });
    }

    async handleRoute(page = window.location.pathname.slice(1) || '') {
        Logger.info('Handling route:', page);
        
        // Clean up current page
        if (this.currentPage) {
            this.currentPage.unmount();
        }

        // Clean up game if it exists and we're not going to the overview page
        if (this.game && page !== 'overview') {
            this.game.dispose();
            this.game = null;
        }

        // Check wallet connection for all routes except access and mint
        if (page !== 'access' && page !== 'mint') {
            if (!AccessControl.isWalletConnected()) {
                Logger.info('Wallet not connected, redirecting to access page');
                window.history.pushState({}, '', '/access');
                this.currentPage = new AccessPage();
                this.currentPage.mount(this.layout.content);
                return;
            }

            // Check player initialization for all routes except start page
            if (page !== '') {
                const isInitialized = await AccessControl.isPlayerInitialized();
                if (!isInitialized) {
                    Logger.info('Player not initialized, redirecting to start page');
                    window.history.pushState({}, '', '/');
                    this.currentPage = new StartPage();
                    this.currentPage.mount(this.layout.content);
                    return;
                }
            }
        }

        // Create and mount new page
        switch (page) {
            case '':
                this.currentPage = new StartPage();
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
            case 'farm':
                this.currentPage = new FarmPage();
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
            case 'shop':
                this.currentPage = new ShopPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'workshop':
                this.currentPage = new WorkshopPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'barracks':
                this.currentPage = new BarracksPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'scout-guild':
                this.currentPage = new ScoutGuildPage();
                this.currentPage.mount(this.layout.content);
                break;
            case 'command-center':
                this.currentPage = new CommandCenterPage();
                this.currentPage.mount(this.layout.content);
                break;
            default:
                Logger.info('Invalid route, redirecting to access page');
                window.history.pushState({}, '', '/access');
                this.handleRoute('access');
        }
    }
}

// Initialize app
new App();