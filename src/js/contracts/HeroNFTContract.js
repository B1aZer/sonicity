import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import HeroNFTABI from '../../../contracts/artifacts/contracts/HeroNFT.sol/HeroNFT.json';

export class HeroNFTContract extends BaseContract {
    // Hero class enum values
    static HERO_CLASSES = {
        WARRIOR: 0,
        STRATEGIST: 1,
        SCOUT: 2
    };

    constructor() {
        super(CONTRACT_ADDRESSES.HERO_NFT, HeroNFTABI.abi);
    }

    async initialize() {
        await super.initialize();
    }

    async mintHero(heroClass) {
        const contract = await this.getContract();
        return contract.mintHero(heroClass);
    }

    async hasHero(player, heroClass) {
        const contract = await this.getContract();
        return contract.hasHero(player, heroClass);
    }

    async getHeroIdByClass(player, heroClass) {
        const contract = await this.getContract();
        return contract.getHeroIdByClass(player, heroClass);
    }

    async getHero(heroId) {
        const contract = await this.getContract();
        return contract.getHero(heroId);
    }



    async getPlayerHeroCount(player) {
        const contract = await this.getContract();
        return contract.getPlayerHeroCount(player);
    }

    async getHeroCost(heroClass) {
        const contract = await this.getContract();
        return contract.getHeroCost(heroClass);
    }

    async getHeroTemplate(heroClass) {
        const contract = await this.getContract();
        return contract.getHeroTemplate(heroClass);
    }

    async calculateHeroBonus(heroId, infantryCount, cavalryCount, siegeCount) {
        const contract = await this.getContract();
        return contract.calculateHeroBonus(heroId, infantryCount, cavalryCount, siegeCount);
    }
} 