// Network Manager - Handles network switching and validation
import { config, getCurrentNetworkConfig } from './config.js';
import Logger from './logger.js';

export class NetworkManager {
    static currentNetwork = null;
    static listeners = new Set();

    static {
        this.currentNetwork = getCurrentNetworkConfig();
    }

    // Get current network configuration
    static getCurrentNetwork() {
        return this.currentNetwork;
    }

    // Check if MetaMask is connected to the correct network
    static async checkNetwork() {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }

        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            const expectedChainId = this.currentNetwork.chainId;

            if (currentChainId !== expectedChainId) {
                Logger.warn(`Network mismatch. Expected: ${expectedChainId}, Got: ${currentChainId}`);
                return {
                    isCorrect: false,
                    current: currentChainId,
                    expected: expectedChainId,
                    network: this.currentNetwork
                };
            }

            return {
                isCorrect: true,
                current: currentChainId,
                expected: expectedChainId,
                network: this.currentNetwork
            };
        } catch (error) {
            Logger.error('Error checking network:', error);
            throw error;
        }
    }

    // Request network switch
    static async requestNetworkSwitch() {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }

        try {
            const networkConfig = this.currentNetwork;
            const chainId = '0x' + networkConfig.chainId.toString(16);

            Logger.info(`Requesting network switch to ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);

            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }],
            });

            Logger.info('Network switch successful');
            return true;
        } catch (error) {
            if (error.code === 4902) {
                // Network not added to MetaMask, try to add it
                return await this.addNetwork();
            }
            Logger.error('Network switch failed:', error);
            throw error;
        }
    }

    // Add network to MetaMask
    static async addNetwork() {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected');
        }

        try {
            const networkConfig = this.currentNetwork;
            const chainId = '0x' + networkConfig.chainId.toString(16);

            Logger.info(`Adding network ${networkConfig.name} to MetaMask`);

            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId,
                    chainName: networkConfig.name,
                    rpcUrls: [networkConfig.rpcUrl],
                    blockExplorerUrls: [networkConfig.blockExplorer],
                    nativeCurrency: {
                        name: 'SONIC',
                        symbol: 'SONIC',
                        decimals: 18
                    }
                }],
            });

            Logger.info('Network added successfully');
            return true;
        } catch (error) {
            Logger.error('Failed to add network:', error);
            throw error;
        }
    }

    // Setup network change listener
    static setupNetworkListener() {
        if (!window.ethereum) {
            return;
        }

        window.ethereum.on('chainChanged', (chainId) => {
            const newChainId = parseInt(chainId, 16);
            Logger.info(`Network changed to chain ID: ${newChainId}`);
            
            // Notify listeners
            this.notifyListeners({
                type: 'networkChanged',
                chainId: newChainId,
                isCorrect: newChainId === this.currentNetwork.chainId
            });
        });
    }

    // Add listener for network events
    static addListener(callback) {
        this.listeners.add(callback);
    }

    // Remove listener
    static removeListener(callback) {
        this.listeners.delete(callback);
    }

    // Notify all listeners
    static notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                Logger.error('Error in network listener:', error);
            }
        });
    }

    // Get network display info
    static getNetworkInfo() {
        return {
            name: this.currentNetwork.name,
            chainId: this.currentNetwork.chainId,
            rpcUrl: this.currentNetwork.rpcUrl,
            blockExplorer: this.currentNetwork.blockExplorer,
            isTestnet: this.currentNetwork.isTestnet
        };
    }

    // Validate network before contract operations
    static async validateNetwork() {
        const networkCheck = await this.checkNetwork();
        
        if (!networkCheck.isCorrect) {
            const shouldSwitch = confirm(
                `You're connected to the wrong network.\n\n` +
                `Current: Chain ID ${networkCheck.current}\n` +
                `Required: ${this.currentNetwork.name} (Chain ID ${networkCheck.expected})\n\n` +
                `Would you like to switch to the correct network?`
            );

            if (shouldSwitch) {
                await this.requestNetworkSwitch();
                return true;
            } else {
                throw new Error(`Please switch to ${this.currentNetwork.name} network`);
            }
        }

        return true;
    }
}

// Initialize network listener
NetworkManager.setupNetworkListener();
