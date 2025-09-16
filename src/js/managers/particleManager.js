import * as THREE from 'three';
import Logger from '../utils/logger.js';

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = new Map();
        this.clock = new THREE.Clock();
        this.isEnabled = true;
        
        // Default particle settings
        this.defaultSettings = {
            count: 1000,
            size: 0.02,
            color: 0xFFD700, // Golden color
            opacity: 0.6,
            speed: 0.5,
            turbulence: 0.3,
            life: 8.0,
            spawnRadius: 10.0,
            height: 2.0,
            windStrength: 0.1,
            windDirection: new THREE.Vector3(1, 0, 0.5)
        };
    }

    /**
     * Create a golden dust particle system
     * @param {string} name - Unique name for the particle system
     * @param {Object} settings - Custom settings for the particles
     * @param {THREE.Vector3} position - Position to spawn particles around
     */
    createGoldenDust(name, settings = {}, position = new THREE.Vector3(0, 0, 0)) {
        if (this.particleSystems.has(name)) {
            Logger.warn(`Particle system '${name}' already exists`);
            return;
        }

        const config = { ...this.defaultSettings, ...settings };
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.count * 3);
        const colors = new Float32Array(config.count * 3);
        const sizes = new Float32Array(config.count);
        const velocities = new Float32Array(config.count * 3);
        const lifetimes = new Float32Array(config.count);
        const maxLifetimes = new Float32Array(config.count);

        // Initialize particles
        for (let i = 0; i < config.count; i++) {
            const i3 = i * 3;
            
            // Random position within spawn radius
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * config.spawnRadius;
            const height = Math.random() * config.height;
            
            positions[i3] = position.x + Math.cos(angle) * radius;
            positions[i3 + 1] = position.y + height;
            positions[i3 + 2] = position.z + Math.sin(angle) * radius;
            
            // Random velocity
            velocities[i3] = (Math.random() - 0.5) * config.speed;
            velocities[i3 + 1] = Math.random() * config.speed * 0.5;
            velocities[i3 + 2] = (Math.random() - 0.5) * config.speed;
            
            // Color (golden with some variation)
            const colorVariation = 0.1;
            const r = (config.color >> 16 & 255) / 255 + (Math.random() - 0.5) * colorVariation;
            const g = (config.color >> 8 & 255) / 255 + (Math.random() - 0.5) * colorVariation;
            const b = (config.color & 255) / 255 + (Math.random() - 0.5) * colorVariation;
            
            colors[i3] = Math.max(0, Math.min(1, r));
            colors[i3 + 1] = Math.max(0, Math.min(1, g));
            colors[i3 + 2] = Math.max(0, Math.min(1, b));
            
            // Size variation
            sizes[i] = config.size * (0.5 + Math.random() * 0.5);
            
            // Lifetime
            const lifetime = config.life * (0.5 + Math.random() * 0.5);
            lifetimes[i] = lifetime;
            maxLifetimes[i] = lifetime;
        }

        // Set geometry attributes
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('maxLifetime', new THREE.BufferAttribute(maxLifetimes, 1));

        // Create shader material
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                windStrength: { value: config.windStrength },
                windDirection: { value: config.windDirection },
                opacity: { value: config.opacity }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                attribute vec3 velocity;
                attribute float lifetime;
                attribute float maxLifetime;
                
                uniform float time;
                uniform float windStrength;
                uniform vec3 windDirection;
                
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    vColor = color;
                    
                    // Calculate opacity based on lifetime
                    float lifeRatio = lifetime / maxLifetime;
                    vOpacity = lifeRatio * lifeRatio; // Fade out quadratically
                    
                    // Apply wind effect
                    vec3 windEffect = windDirection * windStrength * time;
                    
                    // Update position with velocity and wind
                    vec3 newPosition = position + velocity * time + windEffect;
                    
                    // Add some gentle floating motion
                    newPosition.y += sin(time * 0.5 + position.x * 0.1) * 0.1;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    // Create circular particles
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);
                    
                    if (dist > 0.5) discard;
                    
                    // Soft edge
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    alpha *= vOpacity;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // Create particle system
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.name = `particles_${name}`;
        particleSystem.userData = {
            config: config,
            geometry: geometry,
            material: material,
            positions: positions,
            colors: colors,
            sizes: sizes,
            velocities: velocities,
            lifetimes: lifetimes,
            maxLifetimes: maxLifetimes,
            spawnPosition: position.clone()
        };

        this.particleSystems.set(name, particleSystem);
        this.scene.add(particleSystem);
        
        Logger.info(`Created golden dust particle system '${name}' with ${config.count} particles`);
        return particleSystem;
    }

    /**
     * Update all particle systems
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.isEnabled) return;

        const time = this.clock.getElapsedTime();

        this.particleSystems.forEach((particleSystem, name) => {
            const userData = particleSystem.userData;
            const config = userData.config;
            const material = userData.material;
            const positions = userData.positions;
            const velocities = userData.velocities;
            const lifetimes = userData.lifetimes;
            const maxLifetimes = userData.maxLifetimes;
            const spawnPosition = userData.spawnPosition;

            // Update material uniforms
            material.uniforms.time.value = time;
            material.uniforms.windStrength.value = config.windStrength;
            material.uniforms.windDirection.value = config.windDirection;
            material.uniforms.opacity.value = config.opacity;

            // Update particle positions and lifetimes
            for (let i = 0; i < positions.length; i += 3) {
                const particleIndex = i / 3;
                
                // Update lifetime
                lifetimes[particleIndex] -= deltaTime;
                
                // If particle is dead, respawn it
                if (lifetimes[particleIndex] <= 0) {
                    this.respawnParticle(particleIndex, config, spawnPosition, positions, velocities, lifetimes, maxLifetimes);
                } else {
                    // Update position
                    positions[i] += velocities[i] * deltaTime;
                    positions[i + 1] += velocities[i + 1] * deltaTime;
                    positions[i + 2] += velocities[i + 2] * deltaTime;
                    
                    // Apply gravity
                    velocities[i + 1] -= 0.1 * deltaTime;
                    
                    // Apply wind
                    velocities[i] += config.windDirection.x * config.windStrength * deltaTime;
                    velocities[i + 2] += config.windDirection.z * config.windStrength * deltaTime;
                }
            }

            // Mark geometry as needing update
            userData.geometry.attributes.position.needsUpdate = true;
            userData.geometry.attributes.lifetime.needsUpdate = true;
        });
    }

    /**
     * Respawn a dead particle
     */
    respawnParticle(index, config, spawnPosition, positions, velocities, lifetimes, maxLifetimes) {
        const i3 = index * 3;
        
        // Random position within spawn radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * config.spawnRadius;
        const height = Math.random() * config.height;
        
        positions[i3] = spawnPosition.x + Math.cos(angle) * radius;
        positions[i3 + 1] = spawnPosition.y + height;
        positions[i3 + 2] = spawnPosition.z + Math.sin(angle) * radius;
        
        // Random velocity
        velocities[i3] = (Math.random() - 0.5) * config.speed;
        velocities[i3 + 1] = Math.random() * config.speed * 0.5;
        velocities[i3 + 2] = (Math.random() - 0.5) * config.speed;
        
        // Reset lifetime
        const lifetime = config.life * (0.5 + Math.random() * 0.5);
        lifetimes[index] = lifetime;
        maxLifetimes[index] = lifetime;
    }

    /**
     * Set particle system enabled/disabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        this.particleSystems.forEach((particleSystem) => {
            particleSystem.visible = enabled;
        });
    }

    /**
     * Update particle system settings
     */
    updateSettings(name, newSettings) {
        const particleSystem = this.particleSystems.get(name);
        if (!particleSystem) {
            Logger.warn(`Particle system '${name}' not found`);
            return;
        }

        const userData = particleSystem.userData;
        const config = userData.config;
        
        // Update config
        Object.assign(config, newSettings);
        
        // Update material uniforms
        const material = userData.material;
        if (newSettings.windStrength !== undefined) {
            material.uniforms.windStrength.value = newSettings.windStrength;
        }
        if (newSettings.windDirection !== undefined) {
            material.uniforms.windDirection.value = newSettings.windDirection;
        }
        if (newSettings.opacity !== undefined) {
            material.uniforms.opacity.value = newSettings.opacity;
        }
    }

    /**
     * Remove a particle system
     */
    removeParticleSystem(name) {
        const particleSystem = this.particleSystems.get(name);
        if (particleSystem) {
            this.scene.remove(particleSystem);
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
            this.particleSystems.delete(name);
            Logger.info(`Removed particle system '${name}'`);
        }
    }

    /**
     * Remove all particle systems
     */
    dispose() {
        this.particleSystems.forEach((particleSystem, name) => {
            this.scene.remove(particleSystem);
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
        });
        this.particleSystems.clear();
        Logger.info('Disposed all particle systems');
    }

    /**
     * Get particle system by name
     */
    getParticleSystem(name) {
        return this.particleSystems.get(name);
    }

    /**
     * Get all particle system names
     */
    getParticleSystemNames() {
        return Array.from(this.particleSystems.keys());
    }
}
