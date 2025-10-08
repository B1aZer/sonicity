import Logger from './logger.js';

/**
 * Utility functions for blockchain time operations
 */
export class BlockchainTime {
    /**
     * Get the current blockchain timestamp
     * @param {Object} provider - Ethers provider instance
     * @returns {Promise<number>} Current blockchain timestamp in seconds
     */
    static async getCurrentTimestamp(provider) {
        try {
            if (!provider) {
                throw new Error('Provider not provided');
            }
            
            const currentBlock = await provider.getBlock('latest');
            return currentBlock.timestamp;
        } catch (error) {
            Logger.error('Error getting blockchain timestamp:', error);
            // Fallback to local time if blockchain time fails
            return Math.floor(Date.now() / 1000);
        }
    }

    /**
     * Get the current blockchain timestamp with detailed logging
     * @param {Object} provider - Ethers provider instance
     * @param {string} context - Context for logging (e.g., 'scout availability check')
     * @returns {Promise<number>} Current blockchain timestamp in seconds
     */
    static async getCurrentTimestampWithLogging(provider, context = 'blockchain time check') {
        try {
            if (!provider) {
                throw new Error('Provider not provided');
            }
            
            const currentBlock = await provider.getBlock('latest');
            const timestamp = currentBlock.timestamp;
            
            Logger.info(`${context}:`, {
                blockchainTimestamp: timestamp,
                blockchainTime: new Date(timestamp * 1000).toLocaleString(),
                blockNumber: currentBlock.number
            });
            
            return timestamp;
        } catch (error) {
            Logger.error(`Error getting blockchain timestamp for ${context}:`, error);
            // Fallback to local time if blockchain time fails
            const fallbackTime = Math.floor(Date.now() / 1000);
            Logger.warn(`Using fallback local time: ${fallbackTime} (${new Date(fallbackTime * 1000).toLocaleString()})`);
            return fallbackTime;
        }
    }

    /**
     * Check if a timestamp is in the past (available)
     * @param {number} targetTimestamp - Target timestamp to check
     * @param {Object} provider - Ethers provider instance
     * @returns {Promise<boolean>} True if target timestamp is in the past
     */
    static async isTimestampInPast(targetTimestamp, provider) {
        const currentTime = await this.getCurrentTimestamp(provider);
        return targetTimestamp <= currentTime;
    }

    /**
     * Get time remaining until a timestamp
     * @param {number} targetTimestamp - Target timestamp
     * @param {Object} provider - Ethers provider instance
     * @returns {Promise<number>} Seconds remaining (negative if in the past)
     */
    static async getTimeRemaining(targetTimestamp, provider) {
        const currentTime = await this.getCurrentTimestamp(provider);
        return targetTimestamp - currentTime;
    }

    /**
     * Format time remaining in a human-readable format
     * @param {number} seconds - Seconds remaining (can be negative)
     * @returns {string} Formatted time string
     */
    static formatTimeRemaining(seconds) {
        if (seconds <= 0) {
            return 'available';
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }
}
