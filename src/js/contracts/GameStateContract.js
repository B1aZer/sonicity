import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';

export class GameStateContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GAME_STATE, GameStateABI.abi);
    }

    async getCityInfo(cityId) {
        try {
            const city = await this.contract.cities(cityId);
            return {
                treasury: ethers.formatEther(city.treasury), // Convert from wei to ETH
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
        try {
            const address = await this.getAddress();
            const cityId = await this.call('playerCity', address);
            // If cityId is 0 or empty, return null to indicate no city
            return cityId && cityId !== '0x' ? Number(cityId) : null;
        } catch (error) {
            console.error('Error getting player city:', error);
            return null;
        }
    }

    async getBuildingSlots() {
        const address = await this.getAddress();
        return await this.call('getBuildingSlots', address);
    }

    async getMaxBuildingSlots() {
        const address = await this.getAddress();
        return await this.call('getMaxBuildingSlots', address);
    }

    async getPlayerGold() {
        const address = await this.getAddress();
        return await this.call('getPlayerGold', address);
    }

    async getCityTreasury(cityId) {
        return await this.call('getCityTreasury', cityId);
    }

    async earnGold(amount) {
        return await this.transact('earnGold', amount);
    }

    async donateGold(amount) {
        return await this.transact('donateGold', amount);
    }

    async canUnlockBuilding(buildingName) {
        return await this.call('canUnlockBuilding', buildingName);
    }

    async getTierRequirements(tier) {
        return await this.call('tierRequirements', tier);
    }

    async getBuildingRequirements(tier, buildingName) {
        return await this.call('buildingRequirements', tier, buildingName);
    }
} 