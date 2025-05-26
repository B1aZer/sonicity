import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import BattleSystemABI from '../../../contracts/artifacts/contracts/BattleSystem.sol/BattleSystem.json';

export class BattleSystemContract extends BaseContract {
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
        return contract.checkSearchStatus();
    }

    async startBattle(infantry, cavalry, siege) {
        const contract = await this.getContract();
        return contract.startBattle(infantry, cavalry, siege);
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
        return contract.battleDuration();
    }

    async troopConfig(troopType) {
        const contract = await this.getContract();
        return contract.troopConfig(troopType);
    }

    async getBattleRecord(battleId) {
        const contract = await this.getContract();
        return contract.getBattleRecord(battleId);
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
} 