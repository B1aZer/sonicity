import { ethers } from 'ethers';
import { Modal } from './modal.js';
import Logger from './logger.js';

export class WalletManager {
    static modal = new Modal();
    
    // State management
    static walletConnected = false;
    static currentWallet = null;
    static hasVerifiedNFT = false;
    static listeners = new Set();
    
    // Provider and signer
    static provider = null;
    static signer = null;

    static {
        // Initialize state from localStorage
        this.initializeState();
    }

    static initializeState() {
        try {
            const persistedState = localStorage.getItem('walletState');
            if (persistedState) {
                const state = JSON.parse(persistedState);
                this.walletConnected = state.walletConnected || false;
                this.currentWallet = state.currentWallet || null;
                this.hasVerifiedNFT = state.hasVerifiedNFT || false;
            }
        } catch (error) {
            Logger.error('Error initializing wallet state:', error);
            this.clearState();
        }
    }

    static persistState() {
        const state = {
            walletConnected: this.walletConnected,
            currentWallet: this.currentWallet,
            hasVerifiedNFT: this.hasVerifiedNFT
        };
        localStorage.setItem('walletState', JSON.stringify(state));
    }

    static subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    static notify() {
        this.listeners.forEach(listener => listener());
    }

    static isWalletConnected() {
        return this.walletConnected;
    }

    static getCurrentWallet() {
        return this.currentWallet;
    }

    static isNFTVerified() {
        return this.hasVerifiedNFT;
    }

    static async initializeConnection() {
        const { connected, address } = await this.checkExistingConnection();
        if (connected) {
            return await this.handleWalletConnection(address);
        }
        return { success: false };
    }

    static async checkExistingConnection() {
        if (this.walletConnected && this.currentWallet) {
            try {
                // Verify the wallet is still connected
                const accounts = await window.ethereum.request({ 
                    method: 'eth_accounts' 
                });
                if (accounts[0] === this.currentWallet) {
                    return {
                        connected: true,
                        address: this.currentWallet
                    };
                }
            } catch (error) {
                Logger.error('Error checking existing connection:', error);
            }
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
            this.walletConnected = true;
            this.currentWallet = walletAddress;
            this.persistState();
            this.notify();
            
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
            this.clearState();
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async simulateNFTVerification() {
        // For demonstration purposes only - in production, this would check actual NFT ownership
        setTimeout(() => {
            this.hasVerifiedNFT = true;
            this.persistState();
            this.notify();
            Logger.info('NFT automatically verified for demo purposes');
        }, 1000);
    }

    static formatAddress(address) {
        if (!address) return 'Not Connected';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    // Disconnect wallet
    static disconnectWallet() {
        this.clearState();
        Logger.info('Wallet disconnected');
        
        // Dispatch wallet disconnected event
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
        
        return {
            success: true
        };
    }

    static clearState() {
        this.walletConnected = false;
        this.currentWallet = null;
        this.hasVerifiedNFT = false;
        this.provider = null;
        this.signer = null;
        localStorage.removeItem('walletState');
        this.notify();
    }
    
    // Listen for account changes
    static setupAccountChangeListener() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected their wallet
                    this.clearState();
                    window.dispatchEvent(new CustomEvent('walletDisconnected'));
                } else {
                    // User switched accounts
                    this.walletConnected = true;
                    this.currentWallet = accounts[0];
                    this.persistState();
                    this.notify();
                    
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