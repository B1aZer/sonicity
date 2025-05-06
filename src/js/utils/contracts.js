import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './constants.js';
import Logger from './logger.js';
import { GameStateContract } from '../contracts/GameStateContract.js';
import { AltarContract } from '../contracts/AltarContract.js';
import { NFTContract } from '../contracts/NFTContract.js';

export class ContractManager {
    static async initializeContracts(signer) {
        try {
            const nftContract = new NFTContract();
            const gameStateContract = new GameStateContract();
            const altarContract = new AltarContract();

            // Initialize all contracts
            await Promise.all([
                nftContract.initialize(),
                gameStateContract.initialize(),
                altarContract.initialize()
            ]);

            const contracts = {
                nft: nftContract,
                gameState: gameStateContract,
                altar: altarContract
            };

            Logger.info('Contracts initialized successfully');
            return contracts;
        } catch (error) {
            Logger.error('Error initializing contracts:', error);
            throw error;
        }
    }

    static async getProvider() {
        if (!window.ethereum) {
            throw new Error('Please install MetaMask to use this application');
        }
        return new ethers.BrowserProvider(window.ethereum);
    }

    static async getSigner() {
        const provider = await this.getProvider();
        return await provider.getSigner();
    }
} 