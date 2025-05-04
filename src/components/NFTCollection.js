import { GameStateContract } from '../js/contracts/GameStateContract.js';
import { AltarContract } from '../js/contracts/AltarContract.js';

export class NFTCollection {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'nft-collection';
        this.gameState = new GameStateContract();
        this.altar = new AltarContract();
        this.nfts = [];
        this.loading = true;
        this.render();
        this.loadNFTs();
    }

    async loadNFTs() {
        try {
            this.loading = true;
            this.render();

            // Get the user's address
            const address = await this.gameState.getAddress();
            
            // Get all approved collections from GameState
            // Note: In a real implementation, you would need to track approved collections
            const approvedCollections = [/* Add your approved collection addresses here */];
            
            // Load NFTs from each collection
            for (const collectionAddress of approvedCollections) {
                // Get user's NFTs from the collection
                // Note: You'll need to implement this based on your NFT contract
                const nfts = await this.getUserNFTs(collectionAddress, address);
                
                // Get metadata for each NFT
                for (const nft of nfts) {
                    const metadata = await this.gameState.getNFTMetadata(nft.tokenId);
                    const isStaked = await this.altar.isStaked(nft.tokenId);
                    
                    this.nfts.push({
                        id: nft.tokenId,
                        collection: collectionAddress,
                        name: metadata.name || `NFT #${nft.tokenId}`,
                        image: metadata.image || '/images/default-nft.jpg',
                        description: metadata.description || 'A land plot in the Sonicity metaverse',
                        attributes: metadata.attributes || {},
                        isStaked
                    });
                }
            }
        } catch (error) {
            console.error('Error loading NFTs:', error);
        } finally {
            this.loading = false;
            this.render();
        }
    }

    async getUserNFTs(collectionAddress, userAddress) {
        // Implement this method based on your NFT contract
        // This is a placeholder - you'll need to implement the actual logic
        return [];
    }

    async handleStake(tokenId) {
        try {
            await this.altar.stake(tokenId);
            await this.loadNFTs(); // Refresh the list
        } catch (error) {
            console.error('Error staking NFT:', error);
        }
    }

    async handleUnstake(tokenId) {
        try {
            await this.altar.unstake(tokenId);
            await this.loadNFTs(); // Refresh the list
        } catch (error) {
            console.error('Error unstaking NFT:', error);
        }
    }

    render() {
        if (this.loading) {
            this.element.innerHTML = '<div class="loading">Loading NFTs...</div>';
            return;
        }

        this.element.innerHTML = `
            <div class="nft-grid">
                ${this.nfts.map(nft => `
                    <div class="nft-card" data-nft-id="${nft.id}">
                        <div class="nft-image">
                            <img src="${nft.image}" alt="${nft.name}" />
                        </div>
                        <div class="nft-info">
                            <h3>${nft.name}</h3>
                            <p>${nft.description}</p>
                            <div class="nft-attributes">
                                ${Object.entries(nft.attributes).map(([key, value]) => `
                                    <div class="attribute">
                                        <span class="label">${key}:</span>
                                        <span class="value">${value}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="nft-actions">
                                ${nft.isStaked ? 
                                    `<button class="unstake-btn" onclick="this.parentElement.parentElement.parentElement.parentElement.nftCollection.handleUnstake(${nft.id})">Unstake</button>` :
                                    `<button class="stake-btn" onclick="this.parentElement.parentElement.parentElement.parentElement.nftCollection.handleStake(${nft.id})">Stake</button>`
                                }
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Store reference to this instance for button click handlers
        this.element.nftCollection = this;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 