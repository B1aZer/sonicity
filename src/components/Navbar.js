import '../styles/navbar.css';
import { WalletButton } from './WalletButton.js';
import { MusicToggle } from './MusicToggle.js';

export class Navbar {
    constructor() {
        this.element = document.createElement('nav');
        this.element.className = 'navbar';
        this.walletButton = new WalletButton();
        this.musicToggle = new MusicToggle();
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.element.innerHTML = `
            <div class="nav-content">
                <div class="nav-brand" id="logo">SoniCity</div>
                <div class="nav-container">
                    <div class="nav-links">
                        <a href="/faucet" class="nav-link" data-page="faucet">Faucet</a>
                        <a href="/overview" class="nav-link" data-page="overview">Overview</a>
                        <!-- <a href="/mint" class="nav-link" data-page="mint">Mint</a> -->
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