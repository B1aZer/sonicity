import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import Logger from '../utils/logger.js';

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

    async isPlayerInitialized() {
        try {
            const address = await this.getAddress();
            Logger.info('Checking initialization for wallet address:', address);
            const buildingSlots = await this.call('getBuildingSlots', address);
            Logger.info('Player building slots:', buildingSlots);
            return buildingSlots > 0n;
        } catch (error) {
            Logger.error('Error checking player initialization:', error);
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

    async getPlayerFood() {
        const address = await this.getAddress();
        return await this.call('getPlayerFood', address);
    }

    async getPlayerTreasury() {
        const address = await this.getAddress();
        return await this.call('getPlayerTreasury', address);
    }

    async getPlayerTier() {
        const address = await this.getAddress();
        return await this.call('getPlayerTier', address);
    }

    async getNextTierCost(cityId) {
        const cityInfo = await this.getCityInfo(cityId);
        const currentTier = Number(cityInfo.tier);
        const nextTierCost = await this.call('tierRequirements', currentTier + 1);
        return nextTierCost;
    }

    async donateGold(amount) {
        return await this.transact('donateGold', amount);
    }

    async getTierRequirements(tier) {
        return await this.call('tierRequirements', tier);
    }

    // Battle System Integration
    async burnTreasury(amount) {
        return await this.transact('burnTreasury', amount);
    }

    // Resource Deduction
    async deductResources(goldAmount, foodAmount, repAmount) {
        return await this.transact('deductResources', goldAmount, foodAmount, repAmount);
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

    async getPlayerBuildingSlots(address) {
        return await this.call('getPlayerBuildingSlots', address);
    }

    // Upgrade Progress Management
    async getUpgradeProgress(buildingType) {
        try {
            const address = await this.getAddress();
            const progress = await this.call('getUpgradeProgress', address, buildingType);
            return {
                currentAmount: progress[0],
                nextThreshold: progress[1],
                progressPercent: progress[2],
                currentLevel: progress[3]
            };
        } catch (error) {
            Logger.error('Error getting upgrade progress:', error);
            return {
                currentAmount: 0n,
                nextThreshold: 0n,
                progressPercent: 0,
                currentLevel: 0
            };
        }
    }

    async getMaxUpgradeLevel(buildingType) {
        try {
            const address = await this.getAddress();
            return await this.call('getMaxUpgradeLevel', address, buildingType);
        } catch (error) {
            Logger.error('Error getting max upgrade level:', error);
            return 1; // Default to level 1
        }
    }

    async getTotalRechargeAmount(buildingType) {
        try {
            const address = await this.getAddress();
            return await this.call('getTotalRechargeAmount', address, buildingType);
        } catch (error) {
            Logger.error('Error getting total recharge amount:', error);
            return 0n;
        }
    }

    // Helper function to format upgrade progress for UI
    formatUpgradeProgress(progress) {
        const currentAmountInSonic = Number(ethers.formatEther(progress.currentAmount));
        const nextThresholdInSonic = Number(ethers.formatEther(progress.nextThreshold));
        
        return {
            currentAmount: currentAmountInSonic,
            nextThreshold: nextThresholdInSonic,
            progressPercent: progress.progressPercent,
            currentLevel: progress.currentLevel,
            formattedCurrent: currentAmountInSonic.toFixed(2),
            formattedNext: nextThresholdInSonic.toFixed(2),
            isMaxLevel: progress.currentLevel >= 3
        };
    }
} 