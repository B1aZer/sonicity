class AppState {
    constructor() {
        this.walletConnected = false;
        this.hasVerifiedNFT = false;
        this.currentWallet = null;
        this.currentCityId = 0; // 0 means not in any city
        this.listeners = new Set();
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Notify all listeners of state changes
    notify() {
        this.listeners.forEach(listener => listener(this));
    }

    // Update wallet connection state
    setWalletConnected(connected, wallet = null) {
        this.walletConnected = connected;
        this.currentWallet = wallet;
        this.notify();
    }

    // Update NFT verification state
    setNFTVerified(verified) {
        this.hasVerifiedNFT = verified;
        this.notify();
    }

    // Update city ID
    setCurrentCityId(cityId) {
        this.currentCityId = cityId;
        this.notify();
    }

    // Get current state
    getState() {
        return {
            walletConnected: this.walletConnected,
            hasVerifiedNFT: this.hasVerifiedNFT,
            currentWallet: this.currentWallet,
            currentCityId: this.currentCityId
        };
    }
}

// Create a singleton instance
export const appState = new AppState(); 