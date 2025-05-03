import { BUILDING_TYPES } from './constants.js';

export class UI {
    constructor() {
        // Get references to HTML elements
        this.uiContainer = document.getElementById('ui-container');
        this.goldDisplay = document.getElementById('gold-amount');
        
        // Initialize UI
        this.initUI();
    }

    // Initialize UI elements
    initUI() {
        // Hide UI initially
        this.hide();
    }

    // Show UI
    show() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'block';
        }
    }

    // Hide UI
    hide() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
        }
    }

    // Update UI elements with current data
    updateUI(money, resources) {
        // For backwards compatibility, accept both parameters but only use money
        const displayMoney = money || (resources && resources.money) || 0;
        
        // Update gold display
        if (this.goldDisplay) {
            this.goldDisplay.textContent = displayMoney;
        }
    }
}