import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';

export class GameStateContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GAME_STATE, GameStateABI.abi);
    }

    async initializePlayer() {
        try {
            return await this.transact('initializePlayer');
        } catch (error) {
            console.error('Error in initializePlayer:', error);
            throw error;
        }
    }

    async getPlayerState() {
        const address = await this.getAddress();
        return await this.call('playerState', address);
    }

    async isPlayerInitialized() {
        try {
            const state = await this.getPlayerState();
            return state.buildingSlots > 0;
        } catch (error) {
            console.error('Error checking player initialization:', error);
            return false;
        }
    }

    // City Management
    async getCityInfo(cityId) {
        try {
            const city = await this.contract.cities(cityId);
            return {
                treasury: city.treasury,
                tier: city.tier,
                founder: city.founder
            };
        } catch (error) {
            console.error('Error getting city info:', error);
            throw error;
        }
    }

    async joinCity(cityId) {
        return await this.transact('joinCity', cityId);
    }

    async getPlayerCity() {
        const address = await this.getAddress();
        const cityId = await this.call('playerCity', address);
        return cityId === 0n ? null : cityId;
    }

    async getCityTreasury(cityId) {
        return await this.call('getCityTreasury', cityId);
    }

    async upgradeCityTier(cityId) {
        return await this.transact('upgradeCityTier', cityId);
    }

    // Building Slots Management
    async getBuildingSlots() {
        const address = await this.getAddress();
        return await this.call('getBuildingSlots', address);
    }

    // Resource Management
    async getPlayerGold() {
        const address = await this.getAddress();
        return await this.call('getPlayerGold', address);
    }

    async getPlayerRep() {
        const address = await this.getAddress();
        return await this.call('getPlayerRep', address);
    }

    async getPlayerTreasury() {
        const address = await this.getAddress();
        return await this.call('getPlayerTreasury', address);
    }

    async getNextTierCost(cityId) {
        const cityInfo = await this.getCityInfo(cityId);
        const currentTier = Number(cityInfo.tier);
        const nextTierCost = await this.call('tierRequirements', currentTier + 1);
        return nextTierCost;
    }

    async earnGold(player, amount) {
        return await this.transact('earnGold', player, amount);
    }

    async donateGold(amount) {
        return await this.transact('donateGold', amount);
    }

    async getTierRequirements(tier) {
        return await this.call('tierRequirements', tier);
    }

    // NFT Collection Management
    async approveCollection(collectionAddress) {
        return await this.transact('approveCollection', collectionAddress);
    }

    async removeCollection(collectionAddress) {
        return await this.transact('removeCollection', collectionAddress);
    }

    async isCollectionApproved(collectionAddress) {
        return await this.call('approvedCollections', collectionAddress);
    }

    async setNFTMetadata(collectionAddress, tokenId, metadata) {
        return await this.transact('setNFTMetadata', collectionAddress, tokenId, metadata);
    }

    async getNFTMetadata(collectionAddress, tokenId) {
        return await this.call('getNFTMetadata', collectionAddress, tokenId);
    }

    async verifyNFTOwnership(collectionAddress, tokenId, owner) {
        return await this.call('verifyNFTOwnership', collectionAddress, tokenId, owner);
    }
} 