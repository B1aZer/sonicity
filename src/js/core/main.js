import * as THREE from 'three';
import { Game } from './game.js';
import { Navbar } from '../../components/Navbar.js';
import { GamePage } from '../../pages/GamePage.js';
import { MintPage } from '../../pages/MintPage.js';

class App {
    constructor() {
        this.navbar = new Navbar();
        this.currentPage = null;
        this.game = null;
        this.container = document.getElementById('app');
        this.init();
    }

    init() {
        // Mount navbar
        this.navbar.mount(this.container);

        // Handle navigation
        window.addEventListener('pageChange', (e) => this.handlePageChange(e.detail.page));
        window.addEventListener('popstate', () => this.handlePageChange(window.location.pathname.slice(1) || 'game'));

        // Initial page load
        this.handlePageChange(window.location.pathname.slice(1) || 'game');
    }

    handlePageChange(page) {
        // Clean up current page and game
        if (this.currentPage) {
            this.currentPage.unmount();
        }
        if (this.game) {
            this.game.dispose();
            this.game = null;
        }

        // Create and mount new page
        switch (page) {
            case 'game':
                this.currentPage = new GamePage();
                this.currentPage.mount(this.container);
                // Initialize game after the page is mounted
                const renderDiv = document.getElementById('renderDiv');
                if (renderDiv) {
                    this.game = new Game(renderDiv);
                } else {
                    console.error("Error: renderDiv not found after mounting GamePage");
                }
                break;
            case 'mint':
                this.currentPage = new MintPage();
                this.currentPage.mount(this.container);
                break;
            default:
                this.currentPage = new GamePage();
                this.currentPage.mount(this.container);
                const defaultRenderDiv = document.getElementById('renderDiv');
                if (defaultRenderDiv) {
                    this.game = new Game(defaultRenderDiv);
                } else {
                    console.error("Error: renderDiv not found after mounting GamePage");
                }
        }
    }
}

// Initialize the app
new App();