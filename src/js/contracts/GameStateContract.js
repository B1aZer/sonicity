import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';

export class GameStateContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GAME_STATE, GameStateABI.abi);
    }

    // City Management
    async getCityInfo(cityId) {
        try {
            const city = await this.contract.cities(cityId);
            return {
                treasury: city.treasury,
                tier: city.tier,
                peaceShield: city.peaceShield
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

    // Building Management
    async getBuildingSlots() {
        const address = await this.getAddress();
        return await this.call('getBuildingSlots', address);
    }

    async getMaxBuildingSlots() {
        const address = await this.getAddress();
        return await this.call('getMaxBuildingSlots', address);
    }

    async createBuilding(buildingType) {
        try {
            const formattedType = String(buildingType).toLowerCase();
            const cost = await this.call('buildingCosts', formattedType);
            const address = await this.getAddress();
            const gold = await this.call('getPlayerGold', address);
            const slots = await this.call('getBuildingSlots', address);
            const totalBuildings = await this.call('getTotalBuildings', address);

            if (gold < cost) {
                throw new Error(`Insufficient gold. Required: ${cost}, Available: ${gold}`);
            }

            if (totalBuildings >= slots) {
                throw new Error(`No building slots available. Total buildings: ${totalBuildings}, Available slots: ${slots}`);
            }

            return await this.transact('createBuilding', formattedType);
        } catch (error) {
            console.error('Error in createBuilding:', error);
            throw error;
        }
    }

    async removeBuilding(buildingId) {
        return await this.transact('removeBuilding', buildingId);
    }

    async upgradeBuilding(buildingId) {
        return await this.transact('upgradeBuilding', buildingId);
    }

    async getBuildingIds() {
        const address = await this.getAddress();
        return await this.call('getBuildingIds', address);
    }

    async getBuildingIdsOfType(buildingType) {
        const address = await this.getAddress();
        return await this.call('getBuildingIdsOfType', address, buildingType);
    }

    async getBuilding(buildingId) {
        const address = await this.getAddress();
        return await this.call('getBuilding', address, buildingId);
    }

    async getTotalBuildings() {
        const address = await this.getAddress();
        return await this.call('getTotalBuildings', address);
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

    async getNextTierCost(cityId) {
        const cityInfo = await this.getCityInfo(cityId);
        const currentTier = Number(cityInfo.tier);
        const nextTierCost = await this.call('tierRequirements', currentTier + 1);
        return nextTierCost;
    }

    async earnGold(amount) {
        return await this.transact('earnGold', amount);
    }

    async donateGold(amount) {
        return await this.transact('donateGold', amount);
    }

    async getTierRequirements(tier) {
        return await this.call('tierRequirements', tier);
    }

    async getBuildingRequirements(tier, buildingName) {
        return await this.call('buildingRequirements', tier, buildingName);
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

    // Building Costs
    async getBuildingCost(buildingType) {
        return await this.call('buildingCosts', buildingType);
    }

    async getUpgradeCost(buildingType) {
        return await this.call('upgradeCosts', buildingType);
    }

    async getBuildingProductionRate(buildingType) {
        return await this.call('getBuildingProductionRate', buildingType);
    }

    async setBuildingProductionRate(buildingType, rate) {
        return await this.transact('setBuildingProductionRate', buildingType, rate);
    }

    async getBuildingsByType(player, buildingType) {
        return await this.call('getBuildingsByType', player, buildingType);
    }

    async calculateTotalClaimableGold() {
        const address = await this.getAddress();
        return await this.call('calculateTotalClaimableGold', address);
    }

    async collectAllGoldByType(buildingType) {
        return await this.transact('collectAllGoldByType', buildingType);
    }
} 