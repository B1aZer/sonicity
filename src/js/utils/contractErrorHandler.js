import Logger from './logger.js';

/**
 * Centralized contract error handler that processes smart contract revert messages
 * and provides user-friendly error messages
 */
export class ContractErrorHandler {
    
    /**
     * Process contract error and return user-friendly message
     * @param {Error} error - The error from contract call
     * @param {string} operation - The operation being performed (e.g., "resolve battle", "train troops")
     * @returns {string} User-friendly error message
     */
    static processError(error, operation = 'operation') {
        Logger.error(`Contract error in ${operation}:`, error);
        
        // Extract the actual revert message from the error
        const revertMessage = this.extractRevertMessage(error);
        
        if (revertMessage) {
            // Return the contract's revert message directly - it's already user-friendly
            return revertMessage;
        }
        
        // Fallback to generic error message if no specific revert message
        return `Failed to ${operation}. Please try again.`;
    }
    
    /**
     * Extract revert message from contract error
     * @param {Error} error - The error object
     * @returns {string|null} The revert message or null if not found
     */
    static extractRevertMessage(error) {
        // Common patterns for revert messages in different environments
        const patterns = [
            /reverted with reason string '([^']+)'/,  // Hardhat/Anvil
            /execution reverted: ([^"]+)/,           // MetaMask
            /VM Exception while processing transaction: reverted with reason string '([^']+)'/, // Hardhat
            /revert ([^"]+)/,                        // Generic
            /Error: ([^"]+)/,                        // Generic
        ];
        
        const errorString = error.message || error.toString();
        
        for (const pattern of patterns) {
            const match = errorString.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // If no pattern matches, return null to use fallback
        return null;
    }
    
    /**
     * Handle contract error with modal display
     * @param {Error} error - The error from contract call
     * @param {string} operation - The operation being performed
     * @param {Modal} modal - The modal instance to display error
     * @returns {void}
     */
    static handleError(error, operation, modal) {
        const userMessage = this.processError(error, operation);
        modal.error(userMessage);
    }
}

export default ContractErrorHandler;
