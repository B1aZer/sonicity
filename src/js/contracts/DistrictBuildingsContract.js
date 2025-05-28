import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import DistrictBuildingsABI from '../../../contracts/artifacts/contracts/DistrictBuildings.sol/DistrictBuildings.json';

export class DistrictBuildingsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.DISTRICT_BUILDINGS, DistrictBuildingsABI.abi);
    }

    // Map building type string to contract enum value
    getBuildingTypeEnum(buildingType) {
        const typeMap = {
            'SHOP': 0,
            'WORKSHOP': 1,
            'OUTPOST': 2,
            'DEFENSE_TOWER': 3,
            'BARRACKS': 4,
            'SCOUT_GUILD': 5,
            'COMMAND_CENTER': 6,
            'REP_STATION': 7,
            'COUNCIL_CHAMBER': 8,
            'AUDIT_SHRINE': 9,
            'FOUNDERS_HALL': 10,
            'MINISTRY_OF_MERIT': 11,
            'ARCANE_TOWER': 12,
            'FORTRESS_WALLS': 13,
            'BANK': 14,
            'ALTAR': 15
        };
        return typeMap[buildingType];
    }

    // Building Management
    async buildDistrictBuilding(buildingType) {
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.transact('buildDistrictBuilding', enumValue);
    }

    async upgradeDistrictBuilding(buildingType) {
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.transact('upgradeDistrictBuilding', enumValue);
    }

    async repairBuilding(buildingType) {
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.transact('repairBuilding', enumValue);
    }

    // Building Information
    async isDistrictBuildingUnlocked(buildingType) {
        const address = await this.getAddress();
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.call('isDistrictBuildingUnlocked', address, enumValue);
    }

    async isDistrictBuildingBuilt(buildingType) {
        const address = await this.getAddress();
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.call('isDistrictBuildingBuilt', address, enumValue);
    }

    async isDistrictBuildingActive(buildingType) {
        const address = await this.getAddress();
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.call('isDistrictBuildingActive', address, enumValue);
    }

    async isBuildingDamaged(buildingType) {
        const address = await this.getAddress();
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
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

    async getBuildingLevel(buildingType) {
        const address = await this.getAddress();
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        return await this.call('getBuildingLevel', address, enumValue);
    }

    async canTrainTroopType(troopType) {
        const address = await this.getAddress();
        return await this.call('canTrainTroopType', address, troopType);
    }
} 