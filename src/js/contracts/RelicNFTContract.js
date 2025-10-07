import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import RelicNFTABI from '../../../contracts/artifacts/contracts/RelicNFT.sol/RelicNFT.json';
import Logger from '../utils/logger.js';

export class RelicNFTContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.RELIC_NFT, RelicNFTABI.abi);
    }

    // ============================================================================
    // NFT STANDARD FUNCTIONS
    // ============================================================================

    /**
     * Get balance of relics owned by address
     * @param {string} address - Owner address
     * @returns {Promise<BigInt>} Number of relics owned
     */
    async balanceOf(address) {
        try {
            return await this.call('balanceOf', address);
        } catch (error) {
            Logger.error('Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Get token ID by owner index
     * @param {string} owner - Owner address
     * @param {number} index - Index in owner's token list
     * @returns {Promise<BigInt>} Token ID
     */
    async tokenOfOwnerByIndex(owner, index) {
        try {
            return await this.call('tokenOfOwnerByIndex', owner, index);
        } catch (error) {
            Logger.error('Error getting token by index:', error);
            throw error;
        }
    }

    /**
     * Get token URI (metadata URL)
     * @param {number} tokenId - Token ID
     * @returns {Promise<string>} Token URI
     */
    async tokenURI(tokenId) {
        try {
            return await this.call('tokenURI', tokenId);
        } catch (error) {
            Logger.error('Error getting token URI:', error);
            throw error;
        }
    }

    /**
     * Get owner of a token
     * @param {number} tokenId - Token ID
     * @returns {Promise<string>} Owner address
     */
    async ownerOf(tokenId) {
        try {
            return await this.call('ownerOf', tokenId);
        } catch (error) {
            Logger.error('Error getting owner:', error);
            throw error;
        }
    }

    /**
     * Get total supply of relics
     * @returns {Promise<BigInt>} Total supply
     */
    async totalSupply() {
        try {
            return await this.call('totalSupply');
        } catch (error) {
            Logger.error('Error getting total supply:', error);
            throw error;
        }
    }

    // ============================================================================
    // RELIC-SPECIFIC FUNCTIONS
    // ============================================================================

    /**
     * Get relic details
     * @param {number} tokenId - Token ID
     * @returns {Promise<Object>} Relic details { foundAt, finder, rarity }
     */
    async getRelicDetails(tokenId) {
        try {
            const relic = await this.call('relics', tokenId);
            return {
                foundAt: relic.foundAt,
                finder: relic.finder,
                rarity: Number(relic.rarity)
            };
        } catch (error) {
            Logger.error('Error getting relic details:', error);
            throw error;
        }
    }

    /**
     * Get rarity name for a rarity level
     * @param {number} rarity - Rarity level (1-5)
     * @returns {Promise<string>} Rarity name
     */
    async getRarityName(rarity) {
        try {
            return await this.call('getRarityName', rarity);
        } catch (error) {
            Logger.error('Error getting rarity name:', error);
            throw error;
        }
    }

    /**
     * Get max supply
     * @returns {Promise<BigInt>} Max supply (500)
     */
    async getMaxSupply() {
        try {
            return await this.call('MAX_SUPPLY');
        } catch (error) {
            Logger.error('Error getting max supply:', error);
            throw error;
        }
    }

    /**
     * Get max mint per player
     * @returns {Promise<BigInt>} Max mint per player (50)
     */
    async getMaxMintPerPlayer() {
        try {
            return await this.call('MAX_MINT_PER_PLAYER');
        } catch (error) {
            Logger.error('Error getting max mint per player:', error);
            throw error;
        }
    }

    /**
     * Get player mint count
     * @param {string} address - Player address
     * @returns {Promise<BigInt>} Number of relics minted by player
     */
    async getPlayerMintCount(address) {
        try {
            return await this.call('playerMintCount', address);
        } catch (error) {
            Logger.error('Error getting player mint count:', error);
            throw error;
        }
    }

    // ============================================================================
    // QUERY FUNCTIONS
    // ============================================================================

    /**
     * Get all relics owned by an address with full details
     * @param {string} userAddress - Owner address
     * @returns {Promise<Array>} Array of relic objects
     */
    async getOwnedRelics(userAddress) {
        try {
            const balance = await this.balanceOf(userAddress);
            const relics = [];
            
            if (balance > 0n) {
                for (let i = 0; i < Number(balance); i++) {
                    const tokenId = await this.tokenOfOwnerByIndex(userAddress, i);
                    const tokenIdNum = Number(tokenId);
                    
                    // Get relic details
                    const details = await this.getRelicDetails(tokenIdNum);
                    
                    // Get metadata
                    const tokenURI = await this.tokenURI(tokenIdNum);
                    let metadata = null;
                    
                    try {
                        const response = await fetch(tokenURI);
                        metadata = await response.json();
                    } catch (err) {
                        Logger.warn(`Failed to fetch metadata for relic ${tokenIdNum}:`, err);
                    }
                    
                    relics.push({
                        tokenId: tokenIdNum,
                        contractAddress: await this.getContractAddress(),
                        tokenURI,
                        metadata,
                        foundAt: Number(details.foundAt),
                        finder: details.finder,
                        rarity: details.rarity,
                        rarityName: await this.getRarityName(details.rarity)
                    });
                }
            }
            
            return relics;
        } catch (error) {
            Logger.error('Error getting owned relics:', error);
            throw error;
        }
    }

    /**
     * Get relics by rarity for a user
     * @param {string} userAddress - Owner address
     * @param {number} rarity - Rarity level (1-5)
     * @returns {Promise<Array>} Array of relic objects
     */
    async getRelicsByRarity(userAddress, rarity) {
        try {
            const allRelics = await this.getOwnedRelics(userAddress);
            return allRelics.filter(relic => relic.rarity === rarity);
        } catch (error) {
            Logger.error('Error getting relics by rarity:', error);
            throw error;
        }
    }

    /**
     * Get rarity distribution for a user
     * @param {string} userAddress - Owner address
     * @returns {Promise<Object>} Rarity counts { 1: count, 2: count, ... }
     */
    async getRarityDistribution(userAddress) {
        try {
            const allRelics = await this.getOwnedRelics(userAddress);
            const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            
            allRelics.forEach(relic => {
                distribution[relic.rarity]++;
            });
            
            return distribution;
        } catch (error) {
            Logger.error('Error getting rarity distribution:', error);
            throw error;
        }
    }

    /**
     * Get single relic with full details
     * @param {number} tokenId - Token ID
     * @returns {Promise<Object>} Relic object
     */
    async getRelicById(tokenId) {
        try {
            const owner = await this.ownerOf(tokenId);
            const details = await this.getRelicDetails(tokenId);
            const tokenURI = await this.tokenURI(tokenId);
            
            let metadata = null;
            try {
                const response = await fetch(tokenURI);
                metadata = await response.json();
            } catch (err) {
                Logger.warn(`Failed to fetch metadata for relic ${tokenId}:`, err);
            }
            
            return {
                tokenId,
                owner,
                contractAddress: await this.getContractAddress(),
                tokenURI,
                metadata,
                foundAt: Number(details.foundAt),
                finder: details.finder,
                rarity: details.rarity,
                rarityName: await this.getRarityName(details.rarity)
            };
        } catch (error) {
            Logger.error('Error getting relic by ID:', error);
            throw error;
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Get rarity color for UI display
     * @param {number} rarity - Rarity level (1-5)
     * @returns {string} CSS color
     */
    getRarityColor(rarity) {
        const colors = {
            1: '#9CA3AF', // Common - Gray
            2: '#10B981', // Uncommon - Green
            3: '#3B82F6', // Rare - Blue
            4: '#8B5CF6', // Epic - Purple
            5: '#F59E0B'  // Legendary - Gold
        };
        return colors[rarity] || '#9CA3AF';
    }

    /**
     * Get rarity display name (client-side helper)
     * @param {number} rarity - Rarity level (1-5)
     * @returns {string} Rarity name
     */
    getRarityDisplayName(rarity) {
        const names = {
            1: 'Common',
            2: 'Uncommon',
            3: 'Rare',
            4: 'Epic',
            5: 'Legendary'
        };
        return names[rarity] || 'Unknown';
    }

    /**
     * Format timestamp to date string
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Formatted date
     */
    formatFoundDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================

    /**
     * Listen for relic minted events
     * @param {Function} callback - Callback function (player, tokenId, rarity)
     */
    onRelicMinted(callback) {
        const contract = this.contract;
        const listener = (player, tokenId, rarity) => {
            Logger.info('Relic minted:', { player, tokenId, rarity });
            callback({
                player,
                tokenId: Number(tokenId),
                rarity: Number(rarity)
            });
        };
        
        contract.on('RelicMinted', listener);
        return () => contract.off('RelicMinted', listener);
    }

    /**
     * Listen for transfer events
     * @param {Function} callback - Callback function (from, to, tokenId)
     */
    onTransfer(callback) {
        const contract = this.contract;
        const listener = (from, to, tokenId) => {
            Logger.info('Relic transferred:', { from, to, tokenId });
            callback({
                from,
                to,
                tokenId: Number(tokenId)
            });
        };
        
        contract.on('Transfer', listener);
        return () => contract.off('Transfer', listener);
    }
}

export default RelicNFTContract;

