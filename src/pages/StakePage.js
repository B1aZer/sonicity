import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_CONFIG } from '../js/utils/constants.js';
import { appState } from '../js/core/state.js';
import { checkExistingConnection, connectWallet, formatAddress } from '../js/utils/wallet.js';
import SonicityNFTABI from '../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import GameStateABI from '../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import AltarABI from '../../contracts/artifacts/contracts/Altar.sol/Altar.json';
import './../styles/stake-page.css';

export class StakePage {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'stake-page';
        this.container.innerHTML = `
            <div class="stake-container">
                <h1>Stake Your NFTs</h1>
                <div class="wallet-section">
                    <button class="connect-button">Connect Wallet</button>
                </div>
                <div class="stake-status"></div>
                <div class="owned-nfts-container">
                    <h2>Your NFTs</h2>
                    <div class="nft-list"></div>
                </div>
            </div>
        `;
        this.provider = null;
        this.signer = null;
        this.nftContract = null;
        this.gameStateContract = null;
        this.altarContract = null;
        this.nftContractAddress = CONTRACT_ADDRESSES.SONICITY_NFT;
        this.gameStateAddress = CONTRACT_ADDRESSES.GAME_STATE;
        this.altarAddress = CONTRACT_ADDRESSES.ALTAR;
        this.setupEventListeners();
        this.initializeConnection();
    }

    setupEventListeners() {
        const connectWalletBtn = this.container.querySelector('.connect-button');
        connectWalletBtn.addEventListener('click', () => this.handleConnectWallet());
    }

    async initializeConnection() {
        const { connected, address } = await checkExistingConnection();
        if (connected) {
            await this.initializeWallet(address);
        }
    }

    async handleConnectWallet() {
        const statusElement = this.container.querySelector('.stake-status');
        const connectButton = this.container.querySelector('.connect-button');
        
        try {
            statusElement.textContent = "Connecting...";
            
            const result = await connectWallet();
            if (result.success) {
                await this.initializeWallet(result.address);
                statusElement.textContent = "Connected!";
                statusElement.style.color = "green";
            } else {
                statusElement.textContent = result.error || "MetaMask not detected! Please install MetaMask.";
                statusElement.style.color = "red";
            }
        } catch (error) {
            console.error("Connection error:", error);
            statusElement.textContent = "Failed to connect: " + (error.message || "Unknown error");
            statusElement.style.color = "red";
        }
    }

    async initializeWallet(walletAddress) {
        const connectButton = this.container.querySelector('.connect-button');
        
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        // Initialize contracts
        this.nftContract = new ethers.Contract(
            this.nftContractAddress,
            SonicityNFTABI.abi,
            this.signer
        );

        this.gameStateContract = new ethers.Contract(
            this.gameStateAddress,
            GameStateABI.abi,
            this.signer
        );

        this.altarContract = new ethers.Contract(
            this.altarAddress,
            AltarABI.abi,
            this.signer
        );
        
        // Format the account display
        connectButton.textContent = formatAddress(walletAddress);

        // Load and display user's NFTs
        await this.loadUserNFTs();
    }

    async loadUserNFTs() {
        try {
            const ownedNFTsContainer = this.container.querySelector('.nft-list');
            ownedNFTsContainer.innerHTML = '<div class="loading">Loading your NFTs...</div>';

            const balance = await this.nftContract.balanceOf(this.signer.address);
            if (balance === 0n) {
                ownedNFTsContainer.innerHTML = '<div class="no-nfts">You don\'t own any NFTs yet.</div>';
                return;
            }

            let nftListHTML = '';
            for (let i = 0; i < balance; i++) {
                const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.signer.address, i);
                const tokenURI = await this.nftContract.tokenURI(tokenId);
                
                // Fetch metadata
                const response = await fetch(tokenURI);
                const metadata = await response.json();
                
                // Get game state metadata
                const gameStateMetadata = await this.gameStateContract.getNFTMetadata(tokenId);
                
                nftListHTML += `
                    <div class="nft-card">
                        <div class="nft-image">
                            <img src="${metadata.image}" alt="${metadata.name}" onerror="this.src='/images/placeholder.jpg'">
                        </div>
                        <div class="nft-info">
                            <h3>${metadata.name}</h3>
                            <p class="description">${metadata.description}</p>
                            <div class="nft-attributes">
                                <div class="attribute">
                                    <span class="label">District</span>
                                    <span class="value">${gameStateMetadata.district}</span>
                                </div>
                                <div class="attribute">
                                    <span class="label">Building Slots</span>
                                    <span class="value">${gameStateMetadata.buildingSlots}</span>
                                </div>
                            </div>
                            <button class="stake-button" onclick="window.stakeNFT(${tokenId})">Stake NFT</button>
                        </div>
                    </div>
                `;
            }

            ownedNFTsContainer.innerHTML = nftListHTML;
        } catch (error) {
            console.error("Error loading user's NFTs:", error);
            const ownedNFTsContainer = this.container.querySelector('.nft-list');
            ownedNFTsContainer.innerHTML = '<p class="error">Error loading your NFTs. Please try again.</p>';
        }
    }

    async stakeNFT(tokenId) {
        const statusElement = this.container.querySelector('.stake-status');
        
        try {
            statusElement.innerHTML = '<div class="loading">Processing staking transaction...</div>';
            
            // Get the altar contract
            const altarContract = new ethers.Contract(
                this.altarAddress,
                AltarABI.abi,
                this.signer
            );
            
            // Approve the altar to transfer the NFT
            const approveTx = await this.nftContract.approve(this.altarAddress, tokenId);
            await approveTx.wait();
            
            // Stake the NFT
            const stakeTx = await altarContract.stakeNFT(tokenId);
            await stakeTx.wait();
            
            statusElement.innerHTML = '<div class="success">NFT staked successfully!</div>';
            
            // Reload the user's NFTs to update the list
            await this.loadUserNFTs();
        } catch (error) {
            console.error("Error staking NFT:", error);
            statusElement.innerHTML = '<div class="error">Error staking NFT. Please try again.</div>';
        }
    }

    mount(container) {
        container.appendChild(this.container);
    }

    unmount() {
        this.container.remove();
    }
} 