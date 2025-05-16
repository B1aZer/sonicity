import { WalletManager, formatAddress } from '../js/utils/wallet.js';
import { appState } from '../js/core/state.js';
import Logger from '../js/utils/logger.js';

export class WalletButton {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'wallet-button-container';
        this.modal = WalletManager.modal;
        this.render();
        this.setupEventListeners();
        this.checkInitialConnection();

        // Subscribe to appState changes to re-render the button
        appState.subscribe(() => {
            this.render();
        });
    }
    
    async checkInitialConnection() {
        const { connected, address } = await WalletManager.checkExistingConnection();
        if (connected) {
            this.updateWalletStatus(address);
            // Don't dispatch walletConnected event during initial load
            // The page will handle initialization through BasePage.initialize()
        }
    }
    
    setupEventListeners() {
        const connectButton = this.element.querySelector('#connect-wallet-btn');
        if (connectButton) {
            connectButton.addEventListener('click', () => this.handleConnectWallet());
        }
        
        // Setup account change listener
        WalletManager.setupAccountChangeListener();
        
        // Listen for wallet disconnection
        window.addEventListener('walletDisconnected', () => {
            this.render();
        });
        
        // Set up wallet dropdown toggle
        document.addEventListener('click', (e) => {
            const dropdown = this.element.querySelector('.wallet-dropdown');
            if (!dropdown) return;
            
            const walletStatus = this.element.querySelector('.wallet-status');
            if (walletStatus && walletStatus.contains(e.target)) {
                dropdown.classList.toggle('active');
            } else if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }
    
    async handleConnectWallet() {
        try {
            Logger.info('Attempting to connect wallet from navbar');
            const result = await WalletManager.connectWallet();
            if (result.success) {
                this.updateWalletStatus(result.address);
                this.dispatchWalletConnected(result.address);
            } else {
                Logger.error('Wallet connection error:', result.error);
                this.modal.error(result.error || 'Failed to connect wallet. Please try again.');
            }
        } catch (error) {
            Logger.error('Error connecting wallet:', error);
            this.modal.error('Failed to connect wallet. Please try again.');
        }
    }
    
    updateWalletStatus(address) {
        this.render();
    }
    
    handleSignOut() {
        appState.clearState();
        WalletManager.disconnectWallet();
        window.location.reload();
    }
    
    dispatchWalletConnected(address) {
        // Dispatch a custom event that can be listened to by other components
        window.dispatchEvent(new CustomEvent('walletConnected', {
            detail: {
                address: address
            }
        }));
    }
    
    getNetworkBadge() {
        // This could be enhanced to show actual network info
        return `<span class="network-badge">Hardhat</span>`;
    }
    
    render() {
        const state = appState.getState();
        const isConnected = state.walletConnected && state.currentWallet;
        
        if (isConnected) {
            this.element.innerHTML = `
                <div class="wallet-controls connected">
                    <div class="wallet-status">
                        ${this.getNetworkBadge()}
                        <span class="wallet-address">${formatAddress(state.currentWallet)}</span>
                        <div class="wallet-indicator connected"></div>
                        <span class="dropdown-arrow"><i class="fas fa-chevron-down"></i></span>
                    </div>
                    <div class="wallet-dropdown">
                        <div class="dropdown-address">
                            <span class="label">Connected Address</span>
                            <span class="value full-address">${state.currentWallet}</span>
                        </div>
                        <div class="dropdown-actions">
                            <button class="dropdown-action copy-address" data-address="${state.currentWallet}">
                                <i class="action-icon fas fa-copy"></i>
                                <span>Copy Address</span>
                            </button>
                            <button class="dropdown-action view-on-explorer" data-address="${state.currentWallet}">
                                <i class="action-icon fas fa-external-link-alt"></i>
                                <span>View on Explorer</span>
                            </button>
                            <button class="dropdown-action sign-out">
                                <i class="action-icon fas fa-sign-out-alt"></i>
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners for dropdown actions
            const copyAddressBtn = this.element.querySelector('.copy-address');
            if (copyAddressBtn) {
                copyAddressBtn.addEventListener('click', () => {
                    const address = copyAddressBtn.getAttribute('data-address');
                    navigator.clipboard.writeText(address)
                        .then(() => {
                            this.showTooltip(copyAddressBtn, 'Copied!');
                        })
                        .catch(err => {
                            Logger.error('Failed to copy address', err);
                        });
                });
            }
            
            const viewOnExplorerBtn = this.element.querySelector('.view-on-explorer');
            if (viewOnExplorerBtn) {
                viewOnExplorerBtn.addEventListener('click', () => {
                    const address = viewOnExplorerBtn.getAttribute('data-address');
                    // This should be updated based on your network
                    window.open(`http://localhost:8545/address/${address}`, '_blank');
                });
            }
            
            const signOutBtn = this.element.querySelector('.sign-out');
            if (signOutBtn) {
                signOutBtn.addEventListener('click', () => this.handleSignOut());
            }
        } else {
            this.element.innerHTML = `
                <div class="wallet-controls">
                    <button id="connect-wallet-btn" class="connect-wallet-btn">Connect Wallet</button>
                </div>
            `;
        }
    }
    
    showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        
        element.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.remove();
        }, 2000);
    }
}