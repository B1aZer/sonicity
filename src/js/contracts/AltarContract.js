import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import AltarABI from '../../../contracts/artifacts/contracts/Altar.sol/Altar.json';

export class AltarContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.ALTAR, AltarABI.abi);
    }

    async stake(tokenId) {
        return await this.transact('stake', tokenId);
    }

    async unstake(tokenId) {
        return await this.transact('unstake', tokenId);
    }

    async getStakeData(tokenId) {
        return await this.call('stakes', tokenId);
    }

    async getUserStakes() {
        const address = await this.getAddress();
        return await this.call('getUserStakes', address);
    }

    async isStaked(tokenId) {
        const stakeData = await this.getStakeData(tokenId);
        return stakeData.isActive;
    }

    async getMinStakingDuration() {
        return await this.call('minStakingDuration');
    }

    async getGameStateAddress() {
        return await this.call('gameState');
    }

    async getSonicityNFTAddress() {
        return await this.call('sonicityNFT');
    }
} 