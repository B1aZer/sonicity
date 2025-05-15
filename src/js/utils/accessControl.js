import { appState } from '../core/state.js';
import { Modal } from './modal.js';
import { GameStateContract } from '../contracts/GameStateContract.js';

export class AccessControl {
    static modal = new Modal();
    static gameState = null;

    static async initialize() {
        if (!this.gameState) {
            this.gameState = new GameStateContract();
            await this.gameState.initialize();
        }
    }

    /**
     * Check if the user can access the dashboard
     * Requires wallet connection, NFT verification, and being in a city
     */
    static async canAccessDashboard() {
        const state = appState.getState();
        if (!state.walletConnected || !state.hasVerifiedNFT) {
            return false;
        }
        await this.initialize();
        const cityId = await this.gameState.getPlayerCity();
        return cityId !== null;
    }

    /**
     * Check if the user can access the city overview
     * Same requirements as dashboard
     */
    static async canAccessOverview() {
        return await this.canAccessDashboard();
    }

    /**
     * Check if the user is in a city
     */
    static async isInCity() {
        await this.initialize();
        const cityId = await this.gameState.getPlayerCity();
        return cityId !== null;
    }

    /**
     * Check if player is initialized
     */
    static async isPlayerInitialized() {
        await this.initialize();
        try {
            const address = await this.gameState.getAddress();
            const playerState = await this.gameState.call('playerState', address);
            return playerState.buildingSlots > 0;
        } catch (error) {
            console.error('Error checking player initialization:', error);
            return false;
        }
    }

    /**
     * Check if wallet is connected
     */
    static isWalletConnected() {
        return appState.getState().walletConnected;
    }

    /**
     * Check if NFT is verified
     */
    static hasVerifiedNFT() {
        return appState.getState().hasVerifiedNFT;
    }

    static async checkCityAccess() {
        if (!this.isWalletConnected() || !this.hasVerifiedNFT()) {
            return false;
        }

        const isInitialized = await this.isPlayerInitialized();
        if (!isInitialized) {
            this.modal.error('Please start the game first to access the dashboard.');
            return false;
        }

        return true;
    }
} 