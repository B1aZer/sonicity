import { BasePage } from './BasePage.js';
import { NFTCollection } from '../components/NFTCollection.js';
import { NFTCard } from '../components/NFTCard.js';
import { CONTRACT_CONFIG } from '../js/utils/constants.js';
import { WalletManager } from '../js/utils/wallet.js';
import { ethers } from 'ethers';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';

import '../styles/mint-page.css';
import '../styles/nft-collection.css';
import '../styles/status-component.css';

export class MintPage extends BasePage {
    constructor() {
        super();
        Logger.info('MintPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'base-page mint-page';
        this.tokensMinted = 0;
        this.maxSupply = CONTRACT_CONFIG.MAX_SUPPLY;
        this.mintPrice = CONTRACT_CONFIG.MINT_PRICE;
        this.nftCollection = new NFTCollection();
        this.lastMintedTokenId = null;
        this.modal = new Modal();
        this.userNFTs = [];
        this.nftCard = new NFTCard();
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const connectWalletBtn = this.element.querySelector('#connect-wallet');
        connectWalletBtn.addEventListener('click', () => this.handleConnectWallet());

        const mintButton = this.element.querySelector('#mint-button');
        mintButton.addEventListener('click', () => this.handleMint());

        // Mint amount controls
        const decreaseBtn = this.element.querySelector('#decrease-amount');
        const increaseBtn = this.element.querySelector('#increase-amount');
        const amountInput = this.element.querySelector('#mint-amount');

        decreaseBtn.addEventListener('click', () => {
            let currentAmount = parseInt(amountInput.value);
            if (currentAmount > 1) {
                amountInput.value = currentAmount - 1;
                this.updateTotalPrice();
            }
        });

        increaseBtn.addEventListener('click', () => {
            let currentAmount = parseInt(amountInput.value);
            if (currentAmount < 10) {
                amountInput.value = currentAmount + 1;
                this.updateTotalPrice();
            }
        });

        amountInput.addEventListener('change', () => {
            let currentAmount = parseInt(amountInput.value);
            if (currentAmount < 1) amountInput.value = 1;
            if (currentAmount > 10) amountInput.value = 10;
            this.updateTotalPrice();
        });

        // Update price initially
        this.updateTotalPrice();
    }

    updateWalletStatus(address) {
        const connectButton = this.element.querySelector('#connect-wallet');
        const mintButton = this.element.querySelector('#mint-button');
        
        connectButton.textContent = WalletManager.formatAddress(address);
        mintButton.disabled = false;
    }

    async onInitialized(walletResult) {
        try {
            await this.getMintCount();
            await this.loadUserNFTs();
        } catch (error) {
            Logger.error("Error in onInitialized:", error);
        }
    }

    async onWalletConnected(walletResult) {
        try {
            await this.getMintCount();
            await this.loadUserNFTs();
        } catch (error) {
            Logger.error("Error in onWalletConnected:", error);
        }
    }

    updateTotalPrice() {
        const amountInput = this.element.querySelector('#mint-amount');
        const totalPriceElement = this.element.querySelector('#total-price');
        
        const amount = parseInt(amountInput.value);
        const totalPrice = (parseFloat(this.mintPrice) * amount).toFixed(3);
        
        totalPriceElement.textContent = totalPrice;
    }

    async handleConnectWallet() {
        const statusElement = this.element.querySelector('#mint-status');
        const connectButton = this.element.querySelector('#connect-wallet');
        const mintButton = this.element.querySelector('#mint-button');
        
        try {
            this.showStatus(`
                <div class="loading">
                    <div class="step">Connecting...</div>
                </div>
            `, 'loading');
            
            const result = await WalletManager.connectWallet();
            if (result.success) {
                await this.onWalletConnected(result);
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

    showStatus(message, type = 'info') {
        // Remove any existing status
        const existingStatus = this.element.querySelector('.status-component');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Create new status element
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-component ${type}`;
        
        if (type === 'loading') {
            statusDiv.innerHTML = `
                <div class="loading-spinner"></div>
                <div>
                    <div class="step">${message}</div>
                    <div class="description">Please wait while we process your request...</div>
                </div>
            `;
        } else if (type === 'success') {
            statusDiv.innerHTML = `
                <div class="status-content">
                    <div class="title">Success!</div>
                    <div class="description">${message}</div>
                </div>
            `;
        } else if (type === 'error') {
            statusDiv.innerHTML = `
                <div class="status-content">
                    <div class="title">Error</div>
                    <div class="description">${message}</div>
                </div>
            `;
        }

        // Insert after mint actions
        const actionsSection = this.element.querySelector('.mint-actions');
        actionsSection.after(statusDiv);

        // Auto-remove success/error messages after 5 seconds
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.remove();
            }, 5000);
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
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Mint Your Sonicity NFT</h1>
                
                <!-- Preview Section -->
                <div class="page-section preview-section">
                    <h2>NFT Preview</h2>
                    <div class="nft-preview">
                        ${this.getPlaceholderHTML()}
                    </div>
                </div>
                
                <!-- Mint Info Section -->
                <div class="page-section mint-info-section">
                    <h2>Mint Information</h2>
                    <div class="mint-info">
                        <div class="info-card">
                            <h3>Collection Progress</h3>
                            <div class="mint-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(this.tokensMinted / this.maxSupply) * 100}%"></div>
                                </div>
                                <div class="progress-text">
                                    <span id="tokens-minted">${this.tokensMinted}</span> / <span id="max-supply">${this.maxSupply}</span> minted
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <h3>Mint Controls</h3>
                            <div class="mint-controls">
                                <div class="mint-amount">
                                    <button id="decrease-amount" class="amount-button">-</button>
                                    <input type="number" id="mint-amount" value="1" min="1" max="10">
                                    <button id="increase-amount" class="amount-button">+</button>
                                </div>
                                
                                <div class="mint-price">
                                    <span>Price: <span id="total-price">${this.mintPrice}</span> ETH</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Actions Section -->
                <div class="page-section actions-section">
                    <h2>Actions</h2>
                    <div class="mint-actions">
                        <button id="connect-wallet" class="connect-button">
                            <span class="button-text">Connect Wallet</span>
                        </button>
                        <button id="mint-button" class="mint-button" disabled>
                            <span class="button-text">Mint NFT</span>
                        </button>
                    </div>
                    <div id="mint-status" class="mint-status"></div>
                </div>
            </div>

            <!-- Owned NFTs Section -->
            <div class="page-container owned-nfts-container">
                <h2>Your NFTs</h2>
                <div id="owned-nfts" class="owned-nfts"></div>
            </div>
        `;
    }

    async loadUserNFTs(updatePreview = true) {
        try {
            Logger.info('Loading user NFTs');
            const ownedNFTsContainer = this.element.querySelector('#owned-nfts');
            ownedNFTsContainer.innerHTML = '<div class="nft-grid"></div>';
            const grid = ownedNFTsContainer.querySelector('.nft-grid');

            const userAddress = await this.contracts.nft.getAddress();
            const balance = await this.contracts.nft.balanceOf(userAddress);
            const nfts = [];

            for (let i = 0; i < balance; i++) {
                const tokenId = await this.contracts.nft.tokenOfOwnerByIndex(userAddress, i);
                const contractAddress = this.contracts.nft.getContractAddress();
                const tokenURI = await this.contracts.nft.tokenURI(tokenId);
                
                // Fetch and parse metadata JSON
                const response = await fetch(tokenURI);
                const metadata = await response.json();
                
                // Get game state metadata
                const gameStateMetadata = await this.contracts.gameState.getNFTMetadata(
                    contractAddress,
                    tokenId
                );

                nfts.push({
                    tokenId,
                    contractAddress,
                    tokenURI,
                    metadata,
                    gameStateMetadata
                });
            }

            this.userNFTs = nfts;
            
            if (nfts.length === 0) {
                ownedNFTsContainer.innerHTML = '<p class="no-nfts">You don\'t own any NFTs yet.</p>';
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
                                    <div class="nft-attributes">
                                        ${lastMintedNft.gameStateMetadata ? `
                                            <div class="attribute">
                                                <span class="label">District:</span>
                                                <span class="value">${['Central', 'North', 'East', 'South'][lastMintedNft.gameStateMetadata.district]}</span>
                                            </div>
                                            <div class="attribute">
                                                <span class="label">Building Slots:</span>
                                                <span class="value">${lastMintedNft.gameStateMetadata.buildingSlots}</span>
                                            </div>
                                        ` : ''}
                                    </div>
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
            ownedNFTsContainer.innerHTML = '<p class="error">Error loading your NFTs. Please try again.</p>';
            
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
            // Get total supply from contract
            const totalSupply = await this.contracts.nft.totalSupply();
            this.tokensMinted = Number(totalSupply);
            
            // Update UI
            const tokensMintedElement = this.element.querySelector('#tokens-minted');
            if (tokensMintedElement) {
                tokensMintedElement.textContent = this.tokensMinted;
            }
            
            // Update progress bar
            const progressFill = this.element.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${(this.tokensMinted / this.maxSupply) * 100}%`;
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
            if (amount < 1 || amount > 10) {
                throw new Error("Invalid mint amount");
            }
            
            // Check if we have enough supply
            if (this.tokensMinted + amount > this.maxSupply) {
                throw new Error("Not enough NFTs left to mint");
            }
            
            // Calculate total price
            const totalPrice = ethers.parseEther((parseFloat(this.mintPrice) * amount).toString());
            
            // Disable mint button and show status
            mintButton.disabled = true;
            this.showStatus(`
                <div class="loading">
                    <div class="step">Minting NFT${amount > 1 ? 's' : ''}...</div>
                    <div class="description">Please confirm the transaction in your wallet</div>
                </div>
            `, 'loading');
            
            // Mint NFT - transact method already waits for confirmation
            const receipt = await this.contracts.nft.mint(amount, { value: totalPrice });
            
            // Get the minted token IDs
            const events = receipt.logs.filter(log => 
                log.fragment && log.fragment.name === 'Transfer' && 
                log.args.from === ethers.ZeroAddress
            );
            
            if (events && events.length > 0) {
                // Use the last minted token for display
                const lastEvent = events[events.length - 1];
                this.lastMintedTokenId = lastEvent.args.tokenId;
                Logger.info(`Successfully minted ${events.length} NFTs, last token ID: ${this.lastMintedTokenId}`);
                
                this.showStatus(`
                    <div class="success">
                        <div class="title">Successfully Minted!</div>
                        <div class="description">You've minted ${events.length} NFT${events.length > 1 ? 's' : ''}</div>
                    </div>
                `, 'success');
                
                // Update mint count and user's NFTs
                await this.getMintCount();
                
                // Make sure to update the preview with the new NFT
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

    async mount(container) {
        container.appendChild(this.element);
        // Initialize contracts when mounting
        await this.initialize();
    }

    unmount() {
        this.element.remove();
    }
} 