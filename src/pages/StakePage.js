import { formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { NFTCard } from '../components/NFTCard.js';
import { BasePage } from './BasePage.js';
import './../styles/stake-page.css';
import './../styles/nft-collection.css';
import { StatusComponent } from '../components/StatusComponent.js';

export class StakePage extends BasePage {
    constructor() {
        super();
        this.container = document.createElement('div');
        this.container.className = 'base-page stake-page';
        this.statusComponent = new StatusComponent();
        this.container.innerHTML = `
            <div class="page-container container-min-width-1000">
                <h1>Stake Your NFTs</h1>

                <div class="page-section nft-sections">
                    <div class="nft-section">
                        <h2>Your NFTs</h2>
                        <div class="nft-list nft-grid"></div>
                    </div>
                    <div class="nft-section">
                        <h2>Staked NFTs</h2>
                        <div class="staked-nft-list nft-grid"></div>
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
        
    }

    showStatus(type, message, title = '') {
        const statusElement = this.statusComponent.show(message, type);
        const actionsSection = this.container.querySelector('.page-section');
        if (actionsSection) {
            actionsSection.after(statusElement);
        } else {
            // Fallback - append to the container
            this.container.appendChild(statusElement);
        }
    }

    async onInitialized(walletResult) {
        if (walletResult.success) {
            await this.loadUserNFTs();
        }
    }
    async loadUserNFTs() {
        Logger.info('Loading user NFTs in StakePage...');
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
            const stakedTokenIds = await this.contracts.altar.getUserStakes();
            const stakedSet = new Set(stakedTokenIds.map(id => id.toString()));

            // Clear loading messages
            ownedNFTsContainer.innerHTML = '';
            stakedNFTsContainer.innerHTML = '';

            // Load staked NFTs
            for (const tokenId of stakedTokenIds) {
                const tokenURI = await this.contracts.nft.tokenURI(tokenId);
                const response = await fetch(tokenURI);
                const metadata = await response.json();
                const nftAddress = await this.contracts.nft.getContractAddress();
                const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(nftAddress, tokenId);
                
                const nft = {
                    tokenId,
                    contractAddress: nftAddress,
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
                    const nftAddress = await this.contracts.nft.getContractAddress();
                    const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(nftAddress, tokenId);
                    
                    const nft = {
                        tokenId,
                        contractAddress: nftAddress,
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
            Logger.info('Starting stakeNFT process for token:', tokenId);
            
            // Check if NFT collection is approved
            const nftAddress = await this.contracts.nft.getContractAddress();
            Logger.info('Checking approval for NFT collection:', nftAddress);
            const isApproved = await this.contracts.gameState.isCollectionApproved(nftAddress);
            Logger.info('NFT collection approved:', isApproved);
            if (!isApproved) {
                throw new Error("This NFT collection is not approved for staking");
            }
            
            // Check if NFT is already staked
            try {
                const stakeData = await this.contracts.altar.getStakeData(tokenId);
                Logger.info('Stake data:', stakeData);
                if (stakeData.isActive) {
                    throw new Error("This NFT is already staked");
                }
            } catch (error) {
                Logger.info('No existing stake data found, proceeding with staking');
                // Continue if the error is just that the NFT isn't staked yet
            }
            
            // Check if NFT is already approved
            try {
                const userAddress = await this.contracts.nft.getAddress();
                const altarAddress = await this.contracts.altar.getContractAddress();
                const isOwner = await this.contracts.gameState.verifyNFTOwnership(nftAddress, tokenId, userAddress);
                Logger.info('NFT ownership verified:', isOwner);
                if (!isOwner) {
                    throw new Error("You don't own this NFT");
                }
                
                // Step 1: Approve NFT transfer
                this.showStatus('loading', 'Step 1/2: Approving NFT transfer...', 'Approving NFT transfer');
                Logger.info('Approving NFT transfer...');
                const approveReceipt = await this.contracts.nft.approve(altarAddress, tokenId);
                Logger.info('Approval transaction confirmed:', approveReceipt.hash);
                
                // Step 2: Stake NFT
                this.showStatus('loading', 'Step 2/2: Staking NFT...', 'Staking NFT');
                
                // Get NFT metadata to check building slots
                const metadata = await this.contracts.gameState.getNFTMetadata(nftAddress, tokenId);
                Logger.info('NFT metadata:', metadata);
                if (metadata.buildingSlots === 0) {
                    throw new Error("NFT must have at least 1 building slot");
                }
                
                Logger.info('Sending stake transaction...');
                const stakeReceipt = await this.contracts.altar.stake(tokenId);
                Logger.info('Stake transaction confirmed:', stakeReceipt.hash);
                
                // Success message
                this.showStatus('success', 'Your NFT is now staked and you\'ve received building slots', 'NFT Staked Successfully!');
                
                // Reload the user's NFTs to update the list
                await this.loadUserNFTs();
            } catch (error) {
                Logger.error('Error in approval process:', error);
                throw new Error(`Error checking NFT approval: ${error.message}`);
            }
        } catch (error) {
            Logger.error('Error in stakeNFT:', error);
            this.showStatus('error', error.message || "Unknown error", 'Error Staking NFT');
        }
    }

    async unstakeNFT(tokenId) {
        try {
            // Check if user has joined a city
            const playerCity = await this.contracts.gameState.getPlayerCity();
            if (!playerCity) {
                this.modal.error("You must join a city before unstaking NFTs");
                return;
            }
            
            // Check if NFT is actually staked
            let stakeData;
            try {
                stakeData = await this.contracts.altar.getStakeData(tokenId);
                Logger.debug("Stake data:", stakeData);
                
                if (!stakeData.isActive) {
                    this.modal.error("This NFT is not staked");
                    return;
                }
                
                // Check if caller is the staker
                const userAddress = await this.contracts.nft.getAddress();
                if (stakeData.owner.toLowerCase() !== userAddress.toLowerCase()) {
                    this.modal.error("You are not the staker of this NFT");
                    return;
                }
            } catch (error) {
                Logger.error("Error getting stake data:", error);
                this.modal.error("Failed to get stake data. The NFT may not be staked.");
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
                this.modal.show(`You need to wait ${remainingDays} more days before you can unstake this NFT. The minimum staking period is 7 days.`, {
                    title: 'Cannot Unstake Yet',
                    icon: 'info'
                });
                return;
            }
            
            // Check if NFT has building slots
            const nftAddress = await this.contracts.nft.getContractAddress();
            const metadata = await this.contracts.gameState.getNFTMetadata(nftAddress, tokenId);
            Logger.debug("NFT metadata:", metadata);
            
            if (metadata.buildingSlots === 0) {
                this.modal.error("NFT must have at least 1 building slot");
                return;
            }
            
            // Show loading message
            this.modal.loading("Unstaking NFT... Your NFT is being returned to your wallet");
            
            try {
                Logger.debug("Attempting to unstake NFT:", tokenId);
                const unstakeTx = await this.contracts.altar.unstake(tokenId);
                Logger.debug("Unstake transaction sent:", unstakeTx.hash);
                
                await unstakeTx.wait();
                Logger.debug("Unstake transaction confirmed");
                
                this.modal.success("NFT Unstaked Successfully! Your NFT has been returned to your wallet");
                
                // Reload the user's NFTs to update the list
                await this.loadUserNFTs();
            } catch (txError) {
                Logger.error("Transaction error:", txError);
                let errorMessage = "Failed to execute unstake transaction";
                if (txError.code === 'CALL_EXCEPTION') {
                    errorMessage = "Contract call failed. Please check if the NFT is properly staked.";
                } else if (txError.code === 'INSUFFICIENT_FUNDS') {
                    errorMessage = "Insufficient funds for gas. Please add more ETH to your wallet.";
                } else {
                    errorMessage = txError.message;
                }
                this.modal.error(errorMessage);
            }
        } catch (error) {
            Logger.error("Error unstaking NFT:", error);
            this.modal.error(error.message || "Unknown error occurred while unstaking NFT");
        }
    }

    mount(container) {
        Logger.info('Mounting stake page...');
        container.appendChild(this.container);
        // Initialize using base class method
        this.initialize().catch(error => {
            Logger.error('Error during stake page initialization:', error);
            this.modal.error('Failed to initialize stake page. Please try refreshing the page.');
        });
    }

    unmount() {
        Logger.info('Unmounting stake page...');
        this.container.remove();
    }
} 