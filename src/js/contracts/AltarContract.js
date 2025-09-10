import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import AltarABI from '../../../contracts/artifacts/contracts/Altar.sol/Altar.json';

export class AltarContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.ALTAR, AltarABI.abi);
    }

    async stake(tokenId, buildingType, collection) {
        return await this.transact('stake', tokenId, buildingType, collection);
    }

    async unstake(collection, tokenId) {
        return await this.transact('unstake', collection, tokenId);
    }

    async getStakeDataWithCollection(collection, tokenId) {
        return await this.call('getStakeDataWithCollection', collection, tokenId);
    }

    async getUserStakesByCollection(user, collection) {
        return await this.call('getUserStakesByCollection', user, collection);
    }

    /**
     * @deprecated Use getStakeDataWithCollection(collection, tokenId) instead
     * This method only works with the old single-collection system
     */
    async getStakeData(tokenId) {
        console.warn('getStakeData is deprecated. Use getStakeDataWithCollection(collection, tokenId) instead.');
        return await this.call('stakes', tokenId);
    }

    async getUserStakes() {
        const address = await this.getAddress();
        return await this.call('getUserStakes', address);
    }

    /**
     * Check if an NFT is staked
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The token ID
     * @returns {Promise<boolean>} - Whether the NFT is staked
     */
    async isStaked(collection, tokenId) {
        const stakeData = await this.getStakeDataWithCollection(collection, tokenId);
        return stakeData.isActive;
    }

    async getMinStakingDuration() {
        return await this.call('minStakingDuration');
    }

    async getGameStateAddress() {
        return await this.call('gameState');
    }

    async getSonicityNFTAddress() {
        return await this.call('sonicityNFT');
    }

    /**
     * Check if an NFT has preserved building data
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The token ID
     * @returns {Promise<boolean>} - Whether the NFT has preserved building data
     */
    async hasPreservedBuildingData(collection, tokenId) {
        return await this.call('hasPreservedBuildingData', collection, tokenId);
    }

    /**
     * Get preserved building data for an NFT
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The token ID
     * @returns {Promise<Object>} - The preserved building data
     */
    async getPreservedBuildingData(collection, tokenId) {
        const result = await this.call('getPreservedBuildingData', collection, tokenId);
        return {
            buildingType: Number(result[0]),
            level: Number(result[1]),
            lastUpgradeTime: Number(result[2])
        };
    }

    /**
     * Get the building ID for a staked NFT
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The token ID
     * @returns {Promise<number>} - The building ID (0 if not staked or deleted)
     */
    async getStakedBuilding(collection, tokenId) {
        return await this.call('stakedBuilding', collection, tokenId);
    }

    /**
     * Check if an NFT is staked to a specific building
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The token ID
     * @param {number|string} buildingId - The building ID to check against
     * @returns {Promise<boolean>} - Whether the NFT is staked to the specified building
     */
    async isStakedToBuilding(collection, tokenId, buildingId) {
        // First check if the NFT is actively staked
        const stakeData = await this.getStakeDataWithCollection(collection, tokenId);
        if (!stakeData.isActive) {
            return false; // Not staked at all
        }
        
        // Then check if it's staked to the specific building (including building ID 0)
        const stakedBuildingId = await this.getStakedBuilding(collection, tokenId);
        return Number(stakedBuildingId) === Number(buildingId);
    }

    /**
     * Mint and stake an NFT in one atomic operation
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The specific token ID to mint
     * @param {number} buildingType - The type of building to create (0: HOUSE, 1: FARM, 2: DIAMOND_STATION, 3: REP_STATION)
     * @returns {Promise<Object>} - Transaction result
     */
    async mintAndStake(collection, tokenId, buildingType) {
        return await this.transact('mintAndStake', collection, tokenId, buildingType);
    }

    /**
     * Mint an NFT with payment validation (without staking)
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The specific token ID to mint
     * @param {number} buildingType - The type of building to create (0: HOUSE, 1: FARM, 2: DIAMOND_STATION, 3: REP_STATION)
     * @param {Object} options - Transaction options (e.g., { value: ethers.parseEther("10") } for SONIC payment)
     * @returns {Promise<Object>} - Transaction result
     */
    async mint(collection, tokenId, buildingType, options = {}) {
        if (options.value) {
            // Use transactWithValue for SONIC payments
            return await this.transactWithValue('mint', [collection, tokenId, buildingType], options.value);
        } else {
            // Use regular transact for resource-based payments
            return await this.transact('mint', collection, tokenId, buildingType);
        }
    }

    /**
     * Mint a yield NFT by staking REP points
     * @param {number|string} repAmount - The amount of REP to stake for the NFT
     * @returns {Promise<Object>} - Transaction result containing the new token ID
     */
    async mintYieldNFT(repAmount) {
        return await this.transact('mintYieldNFT', repAmount);
    }

    /**
     * Stake a yield NFT to create a yield station
     * @param {number|string} tokenId - The token ID of the yield NFT to stake
     * @returns {Promise<Object>} - Transaction result
     */
    async stakeYieldNFT(tokenId) {
        return await this.transact('stakeYieldNFT', tokenId);
    }

    /**
     * Burn an NFT permanently (destroys building and NFT)
     * @param {string} collection - The NFT collection address
     * @param {number|string} tokenId - The token ID to burn
     * @returns {Promise<Object>} - Transaction result
     */
    async burnNFT(collection, tokenId) {
        return await this.transact('burnNFT', collection, tokenId);
    }
} 