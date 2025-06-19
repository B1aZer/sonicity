import { WalletManager } from './wallet.js';
import { Modal } from './modal.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import Logger from './logger.js';

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
     * Requires wallet connection and player initialization
     */
    static async canAccessDashboard() {
        if (!this.isWalletConnected()) {
            Logger.info('Access denied: Wallet not connected');
            return false;
        }

        const isInitialized = await this.isPlayerInitialized();
        if (!isInitialized) {
            Logger.info('Access denied: Player not initialized');
            this.modal.error('Please start the game first to access the dashboard.');
            return false;
        }

        return true;
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
     * All players are in city 1 by default
     */
    static async isInCity() {
        return true;
    }

    /**
     * Check if player is initialized
     */
    static async isPlayerInitialized() {
        await this.initialize();
        try {
            const address = WalletManager.getCurrentWallet();
            const playerState = await this.gameState.call('playerState', address);
            return playerState.buildingSlots > 0;
        } catch (error) {
            Logger.error('Error checking player initialization:', error);
            return false;
        }
    }

    /**
     * Check if wallet is connected
     */
    static isWalletConnected() {
        return WalletManager.isWalletConnected();
    }

    /**
     * Check access to protected routes
     * Returns true if access is granted, false otherwise
     */
    static async checkAccess() {
        if (!this.isWalletConnected()) {
            Logger.info('Access denied: Wallet not connected');
            return false;
        }

        const isInitialized = await this.isPlayerInitialized();
        if (!isInitialized) {
            Logger.info('Access denied: Player not initialized');
            this.modal.error('Please start the game first to access this page.');
            return false;
        }

        return true;
    }
} 