import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import BattleSystemABI from '../../../contracts/artifacts/contracts/BattleSystem.sol/BattleSystem.json';

export class BattleSystemContract extends BaseContract {
    // Troop type enum values
    static TROOP_TYPES = {
        INFANTRY: 0,
        CAVALRY: 1,
        SIEGE: 2
    };

    // Troop type definitions
    static TROOP_DEFINITIONS = {
        INFANTRY: {
            name: 'Infantry',
            description: 'Base unit for defense and offense',
            image: '/images/barracks/infantry.png'
        },
        CAVALRY: {
            name: 'Cavalry',
            description: 'More powerful unit with chance to disable enemy grid buildings',
            image: '/images/barracks/cavalry.png'
        },
        SIEGE: {
            name: 'Siege',
            description: 'Best at damaging structures with chance to burn enemy treasury gold',
            image: '/images/barracks/siege.png'
        }
    };

    constructor() {
        super(CONTRACT_ADDRESSES.BATTLE_SYSTEM, BattleSystemABI.abi);
    }

    async startSearch() {
        const contract = await this.getContract();
        return contract.startSearch();
    }

    async findRandomOpponent() {
        const contract = await this.getContract();
        return contract.findRandomOpponent();
    }

    async checkSearchStatus() {
        const contract = await this.getContract();
        try {
            const result = await contract.checkSearchStatus();
            return {
                active: result.active,
                completed: result.completed,
                timeRemaining: result.timeRemaining,
                foundOpponent: result.foundOpponent,
                hasAttemptedFind: result.hasAttemptedFind
            };
        } catch (error) {
            console.error('Error checking search status:', error);
            return {
                active: false,
                completed: false,
                timeRemaining: 0,
                foundOpponent: '0x0000000000000000000000000000000000000000',
                hasAttemptedFind: false
            };
        }
    }

    async startBattle(infantry, cavalry, siege) {
        const contract = await this.getContract();
        return contract.startBattle(infantry, cavalry, siege);
    }

    async startBattleWithHero(infantry, cavalry, siege, heroClass) {
        const contract = await this.getContract();
        return contract.startBattleWithHero(infantry, cavalry, siege, heroClass);
    }

    async resolveBattle(attacker) {
        const contract = await this.getContract();
        return contract.resolveBattle(attacker);
    }

    async trainTroops(troopType, amount) {
        const contract = await this.getContract();
        return contract.trainTroops(troopType, amount);
    }

    async playerTroops(player, troopType) {
        const contract = await this.getContract();
        return contract.playerTroops(player, troopType);
    }

    async activeBattles(player) {
        const contract = await this.getContract();
        return contract.activeBattles(player);
    }

    async battleHistory(index) {
        const contract = await this.getContract();
        return contract.battleHistory(index);
    }

    async isRegisteredForMatchmaking(player) {
        const contract = await this.getContract();
        return contract.isRegisteredForMatchmaking(player);
    }

    async searchCost() {
        const contract = await this.getContract();
        return contract.searchCost();
    }

    async searchDuration() {
        const contract = await this.getContract();
        return contract.searchDuration();
    }

    async noOpponentFoundChance() {
        const contract = await this.getContract();
        return contract.noOpponentFoundChance();
    }

    async battleDuration() {
        const contract = await this.getContract();
        return contract.BATTLE_DURATION();
    }

    async troopConfig(troopType) {
        const contract = await this.getContract();
        return contract.troopConfigs(troopType);
    }

    async getBattleRecord(battleId) {
        const contract = await this.getContract();
        return contract.getBattleRecord(battleId);
    }

    async getPlayerBattleHistory(player) {
        const contract = await this.getContract();
        return contract.getPlayerBattleHistory(player);
    }

    async getPlayerBattleCount(player) {
        const contract = await this.getContract();
        return contract.getPlayerBattleCount(player);
    }

    async findPotentialOpponents() {
        const contract = await this.getContract();
        return contract.findPotentialOpponents();
    }

    async lastBattleTime(player) {
        const contract = await this.getContract();
        return contract.lastBattleTime(player);
    }

    async registeredPlayers(index) {
        const contract = await this.getContract();
        return contract.registeredPlayers(index);
    }

    async getTroopConfig(troopType) {
        const contract = await this.getContract();
        const config = await contract.troopConfigs(troopType);
        return {
            goldCost: config.goldCost,
            foodCost: config.foodCost,
            power: config.power,
            gridDamageChance: config.gridDamageChance,
            districtDamageChance: config.districtDamageChance,
            treasuryBurnChance: config.treasuryBurnChance
        };
    }

    async confirmOutpostWarning() {
        const contract = await this.getContract();
        return contract.confirmOutpostWarning();
    }

    async deployHeroToBattleByClass(heroClass) {
        const contract = await this.getContract();
        return contract.deployHeroToBattleByClass(heroClass);
    }

    async deployHeroToBattle(heroId) {
        const contract = await this.getContract();
        return contract.deployHeroToBattle(heroId);
    }

    async deployTroopsToGarrison(infantry, cavalry, siege) {
        const contract = await this.getContract();
        return contract.deployTroopsToGarrison(infantry, cavalry, siege);
    }

    async deployToGarrison(infantry, cavalry, siege, heroClass) {
        const contract = await this.getContract();
        return contract.deployToGarrison(infantry, cavalry, siege, heroClass);
    }

    async deployTacticsToBattle(tacticIds) {
        const contract = await this.getContract();
        return contract.deployTacticsToBattle(tacticIds);
    }

    async battleHeroTactics(player) {
        const contract = await this.getContract();
        return contract.battleHeroTactics(player);
    }
} 