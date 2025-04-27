import { ethers } from 'ethers';
import SonicityNFTABI from '../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import { NFTCollection } from '../components/NFTCollection.js';
import { CONTRACT_ADDRESSES, CONTRACT_CONFIG } from '../js/utils/constants.js';
import { appState } from '../js/core/state.js';
import { checkExistingConnection, connectWallet, formatAddress } from '../js/utils/wallet.js';
import '../styles/nft-collection.css';
import '../styles/mint-page.css';

export class MintPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'mint-page';
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.tokensMinted = 0;
        this.maxSupply = CONTRACT_CONFIG.MAX_SUPPLY;
        this.mintPrice = CONTRACT_CONFIG.MINT_PRICE;
        this.contractAddress = CONTRACT_ADDRESSES.SONICITY_NFT;
        this.nftCollection = new NFTCollection();
        this.lastMintedTokenId = null;
        this.render();
        this.setupEventListeners();
        this.initializeConnection();
    }

    setupEventListeners() {
        const connectWalletBtn = this.element.querySelector('#connect-wallet');
        connectWalletBtn.addEventListener('click', () => this.handleConnectWallet());

        const mintButton = this.element.querySelector('#mint-button');
        mintButton.addEventListener('click', () => this.mintNFT());

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

    async initializeConnection() {
        const { connected, address } = await checkExistingConnection();
        if (connected) {
            await this.initializeWallet(address);
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
            
            const result = await connectWallet();
            if (result.success) {
                await this.initializeWallet(result.address);
                statusElement.textContent = "Connected!";
                statusElement.style.color = "green";
                await this.getMintCount();
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
        const connectButton = this.element.querySelector('#connect-wallet');
        const mintButton = this.element.querySelector('#mint-button');
        
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Initialize contract
        this.contract = new ethers.Contract(
            this.contractAddress,
            SonicityNFTABI.abi,
            this.signer
        );
        
        // Format the account display
        connectButton.textContent = formatAddress(walletAddress);
        
        // Enable mint button
        mintButton.disabled = false;
    }

    async getMintCount() {
        try {
            // Get total supply from contract
            const totalSupply = await this.contract.totalSupply();
            this.tokensMinted = totalSupply.toNumber();
            
            // Update UI
            const tokensMintedElement = this.element.querySelector('#tokens-minted');
            const progressFill = this.element.querySelector('.progress-fill');
            
            tokensMintedElement.textContent = this.tokensMinted;
            progressFill.style.width = `${(this.tokensMinted / this.maxSupply) * 100}%`;
        } catch (error) {
            console.error("Error getting mint count:", error);
        }
    }

    async mintNFT() {
        if (!appState.getState().walletConnected) return;
        
        const statusElement = this.element.querySelector('#mint-status');
        const amountInput = this.element.querySelector('#mint-amount');
        const amount = parseInt(amountInput.value);
        
        try {
            statusElement.textContent = `Minting ${amount} NFT(s)...`;
            statusElement.style.color = "blue";
            
            // Calculate total price in wei
            const pricePerToken = ethers.utils.parseEther(this.mintPrice);
            const totalPrice = pricePerToken.mul(amount);
            
            // Call the mint function on the contract
            const tx = await this.contract.mint(amount, { value: totalPrice });
            
            // Wait for transaction to be mined
            statusElement.textContent = "Transaction sent! Waiting for confirmation...";
            const receipt = await tx.wait();
            
            // Get the minted token ID
            this.lastMintedTokenId = this.tokensMinted + 1;
            
            // Update the preview with the minted NFT
            this.updateNFTPreview(this.lastMintedTokenId);
            
            statusElement.textContent = `Successfully minted ${amount} NFT(s)!`;
            statusElement.style.color = "green";
            
            // Update minted count
            await this.getMintCount();

            // Set NFT as verified in global state
            appState.setNFTVerified(true);
        } catch (error) {
            console.error("Minting error:", error);
            statusElement.textContent = "Failed to mint: " + (error.message || "Unknown error");
            statusElement.style.color = "red";
        }
    }

    async updateNFTPreview(tokenId) {
        const previewContainer = this.element.querySelector('.nft-preview');
        const nft = this.nftCollection.nfts[tokenId - 1]; // Arrays are 0-based
        
        if (nft) {
            previewContainer.innerHTML = `
                <div class="minted-nft">
                    <img src="${nft.image}" alt="${nft.name}" />
                    <div class="nft-details">
                        <h3>${nft.name}</h3>
                        <p>${nft.description}</p>
                        <div class="nft-attributes">
                            <div class="attribute">
                                <span class="label">District:</span>
                                <span class="value">${nft.attributes.district}</span>
                            </div>
                            <div class="attribute">
                                <span class="label">Size:</span>
                                <span class="value">${nft.attributes.size}</span>
                            </div>
                            <div class="attribute">
                                <span class="label">Elevation:</span>
                                <span class="value">${nft.attributes.elevation}</span>
                            </div>
                            <div class="attribute">
                                <span class="label">Resource:</span>
                                <span class="value">${nft.attributes.resourceType}</span>
                            </div>
                            <div class="attribute">
                                <span class="label">Resource Level:</span>
                                <span class="value">${nft.attributes.resourceLevel}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="mint-container">
                <h1>Mint Your Sonicity NFT</h1>
                
                <div class="nft-preview">
                    <div class="preview-placeholder">
                        <img src="/images/placeholder.jpg" alt="Mint your NFT" />
                    </div>
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
        `;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 