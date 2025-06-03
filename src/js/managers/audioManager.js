import * as THREE from 'three';
import Logger from '../utils/logger.js';

export class AudioManager {
    constructor() {
        this.listener = null;
        this.currentMusic = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.audioLoader = new THREE.AudioLoader();
    }

    /**
     * Initialize the audio manager
     * @param {THREE.Camera} [camera] - Optional camera for 3D audio. If not provided, creates a non-positional audio context.
     */
    init(camera = null) {
        if (camera) {
            // 3D audio setup with camera
            this.listener = new THREE.AudioListener();
            camera.add(this.listener);
            Logger.info('Audio manager initialized with 3D audio');
        } else {
            // Non-positional audio setup
            this.listener = new THREE.AudioListener();
            Logger.info('Audio manager initialized with non-positional audio');
        }
    }

    /**
     * Play background music
     * @param {string} musicPath - Path to the music file
     * @param {boolean} loop - Whether to loop the music
     */
    playMusic(musicPath, loop = true) {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }

        this.currentMusic = new THREE.Audio(this.listener);
        
        this.audioLoader.load(
            musicPath,
            (buffer) => {
                try {
                    this.currentMusic.setBuffer(buffer);
                    this.currentMusic.setLoop(loop);
                    this.currentMusic.setVolume(this.musicVolume);
                    this.currentMusic.play();
                    Logger.info(`Playing music: ${musicPath}`);
                } catch (error) {
                    Logger.error('Error playing music:', error);
                }
            },
            (xhr) => {
                Logger.info(`Loading music: ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                Logger.error('Error loading music:', error);
            }
        );
    }

    /**
     * Stop the current music
     */
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
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
    }

    /**
     * Set the SFX volume
     * @param {number} volume - Volume between 0 and 1
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Play a sound effect
     * @param {string} sfxPath - Path to the sound effect file
     * @param {number} volume - Optional volume override
     */
    playSFX(sfxPath, volume = null) {
        const sound = new THREE.Audio(this.listener);
        
        this.audioLoader.load(
            sfxPath,
            (buffer) => {
                try {
                    sound.setBuffer(buffer);
                    sound.setVolume(volume !== null ? volume : this.sfxVolume);
                    sound.play();
                } catch (error) {
                    Logger.error('Error playing sound effect:', error);
                }
            },
            undefined,
            (error) => {
                Logger.error('Error loading sound effect:', error);
            }
        );
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
        if (this.listener) {
            this.listener = null;
        }
    }
} 