async function initializeWallet() {
    try {
        // Check if we have a persisted wallet connection
        if (appState.walletConnected && appState.currentWallet) {
            // Attempt to reconnect to the persisted wallet
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.listAccounts();
            
            if (accounts.length > 0 && accounts[0].toLowerCase() === appState.currentWallet.toLowerCase()) {
                // Successfully reconnected to the same wallet
                await handleWalletConnection(accounts[0]);
                return;
            }
        }

        // If no persisted connection or different wallet, proceed with normal connection
        if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.requestAccounts();
            
            if (accounts.length > 0) {
                await handleWalletConnection(accounts[0]);
            }
        } else {
            Modal.error('Please install MetaMask to use this application');
        }
    } catch (error) {
        console.error('Wallet initialization error:', error);
        Modal.error('Failed to connect wallet. Please try again.');
        // Clear any invalid persisted state
        appState.clearState();
    }
}

async function handleWalletConnection(account) {
    try {
        appState.setWalletConnected(true, account);
        
        // Verify NFT ownership
        const hasNFT = await verifyNFTOwnership(account);
        appState.setNFTVerified(hasNFT);
        
        // Load player's city if they have one
        const gameState = new GameStateContract();
        const cityId = await gameState.getPlayerCityId(account);
        if (cityId > 0) {
            appState.setCurrentCityId(cityId);
        }
        
        // Update UI
        updateUI();
    } catch (error) {
        console.error('Wallet connection error:', error);
        Modal.error('Failed to verify wallet connection. Please try again.');
        appState.clearState();
    }
} 