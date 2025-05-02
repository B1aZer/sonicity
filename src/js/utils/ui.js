import { BUILDING_TYPES } from './constants.js';

export class UI {
    constructor() {
        // Get references to HTML elements
        this.uiContainer = document.getElementById('ui-container');
        this.resourceDisplay = document.getElementById('resource-display');
        this.moneyDisplay = document.getElementById('money-display');
        
        // Initialize UI
        this.initUI();
    }

    initUI() {
        // Hide UI initially
        this.hide();
    }

    show() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'block';
        }
    }

    hide() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
        }
    }

    updateUI(money, resources) {
        // Update money display
        if (this.moneyDisplay) {
            this.moneyDisplay.textContent = `Money: $${money}`;
        }

        // Update resource display
        if (this.resourceDisplay) {
            let resourceText = 'Resources: ';
            for (const [resource, amount] of Object.entries(resources)) {
                resourceText += `${resource}: ${amount} `;
            }
            this.resourceDisplay.textContent = resourceText;
        }
    }
}