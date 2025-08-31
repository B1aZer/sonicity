import * as THREE from 'three';
import Logger from '../utils/logger.js';

export class AnimationManager {
    constructor() {
        this.animationMixers = new Map(); // Store animation mixers by building ID
        this.animationActions = new Map(); // Store animation actions by building ID
        this.animationClips = new Map(); // Store animation clips by building type
    }

    /**
     * Set up animations for a building
     * @param {string} buildingId - Unique building identifier
     * @param {THREE.Object3D} building - The building mesh
     * @param {string} buildingType - Type of building (e.g., 'HOUSE_LVL1')
     * @param {Array} animations - Array of animation clips
     * @param {Object} options - Animation options
     * @returns {Object} Animation setup result
     */
    setupBuildingAnimations(buildingId, building, buildingType, animations, options = {}) {
        try {
            Logger.debug('Setting up animations for building', { buildingId, buildingType, animationCount: animations.length });
            
            if (!animations || animations.length === 0) {
                Logger.debug('No animations available for building', { buildingId, buildingType });
                return { success: true, hasAnimations: false };
            }

            // Store animation clips for this building type
            this.animationClips.set(buildingType, animations);
            
            // Create animation mixer for this building instance
            const mixer = new THREE.AnimationMixer(building);
            this.animationMixers.set(buildingId, mixer);
            
            // Set up animation actions
            const actions = [];
            animations.forEach((anim, index) => {
                const action = mixer.clipAction(anim);
                actions.push(action);
                Logger.debug(`Created animation action for ${buildingType}: ${anim.name}`);
            });
            this.animationActions.set(buildingId, actions);
            
            // Start all animations if autoPlay is enabled
            if (options.autoPlay !== false) {
                this.playAllAnimations(buildingId);
            }
            
            Logger.debug('Animation setup completed', { buildingId, actionCount: actions.length });
            return { success: true, hasAnimations: true, mixer, actions };
            
        } catch (error) {
            Logger.error('Error setting up building animations:', { buildingId, buildingType, error: error.message });
            return { success: false, hasAnimations: false };
        }
    }

    /**
     * Play all animations for a building
     * @param {string} buildingId - Building identifier
     */
    playAllAnimations(buildingId) {
        const actions = this.animationActions.get(buildingId);
        if (actions && actions.length > 0) {
            actions.forEach((action, index) => {
                action.play();
                Logger.debug(`Started animation ${index} for building ${buildingId}`);
            });
        }
    }

    /**
     * Stop all animations for a building
     * @param {string} buildingId - Building identifier
     */
    stopAllAnimations(buildingId) {
        const actions = this.animationActions.get(buildingId);
        if (actions && actions.length > 0) {
            actions.forEach((action, index) => {
                action.stop();
                Logger.debug(`Stopped animation ${index} for building ${buildingId}`);
            });
        }
    }

    /**
     * Toggle animation playback for a building
     * @param {string} buildingId - Building identifier
     * @returns {boolean} Whether animations are now playing
     */
    toggleBuildingAnimation(buildingId) {
        const actions = this.animationActions.get(buildingId);
        if (actions && actions.length > 0) {
            const action = actions[0];
            if (action.isRunning()) {
                this.stopAllAnimations(buildingId);
                Logger.debug('Stopped animations for building', { buildingId });
                return false;
            } else {
                this.playAllAnimations(buildingId);
                Logger.debug('Started animations for building', { buildingId });
                return true;
            }
        }
        return false;
    }

    /**
     * Get animation status for a building
     * @param {string} buildingId - Building identifier
     * @returns {Object} Animation status information
     */
    getAnimationStatus(buildingId) {
        const actions = this.animationActions.get(buildingId);
        if (actions && actions.length > 0) {
            return {
                hasAnimations: true,
                isRunning: actions[0].isRunning(),
                animationCount: actions.length
            };
        }
        return { hasAnimations: false };
    }

    /**
     * Update all animation mixers (call this in the game loop)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        this.animationMixers.forEach((mixer, buildingId) => {
            mixer.update(deltaTime);
        });
    }

    /**
     * Clean up animations for a specific building
     * @param {string} buildingId - Building identifier
     */
    cleanupBuildingAnimations(buildingId) {
        const mixer = this.animationMixers.get(buildingId);
        if (mixer) {
            mixer.stopAllAction();
            mixer.uncacheRoot(mixer.getRoot());
            this.animationMixers.delete(buildingId);
            Logger.debug('Cleaned up animation mixer for building', { buildingId });
        }
        
        this.animationActions.delete(buildingId);
        Logger.debug('Cleaned up animation actions for building', { buildingId });
    }

    /**
     * Dispose of all animation resources
     */
    dispose() {
        Logger.info('AnimationManager: Starting disposal');
        
        // Clean up all animation mixers
        this.animationMixers.forEach((mixer, buildingId) => {
            mixer.stopAllAction();
            mixer.uncacheRoot(mixer.getRoot());
        });
        
        // Clear all collections
        this.animationMixers.clear();
        this.animationActions.clear();
        this.animationClips.clear();
        
        Logger.info('AnimationManager: Disposal completed');
    }
} 