import { BasePage } from '../js/core/BasePage.js';
import { NFTCollection } from '../components/NFTCollection.js';
import { NFTCard } from '../components/NFTCard.js';
import { CONTRACT_CONFIG } from '../js/utils/constants.js';
import { WalletManager } from '../js/utils/wallet.js';
import { ethers } from 'ethers';
import { appState } from '../js/core/state.js';
import '../styles/nft-collection.css';
import '../styles/mint-page.css';
import Logger from '../js/utils/logger.js';
import { Modal } from '../js/utils/modal.js';

export class MintPage extends BasePage {
    constructor() {
        super();
        Logger.info('MintPage constructor called');
        this.element = document.createElement('div');
        this.element.className = 'mint-page';
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
            statusElement.textContent = "Connecting...";
            
            const result = await WalletManager.connectWallet();
            if (result.success) {
                await this.onWalletConnected(result);
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

    getPlaceholderHTML() {
        return `
            <div class="preview-placeholder">
                <img src="/images/placeholder.jpg" alt="Mint your NFT" />
            </div>
        `;
    }

    render() {
        this.element.innerHTML = `
            <div class="mint-container">
                <h1>Mint Your Sonicity NFT</h1>
                
                <div class="nft-preview">
                    ${this.getPlaceholderHTML()}
                </div>
                
                <div class="mint-info">
                    <div class="mint-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.tokensMinted / this.maxSupply) * 100}%"></div>
                        </div>
                        <div class="progress-text">
                            <span id="tokens-minted">${this.tokensMinted}</span> / <span id="max-supply">${this.maxSupply}</span> minted
                        </div>
                    </div>
                    
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
                
                <div class="mint-actions">
                    <button id="connect-wallet" class="connect-button">Connect Wallet</button>
                    <button id="mint-button" class="mint-button" disabled>Mint NFT</button>
                </div>
                
                <div id="mint-status" class="mint-status"></div>
            </div>

            <div class="owned-nfts-container">
                <h2>Your NFTs</h2>
                <div id="owned-nfts" class="owned-nfts"></div>
            </div>
        `;
    }

    async loadUserNFTs(updatePreview = true) {
        try {
            Logger.info('Loading user NFTs');
            const ownedNFTsContainer = this.element.querySelector('#owned-nfts');
            ownedNFTsContainer.innerHTML = '<div class="loading">Loading your NFTs...</div>';

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
                // Clear loading message
                ownedNFTsContainer.innerHTML = '';

                // Create NFT cards for each owned NFT
                for (const nft of nfts) {
                    const cardElement = document.createElement('div');
                    cardElement.innerHTML = this.nftCard.render(nft);
                    ownedNFTsContainer.appendChild(cardElement.firstElementChild);
                }
            }

            // Only update preview if requested
            if (updatePreview) {
                const previewContainer = this.element.querySelector('.nft-preview');
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
        const statusElement = this.element.querySelector('#mint-status');
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
            statusElement.textContent = "Minting...";
            statusElement.style.color = "blue";
            
            // Mint NFT - transact method already waits for confirmation
            const receipt = await this.contracts.nft.mint(amount, { value: totalPrice });
            statusElement.textContent = "Transaction confirmed!";
            
            // Get the minted token IDs
            const event = receipt.logs.find(log => 
                log.fragment && log.fragment.name === 'Transfer' && 
                log.args.from === ethers.ZeroAddress
            );
            
            if (event) {
                this.lastMintedTokenId = event.args.tokenId;
                statusElement.textContent = `Successfully minted NFT #${this.lastMintedTokenId}!`;
                statusElement.style.color = "green";
                
                // Update mint count and user's NFTs
                await this.getMintCount();
                await this.loadUserNFTs();
            } else {
                throw new Error("Could not find mint event in transaction");
            }
        } catch (error) {
            Logger.error("Error minting NFT:", error);
            statusElement.textContent = "Error: " + (error.message || "Unknown error");
            statusElement.style.color = "red";
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