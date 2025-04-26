import { ethers } from 'ethers';
import SonicityNFTABI from '../../contracts/artifacts/contracts/SonicityNFT.sol/SonicityNFT.json';
import { CONTRACT_ADDRESSES } from '../js/utils/constants.js';

export class AccessPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'access-page';
        this.connected = false;
        this.account = null;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.contractAddress = CONTRACT_ADDRESSES.SONICITY_NFT;
        this.hasNFT = false;
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="access-container">
                <h1>Welcome to Sonicity</h1>
                <p class="access-message">Please mint your NFTs to access the game</p>
                
                <div class="access-status">
                    <div class="status-item">
                        <span class="status-label">Wallet:</span>
                        <span id="wallet-status" class="status-value">Not Connected</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">NFT Status:</span>
                        <span id="nft-status" class="status-value">Not Verified</span>
                    </div>
                </div>
                
                <div class="access-actions">
                    <button id="connect-wallet" class="connect-button">Connect Wallet</button>
                    <a href="/mint" class="mint-link">Go to Mint Page</a>
                </div>
                
                <div id="access-status" class="access-message"></div>
            </div>
        `;

        // Connect wallet button
        const connectWalletBtn = this.element.querySelector('#connect-wallet');
        connectWalletBtn.addEventListener('click', () => this.connectWallet());
    }

    async connectWallet() {
        const statusElement = this.element.querySelector('#access-status');
        const walletStatus = this.element.querySelector('#wallet-status');
        const nftStatus = this.element.querySelector('#nft-status');
        const connectButton = this.element.querySelector('#connect-wallet');
        
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
                walletStatus.textContent = shortenedAccount;
                walletStatus.style.color = "#4CAF50";
                
                this.connected = true;
                
                // Check for NFT ownership
                await this.checkNFTOwnership();
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

    async checkNFTOwnership() {
        const statusElement = this.element.querySelector('#access-status');
        const nftStatus = this.element.querySelector('#nft-status');
        
        try {
            // Get balance of NFTs for the connected account
            const balance = await this.contract.balanceOf(this.account);
            this.hasNFT = balance.gt(0);
            
            if (this.hasNFT) {
                nftStatus.textContent = "Verified";
                nftStatus.style.color = "#4CAF50";
                statusElement.textContent = "Access granted! Redirecting to game...";
                statusElement.style.color = "#4CAF50";
                
                // Dispatch event to notify main app
                window.dispatchEvent(new CustomEvent('nftVerified'));
            } else {
                nftStatus.textContent = "No NFTs Found";
                nftStatus.style.color = "#ff4444";
                statusElement.textContent = "Please mint an NFT to access the game";
                statusElement.style.color = "#ff4444";
            }
        } catch (error) {
            console.error("NFT check error:", error);
            nftStatus.textContent = "Check Failed";
            nftStatus.style.color = "#ff4444";
            statusElement.textContent = "Failed to verify NFT ownership";
            statusElement.style.color = "red";
        }
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 