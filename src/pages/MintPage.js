import { ethers } from 'ethers';
import SonicityNFTABI from '../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import { NFTCollection } from '../components/NFTCollection.js';
import '../styles/nft-collection.css';
import '../styles/mint-page.css';

export class MintPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'mint-page';
        this.connected = false;
        this.account = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.tokensMinted = 0;
        this.maxSupply = 10000;
        this.mintPrice = "0.01"; // ETH
        this.contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
        this.nftCollection = new NFTCollection();
        this.lastMintedTokenId = null;
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="mint-container">
                <h1>Mint Your Sonicity NFT</h1>
                <p>Own a piece of virtual land in the Sonicity metaverse!</p>
                
                <div class="nft-preview">
                    <div class="preview-placeholder">
                        <img src="/images/placeholder.jpg" alt="Mint your NFT" />
                        <p>Mint your NFT to reveal your unique land plot</p>
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
                
                <div class="mint-details">
                    <h2>About Sonicity NFTs</h2>
                    <p>Each Sonicity NFT represents virtual land ownership in our metaverse city. NFT holders gain exclusive benefits:</p>
                    <ul>
                        <li>Ownership of a unique plot in Sonicity</li>
                        <li>Revenue sharing from in-game activities</li>
                        <li>Governance rights over city development</li>
                        <li>Early access to new features and expansions</li>
                    </ul>
                </div>
            </div>
        `;

        // Connect wallet button
        const connectWalletBtn = this.element.querySelector('#connect-wallet');
        connectWalletBtn.addEventListener('click', () => this.connectWallet());

        // Mint button
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

    updateTotalPrice() {
        const amountInput = this.element.querySelector('#mint-amount');
        const totalPriceElement = this.element.querySelector('#total-price');
        
        const amount = parseInt(amountInput.value);
        const totalPrice = (parseFloat(this.mintPrice) * amount).toFixed(3);
        
        totalPriceElement.textContent = totalPrice;
    }

    async connectWallet() {
        const statusElement = this.element.querySelector('#mint-status');
        const connectButton = this.element.querySelector('#connect-wallet');
        const mintButton = this.element.querySelector('#mint-button');
        
        try {
            statusElement.textContent = "Connecting...";
            
            // Check if MetaMask is installed
            if (window.ethereum) {
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                
                // Request account access
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.account = accounts[0];
                this.signer = this.provider.getSigner();
                
                // Initialize contract
                this.contract = new ethers.Contract(
                    this.contractAddress,
                    SonicityNFTABI.abi,
                    this.signer
                );
                
                // Format the account display
                const shortenedAccount = this.account.slice(0, 6) + '...' + this.account.slice(-4);
                connectButton.textContent = shortenedAccount;
                
                // Enable mint button
                mintButton.disabled = false;
                this.connected = true;
                
                statusElement.textContent = "Connected!";
                statusElement.style.color = "green";
                
                // Get the current mint count
                await this.getMintCount();
            } else {
                statusElement.textContent = "MetaMask not detected! Please install MetaMask.";
                statusElement.style.color = "red";
            }
        } catch (error) {
            console.error("Connection error:", error);
            statusElement.textContent = "Failed to connect: " + (error.message || "Unknown error");
            statusElement.style.color = "red";
        }
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
        if (!this.connected) return;
        
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

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 