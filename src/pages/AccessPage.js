import { appState } from '../js/core/state.js';
import { checkExistingConnection, connectWallet, formatAddress } from '../js/utils/wallet.js';
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
        this.initializeConnection();
    }

    setupEventListeners() {
        const connectButton = this.element.querySelector('.connect-button');
        if (connectButton) {
            connectButton.addEventListener('click', () => this.handleConnectWallet());
        }
    }

    async initializeConnection() {
        const { connected, address } = await checkExistingConnection();
        if (connected) {
            this.updateWalletStatus(address);
            // For demo purposes, automatically verify NFT
            setTimeout(() => {
                appState.setNFTVerified(true);
                this.updateNFTStatus('Verified');
                // Redirect to root (map) after verification
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
            }, 1000);
        }
    }

    async handleConnectWallet() {
        try {
            Logger.info('Attempting to connect wallet');
            const result = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (result.error) {
                Logger.error('Wallet connection error:', result.error);
                this.modal.error(result.error || 'Failed to connect wallet. Please try again.');
                return;
            }
            Logger.info('Wallet connected successfully');
            // Redirect to dashboard or next page
            window.location.href = '/dashboard';
        } catch (error) {
            Logger.error('Error connecting wallet:', error);
            this.modal.error('Failed to connect wallet. Please try again.');
        }
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
        this.element.innerHTML = `
            <div class="access-container">
                <h1>Welcome to Sonicity</h1>
                <p class="access-message">Please connect your wallet and verify your NFT to access the game</p>
                
                <div class="access-status">
                    <div class="status-item">
                        <span class="status-label">Wallet:</span>
                        <span id="wallet-status" class="status-value">Not Connected</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">NFT Status:</span>
                        <span id="nft-status" class="status-value">Not Verified</span>
                    </div>
                </div>
                
                <div class="access-actions">
                    <button class="connect-button">Connect Wallet</button>
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