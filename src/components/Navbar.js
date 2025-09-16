import '../styles/navbar.css';
import { WalletButton } from './WalletButton.js';
import { MusicToggle } from './MusicToggle.js';

export class Navbar {
    constructor() {
        this.element = document.createElement('nav');
        this.element.className = 'navbar';
        this.walletButton = new WalletButton();
        this.musicToggle = new MusicToggle();
        this.currentRoute = '';
        this.render();
        this.setupEventListeners();
    }

    render() {
        // Generate navigation links based on current route
        const navLinks = this.getNavLinks();
        
        this.element.innerHTML = `
            <div class="nav-content">
                <div class="nav-brand" id="logo">SoniCity</div>
                <div class="nav-container">
                    <div class="nav-links">
                        ${navLinks}
                    </div>
                    <div class="nav-controls">
                        <div id="music-toggle-container"></div>
                        <div id="wallet-button-container" class="wallet-btn-wrapper"></div>
                    </div>
                </div>
            </div>
        `;

        // Mount music toggle
        const musicContainer = this.element.querySelector('#music-toggle-container');
        if (musicContainer) {
            musicContainer.appendChild(this.musicToggle.element);
        }

        // Mount wallet button
        const walletContainer = this.element.querySelector('#wallet-button-container');
        if (walletContainer) {
            walletContainer.appendChild(this.walletButton.element);
        }
    }

    /**
     * Get navigation links based on current route
     * @returns {string} HTML string of navigation links
     */
    getNavLinks() {
        // On start page ('' route), show only Faucet
        if (this.currentRoute === '') {
            return '<a href="/faucet" class="nav-link" data-page="faucet">Faucet</a>';
        }
        
        // On all other pages, show only Overview
        return '<a href="/overview" class="nav-link" data-page="overview">Overview</a>';
    }

    /**
     * Update the navbar based on the current route
     * @param {string} route - The current route
     */
    updateRoute(route) {
        if (this.currentRoute !== route) {
            this.currentRoute = route;
            this.render();
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Add click handlers for navigation
        this.element.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                window.history.pushState({}, '', `/${page}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        });

        // Add click handler for logo to redirect to home page
        const logo = this.element.querySelector('.nav-brand');
        if (logo) {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
            // Add cursor pointer to indicate it's clickable
            logo.style.cursor = 'pointer';
        }
    }

    mount(container) {
        container.appendChild(this.element);
    }
} 