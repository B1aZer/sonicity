import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import SonicityNFTABI from '../../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';

export class NFTContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.SONICITY_NFT, SonicityNFTABI.abi);
    }

    async balanceOf(address) {
        return await this.call('balanceOf', address);
    }

    async tokenOfOwnerByIndex(owner, index) {
        return await this.call('tokenOfOwnerByIndex', owner, index);
    }

    async tokenURI(tokenId) {
        return await this.call('tokenURI', tokenId);
    }

    async mint(amount, options) {
        return await this.transact('mint', amount, options);
    }

    async totalSupply() {
        return await this.call('totalSupply');
    }

    async approve(to, tokenId) {
        return await this.transact('approve', to, tokenId);
    }

    async ownerOf(tokenId) {
        return await this.call('ownerOf', tokenId);
    }
} 