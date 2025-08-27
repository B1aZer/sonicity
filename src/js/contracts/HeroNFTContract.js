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

    // Helper methods for hero names and classes
    static getHeroName(heroClass) {
        const heroNames = {
            0: 'Iron Guardian (WARRIOR)',
            1: 'Shadow Tactician (STRATEGIST)',
            2: 'Swift Scout (SCOUT)'
        };
        return heroNames[heroClass] || `Hero Class ${heroClass}`;
    }

    static getHeroClass(heroClass) {
        const heroClasses = {
            0: 'WARRIOR',
            1: 'STRATEGIST', 
            2: 'SCOUT'
        };
        return heroClasses[heroClass] || `UNKNOWN`;
    }

    async getHeroClass(heroId) {
        const contract = await this.getContract();
        const hero = await contract.getHero(heroId);
        return hero.class;
    }

    async getHeroNameByHeroId(heroId) {
        try {
            const heroClass = await this.getHeroClass(heroId);
            return HeroNFTContract.getHeroName(heroClass);
        } catch (error) {
            console.error('Error getting hero name by ID:', error);
            return `Hero ID ${heroId}`;
        }
    }
} 