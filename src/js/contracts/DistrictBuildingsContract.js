import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import DistrictBuildingsABI from '../../../contracts/artifacts/contracts/DistrictBuildings.sol/DistrictBuildings.json';

export class DistrictBuildingsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.DISTRICT_BUILDINGS, DistrictBuildingsABI.abi);
    }

    async getAllDistrictBuildingConfigs() {
        return await this.call('getAllDistrictBuildingConfigs');
    }

    async getDistrictBuildingsByTier(tier) {
        return await this.call('getDistrictBuildingsByTier', tier);
    }

    async isDistrictBuildingUnlocked(buildingType) {
        const address = await this.getAddress();
        return await this.call('isDistrictBuildingUnlocked', address, buildingType);
    }

    async buildDistrictBuilding(buildingType) {
        return await this.transact('buildDistrictBuilding', buildingType);
    }

    async isDistrictBuildingBuilt(buildingType) {
        const address = await this.getAddress();
        return await this.call('isDistrictBuildingBuilt', address, buildingType);
    }
} 