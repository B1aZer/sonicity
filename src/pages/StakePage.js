import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CONTRACT_CONFIG } from '../js/utils/constants.js';
import { appState } from '../js/core/state.js';
import { checkExistingConnection, connectWallet, formatAddress } from '../js/utils/wallet.js';
import { Toast } from '../js/utils/toast.js';
import Logger from '../js/utils/logger.js';
import { NFTCard } from '../components/NFTCard.js';
import SonicityNFTABI from '../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import GameStateABI from '../../contracts/artifacts/contracts/GameState.sol/GameState.json';
import AltarABI from '../../contracts/artifacts/contracts/Altar.sol/Altar.json';
import './../styles/stake-page.css';
import './../styles/nft-collection.css';

export class StakePage {
    constructor() {
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
                <div class="stake-status"></div>
                <div class="nft-grid">
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
        this.provider = null;
        this.signer = null;
        this.nftContract = null;
        this.gameStateContract = null;
        this.altarContract = null;
        this.nftContractAddress = CONTRACT_ADDRESSES.SONICITY_NFT;
        this.gameStateAddress = CONTRACT_ADDRESSES.GAME_STATE;
        this.altarAddress = CONTRACT_ADDRESSES.ALTAR;
        
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
            const stakedNFTsContainer = this.container.querySelector('.staked-nft-list');
            
            ownedNFTsContainer.innerHTML = '<div class="loading">Loading your NFTs...</div>';
            stakedNFTsContainer.innerHTML = '<div class="loading">Loading staked NFTs...</div>';

            // Get all staked NFTs first
            const userAddress = await this.signer.getAddress();
            const stakedTokenIds = await this.altarContract.getUserStakes(userAddress);
            const stakedSet = new Set(stakedTokenIds.map(id => id.toString()));

            let nftListHTML = '';
            let stakedNftListHTML = '';

            // Load staked NFTs
            for (const tokenId of stakedTokenIds) {
                const tokenURI = await this.nftContract.tokenURI(tokenId);
                const response = await fetch(tokenURI);
                const metadata = await response.json();
                const gameStateMetadata = await this.gameStateContract.getNFTMetadata(this.nftContractAddress, tokenId);
                
                const nft = {
                    tokenId,
                    contractAddress: this.nftContractAddress,
                    tokenURI,
                    metadata,
                    gameStateMetadata
                };

                const cardElement = document.createElement('div');
                cardElement.innerHTML = this.stakedCard.render(nft);
                stakedNFTsContainer.appendChild(cardElement.firstElementChild);
                this.stakedCard.attachEventListeners(cardElement.firstElementChild);
            }

            // Get all owned NFTs that are not staked
            const balance = await this.nftContract.balanceOf(this.signer.address);

            if (balance > 0n) {
                for (let i = 0; i < balance; i++) {
                    const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.signer.address, i);
                    if (stakedSet.has(tokenId.toString())) {
                        continue;
                    }
                    
                    const tokenURI = await this.nftContract.tokenURI(tokenId);
                    const response = await fetch(tokenURI);
                    const metadata = await response.json();
                    const gameStateMetadata = await this.gameStateContract.getNFTMetadata(this.nftContractAddress, tokenId);
                    
                    const nft = {
                        tokenId,
                        contractAddress: this.nftContractAddress,
                        tokenURI,
                        metadata,
                        gameStateMetadata
                    };

                    const cardElement = document.createElement('div');
                    cardElement.innerHTML = this.unstakedCard.render(nft);
                    ownedNFTsContainer.appendChild(cardElement.firstElementChild);
                    this.unstakedCard.attachEventListeners(cardElement.firstElementChild);
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

    async unstakeNFT(tokenId) {
        try {
            // Check if user has joined a city
            const playerCity = await this.gameStateContract.playerCity(await this.signer.getAddress());
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
                const userAddress = await this.signer.getAddress();
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
            const metadata = await this.gameStateContract.getNFTMetadata(this.nftContractAddress, tokenId);
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