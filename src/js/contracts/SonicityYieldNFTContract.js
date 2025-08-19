import { BaseContract } from './BaseContract.js';
import Logger from '../utils/logger.js';

export class SonicityYieldNFTContract extends BaseContract {
    constructor(provider, signer) {
        // ABI for SonicityYieldNFT contract
        const abi = [
            // ERC721 standard functions
            "function balanceOf(address owner) view returns (uint256)",
            "function ownerOf(uint256 tokenId) view returns (address)",
            "function tokenURI(uint256 tokenId) view returns (string)",
            "function totalSupply() view returns (uint256)",
            "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
            
            // SonicityYieldNFT specific functions
            "function stakeInfo(uint256 tokenId) view returns (uint256 repStaked, uint256 mintedAt)",
            "function lockedForYield(uint256 tokenId) view returns (bool)",
            "function mintForAltar(address to, uint256 tokenId, uint256 repAmount)",
            "function setArtProxy(address _artProxy)",
            
            // Events
            "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
            "event ArtProxySet(address indexed artProxy)"
        ];

        super(provider, signer, abi);
        this.contractName = 'SonicityYieldNFT';
    }

    /**
     * Get the balance of NFTs for an address
     * @param {string} address - The wallet address
     * @returns {Promise<number>} Number of NFTs owned
     */
    async balanceOf(address) {
        try {
            const balance = await this.call('balanceOf', address);
            return parseInt(balance.toString());
        } catch (error) {
            Logger.error(`Error getting NFT balance for ${address}:`, error);
            throw error;
        }
    }

    /**
     * Get all NFT token IDs owned by an address
     * @param {string} address - The wallet address
     * @returns {Promise<number[]>} Array of token IDs
     */
    async getTokensOfOwner(address) {
        try {
            const balance = await this.balanceOf(address);
            const tokenIds = [];
            
            for (let i = 0; i < balance; i++) {
                const tokenId = await this.call('tokenOfOwnerByIndex', address, i);
                tokenIds.push(parseInt(tokenId.toString()));
            }
            
            Logger.info(`Found ${tokenIds.length} Yield NFTs for ${address}:`, tokenIds);
            return tokenIds;
        } catch (error) {
            Logger.error(`Error getting tokens for ${address}:`, error);
            throw error;
        }
    }

    /**
     * Get stake information for a token
     * @param {number} tokenId - The token ID
     * @returns {Promise<{repStaked: string, mintedAt: number}>} Stake info
     */
    async getStakeInfo(tokenId) {
        try {
            const stakeInfo = await this.call('stakeInfo', tokenId);
            return {
                repStaked: stakeInfo.repStaked.toString(),
                mintedAt: parseInt(stakeInfo.mintedAt.toString())
            };
        } catch (error) {
            Logger.error(`Error getting stake info for token ${tokenId}:`, error);
            throw error;
        }
    }

    /**
     * Get token URI (metadata) for a token
     * @param {number} tokenId - The token ID
     * @returns {Promise<string>} Token URI
     */
    async getTokenURI(tokenId) {
        try {
            const uri = await this.call('tokenURI', tokenId);
            return uri;
        } catch (error) {
            Logger.error(`Error getting token URI for token ${tokenId}:`, error);
            throw error;
        }
    }

    /**
     * Check if a token is locked for yield
     * @param {number} tokenId - The token ID
     * @returns {Promise<boolean>} Whether the token is locked
     */
    async isLockedForYield(tokenId) {
        try {
            const locked = await this.call('lockedForYield', tokenId);
            return locked;
        } catch (error) {
            Logger.error(`Error checking if token ${tokenId} is locked:`, error);
            throw error;
        }
    }

    /**
     * Get detailed NFT data for display
     * @param {number} tokenId - The token ID
     * @returns {Promise<Object>} Detailed NFT data
     */
    async getNFTDetails(tokenId) {
        try {
            const [stakeInfo, tokenURI, locked] = await Promise.all([
                this.getStakeInfo(tokenId),
                this.getTokenURI(tokenId),
                this.isLockedForYield(tokenId)
            ]);

            // Parse the metadata from the token URI if it's a data URI
            let metadata = null;
            if (tokenURI.startsWith('data:application/json;base64,')) {
                try {
                    const base64Data = tokenURI.split(',')[1];
                    const jsonString = atob(base64Data);
                    metadata = JSON.parse(jsonString);
                } catch (parseError) {
                    Logger.warn(`Failed to parse metadata for token ${tokenId}:`, parseError);
                }
            }

            return {
                tokenId,
                repStaked: stakeInfo.repStaked,
                mintedAt: stakeInfo.mintedAt,
                locked,
                tokenURI,
                metadata,
                // Extract tier info if metadata is available
                tier: metadata?.attributes?.find(attr => attr.trait_type === 'Prestige Tier')?.value || 'Unknown',
                rarity: metadata?.attributes?.find(attr => attr.trait_type === 'Rarity')?.value || 'Unknown'
            };
        } catch (error) {
            Logger.error(`Error getting NFT details for token ${tokenId}:`, error);
            throw error;
        }
    }

    /**
     * Get all NFTs owned by an address with full details
     * @param {string} address - The wallet address
     * @returns {Promise<Object[]>} Array of detailed NFT data
     */
    async getAllNFTsWithDetails(address) {
        try {
            const tokenIds = await this.getTokensOfOwner(address);
            
            if (tokenIds.length === 0) {
                return [];
            }

            // Get details for all tokens in parallel
            const nftDetails = await Promise.all(
                tokenIds.map(tokenId => this.getNFTDetails(tokenId))
            );

            // Sort by REP amount (highest first) for better display
            nftDetails.sort((a, b) => parseInt(b.repStaked) - parseInt(a.repStaked));

            Logger.info(`Retrieved details for ${nftDetails.length} Yield NFTs for ${address}`);
            return nftDetails;
        } catch (error) {
            Logger.error(`Error getting all NFT details for ${address}:`, error);
            throw error;
        }
    }

    /**
     * Get total supply of minted NFTs
     * @returns {Promise<number>} Total supply
     */
    async getTotalSupply() {
        try {
            const supply = await this.call('totalSupply');
            return parseInt(supply.toString());
        } catch (error) {
            Logger.error('Error getting total supply:', error);
            throw error;
        }
    }
} 