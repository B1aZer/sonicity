import * as THREE from 'three';
import Logger from '../utils/logger.js';

export class MusicManager {
    constructor() {
        // Singleton pattern
        if (MusicManager.instance) {
            return MusicManager.instance;
        }
        MusicManager.instance = this;

        this.listener = null;
        this.currentMusic = null;
        this.nextMusic = null; // For crossfade
        this.musicVolume = 0.5;
        this.audioLoader = new THREE.AudioLoader();
        this.currentPage = null; // Track current page
        
        // Crossfade settings
        this.crossfadeDuration = 2.0; // seconds
        this.isCrossfading = false;
        this.fadeInterval = null;
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Music tracks
        this.tracks = {
            'title-theme': {
                path: '/music/1- Title Theme.mp3',
                name: 'Title Theme'
            },
            'home-village': {
                path: '/music/2- Home Village.mp3',
                name: 'Home Village'
            },
            'mystical-forest': {
                path: '/music/4- Mystical Forest.mp3',
                name: 'Mystical Forest'
            }
        };

        // Page music mapping - only override for specific pages
        this.pageMusicMap = {
            '': 'title-theme',                    // Start page - Title Theme
            'access': 'title-theme'               // Access page - Title Theme
        };

        this.currentTrack = null;
        this.isInitialized = false;
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('musicSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.isPlaying = settings.isPlaying || false;
                this.musicVolume = settings.musicVolume || 0.5;
                console.log('MusicManager: Loaded settings from localStorage:', settings);
            } else {
                this.isPlaying = false; // Start with music disabled
                this.musicVolume = 0.5;
                console.log('MusicManager: No saved settings, using defaults');
            }
        } catch (error) {
            console.warn('MusicManager: Failed to load settings from localStorage:', error);
            this.isPlaying = false;
            this.musicVolume = 0.5;
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            const settings = {
                isPlaying: this.isPlaying,
                musicVolume: this.musicVolume
            };
            localStorage.setItem('musicSettings', JSON.stringify(settings));
            console.log('MusicManager: Saved settings to localStorage:', settings);
        } catch (error) {
            console.warn('MusicManager: Failed to save settings to localStorage:', error);
        }
    }

    /**
     * Initialize the music manager
     * @param {THREE.Camera} [camera] - Optional camera for 3D audio
     */
    init(camera = null) {
        if (this.isInitialized) {
            Logger.info('Music manager already initialized');
            return;
        }

        if (camera) {
            // 3D audio setup with camera
            this.listener = new THREE.AudioListener();
            camera.add(this.listener);
            Logger.info('Music manager initialized with 3D audio');
        } else {
            // Non-positional audio setup
            this.listener = new THREE.AudioListener();
            Logger.info('Music manager initialized with non-positional audio');
        }

        this.isInitialized = true;
    }

    /**
     * Update current page and change music if enabled
     * @param {string} pageName - The page name/route
     */
    updatePage(pageName) {
        this.currentPage = pageName;
        
        // If music is enabled, play music for the new page
        if (this.isPlaying) {
            this.playPageMusic(pageName);
        }
    }

    /**
     * Play music for a specific page
     * @param {string} pageName - The page name/route
     */
    playPageMusic(pageName) {
        // Default to home village for all pages
        let trackKey = 'home-village';
        
        // Override with specific page music if defined
        if (this.pageMusicMap[pageName]) {
            trackKey = this.pageMusicMap[pageName];
        }

        const track = this.tracks[trackKey];
        if (!track) {
            Logger.error(`Track not found: ${trackKey}`);
            return;
        }

        if (this.currentTrack === trackKey) {
            Logger.info(`Already playing ${track.name} for page ${pageName}`);
            return;
        }

        Logger.info(`Playing ${track.name} for page ${pageName}`);
        this.playTrack(trackKey);
    }

    /**
     * Play a specific track with crossfade
     * @param {string} trackKey - The track key to play
     */
    playTrack(trackKey) {
        const track = this.tracks[trackKey];
        if (!track) {
            Logger.error(`Track not found: ${trackKey}`);
            return;
        }

        if (this.currentTrack === trackKey) {
            Logger.info(`Already playing ${track.name}`);
            return;
        }

        console.log('MusicManager playTrack - starting to load track:', trackKey);

        // If we're already crossfading, stop the current crossfade
        if (this.isCrossfading) {
            this.stopCrossfade();
        }

        // Create new audio for crossfade
        this.nextMusic = new THREE.Audio(this.listener);
        
        this.audioLoader.load(
            track.path,
            (buffer) => {
                try {
                    console.log('MusicManager playTrack - audio loaded, starting crossfade');
                    this.nextMusic.setBuffer(buffer);
                    this.nextMusic.setLoop(true);
                    this.nextMusic.setVolume(0); // Start at 0 volume
                    this.nextMusic.play();
                    
                    // Start crossfade
                    this.startCrossfade(trackKey);
                    
                } catch (error) {
                    console.log('MusicManager playTrack - error playing music:', error);
                    this.isPlaying = false;
                    Logger.error('Error playing music:', error);
                }
            },
            (xhr) => {
                Logger.info(`Loading music: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.log('MusicManager playTrack - error loading music:', error);
                this.isPlaying = false;
                Logger.error('Error loading music:', error);
            }
        );
    }

    /**
     * Start crossfade between current and next track
     * @param {string} trackKey - The new track key
     */
    startCrossfade(trackKey) {
        if (!this.nextMusic) return;
        
        this.isCrossfading = true;
        const track = this.tracks[trackKey];
        
        // Set up fade interval
        const fadeSteps = 60; // 60 steps over crossfade duration
        const fadeStepDuration = this.crossfadeDuration * 1000 / fadeSteps; // milliseconds
        let currentStep = 0;
        
        this.fadeInterval = setInterval(() => {
            currentStep++;
            const progress = currentStep / fadeSteps;
            
            // Fade out current music
            if (this.currentMusic) {
                const currentVolume = this.musicVolume * (1 - progress);
                this.currentMusic.setVolume(currentVolume);
            }
            
            // Fade in next music
            const nextVolume = this.musicVolume * progress;
            this.nextMusic.setVolume(nextVolume);
            
            // When crossfade is complete
            if (currentStep >= fadeSteps) {
                this.completeCrossfade(trackKey);
            }
        }, fadeStepDuration);
        
        Logger.info(`Starting crossfade to: ${track.name}`);
    }

    /**
     * Complete the crossfade
     * @param {string} trackKey - The new track key
     */
    completeCrossfade(trackKey) {
        // Stop the fade interval
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        
        // Stop and clean up old music
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
        
        // Set new music as current
        this.currentMusic = this.nextMusic;
        this.nextMusic = null;
        this.currentTrack = trackKey;
        this.isCrossfading = false;
        
        // Ensure volume is set correctly
        this.currentMusic.setVolume(this.musicVolume);
        
        // Only set isPlaying if it's not already true (from toggleMusic)
        if (!this.isPlaying) {
            this.isPlaying = true;
        }
        
        const track = this.tracks[trackKey];
        Logger.info(`Crossfade completed: ${track.name}`);
    }

    /**
     * Stop current crossfade
     */
    stopCrossfade() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        
        if (this.nextMusic) {
            this.nextMusic.stop();
            this.nextMusic = null;
        }
        
        this.isCrossfading = false;
    }

    /**
     * Stop music
     */
    stopMusic() {
        console.log('MusicManager stopMusic - before stop isPlaying:', this.isPlaying);
        
        // Stop any ongoing crossfade
        this.stopCrossfade();
        
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
        this.currentTrack = null;
        this.isPlaying = false;
        console.log('MusicManager stopMusic - after stop isPlaying:', this.isPlaying);
        Logger.info('Music stopped');
    }

    /**
     * Toggle music on/off
     */
    toggleMusic() {
        console.log('MusicManager toggleMusic - current isPlaying:', this.isPlaying);
        if (this.isPlaying) {
            console.log('MusicManager: Stopping music');
            this.stopMusic();
        } else {
            console.log('MusicManager: Starting music');
            // Set playing flag immediately for better UI responsiveness
            this.isPlaying = true;
            // Play music for current page
            if (this.currentPage !== null) {
                this.playPageMusic(this.currentPage);
            }
        }
        console.log('MusicManager toggleMusic - after toggle isPlaying:', this.isPlaying);
        
        // Save settings after toggle
        this.saveSettings();
    }

    /**
     * Set the music volume
     * @param {number} volume - Volume between 0 and 1
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume);
        }
        Logger.info(`Music volume set to: ${this.musicVolume}`);
        
        // Save settings after volume change
        this.saveSettings();
    }

    /**
     * Get current track information
     * @returns {Object|null} Current track info or null if no music playing
     */
    getCurrentTrack() {
        if (!this.currentTrack) {
            return null;
        }
        return {
            key: this.currentTrack,
            ...this.tracks[this.currentTrack]
        };
    }

    /**
     * Check if music is currently playing
     * @returns {boolean} True if music is playing
     */
    isMusicPlaying() {
        console.log('MusicManager isMusicPlaying - returning:', this.isPlaying);
        return this.isPlaying;
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stopMusic();
        this.stopCrossfade();
        if (this.listener) {
            this.listener = null;
        }
        this.isInitialized = false;
        Logger.info('Music manager disposed');
    }

    /**
     * Set the crossfade duration
     * @param {number} duration - Duration in seconds (default: 2.0)
     */
    setCrossfadeDuration(duration) {
        this.crossfadeDuration = Math.max(0.5, Math.min(5.0, duration)); // Clamp between 0.5 and 5 seconds
        Logger.info(`Crossfade duration set to: ${this.crossfadeDuration}s`);
    }
}

// Export singleton instance
export const musicManager = new MusicManager();