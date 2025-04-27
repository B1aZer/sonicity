import { appState } from '../js/core/state.js';
import { checkExistingConnection, connectWallet, formatAddress } from '../js/utils/wallet.js';

export class AccessPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'access-page';
        this.render();
        this.setupEventListeners();
        this.initializeConnection();
    }

    setupEventListeners() {
        const connectWalletBtn = this.element.querySelector('#connect-wallet');
        connectWalletBtn.addEventListener('click', () => this.handleConnectWallet());
    }

    async initializeConnection() {
        const { connected, address } = await checkExistingConnection();
        if (connected) {
            this.updateWalletStatus(address);
            // For demo purposes, automatically verify NFT
            setTimeout(() => {
                appState.setNFTVerified(true);
                this.updateNFTStatus('Verified');
            }, 1000);
        }
    }

    async handleConnectWallet() {
        const result = await connectWallet();
        if (result.success) {
            this.updateWalletStatus(result.address);
            // For demo purposes, automatically verify NFT
            setTimeout(() => {
                appState.setNFTVerified(true);
                this.updateNFTStatus('Verified');
            }, 1000);
        } else {
            alert(result.error || 'Failed to connect wallet. Please try again.');
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
                    <button id="connect-wallet" class="connect-button">Connect Wallet</button>
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