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
            <div class="page-container">
                <h1>Stake Your NFTs</h1>

                <!-- Building Type Selector -->
                <div class="page-section type-selector-section">
                    <h2>Select Building Type</h2>
                    <div class="building-type-selector">
                        <select class="building-type-select">
                            <option value="0">House (Tier 0)</option>
                            <option value="1">Farm (Tier 1)</option>
                            <option value="2">Rep Station (Tier 2)</option>
                        </select>
                    </div>
                </div>

                <!-- Status Section -->
                <div class="page-section status-section">
                    <h2>NFT Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Total NFTs:</span>
                            <span class="status-value total-nfts">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Staked NFTs:</span>
                            <span class="status-value staked-nfts">0</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Available NFTs:</span>
                            <span class="status-value available-nfts">0</span>
                        </div>
                    </div>
                </div>

                <!-- Available NFTs Section -->
                <div class="page-section nft-section">
                    <h2>Your NFTs</h2>
                    <div class="nft-list nft-grid"></div>
                </div>

                <!-- Staked NFTs Section -->
                <div class="page-section nft-section">
                    <h2>Staked NFTs</h2>
                    <div class="staked-nft-list nft-grid"></div>
                </div>
            </div>
        `;
        
        // Initialize NFT card components
        this.unstakedCard = new NFTCard({
            showStakeButton: true,
            onStake: (tokenId, collection) => this.stakeNFT(tokenId, collection)
        });
        
        this.stakedCard = new NFTCard({
            showUnstakeButton: true,
            onUnstake: (tokenId, collection) => this.unstakeNFT(tokenId, collection)
        });

        // Store all available NFTs
        this.availableNFTs = [];
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
            // Add event listener for building type selector
            const buildingTypeSelect = this.container.querySelector('.building-type-select');
            buildingTypeSelect.addEventListener('change', () => this.filterNFTs());
        }
    }

    async filterNFTs() {
        const buildingTypeSelect = this.container.querySelector('.building-type-select');
        const selectedType = buildingTypeSelect.value;
        const ownedNFTsContainer = this.container.querySelector('.nft-list');
        
        Logger.info('Filtering NFTs for building type:', selectedType);
        
        // Clear container
        ownedNFTsContainer.innerHTML = '';

        // Get contract addresses for comparison
        const nftAddress = await this.contracts.nft.getContractAddress();
        const farmAddress = await this.contracts.farmNft.getContractAddress();

        // Filter NFTs based on selected type
        const filteredNFTs = this.availableNFTs.filter(nft => {
            const isCorrectContract = nft.contractAddress.toLowerCase() === (selectedType === '1' ? farmAddress : nftAddress).toLowerCase();
            const isRep = selectedType === '2' && nft.metadata.name.toLowerCase().includes('rep');
            
            if (selectedType === '2') {
                return isCorrectContract && isRep;
            }
            return isCorrectContract;
        });

        // Update status section with filtered counts
        const stakedNFTs = this.container.querySelector('.staked-nft-list').children.length;
        const availableNFTs = filteredNFTs.length;
        const totalNFTs = stakedNFTs + availableNFTs;

        this.container.querySelector('.total-nfts').textContent = totalNFTs;
        this.container.querySelector('.staked-nfts').textContent = stakedNFTs;
        this.container.querySelector('.available-nfts').textContent = availableNFTs;

        if (filteredNFTs.length === 0) {
            ownedNFTsContainer.innerHTML = '<div class="no-nfts">No NFTs available for this building type.</div>';
            return;
        }

        // Render filtered NFTs
        filteredNFTs.forEach(nft => {
            const cardWrapper = document.createElement('div');
            cardWrapper.innerHTML = this.unstakedCard.render(nft);
            const cardElement = cardWrapper.firstElementChild;
            ownedNFTsContainer.appendChild(cardElement);
            this.unstakedCard.attachEventListeners(cardElement);
        });
    }

    async loadUserNFTs() {
        Logger.info('Loading user NFTs in StakePage...');
        try {
            const ownedNFTsContainer = this.container.querySelector('.nft-list');
            const stakedNFTsContainer = this.container.querySelector('.staked-nft-list');
            
            // Clear containers first
            ownedNFTsContainer.innerHTML = '<div class="loading">Loading your NFTs...</div>';
            stakedNFTsContainer.innerHTML = '<div class="loading">Loading staked NFTs...</div>';

            const userAddress = await this.contracts.nft.getAddress();
            const nftAddress = await this.contracts.nft.getContractAddress();
            const farmAddress = await this.contracts.farmNft.getContractAddress();

            // Get staked NFTs from both collections
            const stakedNFTs = await this.contracts.altar.getUserStakesByCollection(userAddress, nftAddress);
            const stakedFarmNFTs = await this.contracts.altar.getUserStakesByCollection(userAddress, farmAddress);

            // Clear loading messages
            ownedNFTsContainer.innerHTML = '';
            stakedNFTsContainer.innerHTML = '';

            // Get player's tier
            const playerTier = await this.contracts.gameState.getPlayerTier(userAddress);
            
            // Update building type selector based on tier
            const buildingTypeSelect = this.container.querySelector('.building-type-select');
            buildingTypeSelect.innerHTML = `
                <option value="0">House (Tier 0)</option>
                <option value="1" ${playerTier < 1 ? 'disabled' : ''}>Farm (Tier 1)</option>
                <option value="2" ${playerTier < 2 ? 'disabled' : ''}>Rep Station (Tier 2)</option>
            `;

            // Load staked NFTs
            let stakedCount = 0;
            
            // Process all staked NFTs
            const processStakedNFTs = async (tokenIds, collectionAddress, nftContract) => {
                for (const tokenId of tokenIds) {
                    const stakeData = await this.contracts.altar.getStakeDataWithCollection(collectionAddress, tokenId);
                    if (!stakeData.isActive) continue;

                    const tokenURI = await nftContract.tokenURI(tokenId);
                    const response = await fetch(tokenURI);
                    const metadata = await response.json();
                    const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(
                        collectionAddress,
                        tokenId
                    );
                    
                    const nft = {
                        tokenId,
                        contractAddress: collectionAddress,
                        tokenURI,
                        metadata,
                        gameStateMetadata
                    };

                    stakedCount++;
                    const cardWrapper = document.createElement('div');
                    cardWrapper.innerHTML = this.stakedCard.render(nft);
                    const cardElement = cardWrapper.firstElementChild;
                    stakedNFTsContainer.appendChild(cardElement);
                    this.stakedCard.attachEventListeners(cardElement);
                }
            };

            // Process staked NFTs from both collections
            await processStakedNFTs(stakedNFTs, nftAddress, this.contracts.nft);
            await processStakedNFTs(stakedFarmNFTs, farmAddress, this.contracts.farmNft);

            // Get all owned NFTs that are not staked
            this.availableNFTs = [];

            // Get NFTs from both contracts
            const contracts = [
                { contract: this.contracts.nft, address: nftAddress },
                { contract: this.contracts.farmNft, address: farmAddress }
            ];
            
            for (const { contract, address } of contracts) {
                const balance = await contract.balanceOf(userAddress);
                
                if (balance > 0n) {
                    for (let i = 0; i < balance; i++) {
                        const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
                        
                        // Check if NFT is staked
                        const stakeData = await this.contracts.altar.getStakeDataWithCollection(address, tokenId);
                        if (stakeData.isActive) continue;

                        const tokenURI = await contract.tokenURI(tokenId);
                        const response = await fetch(tokenURI);
                        const metadata = await response.json();
                        const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(
                            address,
                            tokenId
                        );
                        
                        this.availableNFTs.push({
                            tokenId,
                            contractAddress: address,
                            tokenURI,
                            metadata,
                            gameStateMetadata
                        });
                    }
                }
            }

            // Initial filter of NFTs
            await this.filterNFTs();

        } catch (error) {
            Logger.error('Error loading user NFTs:', error);
            this.showStatus('error', 'Failed to load NFTs. Please try again.');
        }
    }

    async stakeNFT(tokenId, collection) {
        try {
            const buildingTypeSelect = this.container.querySelector('.building-type-select');
            const buildingType = parseInt(buildingTypeSelect.value);
            
            // Show loading status
            this.showStatus('info', 'Staking NFT...');
            
            // Get contract addresses for comparison
            const farmAddress = await this.contracts.farmNft.getContractAddress();
            const altarAddress = await this.contracts.altar.getContractAddress();
            
            // Approve NFT transfer
            const nftContract = collection.toLowerCase() === farmAddress.toLowerCase()
                ? this.contracts.farmNft
                : this.contracts.nft;
            
            await nftContract.approve(altarAddress, tokenId);
            
            // Stake NFT
            const tx = await this.contracts.altar.stake(tokenId, buildingType, collection);
            await tx.wait();
            
            // Reload NFTs
            await this.loadUserNFTs();
            
            // Show success status
            this.showStatus('success', 'NFT staked successfully!');
        } catch (error) {
            Logger.error('Error staking NFT:', error);
            this.showStatus('error', 'Failed to stake NFT. Please try again.');
        }
    }

    async unstakeNFT(tokenId, collection) {
        try {
            // Show loading status
            this.showStatus('info', 'Unstaking NFT...');
            
            // Unstake NFT
            const tx = await this.contracts.altar.unstake(collection, tokenId);
            await tx.wait();
            
            // Reload NFTs
            await this.loadUserNFTs();
            
            // Show success status
            this.showStatus('success', 'NFT unstaked successfully!');
        } catch (error) {
            Logger.error('Error unstaking NFT:', error);
            this.showStatus('error', 'Failed to unstake NFT. Please try again.');
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