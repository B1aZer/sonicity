import Logger from '../utils/logger.js';

export class AudioManager {
    constructor() {
        this.sfxVolume = 0.7;
    }



    /**
     * Set the SFX volume
     * @param {number} volume - Volume between 0 and 1
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }


    
    /**
     * Play a sound effect using simple HTML5 Audio
     * @param {string} soundPath - Path to the sound file
     * @param {number} volume - Volume between 0 and 1
     */
    playSound(soundPath, volume = null) {
        const audio = new Audio(soundPath);
        audio.volume = volume !== null ? volume : this.sfxVolume;
        audio.play().catch(error => {
            Logger.warn('Sound failed to play:', error);
        });
        Logger.info(`Playing sound: ${soundPath}`);
    }
    
    /**
     * Play building spawn/upgrade sound effect
     */
    playBuildingSpawn() {
        this.playSound('/assets/sound/spawn.wav', 0.6);
    }
    
    /**
     * Play building enter sound effect when clicking on a building
     */
    playBuildingEnter() {
        this.playSound('/assets/sound/enter.wav', 0.5);
    }
    


    /**
     * Clean up resources
     */
    dispose() {
        // No resources to clean up for simple HTML5 Audio
        Logger.info('AudioManager disposed');
    }
} 