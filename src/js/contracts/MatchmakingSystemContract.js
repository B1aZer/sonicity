import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import MatchmakingSystemABI from '../../../contracts/artifacts/contracts/MatchmakingSystem.sol/MatchmakingSystem.json';

export class MatchmakingSystemContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.MATCHMAKING_SYSTEM, MatchmakingSystemABI.abi);
    }

    // Matchmaking functions
    async registerForMatchmaking() {
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        return this.transact('registerForMatchmaking', address);
    }

    async unregisterFromMatchmaking() {
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        return this.transact('unregisterFromMatchmaking', address);
    }

    async startSearch() {
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        return this.transact('startSearch', address);
    }

    async findRandomOpponent() {
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        return this.transact('findRandomOpponent', address);
    }

    async checkSearchStatus() {
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        return this.contract.checkSearchStatus(address);
    }

    async getPlayerSearch(player) {
        return this.contract.playerSearches(player);
    }

    async isRegisteredForMatchmaking(player) {
        return this.contract.isRegisteredForMatchmaking(player);
    }

    async searchCost() {
        return this.contract.searchCost();
    }

    async searchDuration() {
        return this.contract.searchDuration();
    }

    async noOpponentFoundChance() {
        return this.contract.noOpponentFoundChance();
    }

    async lastBattleTime(player) {
        return this.contract.lastBattleTime(player);
    }

    async registeredPlayers(index) {
        return this.contract.registeredPlayers(index);
    }
}
