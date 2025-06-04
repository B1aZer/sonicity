import { BasePage } from './BasePage.js';
import { SHOP_ITEMS } from '../js/utils/constants.js';
import { Modal } from '../js/utils/modal.js';
import Logger from '../js/utils/logger.js';

export class ShopPage extends BasePage {
    constructor() {
        super();
        import('../styles/shop-page.css');
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.modal = new Modal();
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Shop</h1>
                <div class="page-section">
                    <h2>Status</h2>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Gold:</span>
                            <span id="gold-amount" class="status-value">0</span>
                        </div>
                    </div>
                </div>
                <div class="page-section">
                    <h2>Available Items</h2>
                    <div class="buildings-grid-rows">
                        ${SHOP_ITEMS.map(item => `
                            <div class="shop-item-card">
                                <div class="shop-item-image">
                                    <img src="${item.image.replace('emergency_help', 'help').replace('production_boost', 'boost').replace('cosmetic_item', 'cosmetic')}" alt="${item.name}" />
                                </div>
                                <div class="shop-item-info">
                                    <div class="shop-item-title-row">
                                        <h3>${item.name}</h3>
                                    </div>
                                    <div class="shop-item-desc">${item.description}</div>
                                    <div class="shop-item-cost">
                                        <div class="cost-item">
                                            <i class="fas fa-coins cost-icon"></i>
                                            <span class="cost-value">${item.cost}</span>
                                        </div>
                                        <span class="shop-item-stock ${item.count > 0 ? 'in-stock' : 'out-of-stock'}">
                                            <i class="fas ${item.count > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                            ${item.count > 0 ? `${item.count} in stock` : 'Out of stock'}
                                        </span>
                                    </div>
                                </div>
                                <div class="shop-item-action-row">
                                    <button class="btn btn-primary buy-btn" data-item-id="${item.id}" ${item.count === 0 ? 'disabled' : ''}>
                                        <i class="fas fa-shopping-cart"></i>
                                        ${item.cost > 0 ? 'Buy' : 'Claim'}
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        this.setupBuyHandlers();
    }

    setupBuyHandlers() {
        const buyButtons = this.element.querySelectorAll('.buy-btn');
        buyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = btn.getAttribute('data-item-id');
                const item = SHOP_ITEMS.find(i => i.id === itemId);
                if (!item) return;
                Logger.info(`Shop: Attempting to buy item: ${item.name}`);
                this.modal.confirm(
                    item.cost > 0 ? `Buy <b>${item.name}</b> for <b>${item.cost} Gold</b>?` : `Claim <b>${item.name}</b> for FREE?`,
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