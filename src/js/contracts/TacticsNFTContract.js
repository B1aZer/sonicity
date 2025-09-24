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

    // Helper methods for tactic names and types
    static getTacticName(tacticId) {
        const tacticNames = {
            1: 'Iron Strike',
            2: 'Guardian Wall', 
            3: 'Battle Rage',
            4: 'Cavalry Rush',
            5: 'Defensive Circle',
            6: 'Tactical Feint',
            7: 'Swift Strike',
            8: 'Shadow Guard',
            9: 'Stealth Trap'
        };
        return tacticNames[tacticId] || `Tactic ${tacticId}`;
    }

    static getTacticType(tacticId) {
        const tacticTypes = {
            1: 'STRIKE', 2: 'SHIELD', 3: 'TRICK',
            4: 'STRIKE', 5: 'SHIELD', 6: 'TRICK',
            7: 'STRIKE', 8: 'SHIELD', 9: 'TRICK'
        };
        return tacticTypes[tacticId] || 'UNKNOWN';
    }

    static getTacticImageName(tacticId) {
        const tacticName = this.getTacticName(tacticId);
        // Convert tactic name to image filename format
        const imageName = tacticName.replace(/\s+/g, '') + '.png';
        return imageName;
    }

    static getTacticEffect(tacticId) {
        const tacticEffects = {
            1: '+15 Infantry Power',
            2: '+15 Defense Power', 
            3: '+10% Critical Chance',
            4: '+15 Cavalry Power',
            5: '+15 Defense Power',
            6: '+10% Evasion',
            7: '+15 Siege Power',
            8: '+15 Defense Power',
            9: '+10% Stealth'
        };
        return tacticEffects[tacticId] || 'Unknown Effect';
    }

    static getTacticDescription(tacticId) {
        const tacticDescriptions = {
            1: 'Devastating attack that damages +3 buildings. Perfect for aggressive players who want to maximize destruction.',
            2: 'Defensive formation that reduces troop losses by 75%. Essential for protecting your army during battles.',
            3: 'Inspires your troops to earn +100% more REP points from battles. Great for players focused on reputation building.',
            4: 'Swift cavalry attack that damages +2 buildings. Ideal for players who prefer fast, mobile warfare.',
            5: 'Tactical formation that reduces troop losses by 50%. Balanced defense for various battle scenarios.',
            6: 'Deceptive maneuver that earns +75% more REP points from battles. Subtle but effective reputation building.',
            7: 'Quick attack that damages +1 building. Light but reliable damage for consistent results.',
            8: 'Stealthy defense that reduces troop losses by 25%. Minimal but effective protection.',
            9: 'Hidden trap that earns +50% more REP points from battles. Subtle reputation gains for careful players.'
        };
        return tacticDescriptions[tacticId] || 'A powerful tactical ability.';
    }

    static getTacticTitle(tacticId) {
        const tacticName = this.getTacticName(tacticId);
        const tacticType = this.getTacticType(tacticId);
        return `${tacticName} (${tacticType})`;
    }
} 