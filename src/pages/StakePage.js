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
                const gameStateMetadata = await this.gameStateContract.getNFTMetadata(this.nftContractAddress, tokenId);
                
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
                            <button class="stake-button" data-token-id="${tokenId}">Stake NFT</button>
                        </div>
                    </div>
                `;
            }

            ownedNFTsContainer.innerHTML = nftListHTML;

            // Add event listeners to all stake buttons
            const stakeButtons = ownedNFTsContainer.querySelectorAll('.stake-button');
            stakeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tokenId = button.dataset.tokenId;
                    this.stakeNFT(tokenId);
                });
            });
        } catch (error) {
            console.error("Error loading user's NFTs:", error);
            const ownedNFTsContainer = this.container.querySelector('.nft-list');
            ownedNFTsContainer.innerHTML = '<p class="error">Error loading your NFTs. Please try again.</p>';
        }
    }

    async stakeNFT(tokenId) {
        const statusElement = this.container.querySelector('.stake-status');
        
        try {
            // Check if user has joined a city
            const playerCity = await this.gameStateContract.playerCity(await this.signer.getAddress());
            if (playerCity === 0n) {
                throw new Error("You must join a city before staking NFTs");
            }
            
            // Check if NFT collection is approved
            const isApproved = await this.gameStateContract.approvedCollections(this.nftContractAddress);
            if (!isApproved) {
                throw new Error("This NFT collection is not approved for staking");
            }
            
            // Check if NFT is already staked
            try {
                const stakeData = await this.altarContract.getStakeData(tokenId);
                if (stakeData.isActive) {
                    throw new Error("This NFT is already staked");
                }
            } catch (error) {
                // Continue if the error is just that the NFT isn't staked yet
            }
            
            // Check if NFT is already approved
            try {
                const currentApproval = await this.nftContract.getApproved(tokenId);
                const needsApproval = currentApproval !== this.altarAddress;
                
                if (needsApproval) {
                    // Step 1: Approve NFT transfer
                    statusElement.innerHTML = `
                        <div class="loading">
                            <div class="step">Step 1/2: Approving NFT transfer...</div>
                            <div class="description">This allows the Altar contract to receive your NFT</div>
                        </div>
                    `;
                    const approveTx = await this.nftContract.approve(this.altarAddress, tokenId);
                    await approveTx.wait();
                } else {
                    statusElement.innerHTML = `
                        <div class="loading">
                            <div class="step">Step 1/2: Already Approved</div>
                            <div class="description">Your NFT is already approved for staking</div>
                        </div>
                    `;
                }
            } catch (error) {
                throw new Error(`Error checking NFT approval: ${error.message}`);
            }
            
            // Step 2: Stake NFT
            try {
                statusElement.innerHTML = `
                    <div class="loading">
                        <div class="step">Step 2/2: Staking NFT...</div>
                        <div class="description">Your NFT is being staked in the Altar contract</div>
                    </div>
                `;
                
                // Get NFT metadata to check building slots
                const metadata = await this.gameStateContract.getNFTMetadata(this.nftContractAddress, tokenId);
                if (metadata.buildingSlots === 0) {
                    throw new Error("NFT must have at least 1 building slot");
                }
                
                const stakeTx = await this.altarContract.stake(tokenId);
                await stakeTx.wait();
                
                // Success message
                statusElement.innerHTML = `
                    <div class="success">
                        <div class="title">NFT Staked Successfully!</div>
                        <div class="description">Your NFT is now staked and you've received building slots</div>
                    </div>
                `;
                
                // Reload the user's NFTs to update the list
                await this.loadUserNFTs();
            } catch (error) {
                throw new Error(`Error staking NFT: ${error.message}`);
            }
        } catch (error) {
            statusElement.innerHTML = `
                <div class="error">
                    <div class="title">Error Staking NFT</div>
                    <div class="description">${error.message || "Unknown error"}</div>
                </div>
            `;
        }
    }

    mount(container) {
        container.appendChild(this.container);
    }

    unmount() {
        this.container.remove();
    }
} 