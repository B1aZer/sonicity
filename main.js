import * as THREE from 'three';
import { Game } from 'game';

// Get the render target
const renderDiv = document.getElementById('renderDiv');

if (!renderDiv) {
    console.error("Fatal Error: The 'renderDiv' element was not found in the DOM.");
} else {
    // Initialize the game with the render target
    const game = new Game(renderDiv);
    // Game's async init() method will call start() internally when setup is complete.
    // game.start(); // DO NOT call start() here.
}