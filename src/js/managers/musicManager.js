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
        this.isPlaying = false; // Start with music disabled
        this.musicVolume = 0.5;
        this.audioLoader = new THREE.AudioLoader();
        this.currentPage = null; // Track current page
        
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
     * Play a specific track
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

        // Stop current music if playing
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }

        // Create new audio
        this.currentMusic = new THREE.Audio(this.listener);
        
        this.audioLoader.load(
            track.path,
            (buffer) => {
                try {
                    console.log('MusicManager playTrack - audio loaded, setting isPlaying to true');
                    this.currentMusic.setBuffer(buffer);
                    this.currentMusic.setLoop(true);
                    this.currentMusic.setVolume(this.musicVolume);
                    this.currentMusic.play();
                    this.currentTrack = trackKey;
                    // Only set isPlaying if it's not already true (from toggleMusic)
                    if (!this.isPlaying) {
                        this.isPlaying = true;
                    }
                    console.log('MusicManager playTrack - isPlaying set to:', this.isPlaying);
                    Logger.info(`Playing music: ${track.name}`);
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
     * Stop music
     */
    stopMusic() {
        console.log('MusicManager stopMusic - before stop isPlaying:', this.isPlaying);
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
        if (this.listener) {
            this.listener = null;
        }
        this.isInitialized = false;
        Logger.info('Music manager disposed');
    }
}

// Export singleton instance
export const musicManager = new MusicManager();