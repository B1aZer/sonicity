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
            'CITY_HALL': 0,
            'ALTAR': 1,
            'MINE': 2,
            'SHOP': 3,
            'WORKSHOP': 4,
            'OUTPOST': 5,
            'DEFENSE_TOWER': 6,
            'BARRACKS': 7,
            'SCOUT_GUILD': 8,
            'COMMAND_CENTER': 9,
            'REP_STATION': 10,
            'COUNCIL_CHAMBER': 11,
            'AUDIT_SHRINE': 12,
            'FOUNDERS_HALL': 13,
            'MINISTRY_OF_MERIT': 14,
            'ARCANE_TOWER': 15,
            'FORTRESS_WALLS': 16,
            'BANK': 17
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

    // Core Building Management
    async initializeCoreBuildings() {
        const address = await this.getAddress();
        return await this.transact('initializeCoreBuildings', address);
    }

    async isCoreBuilding(buildingType) {
        const enumValue = this.getBuildingTypeEnum(buildingType);
        if (enumValue === undefined) {
            throw new Error(`Invalid building type: ${buildingType}`);
        }
        const configs = await this.call('getAllDistrictBuildingConfigs');
        return configs[1][enumValue].isCoreBuilding; // configs[1] contains the configs array
    }
} 