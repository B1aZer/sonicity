import { ethers, JsonRpcProvider, Contract } from 'ethers';
import { appState } from '../core/state.js';

export class BaseContract {
    constructor(contractAddress, abi) {
        this.contractAddress = contractAddress;
        this.abi = abi;
        this.contract = null;
        this.provider = null;
        this.signer = null;
        this.initialized = false;
    }

    async initialize() {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        this.contract = new Contract(
            this.contractAddress,
            this.abi,
            this.signer
        );

        this.initialized = true;
        return this;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    async getContract() {
        await this.ensureInitialized();
        return this.contract;
    }

    async getSigner() {
        await this.ensureInitialized();
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