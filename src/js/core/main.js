import * as THREE from 'three';
import { Game } from './game.js';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the render div
    const renderDiv = document.getElementById('renderDiv');
    
    if (!renderDiv) {
        console.error('Render div not found');
        return;
    }
    
    // Create a new game instance
    const game = new Game(renderDiv);
    
    // Initialize the game
    game.init();
    
    // Start the game when the loading screen is hidden
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        // Hide loading screen after a short delay to ensure assets are loaded
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            // Start the game
            game.start();
        }, 2000);
    } else {
        // If no loading screen, start the game immediately
        game.start();
    }
    
    // Set up restart button
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            game.restart();
        });
    }
    
    // Set up building buttons
    const buildingButtons = document.querySelectorAll('.game-button[data-building]');
    buildingButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            buildingButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Set the selected building type
            const buildingType = button.getAttribute('data-building');
            game.setSelectedBuilding(buildingType);
        });
    });
    
    // Set up bulldoze button
    const bulldozeButton = document.getElementById('bulldoze-button');
    if (bulldozeButton) {
        bulldozeButton.addEventListener('click', () => {
            // Remove active class from all building buttons
            buildingButtons.forEach(btn => btn.classList.remove('active'));
            
            // Toggle active class on bulldoze button
            bulldozeButton.classList.toggle('active');
            
            // Set the selected building type to null (bulldoze mode)
            if (bulldozeButton.classList.contains('active')) {
                game.setSelectedBuilding(null);
            } else {
                game.setSelectedBuilding('house'); // Default to house
                document.querySelector('.game-button[data-building="house"]').classList.add('active');
            }
        });
    }
});