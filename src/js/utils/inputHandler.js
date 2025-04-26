import * as THREE from 'three';
import { BUILDING_TYPES_KEYS } from './constants.js';

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('click', (event) => this.onClick(event));
        // window.addEventListener('keydown', (event) => this.onKeyDown(event)); // Remove keydown listener
    }

    onClick(event) {
        // Prevent placement if clicking on UI elements (if any were added)
        if (event.target !== this.game.renderer.domElement) {
            // A simplistic check; more robust UI handling might be needed
            // if complex DOM UI is overlaid.
             // Check if target or parent is UI element
             let targetElement = event.target;
            // Check if the click originated within either UI container
             while (targetElement != null) {
                 if (targetElement.id === 'ui-container' || targetElement.id === 'building-selector-container') {
                     console.log("Clicked on UI bar, ignoring placement.");
                     return;
                 }
                 targetElement = targetElement.parentElement;
             }
        }

        this.game.handlePlacement(event);
    }
    // onKeyDown(event) { ... } // Removed this method entirely
    dispose() {
        // Remove event listeners if the game needs cleanup
        window.removeEventListener('click', this.onClick);
        // window.removeEventListener('keydown', this.onKeyDown); // Removed listener cleanup
    }
}