import { BaseContract } from './BaseContract';
import { CONTRACT_NAMES } from '../constants';

export class BattleSystemContract extends BaseContract {
    constructor(web3, address) {
        super(web3, CONTRACT_NAMES.BATTLE_SYSTEM, address);
    }

    async startSearch() {
        return this.contract.methods.startSearch().send({ from: this.web3.eth.defaultAccount });
    }

    async findRandomOpponent() {
        return this.contract.methods.findRandomOpponent().send({ from: this.web3.eth.defaultAccount });
    }

    async checkSearchStatus() {
        return this.contract.methods.checkSearchStatus().call({ from: this.web3.eth.defaultAccount });
    }

    async startBattle(infantry, cavalry, siege) {
        return this.contract.methods.startBattle(infantry, cavalry, siege).send({ from: this.web3.eth.defaultAccount });
    }

    async resolveBattle(attacker) {
        return this.contract.methods.resolveBattle(attacker).send({ from: this.web3.eth.defaultAccount });
    }

    async trainTroops(troopType, amount) {
        return this.contract.methods.trainTroops(troopType, amount).send({ from: this.web3.eth.defaultAccount });
    }

    async playerTroops(player, troopType) {
        return this.contract.methods.playerTroops(player, troopType).call();
    }

    async activeBattles(player) {
        return this.contract.methods.activeBattles(player).call();
    }

    async battleHistory(index) {
        return this.contract.methods.battleHistory(index).call();
    }

    async isRegisteredForMatchmaking(player) {
        return this.contract.methods.isRegisteredForMatchmaking(player).call();
    }

    async searchCost() {
        return this.contract.methods.searchCost().call();
    }

    async searchDuration() {
        return this.contract.methods.searchDuration().call();
    }

    async noOpponentFoundChance() {
        return this.contract.methods.noOpponentFoundChance().call();
    }

    async battleDuration() {
        return this.contract.methods.battleDuration().call();
    }

    async troopConfig(troopType) {
        return this.contract.methods.troopConfig(troopType).call();
    }
} 