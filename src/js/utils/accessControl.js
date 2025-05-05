import { appState } from '../core/state.js';
import { Modal } from './modal.js';

export class AccessControl {
    static modal = new Modal();

    /**
     * Check if the user can access the dashboard
     * Requires wallet connection, NFT verification, and being in a city
     */
    static canAccessDashboard() {
        const state = appState.getState();
        return state.walletConnected && 
               state.hasVerifiedNFT && 
               state.currentCityId > 0;
    }

    /**
     * Check if the user can access the city overview
     * Same requirements as dashboard
     */
    static canAccessOverview() {
        return this.canAccessDashboard();
    }

    /**
     * Check if the user is in a city
     */
    static isInCity() {
        return appState.getState().currentCityId > 0;
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
        if (!this.canAccessDashboard()) {
            if (this.hasVerifiedNFT() && !this.isInCity()) {
                this.modal.error('Please join a city first to access the dashboard.');
                return false;
            }
            return false;
        }
        return true;
    }
} 