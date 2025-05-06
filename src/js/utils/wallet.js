import { ethers } from 'ethers';
import { appState } from '../core/state.js';
import { Modal } from './modal.js';
import Logger from './logger.js';
import { GameStateContract } from '../contracts/GameStateContract.js';

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
            
            // Verify NFT ownership
            const hasNFT = await this.verifyNFTOwnership(walletAddress);
            appState.setNFTVerified(hasNFT);
            
            // Load player's city if they have one
            const gameState = new GameStateContract();
            await gameState.initialize();
            const cityId = await gameState.getPlayerCityId(walletAddress);
            if (cityId > 0) {
                appState.setCurrentCityId(cityId);
            }

            return {
                success: true,
                address: walletAddress,
                hasNFT,
                cityId
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

    static async verifyNFTOwnership(address) {
        // Implementation of NFT verification logic
        // This should be moved from the current implementation
        return true; // Placeholder
    }

    static formatAddress(address) {
        if (!address) return 'Not Connected';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}

// Export individual functions for backward compatibility
export const checkExistingConnection = WalletManager.checkExistingConnection.bind(WalletManager);
export const connectWallet = WalletManager.connectWallet.bind(WalletManager);
export const formatAddress = WalletManager.formatAddress.bind(WalletManager); 