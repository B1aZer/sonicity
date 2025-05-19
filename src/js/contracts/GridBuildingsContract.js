import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GridBuildingsABI from '../../../contracts/artifacts/contracts/GridBuildings.sol/GridBuildings.json';

export class GridBuildingsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GRID_BUILDINGS, GridBuildingsABI.abi);
    }

    // Building Types
    static BuildingType = {
        HOUSE: 0,
        FARM: 1,
        REP_STATION: 2
    };

    async createBuilding(buildingType) {
        try {
            const address = await this.getAddress();
            const activeBuildings = await this.getActiveBuildings(address);
            
            // Check if player is in Tier 0 and trying to build more than 9 houses
            if (buildingType === GridBuildingsContract.BuildingType.HOUSE) {
                const houseCount = activeBuildings.filter(b => b.buildingType === GridBuildingsContract.BuildingType.HOUSE).length;
                if (houseCount >= 9) {
                    throw new Error('Tier 0 grid is full (3x3)');
                }
            }

            return await this.transact('createBuilding', buildingType);
        } catch (error) {
            console.error('Error in createBuilding:', error);
            throw error;
        }
    }

    async upgradeBuilding(buildingId) {
        return await this.transact('upgradeBuilding', buildingId);
    }

    async removeBuilding(buildingId) {
        return await this.transact('removeBuilding', buildingId);
    }

    async collectResources(buildingId) {
        return await this.transact('collectResources', buildingId);
    }

    async getActiveBuildings(address) {
        const buildingIds = await this.call('getActiveBuildings', address);
        const buildings = [];
        
        for (const buildingId of buildingIds) {
            const building = await this.call('getBuilding', address, buildingId);
            buildings.push({
                id: buildingId,
                buildingType: Number(building[0]),
                level: Number(building[1]),
                lastUpgradeTime: Number(building[2]),
                lastCollectionTime: Number(building[3]),
                active: Boolean(building[4])
            });
        }
        
        return buildings;
    }

    async getBuilding(address, buildingId) {
        const building = await this.call('getBuilding', address, buildingId);
        return {
            buildingType: Number(building[0]),
            level: Number(building[1]),
            lastUpgradeTime: Number(building[2]),
            lastCollectionTime: Number(building[3]),
            active: building[4]
        };
    }

    async getBuildingConfig(buildingType) {
        const config = await this.call('getBuildingConfig', buildingType);
        return {
            name: config[0],
            baseProductionRate: Number(config[1]),
            upgradeCost: Number(config[2]),
            maxLevel: Number(config[3]),
            description: config[4],
            tier: Number(config[5])
        };
    }

    async getAllBuildingConfigs() {
        const configs = [];
        for (let i = 0; i <= GridBuildingsContract.BuildingType.REP_STATION; i++) {
            const config = await this.getBuildingConfig(i);
            configs.push({
                type: i,
                ...config
            });
        }
        return configs;
    }

    async getBuildingProductionRate(buildingType) {
        const config = await this.getBuildingConfig(buildingType);
        return config.baseProductionRate;
    }

    async calculateTotalClaimableGold(buildingType) {
        const address = await this.getAddress();
        const activeBuildings = await this.getActiveBuildings(address);
        
        // Filter buildings by type if specified
        const relevantBuildings = buildingType !== undefined 
            ? activeBuildings.filter(b => b.buildingType === buildingType)
            : activeBuildings;

        let totalClaimable = BigInt(0);
        for (const building of relevantBuildings) {
            const claimable = await this.calculateClaimableGold(building.id);
            totalClaimable += claimable;
        }
        
        return totalClaimable;
    }

    async calculateClaimableGold(buildingId) {
        const address = await this.getAddress();
        return await this.call('calculateClaimableGold', address);
    }

    async collectAllGoldByType(buildingType) {
        return await this.transact('collectResourcesByType', buildingType);
    }

    async getBuildingLevel(buildingId) {
        const building = await this.getBuilding(await this.getAddress(), buildingId);
        return building.level;
    }

    async getBuildingUpgradeCost(buildingId) {
        return await this.call('getBuildingUpgradeCost', buildingId);
    }

    async getBuildingRemovalRefund(buildingId) {
        return await this.call('getBuildingRemovalRefund', buildingId);
    }

    async getBuildingCreationCost(buildingType) {
        const config = await this.getBuildingConfig(buildingType);
        return config.creationCost;
    }
} 