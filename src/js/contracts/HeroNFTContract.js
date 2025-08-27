import { BaseContract } from './BaseContract.js';

export class HeroNFTContract extends BaseContract {
    // Hero class enum values
    static HERO_CLASSES = {
        WARRIOR: 0,
        STRATEGIST: 1,
        SCOUT: 2
    };

    async initialize() {
        await super.initialize('HeroNFT');
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

    async deployHero(heroId) {
        const contract = await this.getContract();
        return contract.deployHero(heroId);
    }

    async deployHeroByClass(heroClass) {
        const contract = await this.getContract();
        return contract.deployHeroByClass(heroClass);
    }

    async undeployHero(heroId) {
        const contract = await this.getContract();
        return contract.undeployHero(heroId);
    }

    async undeployHeroByClass(heroClass) {
        const contract = await this.getContract();
        return contract.undeployHeroByClass(heroClass);
    }

    async getDeployedHero(player) {
        const contract = await this.getContract();
        return contract.getDeployedHero(player);
    }

    async getDeployedHeroInfo(player) {
        const contract = await this.getContract();
        return contract.getDeployedHeroInfo(player);
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