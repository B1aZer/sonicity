import { appState } from '../js/core/state.js';

export class AccessPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'access-page';
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const connectWalletBtn = this.element.querySelector('#connect-wallet');
        connectWalletBtn.addEventListener('click', () => this.connectWallet());
    }

    async connectWallet() {
        try {
            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask to use this application');
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const walletAddress = accounts[0];

            // Update wallet status
            appState.setWalletConnected(true, walletAddress);
            this.updateWalletStatus(walletAddress);

            // For demo purposes, automatically verify NFT
            // In production, this would check the actual NFT ownership
            setTimeout(() => {
                appState.setNFTVerified(true);
                this.updateNFTStatus('Verified');
            }, 1000);

        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    }

    updateWalletStatus(address) {
        const walletStatus = this.element.querySelector('#wallet-status');
        if (walletStatus) {
            walletStatus.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
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