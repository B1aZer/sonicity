import { BUILDING_TYPES, BUILDING_TYPES_KEYS } from './constants.js';

export class UI { // Keep only one class definition
    constructor(onBuildingSelectCallback, onRestartRequestCallback) { // Add callbacks for selection & restart
        this.uiContainer = null;
        this.resourceDisplay = null;
        this.moneyDisplay = null; // Add element for money
        this.buildingSelectorContainer = null; // Add container for buttons
        this.buildingButtons = {}; // Store buttons to manage state
        this.onBuildingSelect = onBuildingSelectCallback; // Store the building/bulldoze callback
        this.onRestartRequest = onRestartRequestCallback; // Store the restart callback
        this.currentlySelectedTypeKey = null; // Track selection for styling ('BULLDOZE' or building type key)
        this.initUI();
    }

    initUI() {
        // Create a container div for UI elements
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'ui-container'; // Assign an ID
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '10px';
        this.uiContainer.style.left = '10px';
        this.uiContainer.style.display = 'none'; // Initially hidden
        this.uiContainer.style.padding = '10px';
        this.uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.uiContainer.style.color = 'white';
        this.uiContainer.style.fontFamily = 'Arial, sans-serif';
        this.uiContainer.style.fontSize = '14px';
        this.uiContainer.style.borderRadius = '5px';
        this.uiContainer.style.pointerEvents = 'none'; // Top bar doesn't need clicks
        this.uiContainer.style.userSelect = 'none'; // Prevent text selection
        // --- Top Info Bar ---
        this.resourceDisplay = document.createElement('div'); // Holds electricity/water
        this.moneyDisplay = document.createElement('div'); // Holds money
        this.moneyDisplay.style.marginTop = '5px'; // Space between resources and money
        this.uiContainer.appendChild(this.resourceDisplay);
        this.uiContainer.appendChild(this.moneyDisplay);
        document.body.appendChild(this.uiContainer); // Add top bar to body
        // --- Bottom Building Selector Bar ---
        this.buildingSelectorContainer = document.createElement('div');
        this.buildingSelectorContainer.id = 'building-selector-container';
        this.buildingSelectorContainer.style.position = 'absolute';
        this.buildingSelectorContainer.style.bottom = '20px';
        this.buildingSelectorContainer.style.left = '50%';
        this.buildingSelectorContainer.style.display = 'none'; // Initially hidden
        this.buildingSelectorContainer.style.transform = 'translateX(-50%)';
        this.buildingSelectorContainer.style.padding = '10px';
        this.buildingSelectorContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        this.buildingSelectorContainer.style.borderRadius = '8px';
        this.buildingSelectorContainer.style.display = 'flex';
        this.buildingSelectorContainer.style.gap = '10px';
        this.buildingSelectorContainer.style.pointerEvents = 'auto'; // Enable clicks on this bar
        this.buildingSelectorContainer.style.userSelect = 'none';
        // Create buttons for each building type
        BUILDING_TYPES_KEYS.forEach(typeKey => {
            const buildingData = BUILDING_TYPES[typeKey];
            const button = document.createElement('button');
            button.textContent = `${buildingData.name} ($${buildingData.cost})`;
            button.style.padding = '8px 12px';
            button.style.border = '1px solid #555';
            button.style.borderRadius = '4px';
            button.style.backgroundColor = '#333';
            button.style.color = 'white';
            button.style.cursor = 'pointer';
            button.style.fontFamily = 'Arial, sans-serif';
            button.style.fontSize = '13px';
            button.addEventListener('click', () => {
                 if (this.onBuildingSelect) {
                    this.onBuildingSelect(typeKey); // Call the callback
                 }
            });
            // Add hover effect styling
            button.onmouseenter = () => button.style.backgroundColor = '#555';
            button.onmouseleave = () => {
                 // Restore background based on selection state (handled in updateSelectionVisuals)
                 this.updateSelectionVisuals(this.currentlySelectedTypeKey);
            }
            this.buildingSelectorContainer.appendChild(button);
            this.buildingButtons[typeKey] = button; // Store button reference
        });
        document.body.appendChild(this.buildingSelectorContainer); // Add bottom bar to body
        // Initial text for top bar
        // Initial text for top bar - pass initial money too
        this.updateResourceDisplay(5000, { balance: 0, supply: 0, demand: 0 }, { balance: 0, supply: 0, demand: 0 });
        // Add Bulldoze button after building types
        const bulldozeButton = document.createElement('button');
        bulldozeButton.textContent = 'Bulldoze';
        bulldozeButton.id = 'bulldoze-button'; // Give it an ID for easier styling/selection
        bulldozeButton.style.padding = '8px 12px';
        bulldozeButton.style.border = '1px solid #e0a800'; // Darker yellow border (consistent with active)
        bulldozeButton.style.borderRadius = '4px';
        bulldozeButton.style.backgroundColor = '#ffc107'; // Yellow background (default)
        bulldozeButton.style.color = '#212529'; // Dark text for yellow background
        bulldozeButton.style.cursor = 'pointer';
        bulldozeButton.style.fontFamily = 'Arial, sans-serif';
        bulldozeButton.style.fontSize = '13px';
        bulldozeButton.style.marginLeft = '15px'; // Add some space before it
        bulldozeButton.addEventListener('click', () => {
             if (this.onBuildingSelect) {
                this.onBuildingSelect('BULLDOZE'); // Special key for bulldoze mode
             }
        });
        // Hover effect
        bulldozeButton.onmouseenter = () => {
            if (this.currentlySelectedTypeKey !== 'BULLDOZE') { // Only darken if not active
                bulldozeButton.style.backgroundColor = '#e0a800'; // Darker yellow on hover
                bulldozeButton.style.borderColor = '#d39e00';
             }
         };
         bulldozeButton.onmouseleave = () => {
             this.updateSelectionVisuals(this.currentlySelectedTypeKey, -1); // Use -1 money to just refresh style
         };
        this.buildingSelectorContainer.appendChild(bulldozeButton);
        this.buildingButtons['BULLDOZE'] = bulldozeButton; // Add to button map
        // --- Add RED Restart Button ---
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart';
        restartButton.id = 'restart-button';
        restartButton.style.padding = '8px 12px';
        restartButton.style.border = '1px solid #dc3545'; // Red border
        restartButton.style.borderRadius = '4px';
        restartButton.style.backgroundColor = '#dc3545'; // Red background
        restartButton.style.color = 'white';
        restartButton.style.cursor = 'pointer';
        restartButton.style.fontFamily = 'Arial, sans-serif';
        restartButton.style.fontSize = '13px';
        restartButton.style.marginLeft = '10px'; // Space between bulldoze and restart
        // Pass the event object to the handler
        restartButton.addEventListener('click', (event) => {
            console.log("UI: Restart button clicked."); // Log 1: Button click detected
            event.stopPropagation(); // Stop the click from bubbling up immediately
            if (this.onRestartRequest) {
                 console.log("UI: onRestartRequest callback exists. Calling immediately..."); // Log 2: Callback check & immediate call
                 // Skip confirmation dialog as it seems unreliable in this env
                 this.onRestartRequest(); // Call the restart callback directly
            }
        });
        // Hover effect
        restartButton.onmouseenter = () => {
            restartButton.style.backgroundColor = '#c82333'; // Darker red
            restartButton.style.borderColor = '#bd2130';
        };
        restartButton.onmouseleave = () => {
             restartButton.style.backgroundColor = '#dc3545'; // Restore original red
             restartButton.style.borderColor = '#dc3545';
        };
        this.buildingSelectorContainer.appendChild(restartButton);
        this.buildingButtons['RESTART'] = restartButton; // Add to button map
        // Initial text for top bar - pass initial money too
        this.updateResourceDisplay(5000, { balance: 0, supply: 0, demand: 0 }, { balance: 0, supply: 0, demand: 0 });
    }
    updateResourceDisplay(money, electricity, water) {
        // Update money display
        this.moneyDisplay.innerHTML = `Money: <span style="color: #FFD700; font-weight: bold;">$${money}</span>`; // Gold color for money
        // Update resource display
        const powerBalance = electricity.balance;
        const waterBalance = water.balance;
        const powerColor = powerBalance >= 0 ? 'lightgreen' : 'lightcoral';
        const waterColor = waterBalance >= 0 ? 'lightblue' : 'lightcoral';
        this.resourceDisplay.innerHTML = `
            Electricity: <span style="color: ${powerColor}; font-weight: bold;">${powerBalance}</span> (S: ${electricity.supply} / D: ${electricity.demand})<br>
            Water: <span style="color: ${waterColor}; font-weight: bold;">${waterBalance}</span> (S: ${water.supply} / D: ${water.demand})
        `;
    }
    // Method to update the visual state of selection buttons, considering affordability
    updateSelectionVisuals(selectedTypeKey, currentMoney) {
        // If money is -1, it's just a style refresh request, don't overwrite selection
        if (currentMoney !== -1) {
             this.currentlySelectedTypeKey = selectedTypeKey; // Remember selection
        }
         // Use the stored currentlySelectedTypeKey for styling
        const activeSelection = this.currentlySelectedTypeKey;
        for (const typeKey in this.buildingButtons) {
            const button = this.buildingButtons[typeKey];
             if (!button) continue; // Safety check
             // Handle Bulldoze button styling separately
            if (typeKey === 'BULLDOZE') {
                if (activeSelection === 'BULLDOZE') {
                    // Active Bulldoze style (Yellow, maybe add slightly brighter effect or keep same)
                    // Let's keep it the same yellow but ensure the shadow is present
                    button.style.backgroundColor = '#ffc107'; // Yellow
                    button.style.borderColor = '#e0a800';     // Darker yellow border
                    button.style.color = '#212529';          // Dark text for contrast
                    button.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.9)'; // Yellow glow
                } else {
                    // Inactive Bulldoze style (Base Yellow)
                    button.style.backgroundColor = '#ffc107'; // Base Yellow
                    button.style.borderColor = '#e0a800';     // Base Darker yellow border
                    button.style.color = '#212529';          // Base Dark text
                     button.style.boxShadow = 'none';
                 }
                 button.disabled = false; // Bulldoze is always usable
                 button.style.cursor = 'pointer';
                 button.style.opacity = '1';
                 continue; // Skip the rest of the loop for Bulldoze button
             } else if (typeKey === 'RESTART') {
                 // Style for Restart button (always RED, non-selectable state)
                 button.style.backgroundColor = '#dc3545'; // Red
                 button.style.borderColor = '#dc3545';
                 button.style.color = 'white';
                 button.style.boxShadow = 'none';
                 button.disabled = false;
                 button.style.cursor = 'pointer';
                 button.style.opacity = '1';
                 continue; // Skip the rest of the loop for Restart button
            }
            // --- Styling for regular building buttons ---
            // --- Styling for regular building buttons ---
             const buildingData = BUILDING_TYPES[typeKey];
             // Check if buildingData exists - robustness for future changes
             if (!buildingData) {
                 console.warn(`Building data not found for key: ${typeKey}`);
                 continue;
             }
             const cost = buildingData.cost || 0;
             // Only check affordability if money was provided (not -1)
             const canAfford = (currentMoney === -1) ? true : currentMoney >= cost; // Assume affordable on style refresh
            // Reset base styles
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.disabled = false; // Re-enable by default
            // Style based on affordability (only if money is provided)
             if (currentMoney !== -1 && !canAfford) {
                button.style.backgroundColor = '#555'; // Dim unaffordable buttons
                button.style.borderColor = '#777';
                button.style.color = '#aaa';
                button.style.cursor = 'not-allowed';
                button.disabled = true; // Disable clicking
                 button.style.boxShadow = 'none'; // Remove shadow if selected but unaffordable
             } else {
                 // Style for affordable buttons (selected vs not selected)
                 // Use activeSelection for comparison
                 if (typeKey === activeSelection) {
                    // Style for selected AND affordable button
                    button.style.backgroundColor = '#007bff';
                    button.style.borderColor = '#fff';
                    button.style.color = 'white';
                    button.style.boxShadow = '0 0 5px rgba(0, 123, 255, 0.7)';
                 } else {
                    // Style for non-selected but affordable buttons
                    button.style.backgroundColor = '#333';
                    button.style.borderColor = '#555';
                    button.style.color = 'white';
                    button.style.boxShadow = 'none';
                }
            }
            // Adjust hover effect based on affordability
             button.onmouseenter = () => {
                 // Re-check affordability for hover effect
                 const currentlyCanAfford = (currentMoney === -1) ? true : currentMoney >= cost;
                 if (currentlyCanAfford && typeKey !== activeSelection) {
                     button.style.backgroundColor = '#555'; // Hover for affordable, non-selected
                 } else if (currentlyCanAfford && typeKey === activeSelection) {
                     // Keep selected style on hover if affordable
                 }
             };
             button.onmouseleave = () => {
                  // Re-apply the correct state style on mouse leave
                  const currentlyCanAfford = (currentMoney === -1) ? true : currentMoney >= cost; // Check again
                  if (currentMoney !== -1 && !currentlyCanAfford) {
                     button.style.backgroundColor = '#555';
                 } else if (typeKey === activeSelection) {
                     button.style.backgroundColor = '#007bff';
                 } else {
                     button.style.backgroundColor = '#333';
                 }
             };
        }
    }
    // Method to show the UI elements
    show() {
        if (this.uiContainer) this.uiContainer.style.display = 'block';
        if (this.buildingSelectorContainer) this.buildingSelectorContainer.style.display = 'flex'; // Use flex for layout
    }
    // Method to hide the UI elements
    hide() {
        if (this.uiContainer) this.uiContainer.style.display = 'none';
        if (this.buildingSelectorContainer) this.buildingSelectorContainer.style.display = 'none';
    }
    // Method to remove UI if needed
    destroy() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
         if (this.buildingSelectorContainer && this.buildingSelectorContainer.parentNode) {
            this.buildingSelectorContainer.parentNode.removeChild(this.buildingSelectorContainer);
        }
    }
}