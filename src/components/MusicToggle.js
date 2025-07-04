import { musicManager } from '../js/managers/musicManager.js';

export class MusicToggle {
    constructor() {
        this.element = document.createElement('button');
        this.element.className = 'music-toggle';
        this.element.title = 'Toggle Music';
        this.render();
        this.setupEventListeners();
    }

    render() {
        // Update icon based on music state
        const isPlaying = musicManager.isMusicPlaying();
        console.log('MusicToggle render - isPlaying:', isPlaying);
        this.element.innerHTML = isPlaying ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
    }

    setupEventListeners() {
        this.element.addEventListener('click', () => {
            const wasPlaying = musicManager.isMusicPlaying();
            console.log('MusicToggle click - wasPlaying:', wasPlaying);
            musicManager.toggleMusic();
            console.log('MusicToggle after toggle - isPlaying:', musicManager.isMusicPlaying());
            this.render(); // Update icon after toggle
        });
    }
} 