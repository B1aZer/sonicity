import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import RepNFTABI from '../../../contracts/artifacts/contracts/SonicityRep.sol/SonicityRep.json';

export class RepNFTContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.SONICITY_REP, RepNFTABI.abi);
    }

    async mint(numTokens) {
        return await this.transact('mint', numTokens);
    }

    async mintForAltar(to, tokenId) {
        return await this.transact('mintForAltar', to, tokenId);
    }

    async balanceOf(owner) {
        return await this.call('balanceOf', owner);
    }

    async ownerOf(tokenId) {
        return await this.call('ownerOf', tokenId);
    }

    async tokenOfOwnerByIndex(owner, index) {
        return await this.call('tokenOfOwnerByIndex', owner, index);
    }

    async tokenURI(tokenId) {
        return await this.call('tokenURI', tokenId);
    }

    async totalSupply() {
        return await this.call('totalSupply');
    }

    async approve(to, tokenId) {
        return await this.transact('approve', to, tokenId);
    }

    async setAltarContract(altarContract) {
        return await this.transact('setAltarContract', altarContract);
    }

    async getAltarContract() {
        return await this.call('altarContract');
    }
} 