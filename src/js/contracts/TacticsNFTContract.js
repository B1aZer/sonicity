import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import TacticsNFTABI from '../../../contracts/artifacts/contracts/TacticsNFT.sol/TacticsNFT.json';

export class TacticsNFTContract extends BaseContract {
    // Tactic types enum values
    static TACTIC_TYPES = {
        STRIKE: 0,
        SHIELD: 1,
        TRICK: 2
    };

    constructor() {
        super(CONTRACT_ADDRESSES.TACTICS_NFT, TacticsNFTABI.abi);
    }

    async initialize() {
        await super.initialize();
    }

    async mintTactic(tacticId) {
        const contract = await this.getContract();
        return contract.mintTactic(tacticId);
    }

    async hasTactic(player, tacticId) {
        const contract = await this.getContract();
        return contract.hasTactic(player, tacticId);
    }

    async getTactic(tacticId) {
        const contract = await this.getContract();
        return contract.getTactic(tacticId);
    }

    async getTacticCost(tacticId) {
        const contract = await this.getContract();
        return contract.getTacticCost(tacticId);
    }

    async getPlayerTacticCount(player) {
        const contract = await this.getContract();
        return contract.getPlayerTacticCount(player);
    }

    async getPlayerTactics(player) {
        const contract = await this.getContract();
        return contract.getPlayerTactics(player);
    }

    async getTacticsByType(tacticType) {
        const contract = await this.getContract();
        return contract.getTacticsByType(tacticType);
    }

    async validateTacticsForBattle(player, tacticIds) {
        const contract = await this.getContract();
        return contract.validateTacticsForBattle(player, tacticIds);
    }
} 