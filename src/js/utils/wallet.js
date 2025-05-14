import { ethers } from 'ethers';
import { appState } from '../core/state.js';
import { Modal } from './modal.js';
import Logger from './logger.js';

export class WalletManager {
    static modal = new Modal();

    static async initializeConnection() {
        const { connected, address } = await this.checkExistingConnection();
        if (connected) {
            return await this.handleWalletConnection(address);
        }
        return { success: false };
    }

    static async checkExistingConnection() {
        const state = appState.getState();
        if (state.walletConnected && state.currentWallet) {
            return {
                connected: true,
                address: state.currentWallet
            };
        }
        return {
            connected: false,
            address: null
        };
    }

    static async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                throw new Error('Please install MetaMask to use this application');
            }

            // Request accounts using window.ethereum directly
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            const walletAddress = accounts[0];

            return await this.handleWalletConnection(walletAddress);
        } catch (error) {
            Logger.error('Error connecting wallet:', error);
            this.modal.error(error.message || 'Failed to connect wallet. Please try again.');
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async handleWalletConnection(walletAddress) {
        try {
            appState.setWalletConnected(true, walletAddress);
            
            // For demo: automatically verify NFT status
            // This avoids needing to call contracts
            this.simulateNFTVerification();
            
            return {
                success: true,
                address: walletAddress
            };
        } catch (error) {
            Logger.error('Wallet connection error:', error);
            this.modal.error('Failed to verify wallet connection. Please try again.');
            appState.clearState();
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async simulateNFTVerification() {
        // For demonstration purposes only - in production, this would check actual NFT ownership
        setTimeout(() => {
            appState.setNFTVerified(true);
            Logger.info('NFT automatically verified for demo purposes');
        }, 1000);
    }

    static formatAddress(address) {
        if (!address) return 'Not Connected';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    // Disconnect wallet
    static disconnectWallet() {
        appState.clearState();
        Logger.info('Wallet disconnected');
        
        // Dispatch wallet disconnected event
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
        
        return {
            success: true
        };
    }
    
    // Listen for account changes
    static setupAccountChangeListener() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected their wallet
                    appState.clearState();
                    window.location.reload();
                } else {
                    // User switched accounts
                    appState.setWalletConnected(true, accounts[0]);
                    
                    // For demo: automatically verify NFT for new account too
                    this.simulateNFTVerification();
                    
                    // Dispatch wallet connected event
                    window.dispatchEvent(new CustomEvent('walletConnected', {
                        detail: {
                            address: accounts[0]
                        }
                    }));
                }
            });
        }
    }
}

// Export individual functions for backward compatibility
export const checkExistingConnection = WalletManager.checkExistingConnection.bind(WalletManager);
export const connectWallet = WalletManager.connectWallet.bind(WalletManager);
export const formatAddress = WalletManager.formatAddress.bind(WalletManager); 