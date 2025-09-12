import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GridBuildingsABI from '../../../contracts/artifacts/contracts/GridBuildings.sol/GridBuildings.json';

/**
 * @typedef {Object} Building
 * @property {number} buildingType - The type of building (0: House, 1: Farm, 2: Diamond Station, 3: REP Forge)
 * @property {number} level - The current level of the building
 * @property {number} lastUpgradeTime - Timestamp of last upgrade
 * @property {number} lastRechargeTime - Timestamp of last recharge (when production started)
 * @property {number} lastCollectionTime - Timestamp of last resource collection
 * @property {boolean} damaged - Whether the building is damaged
 */

/**
 * @typedef {Object} BuildingConfig
 * @property {string} name - Building name
 * @property {number} baseProductionRate - Base production rate per hour
 * @property {number} upgradeCost - Cost to upgrade the building
 * @property {number} maxLevel - Maximum level for this building type
 * @property {string} description - Building description
 * @property {number} tier - Building tier (0, 1, 2)
 */

export class GridBuildingsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GRID_BUILDINGS, GridBuildingsABI.abi);
    }

    // Building Types
    static BuildingType = {
        HOUSE: 0,
        FARM: 1,
        DIAMOND_STATION: 2,
        REP_FORGE: 3,
        YIELD_STATION: 4
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
    async getBuilding(addressOrId, maybeId) {
        // Support both (buildingId) and (address, buildingId)
        let address, buildingId;
        if (maybeId !== undefined) {
            address = addressOrId;
            buildingId = maybeId;
        } else {
            address = await this.getAddress();
            buildingId = addressOrId;
        }
        
        // Get raw building data from contract
        const rawBuilding = await this.call('getBuilding', address, buildingId);
        
        // Map to structured Building object
        /** @type {Building} */
        const building = {
            buildingType: Number(rawBuilding[0]),
            level: Number(rawBuilding[1]),
            lastUpgradeTime: Number(rawBuilding[2]),
            lastRechargeTime: Number(rawBuilding[3]),
            lastCollectionTime: Number(rawBuilding[4]),
            damaged: Boolean(rawBuilding[5])
        };
        
        return building;
    }

    async getBuildingConfig(buildingType) {
        return await this.call('getBuildingConfig', buildingType);
    }

    async getYieldStationInfo(address, buildingId) {
        return await this.call('getYieldStationInfo', address, buildingId);
    }

    async getActiveBuildings(address) {
        if (!address) address = await this.getAddress();
        return await this.call('getActiveBuildings', address);
    }

    /**
     * Get all active buildings for a player with full building data
     * @param {string} address - Player address
     * @returns {Promise<Building[]>} Array of Building objects
     */
    async getActiveBuildingsWithData(address) {
        if (!address) address = await this.getAddress();
        const buildingIds = await this.getActiveBuildings(address);
        const buildings = [];
        
        for (const id of buildingIds) {
            const building = await this.getBuilding(address, id);
            building.id = id;
            buildings.push(building);
        }
        
        return buildings;
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
        const building = await this.getBuilding(address, buildingId);
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

    // Recharge Functionality
    async isBuildingAtCap(buildingId) {
        const address = await this.getAddress();
        return await this.call('isBuildingAtCap', address, buildingId);
    }

    async getBuildingsAtCap() {
        const address = await this.getAddress();
        return await this.call('getBuildingsAtCap', address);
    }

    async rechargeBuilding(buildingId) {
        // Get the building to determine its type
        const address = await this.getAddress();
        const building = await this.getBuilding(address, buildingId);
        const config = await this.getBuildingConfig(building.buildingType);
        
        // Use the building's configured recharge cost
        const rechargeCost = config.rechargeCost;
        return await this.transactWithValue('rechargeBuilding', [buildingId], rechargeCost);
    }

    async rechargeBuildings(buildingIds) {
        // Calculate total fee based on each building's type
        const address = await this.getAddress();
        let totalFee = 0n;
        
        for (const buildingId of buildingIds) {
            const building = await this.getBuilding(address, buildingId);
            const config = await this.getBuildingConfig(building.buildingType);
            totalFee += config.rechargeCost;
        }
        
        return await this.transactWithValue('rechargeBuildings', [buildingIds], totalFee);
    }

    async rechargeAllBuildingsAtCap() {
        const buildingsAtCap = await this.getBuildingsAtCap();
        if (buildingsAtCap.length === 0) {
            throw new Error('No buildings at cap to recharge');
        }
        
        // Calculate total fee based on each building's type
        const address = await this.getAddress();
        let totalFee = 0n;
        
        for (const buildingId of buildingsAtCap) {
            const building = await this.getBuilding(address, buildingId);
            const config = await this.getBuildingConfig(building.buildingType);
            totalFee += config.rechargeCost;
        }
        
        return await this.transactWithValue('rechargeAllBuildingsAtCap', [], totalFee);
    }

    async getContractBalance() {
        return await this.call('getContractBalance');
    }

    // Helper method to get recharge fee for a specific building type
    async getRechargeFeeForBuildingType(buildingType) {
        const config = await this.getBuildingConfig(buildingType);
        return config.rechargeCost;
    }

    // Helper method to format recharge fee for display
    formatRechargeFee(fee) {
        return ethers.formatEther(fee);
    }

    // Production Progress
    async calculateProductionProgress(buildingId) {
        const address = await this.getAddress();
        return await this.call('calculateProductionProgress', address, buildingId);
    }

    // Format upgrade cost for display
    formatUpgradeCost(cost) {
        return cost.toString();
    }

    // Building Upgrade Information
    async getBuildingUpgradeInfo(buildingId) {
        try {
            const address = await this.getAddress();
            const building = await this.getBuilding(address, buildingId);
            const config = await this.getBuildingConfig(building.buildingType);
            
            // Get max upgrade level from GameState
            const gameState = await this.getGameStateContract();
            const maxLevel = await gameState.getMaxUpgradeLevel(Number(building.buildingType));
            
            const currentLevel = Number(building.level);
            const canUpgrade = currentLevel < maxLevel && !building.damaged;
            
            // Calculate upgrade cost
            const upgradeCost = canUpgrade ? config.upgradeCost * BigInt(currentLevel + 1) : 0n;
            
            // Check if player has enough diamonds
            const playerDiamonds = await gameState.getPlayerDiamonds();
            const hasEnoughDiamonds = playerDiamonds >= upgradeCost;
            
            // Determine error message
            let errorMessage = '';
            if (!canUpgrade) {
                if (currentLevel >= 3) {
                    errorMessage = 'Building is already at maximum level';
                } else if (currentLevel >= maxLevel) {
                    errorMessage = 'Upgrade level not unlocked';
                } else if (building.damaged) {
                    errorMessage = 'Building is damaged';
                }
            } else if (!hasEnoughDiamonds) {
                errorMessage = 'Insufficient diamond balance';
            }
            
            return {
                canUpgrade: canUpgrade && hasEnoughDiamonds,
                currentLevel,
                maxLevel,
                upgradeCost,
                errorMessage,
                buildingType: Number(building.buildingType),
                damaged: building.damaged
            };
        } catch (error) {
            console.error('Error getting building upgrade info:', error);
            return {
                canUpgrade: false,
                currentLevel: 0,
                maxLevel: 1,
                upgradeCost: 0n,
                errorMessage: 'Failed to get upgrade information',
                buildingType: 0,
                damaged: false
            };
        }
    }

    // Revenue Pool Management
    async getRevenuePool() {
        return await this.call('getRevenuePool');
    }

    async getAvailableRevenuePool() {
        return await this.call('getAvailableRevenuePool');
    }

    async getReservedRevenue() {
        return await this.call('getReservedRevenue');
    }

    async calculateProjectedYieldRate(address, buildingId) {
        return await this.call('calculateProjectedYieldRate', address, buildingId);
    }

    async getProductionState(address, buildingId) {
        return await this.call('getProductionState', address, buildingId);
    }

    // Helper method to check if building is actively producing
    async isBuildingActivelyProducing(address, buildingId) {
        // Check if building is damaged first
        const isDamaged = await this.isBuildingDamaged(address, buildingId);
        if (isDamaged) return false;
        
        const productionState = await this.getProductionState(address, buildingId);
        // ProductionState enum: 0=INACTIVE, 1=ACTIVE, 2=AT_CAP
        // A building is actively producing if it's in ACTIVE state (1) and not damaged
        // Note: productionState is returned as BigInt, so we need to compare with BigInt
        return productionState === 1n;
    }

    // Helper function to get GameState contract reference
    async getGameStateContract() {
        const { GameStateContract } = await import('./GameStateContract.js');
        return new GameStateContract();
    }

    // Helper function to format upgrade cost for UI
    formatUpgradeCost(upgradeCost) {
        if (!upgradeCost || upgradeCost === 0n) return '0';
        return ethers.formatEther(upgradeCost);
    }

    // Helper function to check if building can be upgraded
    async canUpgradeBuilding(buildingId) {
        const upgradeInfo = await this.getBuildingUpgradeInfo(buildingId);
        return upgradeInfo.canUpgrade;
    }

    // Helper function to get building status for UI
    async getBuildingStatus(buildingId) {
        try {
            const address = await this.getAddress();
            const building = await this.getBuilding(address, buildingId);
            const isAtCap = await this.isBuildingAtCap(buildingId);
            
            return {
                damaged: building.damaged,
                isAtCap,
                level: Number(building.level),
                buildingType: Number(building.buildingType),
                lastCollectionTime: Number(building.lastCollectionTime),
                lastUpgradeTime: Number(building.lastUpgradeTime)
            };
        } catch (error) {
            console.error('Error getting building status:', error);
            return {
                damaged: false,
                isAtCap: false,
                level: 0,
                buildingType: 0,
                lastCollectionTime: 0,
                lastUpgradeTime: 0
            };
        }
    }

    // Get building cost for minting
    async getBuildingCost(buildingType) {
        return await this.call('getBuildingCost', buildingType);
    }
} 