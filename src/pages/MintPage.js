import { BasePage } from './BasePage.js';
import { NFTCard } from '../components/NFTCard.js';
import { CONTRACT_CONFIG } from '../js/utils/constants.js';
import { WalletManager } from '../js/utils/wallet.js';
import { ethers } from 'ethers';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';
import { StatusComponent } from '../components/StatusComponent.js';

import('../styles/mint-page.css');
import('../styles/nft-collection.css');

export class MintPage extends BasePage {
    constructor() {
        super();
        
        
        Logger.info('MintPage constructor called');
        this.element.className = 'base-page mint-page';
        this.tokensMinted = 0;
        this.maxSupply = CONTRACT_CONFIG.MAX_SUPPLY;
        this.mintPrice = CONTRACT_CONFIG.MINT_PRICE;
        this.farmMaxSupply = CONTRACT_CONFIG.FARM_MAX_SUPPLY;
        this.farmMintPrice = CONTRACT_CONFIG.FARM_MINT_PRICE;
        this.lastMintedTokenId = null;
        this.userNFTs = [];
        this.nftCard = new NFTCard();
        this.statusComponent = new StatusComponent();
        this.selectedType = 'house'; // Default to house
        
        this.render();
    }

    setupEventListeners() {
        Logger.info('Setting up event listeners');
        
        // Mint button
        this.addEventListener('#mint-button', 'click', () => {
            this.handleMint().catch(error => {
                Logger.error('Error in handleMint:', error);
            });
        });

        // NFT type selector
        this.addEventListener('#nft-type-selector', 'change', (e) => {
            this.selectedType = e.target.value;
            this.updateMintInfo().catch(error => {
                Logger.error('Error in updateMintInfo:', error);
            });
        });

        // Mint amount controls
        this.addEventListener('#decrease-amount', 'click', () => {
        const amountInput = this.element.querySelector('#mint-amount');
            let currentAmount = parseInt(amountInput.value);
            if (currentAmount > 1) {
                amountInput.value = currentAmount - 1;
                this.updateTotalPrice();
            }
        });

        this.addEventListener('#increase-amount', 'click', () => {
            const amountInput = this.element.querySelector('#mint-amount');
            let currentAmount = parseInt(amountInput.value);
            const maxAmount = this.selectedType === 'house' ? 10 : 5;
            if (currentAmount < maxAmount) {
                amountInput.value = currentAmount + 1;
                this.updateTotalPrice();
            }
        });

        this.addEventListener('#mint-amount', 'change', () => {
            const amountInput = this.element.querySelector('#mint-amount');
            let currentAmount = parseInt(amountInput.value);
            const maxAmount = this.selectedType === 'house' ? 10 : 5;
            if (currentAmount < 1) amountInput.value = 1;
            if (currentAmount > maxAmount) amountInput.value = maxAmount;
            this.updateTotalPrice();
        });

        // Update price initially
        this.updateTotalPrice();
    }

    async updateMintInfo() {
        const maxSupply = this.selectedType === 'house' ? this.maxSupply : this.farmMaxSupply;
        const mintPrice = this.selectedType === 'house' ? this.mintPrice : this.farmMintPrice;
        const maxMintPerTx = this.selectedType === 'house' ? 10 : 5;

        // Update max supply display
        const maxSupplyElement = this.element.querySelector('#max-supply');
        if (maxSupplyElement) {
            maxSupplyElement.textContent = maxSupply;
        }

        // Update mint price
        this.mintPrice = mintPrice;
        this.updateTotalPrice();

        // Update mint amount input max value
        const amountInput = this.element.querySelector('#mint-amount');
        if (amountInput) {
            amountInput.max = maxMintPerTx;
            if (parseInt(amountInput.value) > maxMintPerTx) {
                amountInput.value = maxMintPerTx;
                this.updateTotalPrice();
            }
        }

        // Update progress bar with correct contract data
        await this.getMintCount();
        
        // Update owned NFTs display
        await this.loadUserNFTs();
    }

    async onInitialized(walletResult) {
        Logger.info('MintPage onInitialized called with wallet:', walletResult);
        if (!walletResult || !walletResult.address) {
            Logger.error('No wallet address provided in onInitialized');
            this.modal.error('Please connect your wallet first.');
            return;
        }
        
        try {
            // Check if wallet is connected and update button accordingly
            const isConnected = WalletManager.isWalletConnected();
            Logger.info('Wallet connection status in onInitialized:', isConnected);
            
            const mintButton = this.element.querySelector('#mint-button');
            if (mintButton) {
                if (isConnected) {
                    mintButton.disabled = false;
                    mintButton.removeAttribute('title');
                    Logger.info('Mint button enabled in onInitialized');
                } else {
                    mintButton.disabled = true;
                    mintButton.setAttribute('title', 'Please connect your wallet to mint NFTs. You\'ll need ETH to pay for gas fees and minting costs.');
                    Logger.info('Mint button disabled in onInitialized');
                }
            }
            
            await this.getMintCount();
            await this.loadUserNFTs();
            this.setupEventListeners();
            Logger.info('Mint page initialized successfully');
        } catch (error) {
            Logger.error('Error initializing mint page:', error);
            this.modal.error('Failed to initialize mint page. Please try refreshing the page.');
        }
    }

    updateTotalPrice() {
        const amountInput = this.element.querySelector('#mint-amount');
        const totalPriceElement = this.element.querySelector('#total-price');
        
        const amount = parseInt(amountInput.value);
        const totalPrice = (parseFloat(this.mintPrice) * amount).toFixed(3);
        
        totalPriceElement.textContent = totalPrice;
    }

    showStatus(message, type = 'info') {
        const statusElement = this.statusComponent.show(message, type);
        const actionsSection = this.element.querySelector('.building-actions');
        if (actionsSection) {
            actionsSection.after(statusElement);
        } else {
            // Fallback - append to the page container
            const pageContainer = this.element.querySelector('.page-container');
            if (pageContainer) {
                pageContainer.appendChild(statusElement);
            }
        }
    }

    getPlaceholderHTML() {
        return `
            <div class="preview-placeholder">
                <img src="/images/placeholder.jpg" alt="Mint your NFT" />
            </div>
        `;
    }

    render() {
        const isConnected = WalletManager.isWalletConnected();
        
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Mint Your Sonicity NFT</h1>
                <p class="page-description">
                    <strong>NFTs are the foundation of your Sonicity empire.</strong> Each NFT represents a plot of land that you can build upon. 
                    <em>Choose your tier wisely - higher tiers unlock more advanced buildings and features.</em>
                </p>
                
                <!-- NFT Type Selector -->
                <div class="page-section type-selector-section">
                    <h2>Select NFT Type</h2>
                    <div class="building-type-selector">
                        <select id="nft-type-selector" class="building-type-select">
                            <option value="house">House (Tier 0)</option>
                            <option value="farm">Farm (Tier 1)</option>
                            <option value="rep">REP Forge (Tier 2)</option>
                        </select>
                    </div>
                </div>
                
                <!-- Mint Info Section -->
                <div class="page-section status-section">
                    <h2>Mint Information</h2>
                    <div class="buildings-grid">
                        <div class="building-card">
                            <h3>Mint Controls</h3>
                            <div class="building-details">
                                <div class="detail-item">
                                    <span class="detail-label">Amount:</span>
                                    <span class="detail-value">
                                        <div class="mint-amount">
                                            <button id="decrease-amount" class="amount-button">-</button>
                                            <input type="number" id="mint-amount" value="1" min="1" max="10" class="input input-sm">
                                            <button id="increase-amount" class="amount-button">+</button>
                                        </div>
                                    </span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Price:</span>
                                    <span class="detail-value">
                                        <span id="total-price">${this.mintPrice}</span> ETH
                                    </span>
                                </div>
                                <div class="building-progress">
                                    <div class="progress-info">
                                        <span class="progress-label">Collection Progress</span>
                                        <span class="progress-time">
                                            <span id="tokens-minted">${this.tokensMinted}</span> / <span id="max-supply">${this.maxSupply}</span>
                                        </span>
                                    </div>
                                    <div class="progress-container">
                                        <div class="progress-bar" style="width: ${(this.tokensMinted / this.maxSupply) * 100}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="page-section status-section">
                    <h2>Actions</h2>
                    <div class="building-actions">
                        <button id="mint-button" class="btn btn-primary btn-lg" ${isConnected ? '' : 'disabled'} ${!isConnected ? 'title="Please connect your wallet to mint NFTs. You\'ll need ETH to pay for gas fees and minting costs."' : ''}>
                            <span class="button-text">Mint NFT</span>
                        </button>
                    </div>
                    <div id="mint-status" class="mint-status"></div>
                </div>

                <!-- Preview Section -->
                <div class="page-section status-section">
                    <h2>NFT Preview</h2>
                    <div class="nft-preview">
                        ${this.getPlaceholderHTML()}
                    </div>
                </div>

                <!-- Your NFTs Section -->
                <div class="page-section status-section">
                    <h2>Your NFTs</h2>
                    <div id="owned-nfts" class="">
                        ${isConnected ? `
                            <div class="loading-spinner">
                                <div class="spinner"></div>
                            </div>
                        ` : `
                            <div class="no-nfts">Please connect your wallet to view your NFTs.</div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    async loadUserNFTs(updatePreview = true) {
        try {
            Logger.info('Loading user NFTs');
            const ownedNFTsContainer = this.element.querySelector('#owned-nfts');
            
            // Clear loading spinner
            ownedNFTsContainer.innerHTML = '<div class="nft-grid"></div>';
            const grid = ownedNFTsContainer.querySelector('.nft-grid');

            const userAddress = await this.contracts.nft.getAddress();
            
            // Get NFTs from appropriate contract
            const contract = this.selectedType === 'house' ? this.contracts.nft : this.contracts.farmNft;
            const balance = await contract.balanceOf(userAddress);
            const nfts = [];

            for (let i = 0; i < balance; i++) {
                const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
                const contractAddress = contract.getContractAddress();
                const tokenURI = await contract.tokenURI(tokenId);
                
                // Fetch and parse metadata JSON
                const response = await fetch(tokenURI);
                const metadata = await response.json();

                nfts.push({
                    tokenId,
                    contractAddress,
                    tokenURI,
                    metadata
                });
            }

            this.userNFTs = nfts;
            
            if (nfts.length === 0) {
                ownedNFTsContainer.innerHTML = '<div class="no-nfts">You don\'t own any NFTs yet.</div>';
            } else {
                // Add NFT cards to the grid
                for (const nft of nfts) {
                    const cardElement = document.createElement('div');
                    cardElement.innerHTML = this.nftCard.render(nft);
                    grid.appendChild(cardElement.firstElementChild);
                }
            }

            // Only update preview if requested
            if (updatePreview) {
                const previewContainer = this.element.querySelector('.nft-preview');
                
                // Check if we have a last minted token ID and if that NFT exists in our loaded NFTs
                if (this.lastMintedTokenId) {
                    const lastMintedNft = nfts.find(nft => nft.tokenId.toString() === this.lastMintedTokenId.toString());
                    
                    if (lastMintedNft) {
                        // Display the last minted NFT in the preview
                        Logger.info('Displaying last minted NFT in preview:', this.lastMintedTokenId);
                        previewContainer.innerHTML = `
                            <div class="minted-nft">
                                <img src="${lastMintedNft.metadata.image}" onerror="this.src='/images/placeholder.jpg'" alt="Land Plot #${lastMintedNft.tokenId}" />
                                <div class="nft-details">
                                    <h3>${lastMintedNft.metadata.name}</h3>
                                    <p>${lastMintedNft.metadata.description}</p>
                                    <div class="success-message">Minted Successfully!</div>
                                </div>
                            </div>
                        `;
                        return;
                    }
                }
                
                // If no last minted NFT or it wasn't found, show placeholder
                previewContainer.innerHTML = this.getPlaceholderHTML();
            }
        } catch (error) {
            Logger.error("Error loading user's NFTs:", error);
            const ownedNFTsContainer = this.element.querySelector('#owned-nfts');
            ownedNFTsContainer.innerHTML = '<div class="error-message">Error loading your NFTs. Please try again.</div>';
            
            // Only update preview if requested
            if (updatePreview) {
                const previewContainer = this.element.querySelector('.nft-preview');
                previewContainer.innerHTML = this.getPlaceholderHTML();
            }
        }
    }

    async getMintCount() {
        try {
            Logger.info('Getting mint count');
            // Get total supply from appropriate contract
            const contract = this.selectedType === 'house' ? this.contracts.nft : this.contracts.farmNft;
            const totalSupply = await contract.totalSupply();
            this.tokensMinted = Number(totalSupply);
            
            // Update UI
            const tokensMintedElement = this.element.querySelector('#tokens-minted');
            if (tokensMintedElement) {
                tokensMintedElement.textContent = this.tokensMinted;
            }
            
            // Update progress bar
            const progressBar = this.element.querySelector('.progress-bar');
            if (progressBar) {
                const maxSupply = this.selectedType === 'house' ? this.maxSupply : this.farmMaxSupply;
                progressBar.style.width = `${(this.tokensMinted / maxSupply) * 100}%`;
            }
        } catch (error) {
            Logger.error("Error getting mint count:", error);
        }
    }

    async handleMint() {
        const mintButton = this.element.querySelector('#mint-button');
        const amountInput = this.element.querySelector('#mint-amount');
        
        try {
            const amount = parseInt(amountInput.value);
            const maxAmount = this.selectedType === 'house' ? 10 : 5;
            if (amount < 1 || amount > maxAmount) {
                throw new Error("Invalid mint amount");
            }
            
            // Get the appropriate contract based on selected type
            const contract = this.selectedType === 'house' ? this.contracts.nft : this.contracts.farmNft;
            const maxSupply = this.selectedType === 'house' ? this.maxSupply : this.farmMaxSupply;
            const mintPrice = this.selectedType === 'house' ? this.mintPrice : this.farmMintPrice;
            
            // Check if we have enough supply
            const totalSupply = await contract.totalSupply();
            if (Number(totalSupply) + amount > maxSupply) {
                throw new Error("Not enough NFTs left to mint");
            }
            
            // Calculate total price
            const totalPrice = ethers.parseEther((parseFloat(mintPrice) * amount).toString());
            
            // Disable mint button and show status
            mintButton.disabled = true;
            this.showStatus(`
                <div class="loading">
                    <div class="step">Minting ${this.selectedType} NFT${amount > 1 ? 's' : ''}...</div>
                    <div class="description">Please confirm the transaction in your wallet</div>
                </div>
            `, 'loading');
            
            // Mint NFT
            const receipt = await contract.mint(amount, { value: totalPrice });
            
            // Get the minted token IDs
            const events = receipt.logs.filter(log => 
                log.fragment && log.fragment.name === 'Transfer' && 
                log.args.from === ethers.ZeroAddress
            );
            
            if (events && events.length > 0) {
                // Use the last minted token for display
                const lastEvent = events[events.length - 1];
                this.lastMintedTokenId = lastEvent.args.tokenId;
                Logger.info(`Successfully minted ${events.length} ${this.selectedType} NFTs, last token ID: ${this.lastMintedTokenId}`);
                
                this.showStatus(`
                    <div class="success">
                        <div class="title">Successfully Minted!</div>
                        <div class="description">You've minted ${events.length} ${this.selectedType} NFT${events.length > 1 ? 's' : ''}</div>
                    </div>
                `, 'success');
                
                // Update mint count and user's NFTs
                await this.getMintCount();
                await this.loadUserNFTs(true);
                
                // Scroll to the NFT preview section
                const previewContainer = this.element.querySelector('.nft-preview');
                if (previewContainer) {
                    previewContainer.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                throw new Error("Could not find mint event in transaction");
            }
        } catch (error) {
            Logger.error("Error minting NFT:", error);
            this.showStatus(`
                <div class="error">
                    <div class="title">Error Minting NFT</div>
                    <div class="description">${error.message || "Unknown error"}</div>
                </div>
            `, 'error');
        } finally {
            mintButton.disabled = false;
        }
    }
} 