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
        HOUSE: 0n,
        FARM: 1n,
        REP_STATION: 2n
    };

    // Building Management
    async createBuilding(buildingType) {
        return await this.transact('createBuilding', buildingType);
    }

    async upgradeBuilding(buildingId) {
        return await this.transact('upgradeBuilding', buildingId);
    }

    async removeBuilding(buildingId) {
        return await this.transact('removeBuilding', buildingId);
    }

    async repairBuilding(buildingId) {
        return await this.transact('repairBuilding', buildingId);
    }

    // Resource Collection
    async collectResources(buildingId) {
        return await this.transact('collectResources', buildingId);
    }

    async collectResourcesByType(buildingType) {
        return await this.transact('collectResourcesByType', buildingType);
    }

    // Building Information
    async getBuilding(buildingId) {
        const address = await this.getAddress();
        return await this.call('getBuilding', address, buildingId);
    }

    async getBuildingConfig(buildingType) {
        return await this.call('getBuildingConfig', buildingType);
    }

    async getActiveBuildings() {
        const address = await this.getAddress();
        return await this.call('getActiveBuildings', address);
    }

    // Resource Calculation
    async calculateClaimableResources(buildingId) {
        const address = await this.getAddress();
        return await this.call('calculateClaimableResources', address, buildingId);
    }

    async calculateTotalClaimableResources(buildingType) {
        const address = await this.getAddress();
        return await this.call('calculateTotalClaimableResources', address, buildingType);
    }

    // Building Counts
    async getBuildingCount(buildingType) {
        const address = await this.getAddress();
        return await this.call('buildingCounts', address, buildingType);
    }

    // Building Damage
    async isBuildingDamaged(buildingId) {
        const address = await this.getAddress();
        const building = await this.call('getBuilding', address, buildingId);
        return building.damaged;
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