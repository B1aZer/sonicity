import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import DistrictBuildingsABI from '../../../contracts/artifacts/contracts/DistrictBuildings.sol/DistrictBuildings.json';

export class DistrictBuildingsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.DISTRICT_BUILDINGS, DistrictBuildingsABI.abi);
    }

    // Building Management
    async buildDistrictBuilding(buildingType) {
        return await this.transact('buildDistrictBuilding', buildingType);
    }

    async upgradeDistrictBuilding(buildingType) {
        return await this.transact('upgradeDistrictBuilding', buildingType);
    }

    async repairBuilding(buildingType) {
        return await this.transact('repairBuilding', buildingType);
    }

    // Building Information
    async isDistrictBuildingUnlocked(buildingType) {
        const address = await this.getAddress();
        return await this.call('isDistrictBuildingUnlocked', address, buildingType);
    }

    async isDistrictBuildingBuilt(buildingType) {
        const address = await this.getAddress();
        return await this.call('isDistrictBuildingBuilt', address, buildingType);
    }

    async isDistrictBuildingActive(buildingType) {
        const address = await this.getAddress();
        return await this.call('isDistrictBuildingActive', address, buildingType);
    }

    async isBuildingDamaged(buildingType) {
        const address = await this.getAddress();
        return await this.call('isBuildingDamaged', address, buildingType);
    }

    // Building Configuration
    async getAllDistrictBuildingConfigs() {
        return await this.call('getAllDistrictBuildingConfigs');
    }

    async getDistrictBuildingsByTier(tier) {
        return await this.call('getDistrictBuildingsByTier', tier);
    }

    // Defense Tower Power (for Battle System)
    async getDefenseTowerPower() {
        const address = await this.getAddress();
        return await this.call('getDefenseTowerPower', address);
    }

    async getBuiltBuildings() {
        const address = await this.getAddress();
        const [buildingTypes, configs] = await this.call('getAllDistrictBuildingConfigs');
        const buildingNames = await this.call('getBuildingNames');
        const builtBuildings = [];

        for (let i = 0; i < buildingTypes.length; i++) {
            const isBuilt = await this.call('isDistrictBuildingBuilt', address, buildingTypes[i]);
            if (isBuilt) {
                builtBuildings.push({
                    type: buildingTypes[i],
                    name: buildingNames[i],
                    config: configs[i]
                });
            }
        }

        return builtBuildings;
    }

    async getBuildingNames() {
        return await this.call('getBuildingNames');
    }
} 