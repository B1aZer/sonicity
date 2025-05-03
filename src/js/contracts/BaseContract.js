import { ethers } from 'ethers';
import { appState } from '../core/state.js';

export class BaseContract {
    constructor(contractAddress, abi) {
        this.contractAddress = contractAddress;
        this.abi = abi;
        this.contract = null;
        this.provider = null;
        this.signer = null;
    }

    async initialize() {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }

        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        this.contract = new ethers.Contract(
            this.contractAddress,
            this.abi,
            this.signer
        );

        return this;
    }

    async getContract() {
        if (!this.contract) {
            await this.initialize();
        }
        return this.contract;
    }

    async getSigner() {
        if (!this.signer) {
            await this.initialize();
        }
        return this.signer;
    }

    async getAddress() {
        const signer = await this.getSigner();
        return await signer.getAddress();
    }

    // Helper method to handle contract calls
    async call(method, ...args) {
        const contract = await this.getContract();
        try {
            return await contract[method](...args);
        } catch (error) {
            console.error(`Error calling ${method}:`, error);
            throw error;
        }
    }

    // Helper method to handle contract transactions
    async transact(method, ...args) {
        const contract = await this.getContract();
        try {
            const tx = await contract[method](...args);
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            console.error(`Error in transaction ${method}:`, error);
            throw error;
        }
    }
} 