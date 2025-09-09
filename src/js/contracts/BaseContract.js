import { ethers, JsonRpcProvider, Contract } from 'ethers';

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

    async getContractAddress() {
        await this.ensureInitialized();
        return this.contractAddress;
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
            
            // Send the transaction
            const tx = await contract[method](...args);
            console.log(`Transaction sent:`, tx.hash);
            
            // Wait for transaction to be mined
            const receipt = await tx.wait();
            console.log(`Transaction mined:`, receipt);
            return receipt;
        } catch (error) {
            console.error(`Error in transaction ${method}:`, error);
            
            // Try to get more details about the error
            if (error.data) {
                console.error('Error data:', error.data);
            }
            if (error.reason) {
                console.error('Error reason:', error.reason);
            }
            
            // Let the ContractErrorHandler process the error instead of intercepting it
            throw error;
        }
    }

    // Helper method to handle contract transactions with value (e.g., for payable functions)
    async transactWithValue(method, args, value) {
        const contract = await this.getContract();
        try {
            console.log(`Attempting to call ${method} with args:`, args, 'and value:', value);
            const tx = await contract[method](...args, { value });
            console.log(`Transaction sent:`, tx.hash);
            const receipt = await tx.wait();
            console.log(`Transaction mined:`, receipt);
            return receipt;
        } catch (error) {
            console.error(`Error in transaction ${method}:`, error);
            throw error;
        }
    }
} 