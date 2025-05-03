import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';

export class GameStateContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GAME_STATE, GameStateABI.abi);
    }

    async joinCity(cityId) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            // Join the city
            const tx = await this.contract.joinCity(cityId);
            await tx.wait();

            return true;
        } catch (error) {
            console.error('Error joining city:', error);
            throw error;
        }
    }

    async getCityInfo(cityId) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            const city = await this.contract.cities(cityId);
            return {
                treasury: ethers.utils.formatEther(city.treasury),
                tier: city.tier,
                peaceShield: city.peaceShield
            };
        } catch (error) {
            console.error('Error getting city info:', error);
            throw error;
        }
    }

    async getPlayerCity() {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            const cityId = await this.contract.playerCity(await this.getSignerAddress());
            return cityId.toNumber();
        } catch (error) {
            console.error('Error getting player city:', error);
            throw error;
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