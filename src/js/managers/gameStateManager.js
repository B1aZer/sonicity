import Logger from '../utils/logger.js';

/**
 * Global Game State Manager
 * Provides centralized access to contract data with caching
 * Can be used by any component to query game state
 */
export class GameStateManager {
    constructor() {
        // Singleton pattern
        if (GameStateManager.instance) {
            return GameStateManager.instance;
        }
        GameStateManager.instance = this;

        this.contracts = null;
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.defaultCacheDuration = 5000; // 5 seconds default cache
        
        // Different cache durations for different types of data
        this.cacheDurations = {
            'battle': 3000,     // Battle state changes frequently
            'resources': 10000, // Resources change less frequently
            'buildings': 30000, // Buildings change rarely
            'general': 5000     // Default for other data
        };

        Logger.debug('GameStateManager initialized');
    }

    /**
     * Set contract references
     * @param {Object} contracts - Object containing all contract instances
     */
    setContracts(contracts) {
        this.contracts = contracts;
        Logger.debug('Contracts set in GameStateManager');
    }

    /**
     * Get cached data or fetch from contract
     * @param {string} key - Cache key
     * @param {Function} fetchFunction - Function to fetch data if not cached
     * @param {string} dataType - Type of data for cache duration ('battle', 'resources', etc.)
     * @returns {Promise<any>} The requested data
     */
    async getCachedData(key, fetchFunction, dataType = 'general') {
        const now = Date.now();
        
        // Check if we have valid cached data
        if (this.cache.has(key) && this.cacheExpiry.has(key)) {
            const expiry = this.cacheExpiry.get(key);
            if (now < expiry) {
                Logger.debug(`Returning cached data for: ${key}`);
                return this.cache.get(key);
            }
        }

        try {
            // Fetch fresh data
            Logger.debug(`Fetching fresh data for: ${key}`);
            const data = await fetchFunction();
            
            // Cache the result
            const cacheDuration = this.cacheDurations[dataType] || this.defaultCacheDuration;
            this.cache.set(key, data);
            this.cacheExpiry.set(key, now + cacheDuration);
            
            return data;
        } catch (error) {
            Logger.error(`Error fetching data for ${key}:`, error);
            // Return cached data if available, even if expired
            if (this.cache.has(key)) {
                Logger.warn(`Returning stale cached data for: ${key}`);
                return this.cache.get(key);
            }
            throw error;
        }
    }

    /**
     * Clear cache for specific key or all cache
     * @param {string} key - Optional specific key to clear
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            Logger.debug(`Cleared cache for: ${key}`);
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
            Logger.debug('Cleared all cache');
        }
    }

    /**
     * Get player's wallet address
     * @returns {Promise<string>} Player address
     */
    async getPlayerAddress() {
        if (!this.contracts?.gameState) {
            throw new Error('GameState contract not available');
        }
        
        return this.getCachedData(
            'playerAddress',
            () => this.contracts.gameState.getAddress(),
            'general'
        );
    }

    /**
     * Check if player is currently in battle
     * @param {string} playerAddress - Optional player address
     * @returns {Promise<boolean>} True if player is in battle
     */
    async isPlayerInBattle(playerAddress = null) {
        if (!this.contracts?.battleSystem) {
            return false;
        }

        try {
            const address = playerAddress || await this.getPlayerAddress();
            const cacheKey = `battle_${address}`;
            
            const activeBattle = await this.getCachedData(
                cacheKey,
                () => this.contracts.battleSystem.getActiveBattle(address),
                'battle'
            );
            
            return activeBattle !== null;
        } catch (error) {
            Logger.error('Error checking battle state:', error);
            return false;
        }
    }

    /**
     * Get player's active battle details
     * @param {string} playerAddress - Optional player address
     * @returns {Promise<Object|null>} Battle details or null
     */
    async getPlayerActiveBattle(playerAddress = null) {
        if (!this.contracts?.battleSystem) {
            return null;
        }

        try {
            const address = playerAddress || await this.getPlayerAddress();
            const cacheKey = `battleDetails_${address}`;
            
            return this.getCachedData(
                cacheKey,
                () => this.contracts.battleSystem.getActiveBattle(address),
                'battle'
            );
        } catch (error) {
            Logger.error('Error getting battle details:', error);
            return null;
        }
    }

    /**
     * Get player's resources
     * @param {string} playerAddress - Optional player address
     * @returns {Promise<Object>} Object with gold, food, diamonds, rep
     */
    async getPlayerResources(playerAddress = null) {
        if (!this.contracts?.gameState) {
            throw new Error('GameState contract not available');
        }

        try {
            const address = playerAddress || await this.getPlayerAddress();
            const cacheKey = `resources_${address}`;
            
            return this.getCachedData(
                cacheKey,
                async () => {
                    const [gold, food, diamonds, rep] = await Promise.all([
                        this.contracts.gameState.getPlayerGold(address),
                        this.contracts.gameState.getPlayerFood(address),
                        this.contracts.gameState.getPlayerDiamonds(address),
                        this.contracts.gameState.getPlayerRep(address)
                    ]);
                    
                    return {
                        gold: gold.toString(),
                        food: food.toString(),
                        diamonds: diamonds.toString(),
                        rep: rep.toString()
                    };
                },
                'resources'
            );
        } catch (error) {
            Logger.error('Error getting player resources:', error);
            throw error;
        }
    }

    /**
     * Get player's buildings
     * @param {string} playerAddress - Optional player address
     * @returns {Promise<Array>} Array of active buildings
     */
    async getPlayerBuildings(playerAddress = null) {
        if (!this.contracts?.gridBuildings) {
            return [];
        }

        try {
            const address = playerAddress || await this.getPlayerAddress();
            const cacheKey = `buildings_${address}`;
            
            return this.getCachedData(
                cacheKey,
                () => this.contracts.gridBuildings.getActiveBuildings(address),
                'buildings'
            );
        } catch (error) {
            Logger.error('Error getting player buildings:', error);
            return [];
        }
    }

    /**
     * Invalidate cache when data changes
     * Call this after actions that modify game state
     * @param {string} dataType - Type of data that changed ('battle', 'resources', etc.)
     * @param {string} playerAddress - Optional specific player address
     */
    invalidateCache(dataType, playerAddress = null) {
        const keysToRemove = [];
        
        for (const key of this.cache.keys()) {
            const shouldRemove = 
                key.startsWith(dataType) || 
                (playerAddress && key.includes(playerAddress));
            
            if (shouldRemove) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
        });
        
        Logger.debug(`Invalidated cache for ${dataType}${playerAddress ? ` (${playerAddress})` : ''}`);
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.clearCache();
        this.contracts = null;
        Logger.info('GameStateManager disposed');
    }
}

// Export singleton instance
export const gameStateManager = new GameStateManager();
