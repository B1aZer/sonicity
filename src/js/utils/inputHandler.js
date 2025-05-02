import * as THREE from 'three';

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.boundOnClick = this.onClick.bind(this);
    }

    setupEventListeners() {
        // Remove any existing listeners first
        this.removeEventListeners();
        
        // Add click listener to the renderer's DOM element
        if (this.game.renderer && this.game.renderer.domElement) {
            this.game.renderer.domElement.addEventListener('click', this.boundOnClick);
            console.log("InputHandler: Click listener added to renderer");
        } else {
            console.error("InputHandler: Renderer or DOM element not available");
        }
    }

    removeEventListeners() {
        if (this.game.renderer && this.game.renderer.domElement) {
            this.game.renderer.domElement.removeEventListener('click', this.boundOnClick);
            console.log("InputHandler: Click listener removed");
        }
    }

    onClick(event) {
        console.log("InputHandler: Click detected");
        
        // Prevent clicking on UI elements
        if (event.target !== this.game.renderer.domElement) {
            let targetElement = event.target;
            while (targetElement != null) {
                if (targetElement.id === 'ui-container' || targetElement.id === 'building-selector-container') {
                    console.log("InputHandler: Clicked on UI element, ignoring");
                    return;
                }
                targetElement = targetElement.parentElement;
            }
        }

        // TODO: Implement building click interaction here
    }

    dispose() {
        this.removeEventListeners();
    }
}