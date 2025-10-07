import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import AdventureSystemABI from '../../../contracts/artifacts/contracts/AdventureSystem.sol/AdventureSystem.json';
import Logger from '../utils/logger.js';

export class AdventureSystemContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.ADVENTURE_SYSTEM, AdventureSystemABI.abi);
        this.eventListeners = [];
    }

    // ============================================================================
    // STARTING SCOUT FUNCTIONS
    // ============================================================================

    /**
     * Purchase a starting scout with SONIC tokens
     * @returns {Promise<Object>} Transaction receipt
     */
    async purchaseStartingScout() {
        try {
            const cost = await this.getStartingScoutCost();
            Logger.info('Purchasing starting scout for:', ethers.formatEther(cost), 'SONIC');
            return await this.transactWithValue('purchaseStartingScout', [], cost);
        } catch (error) {
            Logger.error('Error purchasing starting scout:', error);
            throw error;
        }
    }

    /**
     * Get starting scout cost in wei
     * @returns {Promise<BigInt>} Cost in wei
     */
    async getStartingScoutCost() {
        try {
            return await this.call('STARTING_SCOUT_COST');
        } catch (error) {
            Logger.error('Error getting starting scout cost:', error);
            throw error;
        }
    }

    /**
     * Check if player has a starting scout
     * @param {string} address - Player address
     * @returns {Promise<Object>} Scout info { purchased, onAdventure, availableAt }
     */
    async getPlayerScout(address) {
        try {
            const scout = await this.call('playerScouts', address);
            return {
                purchased: scout.purchased,
                onAdventure: scout.onAdventure,
                availableAt: scout.availableAt
            };
        } catch (error) {
            Logger.error('Error getting player scout:', error);
            throw error;
        }
    }

    /**
     * Check if player's scout is available
     * @param {string} address - Player address
     * @returns {Promise<boolean>} True if available
     */
    async isScoutAvailable(address) {
        try {
            const scout = await this.getPlayerScout(address);
            if (!scout.purchased || scout.onAdventure) return false;
            
            const now = Math.floor(Date.now() / 1000);
            return Number(scout.availableAt) <= now;
        } catch (error) {
            Logger.error('Error checking scout availability:', error);
            return false;
        }
    }

    // ============================================================================
    // ADVENTURE FUNCTIONS
    // ============================================================================

    /**
     * Start a new adventure
     * @param {number} heroId - Hero NFT ID (0 if using starting scout)
     * @param {boolean} useStartingScout - True to use starting scout
     * @returns {Promise<Object>} Transaction receipt
     */
    async startAdventure(heroId, useStartingScout) {
        try {
            Logger.info('Starting adventure with:', { heroId, useStartingScout });
            return await this.transact('startAdventure', heroId, useStartingScout);
        } catch (error) {
            Logger.error('Error starting adventure:', error);
            throw error;
        }
    }

    /**
     * Reveal a tile in the current adventure
     * @returns {Promise<Object>} Transaction receipt
     */
    async revealTile() {
        try {
            Logger.info('Revealing tile...');
            return await this.transact('revealTile');
        } catch (error) {
            Logger.error('Error revealing tile:', error);
            throw error;
        }
    }

    /**
     * Complete adventure and claim rewards
     * @returns {Promise<Object>} Transaction receipt
     */
    async completeAdventure() {
        try {
            Logger.info('Completing adventure...');
            return await this.transact('completeAdventure');
        } catch (error) {
            Logger.error('Error completing adventure:', error);
            throw error;
        }
    }

    /**
     * Get current adventure status for player
     * @param {string} address - Player address
     * @returns {Promise<Object>} Adventure status
     */
    async getAdventureStatus(address) {
        try {
            const adventure = await this.call('getAdventureStatus', address);
            return {
                active: adventure.active,
                startedAt: adventure.startedAt,
                heroId: adventure.heroId,
                useStartingScout: adventure.useStartingScout,
                tilesRevealed: adventure.tilesRevealed,
                goldCollected: adventure.goldCollected,
                foodCollected: adventure.foodCollected,
                diamondsCollected: adventure.diamondsCollected,
                repCollected: adventure.repCollected,
                relicsFound: adventure.relicsFound,
                disasterEncountered: adventure.disasterEncountered,
                gridSize: adventure.gridSize
            };
        } catch (error) {
            Logger.error('Error getting adventure status:', error);
            throw error;
        }
    }

    /**
     * Check if player has an active adventure
     * @param {string} address - Player address
     * @returns {Promise<boolean>} True if active
     */
    async hasActiveAdventure(address) {
        try {
            const status = await this.getAdventureStatus(address);
            return status.active;
        } catch (error) {
            Logger.error('Error checking active adventure:', error);
            return false;
        }
    }

    // ============================================================================
    // HERO AVAILABILITY
    // ============================================================================

    /**
     * Check when a hero will be available again
     * @param {number} heroId - Hero NFT ID
     * @returns {Promise<BigInt>} Timestamp when hero is available
     */
    async getHeroAvailableAt(heroId) {
        try {
            return await this.call('heroAvailableAt', heroId);
        } catch (error) {
            Logger.error('Error getting hero availability:', error);
            throw error;
        }
    }

    /**
     * Check if hero is available for adventure
     * @param {number} heroId - Hero NFT ID
     * @returns {Promise<boolean>} True if available
     */
    async isHeroAvailable(heroId) {
        try {
            const availableAt = await this.getHeroAvailableAt(heroId);
            const now = Math.floor(Date.now() / 1000);
            return Number(availableAt) <= now;
        } catch (error) {
            Logger.error('Error checking hero availability:', error);
            return false;
        }
    }

    /**
     * Get hero cooldown period
     * @returns {Promise<BigInt>} Cooldown in seconds
     */
    async getHeroCooldown() {
        try {
            return await this.call('HERO_COOLDOWN');
        } catch (error) {
            Logger.error('Error getting hero cooldown:', error);
            throw error;
        }
    }

    // ============================================================================
    // GRID & TIER FUNCTIONS
    // ============================================================================

    /**
     * Get grid size for a tier
     * @param {number} tier - Player tier (0-4)
     * @returns {Promise<number>} Grid size (number of tiles)
     */
    async getGridSizeForTier(tier) {
        try {
            return await this.call('tierToGridSize', tier);
        } catch (error) {
            Logger.error('Error getting grid size:', error);
            throw error;
        }
    }

    /**
     * Get grid dimensions for a tier (e.g., 3x3 = 9 tiles)
     * @param {number} tier - Player tier (0-4)
     * @returns {Promise<Object>} { rows, cols, total }
     */
    async getGridDimensions(tier) {
        try {
            const gridSize = await this.getGridSizeForTier(tier);
            const size = Number(gridSize);
            
            // Map grid sizes to dimensions
            const dimensions = {
                9: { rows: 3, cols: 3 },   // 3x3
                12: { rows: 3, cols: 4 },  // 3x4
                16: { rows: 4, cols: 4 },  // 4x4
                20: { rows: 4, cols: 5 },  // 4x5
                25: { rows: 5, cols: 5 }   // 5x5
            };
            
            return {
                ...dimensions[size],
                total: size
            };
        } catch (error) {
            Logger.error('Error getting grid dimensions:', error);
            throw error;
        }
    }

    // ============================================================================
    // TILE PROBABILITIES (Read-only constants)
    // ============================================================================

    async getTileProbabilities() {
        try {
            const [safe, reward, disaster, diamond, special] = await Promise.all([
                this.call('SAFE_CHANCE'),
                this.call('REWARD_CHANCE'),
                this.call('DISASTER_CHANCE'),
                this.call('DIAMOND_CHANCE'),
                this.call('SPECIAL_CHANCE')
            ]);

            return {
                safe: Number(safe),
                reward: Number(reward),
                disaster: Number(disaster),
                diamond: Number(diamond),
                special: Number(special)
            };
        } catch (error) {
            Logger.error('Error getting tile probabilities:', error);
            throw error;
        }
    }

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================

    /**
     * Listen for adventure started events
     * @param {Function} callback - Callback function (player, heroId, useStartingScout, gridSize)
     */
    onAdventureStarted(callback) {
        const contract = this.contract;
        const listener = (player, heroId, useStartingScout, gridSize) => {
            Logger.info('Adventure started:', { player, heroId, useStartingScout, gridSize });
            callback({ player, heroId, useStartingScout, gridSize });
        };
        
        contract.on('AdventureStarted', listener);
        this.eventListeners.push({ event: 'AdventureStarted', listener });
    }

    /**
     * Listen for tile revealed events
     * @param {Function} callback - Callback function with tile result
     */
    onTileRevealed(callback) {
        const contract = this.contract;
        const listener = (player, tileIndex, tileType, gold, food, diamonds, rep, relicFound) => {
            Logger.info('Tile revealed:', { player, tileIndex, tileType, gold, food, diamonds, rep, relicFound });
            callback({
                player,
                tileIndex: Number(tileIndex),
                tileType: Number(tileType),
                goldReward: gold,
                foodReward: food,
                diamondReward: diamonds,
                repReward: rep,
                relicFound
            });
        };
        
        contract.on('TileRevealed', listener);
        this.eventListeners.push({ event: 'TileRevealed', listener });
    }

    /**
     * Listen for adventure completed events
     * @param {Function} callback - Callback function with rewards
     */
    onAdventureCompleted(callback) {
        const contract = this.contract;
        const listener = (player, gold, food, diamonds, rep, relics) => {
            Logger.info('Adventure completed:', { player, gold, food, diamonds, rep, relics });
            callback({
                player,
                goldEarned: gold,
                foodEarned: food,
                diamondsEarned: diamonds,
                repEarned: rep,
                relicsFound: Number(relics)
            });
        };
        
        contract.on('AdventureCompleted', listener);
        this.eventListeners.push({ event: 'AdventureCompleted', listener });
    }

    /**
     * Listen for disaster events
     * @param {Function} callback - Callback function (player, heroId, wasStartingScout)
     */
    onAdventureDisaster(callback) {
        const contract = this.contract;
        const listener = (player, heroId, wasStartingScout) => {
            Logger.info('Adventure disaster:', { player, heroId, wasStartingScout });
            callback({ player, heroId, wasStartingScout });
        };
        
        contract.on('AdventureDisaster', listener);
        this.eventListeners.push({ event: 'AdventureDisaster', listener });
    }

    /**
     * Listen for hero lost events
     * @param {Function} callback - Callback function (player, heroId)
     */
    onHeroLost(callback) {
        const contract = this.contract;
        const listener = (player, heroId) => {
            Logger.info('Hero lost:', { player, heroId });
            callback({ player, heroId });
        };
        
        contract.on('HeroLost', listener);
        this.eventListeners.push({ event: 'HeroLost', listener });
    }

    /**
     * Listen for starting scout purchased events
     * @param {Function} callback - Callback function (player)
     */
    onStartingScoutPurchased(callback) {
        const contract = this.contract;
        const listener = (player) => {
            Logger.info('Starting scout purchased:', { player });
            callback({ player });
        };
        
        contract.on('StartingScoutPurchased', listener);
        this.eventListeners.push({ event: 'StartingScoutPurchased', listener });
    }

    /**
     * Remove all event listeners
     */
    removeAllListeners() {
        if (!this.contract) return;
        
        this.eventListeners.forEach(({ event, listener }) => {
            this.contract.off(event, listener);
        });
        
        this.eventListeners = [];
        Logger.info('All adventure system event listeners removed');
    }

    /**
     * Cleanup on component unmount
     */
    cleanup() {
        this.removeAllListeners();
    }
}

export default AdventureSystemContract;

