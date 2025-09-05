import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import cosmeticItemsABI from '../../../contracts/artifacts/contracts/CosmeticItems.sol/CosmeticItems.json' assert { type: 'json' };

export class CosmeticItemsContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.COSMETIC_ITEMS, cosmeticItemsABI.abi);
    }

    // Purchase a cosmetic item
    async purchaseCosmetic(cosmeticId, options = {}) {
        return this.transact('purchaseCosmetic', cosmeticId, options);
    }

    // Check if player owns a cosmetic
    async ownsCosmetic(player, cosmeticId) {
        return this.contract.ownsCosmetic(player, cosmeticId);
    }

    // Get cosmetic configuration
    async getCosmeticConfig(cosmeticId) {
        return this.contract.getCosmeticConfig(cosmeticId);
    }

    // Get all owned cosmetics for a player
    async getOwnedCosmetics(player, maxId = 50) {
        return this.contract.getOwnedCosmetics(player, maxId);
    }

    // Get all available cosmetics
    async getAvailableCosmetics(maxId = 50) {
        return this.contract.getAvailableCosmetics(maxId);
    }

    // Owner functions (if needed)
    async setCosmeticConfig(cosmeticId, name, cost, resourceType, enabled, description = "", modelPath = "", cosmeticType = 0, options = {}) {
        return this.transact('setCosmeticConfig', cosmeticId, name, cost, resourceType, enabled, description, modelPath, cosmeticType, options);
    }

    async setCosmeticEnabled(cosmeticId, enabled, options = {}) {
        return this.transact('setCosmeticEnabled', cosmeticId, enabled, options);
    }

    async setCosmeticPrice(cosmeticId, newPrice, options = {}) {
        return this.transact('setCosmeticPrice', cosmeticId, newPrice, options);
    }
} 