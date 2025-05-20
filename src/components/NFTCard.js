import Logger from '../js/utils/logger.js';

export class NFTCard {
    constructor(options = {}) {
        this.options = {
            showStakeButton: false,
            showUnstakeButton: false,
            onStake: null,
            onUnstake: null,
            ...options
        };
    }

    render(nft) {
        const { tokenId, metadata, gameStateMetadata, contractAddress } = nft;
        const districts = ['Central', 'North', 'East', 'South'];

        return `
            <div class="nft-card" data-collection="${contractAddress}">
                <div class="nft-image">
                    <img src="${metadata.image}" onerror="this.src='/images/placeholder.jpg'" alt="Land Plot #${tokenId}" />
                </div>
                <div class="nft-info">
                    <h3>${metadata.name}</h3>
                    <p class="description">${metadata.description}</p>
                    <div class="nft-attributes">
                        <div class="attribute">
                            <span class="label">District:</span>
                            <span class="value">${districts[gameStateMetadata.district]}</span>
                        </div>
                        <div class="attribute">
                            <span class="label">Building Slots:</span>
                            <span class="value">${gameStateMetadata.buildingSlots}</span>
                        </div>
                    </div>
                    ${this.renderActionButtons(tokenId)}
                </div>
            </div>
        `;
    }

    renderActionButtons(tokenId) {
        if (!this.options.showStakeButton && !this.options.showUnstakeButton) {
            return '';
        }

        if (this.options.showStakeButton) {
            return `
                <button class="stake-button" data-token-id="${tokenId}">
                    Stake NFT
                </button>
            `;
        }

        if (this.options.showUnstakeButton) {
            return `
                <button class="unstake-button" data-token-id="${tokenId}">
                    Unstake NFT
                </button>
            `;
        }

        return '';
    }

    attachEventListeners(element) {
        if (!element) {
            Logger.warn('No element provided to attach event listeners');
            return;
        }

        if (this.options.showStakeButton && this.options.onStake) {
            const stakeButton = element.querySelector('.stake-button');
            if (stakeButton) {
                stakeButton.addEventListener('click', () => {
                    const tokenId = stakeButton.dataset.tokenId;
                    const collection = element.dataset.collection;
                    this.options.onStake(tokenId, collection);
                });
            }
        }

        if (this.options.showUnstakeButton && this.options.onUnstake) {
            const unstakeButton = element.querySelector('.unstake-button');
            if (unstakeButton) {
                unstakeButton.addEventListener('click', () => {
                    const tokenId = unstakeButton.dataset.tokenId;
                    const collection = element.dataset.collection;
                    this.options.onUnstake(tokenId, collection);
                });
            }
        }
    }
} 