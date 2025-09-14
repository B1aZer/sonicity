import Logger from './logger.js';

/**
 * Simple contract error handler that returns user-friendly error messages
 */
export class ContractErrorHandler {
    
    /**
     * Get user-friendly error message from contract error
     * @param {Error} error - The error from contract call
     * @returns {string} User-friendly error message
     */
    static getErrorMessage(error) {
        Logger.error('Contract error:', error);
        
        const errorString = error.message || error.toString();
        
        // Extract revert message if available
        const revertMessage = this.extractRevertMessage(errorString);
        if (revertMessage) {
            return this.makeUserFriendly(revertMessage);
        }
        
        // Handle common blockchain errors
        return this.handleCommonErrors(errorString);
    }
    
    /**
     * Make contract revert message user-friendly
     * @param {string} revertMessage - The revert message from contract
     * @returns {string} User-friendly message
     */
    static makeUserFriendly(revertMessage) {
        const friendlyMessages = {
            'Token already exists': 'This NFT has already been minted. Please refresh the page to see your latest NFTs.',
            'Insufficient SONIC balance': 'You don\'t have enough SONIC tokens. Get more from the faucet or collect from buildings.',
            'Insufficient balance': 'You don\'t have enough resources. Collect from your buildings or wait for more.',
            'Building slot limit reached': 'You\'ve reached the maximum buildings for your tier. Upgrade your tier for more slots.',
            'Tier not unlocked': 'You need to unlock this tier first. Complete the requirements.',
            'NFT already staked': 'This NFT is already staked. Check your staked buildings.',
            'NFT not approved': 'The NFT needs approval. Try the staking process again.',
            'Battle already resolved': 'This battle has already been resolved. Check your battle history.',
            'Cannot start battle': 'Cannot start battle. Make sure you have troops and no active battles.',
            'Building already exists': 'This building already exists. Check your district buildings.',
            'Cannot upgrade': 'Cannot upgrade. Check resources and building level.'
        };
        
        // Return friendly message if available, otherwise return original
        return friendlyMessages[revertMessage] || revertMessage;
    }
    
    /**
     * Handle common blockchain/wallet errors
     * @param {string} errorString - The error string
     * @returns {string} User-friendly error message
     */
    static handleCommonErrors(errorString) {
        if (errorString.includes('User rejected the request')) {
            return 'Transaction was cancelled. Please try again and approve the transaction.';
        }
        
        if (errorString.includes('gas required exceeds allowance')) {
            return 'Not enough gas. Increase your gas limit or check your SONIC balance.';
        }
        
        if (errorString.includes('nonce too low')) {
            return 'Transaction order issue. Please wait a moment and try again.';
        }
        
        if (errorString.includes('network error')) {
            return 'Network connection error. Check your internet and try again.';
        }
        
        if (errorString.includes('missing revert data')) {
            return 'Transaction failed. Please refresh the page and try again.';
        }
        
        // Default fallback
        return 'Transaction failed. Please try again.';
    }
    
    /**
     * Extract revert message from contract error
     * @param {string} errorString - The error string
     * @returns {string|null} The revert message or null if not found
     */
    static extractRevertMessage(errorString) {
        // Common patterns for revert messages
        const patterns = [
            /reverted with reason string '([^']+)'/,  // Hardhat/Anvil
            /execution reverted: "([^"]+)"/,         // MetaMask with quotes
            /execution reverted: ([^"]+)/,           // MetaMask without quotes
            /VM Exception while processing transaction: reverted with reason string '([^']+)'/, // Hardhat
            /revert ([^"]+)/,                        // Generic
            /Error: ([^"]+)/,                        // Generic
        ];
        
        for (const pattern of patterns) {
            const match = errorString.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
}

/**
 * Simple utility function to get user-friendly error message
 * Can be used anywhere without dependencies
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function getContractErrorMessage(error) {
    return ContractErrorHandler.getErrorMessage(error);
}

export default ContractErrorHandler;