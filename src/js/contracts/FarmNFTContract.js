import { BaseContract } from './BaseContract.js';
import { CONTRACT_ADDRESSES } from '../utils/constants.js';
import SonicityFarmABI from '../../../contracts/artifacts/contracts/SonicityFarm.sol/SonicityFarm.json';

export class FarmNFTContract extends BaseContract {
    constructor() {
        super(CONTRACT_ADDRESSES.SONICITY_FARM, SonicityFarmABI.abi);
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

    async burn(tokenId) {
        return await this.transact('burn', tokenId);
    }

    async getOwnedNFTs(userAddress) {
        const balance = await this.balanceOf(userAddress);
        const ownedNFTs = [];
        
        if (balance > 0n) {
            for (let i = 0; i < balance; i++) {
                const tokenId = await this.tokenOfOwnerByIndex(userAddress, i);
                const tokenURI = await this.tokenURI(tokenId);
                
                // Fetch and parse metadata JSON
                const response = await fetch(tokenURI);
                const metadata = await response.json();

                ownedNFTs.push({
                    tokenId,
                    contractAddress: await this.getContractAddress(),
                    tokenURI,
                    metadata
                });
            }
        }
        
        return ownedNFTs;
    }
} 