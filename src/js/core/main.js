import * as THREE from 'three';
import { Game } from './game.js';
import { Navbar } from '../../components/Navbar.js';
import { GamePage } from '../../pages/GamePage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { MintPage } from '../../pages/MintPage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import '../../styles/access-page.css';
import '../../styles/dashboard-page.css';

class App {
    constructor() {
        this.navbar = new Navbar();
        this.currentPage = null;
        this.game = null;
        this.container = document.getElementById('app');
        this.hasVerifiedNFT = false;
        this.init();
    }

    init() {
        // Mount navbar
        this.navbar.mount(this.container);

        // Handle page changes
        window.addEventListener('popstate', () => this.handleRoute());
        window.addEventListener('pageChange', (e) => this.handleRoute(e.detail.page));
        
        // Handle NFT verification
        window.addEventListener('nftVerified', () => {
            this.hasVerifiedNFT = true;
            this.handleRoute('dashboard');
        });

        // Initial route
        this.handleRoute();
    }

    async handleRoute(page = window.location.pathname.slice(1) || 'dashboard') {
        // Clean up current page
        if (this.currentPage) {
            this.currentPage.unmount();
        }

        // Handle game page specially
        if (page === 'dashboard') {
            if (!this.hasVerifiedNFT) {
                page = 'access';
            }
        }

        // Create and mount new page
        switch (page) {
            case 'dashboard':
                this.currentPage = new DashboardPage();
                this.currentPage.mount(this.container);
                break;
            case 'overview':
                this.currentPage = new GamePage();
                this.currentPage.mount(this.container);
                if (!this.game) {
                    const renderDiv = document.getElementById('renderDiv');
                    this.game = new Game(renderDiv);
                    await this.game.init();
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

// Initialize the app
new App();