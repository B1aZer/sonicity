import { ethers } from 'ethers';
import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';

export class GameStateContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.GAME_STATE, GameStateABI.abi);
    }

    async getCityInfo(cityId) {
        try {
            const city = await this.contract.cities(cityId);
            return {
                treasury: ethers.formatEther(city.treasury), // Convert from wei to ETH
                tier: city.tier,
                peaceShield: city.peaceShield
            };
        } catch (error) {
            console.error('Error getting city info:', error);
            throw error;
        }
    }

    async joinCity(cityId) {
        return await this.transact('joinCity', cityId);
    }

    async getPlayerCity() {
        try {
            const address = await this.getAddress();
            const cityId = await this.call('playerCity', address);
            // If cityId is 0 or empty, return null to indicate no city
            return cityId && cityId !== '0x' ? Number(cityId) : null;
        } catch (error) {
            console.error('Error getting player city:', error);
            return null;
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

    // New methods for NFT collection management
    async approveCollection(collectionAddress) {
        return await this.transact('approveCollection', collectionAddress);
    }

    async removeCollection(collectionAddress) {
        return await this.transact('removeCollection', collectionAddress);
    }

    async isCollectionApproved(collectionAddress) {
        return await this.call('approvedCollections', collectionAddress);
    }

    async setNFTMetadata(tokenId, metadata) {
        return await this.transact('setNFTMetadata', tokenId, metadata);
    }

    async getNFTMetadata(tokenId) {
        return await this.call('nftMetadata', tokenId);
    }

    async verifyNFTOwnership(collectionAddress, tokenId) {
        return await this.call('verifyNFTOwnership', collectionAddress, tokenId);
    }

    async createBuilding(buildingType) {
        try {
            // Ensure building type is a string and properly formatted
            const formattedType = String(buildingType).toLowerCase();
            console.log('Creating building with type:', formattedType);
            
            // Check if the building type is valid
            const cost = await this.call('buildingCosts', formattedType);
            console.log('Building cost in gold:', cost.toString());
            
            // Check player's gold balance
            const address = await this.getAddress();
            const gold = await this.call('getPlayerGold', address);
            console.log('Player gold:', gold.toString());
            
            // Check building slots
            const slots = await this.call('getBuildingSlots', address);
            console.log('Available building slots:', slots.toString());
            
            // Check if player is in a city
            const cityId = await this.call('playerCity', address);
            console.log('Player city ID:', cityId.toString());

            // Check if player has enough gold
            if (gold < cost) {
                throw new Error(`Insufficient gold. Required: ${cost}, Available: ${gold}`);
            }

            // Check if player has available slots
            const totalBuildings = await this.call('getTotalBuildings', address);
            if (totalBuildings >= slots) {
                throw new Error(`No building slots available. Total buildings: ${totalBuildings}, Available slots: ${slots}`);
            }

            // Create the building
            console.log('Sending createBuilding transaction with type:', formattedType);
            return await this.transact('createBuilding', formattedType);
        } catch (error) {
            console.error('Error in createBuilding:', error);
            throw error;
        }
    }

    async getBuildingIds() {
        const address = await this.getAddress();
        return await this.call('getBuildingIds', address);
    }

    async getBuildingIdsOfType(buildingType) {
        const address = await this.getAddress();
        return await this.call('getBuildingIdsOfType', address, buildingType);
    }

    async getBuilding(buildingId) {
        const address = await this.getAddress();
        return await this.call('getBuilding', address, buildingId);
    }
} 