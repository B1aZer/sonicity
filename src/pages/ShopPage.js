import { BasePage } from './BasePage.js';
import { SHOP_ITEMS } from '../js/utils/constants.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';
import '../styles/shop-page.css';
import '../styles/building.css';
import '../styles/buttons.css';

export class ShopPage extends BasePage {
    constructor() {
        super();
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Shop</h1>
                <div class="buildings-grid">
                    ${SHOP_ITEMS.map(item => `
                        <div class="building-card shop-item-card">
                            <div class="shop-item-image">
                                <img src="${item.image.replace('emergency_help', 'help').replace('production_boost', 'boost').replace('cosmetic_item', 'cosmetic')}" alt="${item.name}" />
                            </div>
                            <div class="shop-item-info">
                                <div class="shop-item-title-row">
                                    <h3>${item.name}</h3>
                                    <span class="shop-item-stock">${item.count > 0 ? `In stock: ${item.count}` : 'Out of stock'}</span>
                                </div>
                                <div class="shop-item-desc">${item.description}</div>
                            </div>
                            <div class="shop-item-action-row">
                                <button class="btn btn-primary shop-buy-btn" data-item-id="${item.id}" ${item.count === 0 ? 'disabled' : ''}>
                                    ${item.count === 0 ? 'Out of Stock' : (item.cost > 0 ? `Buy for ${item.cost} ${item.currency}` : 'Get for FREE')}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.setupBuyHandlers();
    }

    setupBuyHandlers() {
        const buyButtons = this.element.querySelectorAll('.shop-buy-btn');
        buyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.getAttribute('data-item-id');
                const item = SHOP_ITEMS.find(i => i.id === itemId);
                if (!item) return;
                Logger.info(`Shop: Attempting to buy item: ${item.name}`);
                this.modal.confirm(
                    item.cost > 0 ? `Buy <b>${item.name}</b> for <b>${item.cost} ${item.currency}</b>?` : `Claim <b>${item.name}</b> for FREE?`,
                    { title: 'Confirm Purchase' }
                ).then(result => {
                    if (result.isConfirmed) {
                        Logger.info(`Shop: Purchased item: ${item.name}`);
                        this.modal.success(`You have purchased <b>${item.name}</b>!`);
                    }
                });
            });
        });
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 