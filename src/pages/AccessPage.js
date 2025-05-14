import { appState } from '../js/core/state.js';
import { formatAddress } from '../js/utils/wallet.js';
import '../styles/access-page.css';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';

export class AccessPage {
    constructor() {
        Logger.info('AccessPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'access-page';
        this.modal = new Modal();
        this.render();
        this.setupEventListeners();
        this.checkWalletStatus();
    }

    setupEventListeners() {
        const mintPageLink = this.element.querySelector('.mint-link');
        if (mintPageLink) {
            mintPageLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/mint');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }
        
        // Listen for wallet connection state changes
        window.addEventListener('walletConnected', (e) => {
            this.handleWalletConnected(e.detail.address);
        });
    }

    checkWalletStatus() {
        const state = appState.getState();
        if (state.walletConnected && state.currentWallet) {
            this.updateWalletStatus(state.currentWallet);
            // For demo purposes, automatically verify NFT
            this.simulateNFTVerification();
        }
    }
    
    simulateNFTVerification() {
        setTimeout(() => {
            appState.setNFTVerified(true);
            this.updateNFTStatus('Verified');
            // Redirect to root (map) after verification
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }, 1000);
    }

    handleWalletConnected(address) {
        this.updateWalletStatus(address);
        this.simulateNFTVerification();
    }

    updateWalletStatus(address) {
        const walletStatus = this.element.querySelector('#wallet-status');
        if (walletStatus) {
            walletStatus.textContent = formatAddress(address);
        }
    }

    updateNFTStatus(status) {
        const nftStatus = this.element.querySelector('#nft-status');
        if (nftStatus) {
            nftStatus.textContent = status;
        }
    }

    render() {
        const state = appState.getState();
        const isConnected = state.walletConnected && state.currentWallet;
        
        this.element.innerHTML = `
            <div class="access-container">
                <h1>Welcome to Sonicity</h1>
                <p class="access-message">Please connect your wallet using the button in the navbar and verify your NFT to access the game</p>
                
                <div class="access-status">
                    <div class="status-item">
                        <span class="status-label">Wallet:</span>
                        <span id="wallet-status" class="status-value">${isConnected ? formatAddress(state.currentWallet) : 'Not Connected'}</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">NFT Status:</span>
                        <span id="nft-status" class="status-value">Not Verified</span>
                    </div>
                </div>
                
                <div class="access-actions">
                    <a href="/mint" class="mint-link">Go to Mint Page</a>
                </div>
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