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
        
        // If we have a missing revert data error, try to provide context-specific message
        const errorString = error.message || error.toString();
        if (errorString.includes('missing revert data')) {
            const contextMessage = this.getKnownErrorMessage(errorString);
            if (contextMessage !== 'Transaction failed - please check your resources and try again') {
                return contextMessage;
            }
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
        // Check if error has a reason property (ethers.js v6)
        if (error.reason) {
            return error.reason;
        }
        
        // Check if error has a shortMessage property (ethers.js v6)
        if (error.shortMessage) {
            return error.shortMessage;
        }
        
        // Common patterns for revert messages in different environments
        const patterns = [
            /reverted with reason string '([^']+)'/,  // Hardhat/Anvil
            /execution reverted: ([^"]+)/,           // MetaMask
            /VM Exception while processing transaction: reverted with reason string '([^']+)'/, // Hardhat
            /revert ([^"]+)/,                        // Generic
            /Error: ([^"]+)/,                        // Generic
            /missing revert data.*action="([^"]+)"/, // ethers.js v6 missing revert data
        ];
        
        const errorString = error.message || error.toString();
        
        for (const pattern of patterns) {
            const match = errorString.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        // Handle specific known contract errors based on the operation context
        if (errorString.includes('missing revert data')) {
            return this.getKnownErrorMessage(errorString);
        }
        
        // If no pattern matches, return null to use fallback
        return null;
    }
    
    /**
     * Get known error messages for common contract operations
     * @param {string} errorString - The error string
     * @returns {string} A user-friendly error message
     */
    static getKnownErrorMessage(errorString) {
        // Extract the method name from the transaction data if available
        const methodPatterns = {
            '0x617497cb': 'resolveBattle', // resolveBattle(address) method signature
            '0x8b4ce637': 'startBattle',   // startBattle(uint256,uint256,uint256) method signature
            '0x12345678': 'deployToGarrison', // deployToGarrison method signature (placeholder)
            '0x87654321': 'trainTroops',   // trainTroops method signature (placeholder)
        };
        
        // Check for method signatures in the transaction data
        for (const [signature, method] of Object.entries(methodPatterns)) {
            if (errorString.includes(signature)) {
                switch (method) {
                    case 'resolveBattle':
                        return 'Battle has already been resolved or does not exist';
                    case 'startBattle':
                        return 'Cannot start battle - no opponent found or battle already in progress';
                    case 'deployToGarrison':
                        return 'Cannot deploy troops - battle not active or troops already deployed';
                    case 'trainTroops':
                        return 'Cannot train troops - insufficient resources or barracks not built';
                }
            }
        }
        
        // Fallback to text-based detection
        if (errorString.includes('resolveBattle') || errorString.includes('resolve battle')) {
            return 'Battle has already been resolved or does not exist';
        }
        if (errorString.includes('startBattle') || errorString.includes('start battle')) {
            return 'Cannot start battle - no opponent found or battle already in progress';
        }
        if (errorString.includes('deployToGarrison') || errorString.includes('deploy to garrison')) {
            return 'Cannot deploy troops - battle not active or troops already deployed';
        }
        if (errorString.includes('trainTroops') || errorString.includes('train troops')) {
            return 'Cannot train troops - insufficient resources or barracks not built';
        }
        if (errorString.includes('buildDistrictBuilding') || errorString.includes('build district building')) {
            return 'Cannot build - insufficient resources or building already exists';
        }
        if (errorString.includes('upgradeDistrictBuilding') || errorString.includes('upgrade district building')) {
            return 'Cannot upgrade - insufficient resources or building at max level';
        }
        
        return 'Transaction failed - please check your resources and try again';
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
