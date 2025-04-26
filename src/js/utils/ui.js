import { BUILDING_TYPES, BUILDING_TYPES_KEYS } from './constants.js';

export class UI {
    constructor(onBuildingSelectCallback, onRestartRequestCallback) {
        // Store callbacks
        this.onBuildingSelect = onBuildingSelectCallback;
        this.onRestartRequest = onRestartRequestCallback;
        this.currentlySelectedTypeKey = null;
        
        // Get references to HTML elements
        this.uiContainer = document.getElementById('ui-container');
        this.resourceDisplay = document.getElementById('resource-display');
        this.moneyDisplay = document.getElementById('money-display');
        this.buildingSelectorContainer = document.getElementById('building-selector-container');
        
        // Store buttons for state management
        this.buildingButtons = {};
        
        // Initialize UI
        this.initUI();
    }

    initUI() {
        // Hide UI initially
        this.hide();
        
        // Create building buttons
        BUILDING_TYPES_KEYS.forEach(typeKey => {
            const buildingData = BUILDING_TYPES[typeKey];
            const button = document.createElement('button');
            button.textContent = `${buildingData.name} ($${buildingData.cost})`;
            button.classList.add('game-button');
            button.dataset.type = typeKey;
            
            button.addEventListener('click', () => {
                if (this.onBuildingSelect) {
                    this.onBuildingSelect(typeKey);
                }
            });
            
            this.buildingSelectorContainer.appendChild(button);
            this.buildingButtons[typeKey] = button;
        });
        
        // Add Bulldoze button
        const bulldozeButton = document.createElement('button');
        bulldozeButton.textContent = 'Bulldoze';
        bulldozeButton.id = 'bulldoze-button';
        bulldozeButton.classList.add('game-button');
        bulldozeButton.dataset.type = 'BULLDOZE';
        
        bulldozeButton.addEventListener('click', () => {
            if (this.onBuildingSelect) {
                this.onBuildingSelect('BULLDOZE');
            }
        });
        
        this.buildingSelectorContainer.appendChild(bulldozeButton);
        this.buildingButtons['BULLDOZE'] = bulldozeButton;
        
        // Add Restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart';
        restartButton.id = 'restart-button';
        restartButton.classList.add('game-button');
        restartButton.dataset.type = 'RESTART';
        
        restartButton.addEventListener('click', (event) => {
            console.log("UI: Restart button clicked.");
            event.stopPropagation();
            if (this.onRestartRequest) {
                console.log("UI: onRestartRequest callback exists. Calling immediately...");
                this.onRestartRequest();
            }
        });
        
        this.buildingSelectorContainer.appendChild(restartButton);
        this.buildingButtons['RESTART'] = restartButton;
        
        // Initial update
        this.updateResourceDisplay(5000, { balance: 0, supply: 0, demand: 0 }, { balance: 0, supply: 0, demand: 0 });
    }
    
    updateResourceDisplay(money, electricity, water) {
        // Update money display
        const moneyAmount = document.getElementById('money-amount');
        if (moneyAmount) {
            moneyAmount.textContent = `$${money}`;
        }
        
        // Update electricity display
        const electricityBalance = document.getElementById('electricity-balance');
        const electricitySupply = document.getElementById('electricity-supply');
        const electricityDemand = document.getElementById('electricity-demand');
        
        if (electricityBalance && electricitySupply && electricityDemand) {
            const powerBalance = electricity.balance;
            const powerColor = powerBalance >= 0 ? 'lightgreen' : 'lightcoral';
            
            electricityBalance.textContent = powerBalance;
            electricityBalance.style.color = powerColor;
            electricitySupply.textContent = electricity.supply;
            electricityDemand.textContent = electricity.demand;
        }
        
        // Update water display
        const waterBalance = document.getElementById('water-balance');
        const waterSupply = document.getElementById('water-supply');
        const waterDemand = document.getElementById('water-demand');
        
        if (waterBalance && waterSupply && waterDemand) {
            const waterBalanceValue = water.balance;
            const waterColor = waterBalanceValue >= 0 ? 'lightblue' : 'lightcoral';
            
            waterBalance.textContent = waterBalanceValue;
            waterBalance.style.color = waterColor;
            waterSupply.textContent = water.supply;
            waterDemand.textContent = water.demand;
        }
    }
    
    updateSelectionVisuals(selectedTypeKey, currentMoney) {
        // If money is -1, it's just a style refresh request, don't overwrite selection
        if (currentMoney !== -1) {
            this.currentlySelectedTypeKey = selectedTypeKey;
        }
        
        // Use the stored currentlySelectedTypeKey for styling
        const activeSelection = this.currentlySelectedTypeKey;
        
        for (const typeKey in this.buildingButtons) {
            const button = this.buildingButtons[typeKey];
            if (!button) continue;
            
            // Handle Bulldoze button styling separately
            if (typeKey === 'BULLDOZE') {
                if (activeSelection === 'BULLDOZE') {
                    button.classList.add('selected');
                } else {
                    button.classList.remove('selected');
                }
                button.disabled = false;
                continue;
            } else if (typeKey === 'RESTART') {
                // Restart button styling is handled by CSS
                button.disabled = false;
                continue;
            }
            
            // Handle building buttons
            const buildingData = BUILDING_TYPES[typeKey];
            if (!buildingData) {
                console.warn(`Building data not found for key: ${typeKey}`);
                continue;
            }
            
            const cost = buildingData.cost || 0;
            const canAfford = (currentMoney === -1) ? true : currentMoney >= cost;
            
            // Reset base styles
            button.disabled = false;
            
            // Style based on affordability
            if (currentMoney !== -1 && !canAfford) {
                button.classList.add('unaffordable');
                button.disabled = true;
            } else {
                button.classList.remove('unaffordable');
                
                if (typeKey === activeSelection) {
                    button.classList.add('selected');
                } else {
                    button.classList.remove('selected');
                }
            }
        }
    }
    
    show() {
        if (this.uiContainer) this.uiContainer.style.display = 'block';
        if (this.buildingSelectorContainer) this.buildingSelectorContainer.style.display = 'flex';
    }
    
    hide() {
        if (this.uiContainer) this.uiContainer.style.display = 'none';
        if (this.buildingSelectorContainer) this.buildingSelectorContainer.style.display = 'none';
    }
    
    destroy() {
        // No need to remove elements as they're now in the HTML
        // Just clear event listeners if needed
        for (const typeKey in this.buildingButtons) {
            const button = this.buildingButtons[typeKey];
            if (button) {
                // Clone and replace to remove event listeners
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
            }
        }
    }
}