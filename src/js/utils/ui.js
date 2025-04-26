import { BUILDING_TYPES } from './constants.js';

export class UI {
    constructor(onBuildingSelect, onRestart) {
        this.onBuildingSelect = onBuildingSelect;
        this.onRestart = onRestart;
        
        // Get UI elements
        this.uiContainer = document.getElementById('ui-container');
        this.buildingSelectorContainer = document.getElementById('building-selector-container');
        this.restartButton = document.getElementById('restart-button');
        this.bulldozeButton = document.getElementById('bulldoze-button');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize resource display
        this.initializeResourceDisplay();
    }
    
    setupEventListeners() {
        // Set up building buttons
        const buildingButtons = document.querySelectorAll('.game-button[data-building]');
        buildingButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                buildingButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Get the building type
                const buildingType = button.getAttribute('data-building');
                
                // Call the callback
                if (this.onBuildingSelect) {
                    this.onBuildingSelect(buildingType);
                }
            });
        });
        
        // Set up bulldoze button
        if (this.bulldozeButton) {
            this.bulldozeButton.addEventListener('click', () => {
                // Toggle active class
                this.bulldozeButton.classList.toggle('active');
                
                // Remove active class from all building buttons
                buildingButtons.forEach(btn => btn.classList.remove('active'));
                
                // Call the callback with null (bulldoze mode)
                if (this.onBuildingSelect) {
                    this.onBuildingSelect(this.bulldozeButton.classList.contains('active') ? null : 'house');
                }
            });
        }
        
        // Set up restart button
        if (this.restartButton) {
            this.restartButton.addEventListener('click', () => {
                if (this.onRestart) {
                    this.onRestart();
                }
            });
        }
    }
    
    initializeResourceDisplay() {
        // Create resource display elements if they don't exist
        if (!document.getElementById('resource-display')) {
            const resourceDisplay = document.createElement('div');
            resourceDisplay.id = 'resource-display';
            resourceDisplay.className = 'resource-display';
            
            // Create money display
            const moneyDisplay = document.createElement('div');
            moneyDisplay.id = 'money-display';
            moneyDisplay.className = 'resource-item';
            moneyDisplay.innerHTML = '<span class="resource-label">Money:</span> <span class="resource-value">$1000</span>';
            
            // Create electricity display
            const electricityDisplay = document.createElement('div');
            electricityDisplay.id = 'electricity-display';
            electricityDisplay.className = 'resource-item';
            electricityDisplay.innerHTML = '<span class="resource-label">Electricity:</span> <span class="resource-value">0</span>';
            
            // Create water display
            const waterDisplay = document.createElement('div');
            waterDisplay.id = 'water-display';
            waterDisplay.className = 'resource-item';
            waterDisplay.innerHTML = '<span class="resource-label">Water:</span> <span class="resource-value">0</span>';
            
            // Add displays to resource display
            resourceDisplay.appendChild(moneyDisplay);
            resourceDisplay.appendChild(electricityDisplay);
            resourceDisplay.appendChild(waterDisplay);
            
            // Add resource display to UI container
            this.uiContainer.appendChild(resourceDisplay);
        }
    }
    
    updateResources(resources) {
        // Update money display
        const moneyDisplay = document.getElementById('money-display');
        if (moneyDisplay) {
            const moneyValue = moneyDisplay.querySelector('.resource-value');
            if (moneyValue) {
                moneyValue.textContent = `$${resources.money}`;
            }
        }
        
        // Update electricity display
        const electricityDisplay = document.getElementById('electricity-display');
        if (electricityDisplay) {
            const electricityValue = electricityDisplay.querySelector('.resource-value');
            if (electricityValue) {
                electricityValue.textContent = resources.electricity;
            }
        }
        
        // Update water display
        const waterDisplay = document.getElementById('water-display');
        if (waterDisplay) {
            const waterValue = waterDisplay.querySelector('.resource-value');
            if (waterValue) {
                waterValue.textContent = resources.water;
            }
        }
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
} 