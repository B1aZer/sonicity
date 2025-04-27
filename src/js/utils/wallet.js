import { ethers } from 'ethers';
import { appState } from '../core/state.js';

export async function checkExistingConnection() {
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

export async function connectWallet() {
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Please install MetaMask to use this application');
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const walletAddress = accounts[0];

        // Update wallet status
        appState.setWalletConnected(true, walletAddress);

        return {
            success: true,
            address: walletAddress
        };
    } catch (error) {
        console.error('Error connecting wallet:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
} 