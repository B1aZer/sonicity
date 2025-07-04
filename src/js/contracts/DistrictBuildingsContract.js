import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import DistrictBuildingsABI from '../../../contracts/artifacts/contracts/DistrictBuildings.sol/DistrictBuildings.json';

export class DistrictBuildingsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.DISTRICT_BUILDINGS, DistrictBuildingsABI.abi);
    }

    // Map building type string to contract enum value
    async getBuildingTypeEnum(buildingType) {
        // Get all building configs from the contract
        const [buildingTypes, configs] = await this.call('getAllDistrictBuildingConfigs');
        
        // Find the index of the building type in the configs
        const index = configs.findIndex(config => config.name === buildingType);
        
        if (index === -1) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        
        return buildingTypes[index];
    }

    // Building Management
    async buildDistrictBuilding(buildingType) {
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.transact('buildDistrictBuilding', enumValue);
    }

    async upgradeDistrictBuilding(buildingType) {
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.transact('upgradeDistrictBuilding', enumValue);
    }

    async repairBuilding(buildingType) {
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.transact('repairBuilding', enumValue);
    }

    // Building Information
    async isDistrictBuildingUnlocked(buildingType) {
        const address = await this.getAddress();
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.call('isDistrictBuildingUnlocked', address, enumValue);
    }

    async isDistrictBuildingBuilt(buildingType) {
        const address = await this.getAddress();
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.call('isDistrictBuildingBuilt', address, enumValue);
    }

    async isDistrictBuildingActive(buildingType) {
        const address = await this.getAddress();
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.call('isDistrictBuildingActive', address, enumValue);
    }

    async isBuildingDamaged(buildingType) {
        const address = await this.getAddress();
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.call('isBuildingDamaged', address, enumValue);
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
                const level = await this.call('getBuildingLevel', address, buildingTypes[i]);
                builtBuildings.push({
                    type: buildingTypes[i],
                    name: buildingNames[i],
                    level: level,
                    config: configs[i]
                });
            }
        }

        return builtBuildings;
    }

    async getBuildingNames() {
        return await this.call('getBuildingNames');
    }

    async getBuildingLevel(buildingType) {
        const address = await this.getAddress();
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        return await this.call('getBuildingLevel', address, enumValue);
    }

    async canTrainTroopType(troopType) {
        const address = await this.getAddress();
        return await this.call('canTrainTroopType', address, troopType);
    }

    // Core Building Management
    async initializeCoreBuildings() {
        const address = await this.getAddress();
        return await this.transact('initializeCoreBuildings', address);
    }

    async isCoreBuilding(buildingType) {
        const enumValue = await this.getBuildingTypeEnum(buildingType);
        const configs = await this.call('getAllDistrictBuildingConfigs');
        return configs[1][enumValue].isCoreBuilding; // configs[1] contains the configs array
    }
} 