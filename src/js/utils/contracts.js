import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './constants.js';
import SonicityNFTABI from '../../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import GameStateABI from '../../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import AltarABI from '../../../contracts/artifacts/contracts/Altar.sol/Altar.json';
import Logger from './logger.js';

export class ContractManager {
    static async initializeContracts(signer) {
        try {
            const contracts = {
                nft: new ethers.Contract(
                    CONTRACT_ADDRESSES.SONICITY_NFT,
                    SonicityNFTABI.abi,
                    signer
                ),
                gameState: new ethers.Contract(
                    CONTRACT_ADDRESSES.GAME_STATE,
                    GameStateABI.abi,
                    signer
                ),
                altar: new ethers.Contract(
                    CONTRACT_ADDRESSES.ALTAR,
                    AltarABI.abi,
                    signer
                )
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