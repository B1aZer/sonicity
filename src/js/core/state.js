class AppState {
    constructor() {
        // Load persisted state from localStorage
        const persistedState = localStorage.getItem('appState');
        const initialState = persistedState ? JSON.parse(persistedState) : {
            walletConnected: false,
            hasVerifiedNFT: false,
            currentWallet: null
        };

        this.walletConnected = initialState.walletConnected;
        this.hasVerifiedNFT = initialState.hasVerifiedNFT;
        this.currentWallet = initialState.currentWallet;
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

    // Persist state to localStorage
    persistState() {
        const state = {
            walletConnected: this.walletConnected,
            hasVerifiedNFT: this.hasVerifiedNFT,
            currentWallet: this.currentWallet
        };
        localStorage.setItem('appState', JSON.stringify(state));
    }

    // Update wallet connection state
    setWalletConnected(connected, wallet = null) {
        this.walletConnected = connected;
        this.currentWallet = wallet;
        this.persistState();
        this.notify();
    }

    // Update NFT verification state
    setNFTVerified(verified) {
        this.hasVerifiedNFT = verified;
        this.persistState();
        this.notify();
    }

    // Get current state
    getState() {
        return {
            walletConnected: this.walletConnected,
            hasVerifiedNFT: this.hasVerifiedNFT,
            currentWallet: this.currentWallet
        };
    }

    // Clear all state (useful for logout)
    clearState() {
        this.walletConnected = false;
        this.hasVerifiedNFT = false;
        this.currentWallet = null;
        localStorage.removeItem('appState');
        this.notify();
    }
}

// Create a singleton instance
export const appState = new AppState(); 