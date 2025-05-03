import { BaseContract } from './BaseContract.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';

export class GameStateContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GAME_STATE, GameStateABI.abi);
    }

    async joinCity(cityId) {
        return await this.transact('joinCity', cityId);
    }

    async getPlayerCity() {
        const address = await this.getAddress();
        return await this.call('playerCity', address);
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