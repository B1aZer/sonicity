import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_CONFIG } from '../js/utils/constants.js';
import { appState } from '../js/core/state.js';
import { checkExistingConnection, connectWallet, formatAddress } from '../js/utils/wallet.js';
import { Toast } from '../js/utils/toast.js';
import Logger from '../js/utils/logger.js';
import { NFTCard } from '../components/NFTCard.js';
import { BasePage } from '../js/core/BasePage.js';
import SonicityNFTABI from '../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import GameStateABI from '../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import AltarABI from '../../contracts/artifacts/contracts/Altar.sol/Altar.json';
import './../styles/stake-page.css';
import './../styles/nft-collection.css';

export class StakePage extends BasePage {
    constructor() {
        super();
        this.container = document.createElement('div');
        this.container.className = 'stake-page';
        this.container.innerHTML = `
            <div class="stake-container">
                <h1>Stake Your NFTs</h1>
                <p class="stake-description">
                    Stake your NFTs to earn rewards and participate in the Sonicity ecosystem.
                </p>
                <div class="wallet-section">
                    <button class="connect-button">Connect Wallet</button>
                </div>
                <div class="nft-sections">
                    <div class="nft-section">
                        <h2>Your NFTs</h2>
                        <div class="nft-list"></div>
                    </div>
                    <div class="nft-section">
                        <h2>Staked NFTs</h2>
                        <div class="staked-nft-list"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize NFT card components
        this.unstakedCard = new NFTCard({
            showStakeButton: true,
            onStake: (tokenId) => this.stakeNFT(tokenId)
        });
        
        this.stakedCard = new NFTCard({
            showUnstakeButton: true,
            onUnstake: (tokenId) => this.unstakeNFT(tokenId)
        });
        
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

    showStatus(message, type = 'info') {
        // Remove any existing status
        const existingStatus = this.container.querySelector('.stake-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Create new status element
        const statusDiv = document.createElement('div');
        statusDiv.className = `stake-status ${type}`;
        statusDiv.innerHTML = message;

        // Insert after wallet section
        const walletSection = this.container.querySelector('.wallet-section');
        walletSection.after(statusDiv);
    }

    async handleConnectWallet() {
        try {
            this.showStatus(`
                <div class="loading">
                    <div class="step">Connecting...</div>
                </div>
            `, 'loading');
            
            const result = await connectWallet();
            if (result.success) {
                await this.initializeWallet(result.address);
                this.showStatus(`
                    <div class="success">
                        <div class="title">Connected!</div>
                    </div>
                `, 'success');
            } else {
                this.showStatus(`
                    <div class="error">
                        <div class="title">Connection Failed</div>
                        <div class="description">${result.error || "MetaMask not detected! Please install MetaMask."}</div>
                    </div>
                `, 'error');
            }
        } catch (error) {
            console.error("Connection error:", error);
            this.showStatus(`
                <div class="error">
                    <div class="title">Connection Error</div>
                    <div class="description">${error.message || "Unknown error"}</div>
                </div>
            `, 'error');
        }
    }

    async initializeWallet(walletAddress) {
        const connectButton = this.container.querySelector('.connect-button');
        
        // Initialize contracts using BasePage's method
        await this.initialize();
        
        // Format the account display
        connectButton.textContent = formatAddress(walletAddress);

        // Load and display user's NFTs
        await this.loadUserNFTs();
    }

    updateWalletStatus(address) {
        const connectButton = this.container.querySelector('.connect-button');
        connectButton.textContent = formatAddress(address);
    }

    async loadUserNFTs() {
        try {
            const ownedNFTsContainer = this.container.querySelector('.nft-list');
            const stakedNFTsContainer = this.container.querySelector('.staked-nft-list');
            
            // Clear containers first
            ownedNFTsContainer.innerHTML = '';
            stakedNFTsContainer.innerHTML = '';
            
            // Show loading messages
            const ownedLoading = document.createElement('div');
            ownedLoading.className = 'loading';
            ownedLoading.textContent = 'Loading your NFTs...';
            ownedNFTsContainer.appendChild(ownedLoading);

            const stakedLoading = document.createElement('div');
            stakedLoading.className = 'loading';
            stakedLoading.textContent = 'Loading staked NFTs...';
            stakedNFTsContainer.appendChild(stakedLoading);

            // Get all staked NFTs first
            const userAddress = await this.contracts.nft.getAddress();
            const stakedTokenIds = await this.contracts.altar.getUserStakes(userAddress);
            const stakedSet = new Set(stakedTokenIds.map(id => id.toString()));

            // Clear loading messages
            ownedNFTsContainer.innerHTML = '';
            stakedNFTsContainer.innerHTML = '';

            // Load staked NFTs
            for (const tokenId of stakedTokenIds) {
                const tokenURI = await this.contracts.nft.tokenURI(tokenId);
                const response = await fetch(tokenURI);
                const metadata = await response.json();
                const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(this.contracts.nft.getContractAddress(), tokenId);
                
                const nft = {
                    tokenId,
                    contractAddress: this.contracts.nft.getContractAddress(),
                    tokenURI,
                    metadata,
                    gameStateMetadata
                };

                const cardWrapper = document.createElement('div');
                cardWrapper.innerHTML = this.stakedCard.render(nft);
                const cardElement = cardWrapper.firstElementChild;
                stakedNFTsContainer.appendChild(cardElement);
                this.stakedCard.attachEventListeners(cardElement);
            }

            // Get all owned NFTs that are not staked
            const balance = await this.contracts.nft.balanceOf(userAddress);

            if (balance > 0n) {
                for (let i = 0; i < balance; i++) {
                    const tokenId = await this.contracts.nft.tokenOfOwnerByIndex(userAddress, i);
                    if (stakedSet.has(tokenId.toString())) {
                        continue;
                    }
                    
                    const tokenURI = await this.contracts.nft.tokenURI(tokenId);
                    const response = await fetch(tokenURI);
                    const metadata = await response.json();
                    const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(this.contracts.nft.getContractAddress(), tokenId);
                    
                    const nft = {
                        tokenId,
                        contractAddress: this.contracts.nft.getContractAddress(),
                        tokenURI,
                        metadata,
                        gameStateMetadata
                    };

                    const cardWrapper = document.createElement('div');
                    cardWrapper.innerHTML = this.unstakedCard.render(nft);
                    const cardElement = cardWrapper.firstElementChild;
                    ownedNFTsContainer.appendChild(cardElement);
                    this.unstakedCard.attachEventListeners(cardElement);
                }
            }

            if (ownedNFTsContainer.children.length === 0) {
                ownedNFTsContainer.innerHTML = '<div class="no-nfts">You don\'t have any unstaked NFTs.</div>';
            }
            if (stakedNFTsContainer.children.length === 0) {
                stakedNFTsContainer.innerHTML = '<div class="no-nfts">You don\'t have any staked NFTs.</div>';
            }
        } catch (error) {
            Logger.error("Error loading user's NFTs:", error);
            const ownedNFTsContainer = this.container.querySelector('.nft-list');
            const stakedNFTsContainer = this.container.querySelector('.staked-nft-list');
            ownedNFTsContainer.innerHTML = '<p class="error">Error loading your NFTs. Please try again.</p>';
            stakedNFTsContainer.innerHTML = '<p class="error">Error loading staked NFTs. Please try again.</p>';
        }
    }

    async stakeNFT(tokenId) {
        try {
            // Check if user has joined a city
            const playerCity = await this.contracts.gameState.playerCity(await this.contracts.nft.getAddress());
            if (playerCity === 0n) {
                throw new Error("You must join a city before staking NFTs");
            }
            
            // Check if NFT collection is approved
            const isApproved = await this.contracts.gameState.approvedCollections(this.contracts.nft.getContractAddress());
            if (!isApproved) {
                throw new Error("This NFT collection is not approved for staking");
            }
            
            // Check if NFT is already staked
            try {
                const stakeData = await this.contracts.altar.getStakeData(tokenId);
                if (stakeData.isActive) {
                    throw new Error("This NFT is already staked");
                }
            } catch (error) {
                // Continue if the error is just that the NFT isn't staked yet
            }
            
            // Check if NFT is already approved
            try {
                const currentApproval = await this.contracts.nft.getApproved(tokenId);
                const needsApproval = currentApproval !== this.contracts.altar.getContractAddress();
                
                if (needsApproval) {
                    // Step 1: Approve NFT transfer
                    this.showStatus(`
                        <div class="loading">
                            <div class="step">Step 1/2: Approving NFT transfer...</div>
                            <div class="description">This allows the Altar contract to receive your NFT</div>
                        </div>
                    `, 'loading');
                    const approveTx = await this.contracts.nft.approve(this.contracts.altar.getContractAddress(), tokenId);
                    await approveTx.wait();
                } else {
                    this.showStatus(`
                        <div class="loading">
                            <div class="step">Step 1/2: Already Approved</div>
                            <div class="description">Your NFT is already approved for staking</div>
                        </div>
                    `, 'loading');
                }
            } catch (error) {
                throw new Error(`Error checking NFT approval: ${error.message}`);
            }
            
            // Step 2: Stake NFT
            try {
                this.showStatus(`
                    <div class="loading">
                        <div class="step">Step 2/2: Staking NFT...</div>
                        <div class="description">Your NFT is being staked in the Altar contract</div>
                    </div>
                `, 'loading');
                
                // Get NFT metadata to check building slots
                const metadata = await this.contracts.gameState.getNFTMetadata(this.contracts.nft.getContractAddress(), tokenId);
                if (metadata.buildingSlots === 0) {
                    throw new Error("NFT must have at least 1 building slot");
                }
                
                const stakeTx = await this.contracts.altar.stake(tokenId);
                await stakeTx.wait();
                
                // Success message
                this.showStatus(`
                    <div class="success">
                        <div class="title">NFT Staked Successfully!</div>
                        <div class="description">Your NFT is now staked and you've received building slots</div>
                    </div>
                `, 'success');
                
                // Reload the user's NFTs to update the list
                await this.loadUserNFTs();
            } catch (error) {
                throw new Error(`Error staking NFT: ${error.message}`);
            }
        } catch (error) {
            this.showStatus(`
                <div class="error">
                    <div class="title">Error Staking NFT</div>
                    <div class="description">${error.message || "Unknown error"}</div>
                </div>
            `, 'error');
        }
    }

    async unstakeNFT(tokenId) {
        try {
            // Check if user has joined a city
            const playerCity = await this.gameStateContract.playerCity(await this.nftContract.getAddress());
            if (playerCity === 0n) {
                Toast.error("You must join a city before unstaking NFTs");
                return;
            }
            
            // Check if NFT is actually staked
            let stakeData;
            try {
                stakeData = await this.altarContract.getStakeData(tokenId);
                Logger.debug("Stake data:", stakeData);
                
                if (!stakeData.isActive) {
                    Toast.error("This NFT is not staked");
                    return;
                }
                
                // Check if caller is the staker
                const userAddress = await this.nftContract.getAddress();
                if (stakeData.owner.toLowerCase() !== userAddress.toLowerCase()) {
                    Toast.error("You are not the staker of this NFT");
                    return;
                }
            } catch (error) {
                Logger.error("Error getting stake data:", error);
                Toast.error("Failed to get stake data. The NFT may not be staked.");
                return;
            }
            
            // Check if minimum staking period has passed
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const minimumStakeTime = stakeData.stakedAt + BigInt(7 * 24 * 60 * 60); // 7 days
            Logger.debug("Current time:", currentTime);
            Logger.debug("Minimum stake time:", minimumStakeTime);
            
            if (currentTime < minimumStakeTime) {
                const remainingTime = minimumStakeTime - currentTime;
                const remainingDays = Math.ceil(Number(remainingTime) / (24 * 60 * 60));
                Toast.warning(`You need to wait ${remainingDays} more days before you can unstake this NFT. The minimum staking period is 7 days.`);
                return;
            }
            
            // Check if NFT has building slots
            const metadata = await this.gameStateContract.getNFTMetadata(this.nftContract.getContractAddress(), tokenId);
            Logger.debug("NFT metadata:", metadata);
            
            if (metadata.buildingSlots === 0) {
                Toast.error("NFT must have at least 1 building slot");
                return;
            }
            
            // Unstake NFT
            Toast.warning("Unstaking NFT... Your NFT is being returned to your wallet");
            
            try {
                Logger.debug("Attempting to unstake NFT:", tokenId);
                const unstakeTx = await this.altarContract.unstake(tokenId);
                Logger.debug("Unstake transaction sent:", unstakeTx.hash);
                
                await unstakeTx.wait();
                Logger.debug("Unstake transaction confirmed");
                
                Toast.success("NFT Unstaked Successfully! Your NFT has been returned to your wallet");
                
                // Reload the user's NFTs to update the list
                await this.loadUserNFTs();
            } catch (txError) {
                Logger.error("Transaction error:", txError);
                if (txError.code === 'CALL_EXCEPTION') {
                    Toast.error("Contract call failed. Please check if the NFT is properly staked.");
                } else if (txError.code === 'INSUFFICIENT_FUNDS') {
                    Toast.error("Insufficient funds for gas. Please add more ETH to your wallet.");
                } else {
                    Toast.error(`Failed to execute unstake transaction: ${txError.message}`);
                }
            }
        } catch (error) {
            Logger.error("Error unstaking NFT:", error);
            Toast.error(error.message || "Unknown error occurred while unstaking NFT");
        }
    }

    mount(container) {
        container.appendChild(this.container);
    }

    unmount() {
        this.container.remove();
    }
} 