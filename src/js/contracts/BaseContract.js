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
            console.log(`Attempting to call ${method} with args:`, args);
            
            // First try to call the method to see if it would succeed
            try {
                const result = await contract[method](...args);
                console.log(`Call to ${method} succeeded with result:`, result);
            } catch (callError) {
                console.error(`Call to ${method} failed:`, callError);
            }

            // Then try to estimate gas
            try {
                const gasEstimate = await contract[method].estimateGas(...args);
                console.log(`Gas estimate for ${method}:`, gasEstimate);
                
                // Then send the transaction with the gas estimate
                // Add 20% buffer to gas estimate
                const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
                
                const tx = await contract[method](...args, {
                    gasLimit: gasLimit
                });
                console.log(`Transaction sent:`, tx.hash);
                
                // Wait for transaction to be mined
                const receipt = await tx.wait();
                console.log(`Transaction mined:`, receipt);
                return receipt;
            } catch (gasError) {
                console.error(`Gas estimation failed for ${method}:`, gasError);
                // Try to get more details about the error
                if (gasError.data) {
                    console.error('Error data:', gasError.data);
                }
                if (gasError.reason) {
                    console.error('Error reason:', gasError.reason);
                }
                throw gasError;
            }
        } catch (error) {
            console.error(`Error in transaction ${method}:`, error);
            // Try to get more details about the error
            if (error.data) {
                console.error('Error data:', error.data);
            }
            if (error.reason) {
                console.error('Error reason:', error.reason);
            }
            throw error;
        }
    }
} 