import { formatAddress } from '../js/utils/wallet.js';
import Logger from '../js/utils/logger.js';
import { NFTCard } from '../components/NFTCard.js';
import { BasePage } from './BasePage.js';
import { StatusComponent } from '../components/StatusComponent.js';
import { Modal } from '../js/utils/modal.js';

import('../styles/nft-collection.css');

export class StakePage extends BasePage {
    constructor() {
        super();
        
        Logger.info('StakePage constructor called');
        
        this.element.className = 'base-page';
        
        this.statusComponent = new StatusComponent();
        
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
        
        this.render();
    }

    async onInitialized(walletResult) {
        Logger.info('StakePage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            await this.loadUserNFTs();
            this.setupEventListeners();
            Logger.info('Stake page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing stake page:', error);
            this.modal.error('Failed to initialize stake page. Please try refreshing the page.');
        }
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Add event listener for building type selector
        this.addEventListener('.building-type-select', 'change', () => {
            this.filterNFTs().catch(error => {
                Logger.error('Error in filterNFTs:', error);
            });
        });
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Stake Your NFTs</h1>

                <!-- Building Type Selector -->
                <div class="page-section type-selector-section">
                    <h2>Select Building Type</h2>
                    <div class="building-type-selector">
                        <select class="building-type-select">
                            <option value="0">House (Tier 0)</option>
                            <option value="1">Farm (Tier 1)</option>
                            <option value="2">Diamond Station (Tier 2)</option>
                            <option value="3">Rep Station (Tier 3)</option>
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
                <div class="page-section status-section">
                    <h2>Your NFTs</h2>
                    <div class="nft-list nft-grid">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>

                <!-- Staked NFTs Section -->
                <div class="page-section status-section">
                    <h2>Staked NFTs</h2>
                    <div class="staked-nft-list nft-grid">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showStatus(type, message, title = '') {
        const statusElement = this.statusComponent.show(message, type);
        const pageContainer = this.element.querySelector('.page-container');
        if (pageContainer) {
            // Insert after the first section
            const firstSection = pageContainer.querySelector('.page-section');
            if (firstSection) {
                firstSection.after(statusElement);
            } else {
                pageContainer.appendChild(statusElement);
            }
        } else {
            // Fallback - append to the container
            this.element.appendChild(statusElement);
        }
    }

    async filterNFTs() {
        const buildingTypeSelect = this.element.querySelector('.building-type-select');
        const selectedType = buildingTypeSelect.value;
        const ownedNFTsContainer = this.element.querySelector('.nft-list');
        
        Logger.info('Filtering NFTs for building type:', selectedType);
        
        // Clear container
        ownedNFTsContainer.innerHTML = '';

        // Get contract addresses for comparison
        const nftAddress = await this.contracts.nft.getContractAddress();
        const farmAddress = await this.contracts.farmNft.getContractAddress();

        // Filter NFTs based on selected type
        const filteredNFTs = this.availableNFTs.filter(nft => {
            const isCorrectContract = nft.contractAddress.toLowerCase() === (selectedType === '1' ? farmAddress : nftAddress).toLowerCase();
            const isRep = selectedType === '3' && nft.metadata.name.toLowerCase().includes('rep');
            
            if (selectedType === '3') {
                return isCorrectContract && isRep;
            }
            return isCorrectContract;
        });

        // Update status section with filtered counts
        const stakedNFTs = this.element.querySelector('.staked-nft-list').children.length;
        const availableNFTs = filteredNFTs.length;
        const totalNFTs = stakedNFTs + availableNFTs;

        this.element.querySelector('.total-nfts').textContent = totalNFTs;
        this.element.querySelector('.staked-nfts').textContent = stakedNFTs;
        this.element.querySelector('.available-nfts').textContent = availableNFTs;

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
            const ownedNFTsContainer = this.element.querySelector('.nft-list');
            const stakedNFTsContainer = this.element.querySelector('.staked-nft-list');
            
            // Clear loading spinners
            ownedNFTsContainer.innerHTML = '';
            stakedNFTsContainer.innerHTML = '';

            const userAddress = await this.contracts.nft.getAddress();
            const nftAddress = await this.contracts.nft.getContractAddress();
            const farmAddress = await this.contracts.farmNft.getContractAddress();

            // Get staked NFTs from both collections
            const stakedNFTs = await this.contracts.altar.getUserStakesByCollection(userAddress, nftAddress);
            const stakedFarmNFTs = await this.contracts.altar.getUserStakesByCollection(userAddress, farmAddress);

            // Get player's tier
            const playerTier = await this.contracts.gameState.getPlayerTier(userAddress);
            
            // Store current selection before updating
            const buildingTypeSelect = this.element.querySelector('.building-type-select');
            const currentSelection = buildingTypeSelect.value;
            
            // Update building type selector based on tier
            buildingTypeSelect.innerHTML = `
                <option value="0">House (Tier 0)</option>
                <option value="1" ${playerTier < 1 ? 'disabled' : ''}>Farm (Tier 1)</option>
                <option value="2" ${playerTier < 2 ? 'disabled' : ''}>Diamond Station (Tier 2)</option>
                <option value="3" ${playerTier < 3 ? 'disabled' : ''}>Rep Station (Tier 3)</option>
            `;

            // Restore selection if it's still valid
            if (currentSelection && !buildingTypeSelect.querySelector(`option[value="${currentSelection}"]`).disabled) {
                buildingTypeSelect.value = currentSelection;
            }

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
                    
                    const nft = {
                        tokenId,
                        contractAddress: collectionAddress,
                        tokenURI,
                        metadata
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

            // Show message if no staked NFTs
            if (stakedCount === 0) {
                stakedNFTsContainer.innerHTML = '<div class="no-nfts">No staked NFTs found.</div>';
            }

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
                        
                        this.availableNFTs.push({
                            tokenId,
                            contractAddress: address,
                            tokenURI,
                            metadata
                        });
                    }
                }
            }

            // Show message if no available NFTs
            if (this.availableNFTs.length === 0) {
                ownedNFTsContainer.innerHTML = '<div class="no-nfts">No NFTs available for staking.</div>';
            }

            // Initial filter of NFTs
            await this.filterNFTs();

        } catch (error) {
            Logger.error('Error loading user NFTs:', error);
            this.showStatus('error', 'Failed to load NFTs. Please try again.');
            
            // Show error state in containers
            const ownedNFTsContainer = this.element.querySelector('.nft-list');
            const stakedNFTsContainer = this.element.querySelector('.staked-nft-list');
            ownedNFTsContainer.innerHTML = '<div class="error-message">Failed to load NFTs. Please try refreshing the page.</div>';
            stakedNFTsContainer.innerHTML = '<div class="error-message">Failed to load staked NFTs. Please try refreshing the page.</div>';
        }
    }

    async stakeNFT(tokenId, collection) {
        try {
            Logger.info('StakeNFT called with:', { tokenId, collection });
            
            const buildingTypeSelect = this.element.querySelector('.building-type-select');
            const buildingType = parseInt(buildingTypeSelect.value);
            
            // Step 1: Initial checks
            this.showStatus('loading', 'Step 1/3: Preparing to stake NFT...', 'Preparing');
            
            // Get contract addresses for comparison
            const farmAddress = await this.contracts.farmNft.getContractAddress();
            Logger.info('Contract addresses:', { farmAddress, collection });
            
            const altarAddress = await this.contracts.altar.getContractAddress();
            
            // Step 2: Approve NFT transfer
            this.showStatus('loading', 'Step 2/3: Approving NFT transfer...', 'Approving');
            
            // Approve NFT transfer
            const nftContract = collection.toLowerCase() === farmAddress.toLowerCase()
                ? this.contracts.farmNft
                : this.contracts.nft;
            
            await nftContract.transact('approve', altarAddress, tokenId);
            this.showStatus('loading', 'Approval confirmed, proceeding with staking...', 'Approving');
            
            // Step 3: Stake NFT
            this.showStatus('loading', 'Step 3/3: Staking NFT...', 'Staking');
            
            // Stake NFT
            await this.contracts.altar.transact('stake', tokenId, buildingType, collection);
            
            // Reload NFTs
            this.showStatus('loading', 'Updating NFT list...', 'Updating');
            await this.loadUserNFTs();
            
            // Show success status
            this.showStatus('success', 'Your NFT has been staked and a new building has been constructed in your district!', 'NFT Staked Successfully!');
        } catch (error) {
            Logger.error('Error staking NFT:', error);
            this.showStatus('error', `Failed to stake NFT: ${error.message}`, 'Staking Failed');
        }
    }

    async unstakeNFT(tokenId, collection) {
        try {
            // Show loading status
            this.showStatus('loading', 'Unstaking NFT...', 'Unstaking');
            
            // Unstake NFT
            await this.contracts.altar.transact('unstake', collection, tokenId);
            
            // Reload NFTs
            this.showStatus('loading', 'Updating NFT list...', 'Updating');
            await this.loadUserNFTs();
            
            // Show success status
            this.showStatus('success', 'NFT unstaked successfully!', 'Unstaking Complete');
        } catch (error) {
            Logger.error('Error unstaking NFT:', error);
            this.showStatus('error', `Failed to unstake NFT: ${error.message}`, 'Unstaking Failed');
        }
    }
} 