import * as THREE from 'three';
import { FOG_CONFIG } from '../utils/constants.js';
import Logger from '../utils/logger.js';

export class FogManager {
    constructor(scene) {
        this.scene = scene;
        this.fogPlanes = new Map(); // Track all fog planes
        this.debugHelpers = new Set(); // Track debug wireframe helpers
        this.debugVisible = false;
        this.debugIcons = new Map(); // Store debug icon meshes
        this.shaderMaterial = null; // Cache for fog shader material
        
        Logger.info('FogManager initialized');
    }

    /**
     * Load all fog configurations
     */
    async loadAllFog() {
        try {
            Logger.info('Loading fog configurations...');
            
            for (const [fogType, config] of Object.entries(FOG_CONFIG)) {
                if (config.enabled) {
                    await this.loadFogType(fogType, config);
                }
            }
            
            Logger.info('✅ All fog configurations loaded');
        } catch (error) {
            Logger.error('Error loading fog:', error);
        }
    }

    /**
     * Load a specific fog type and create all its planes
     */
    async loadFogType(fogType, config) {
        try {
            Logger.info(`Loading fog type: ${config.name} (${config.planes.length} planes)`);
            
            // Create fog planes for this type
            for (let i = 0; i < config.planes.length; i++) {
                const planeConfig = config.planes[i];
                const fogPlane = this.createFogPlane(config, planeConfig, i);
                
                if (fogPlane) {
                    const planeId = `${fogType}_${i}`;
                    this.fogPlanes.set(planeId, {
                        mesh: fogPlane,
                        config: config,
                        planeConfig: planeConfig,
                        type: fogType
                    });
                    this.scene.add(fogPlane);

                    // Create debug helper if debug mode is enabled
                    if (config.debug) {
                        const debugHelper = this.createDebugHelper(planeConfig, i);
                        if (debugHelper) {
                            const debugId = `${fogType}_debug_${i}`;
                            this.debugHelpers.add(debugHelper);
                            this.scene.add(debugHelper);
                        }
                    }
                }
            }
            
            Logger.info(`✅ Loaded ${config.planes.length} fog planes for ${fogType}`);
        } catch (error) {
            Logger.error(`Error loading fog type ${fogType}:`, error);
        }
    }

    /**
     * Create a single fog plane with shader material
     */
    createFogPlane(config, planeConfig, index) {
        try {
            // Create plane geometry
            const geometry = new THREE.PlaneGeometry(
                planeConfig.size.width, 
                planeConfig.size.height,
                32, 32 // Add segments for noise deformation
            );

            // Create fog shader material
            const material = this.createFogMaterial(config, planeConfig);

            // Create mesh
            const fogPlane = new THREE.Mesh(geometry, material);

            // Set position
            fogPlane.position.set(
                planeConfig.position.x,
                planeConfig.position.y,
                planeConfig.position.z
            );

            // Set rotation
            fogPlane.rotation.set(
                planeConfig.rotation.x,
                planeConfig.rotation.y,
                planeConfig.rotation.z
            );

            // Configure rendering properties
            fogPlane.renderOrder = 999 - index; // Render back-to-front for proper blending
            fogPlane.name = `fogPlane_${index}`;
            
            // Disable frustum culling to prevent disappearing when camera is inside
            fogPlane.frustumCulled = false;

            return fogPlane;
        } catch (error) {
            Logger.error(`Error creating fog plane ${index}:`, error);
            return null;
        }
    }

    /**
     * Create the fog shader material with noise
     */
    createFogMaterial(config, planeConfig) {
        const vertexShader = `
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec4 mvPosition;
            uniform float time;
            uniform float noiseScale;
            uniform float noiseIntensity;
            uniform float noiseEnabled;
            uniform vec3 driftSpeed;

            // Simple noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
                vUv = uv;
                vPosition = position;

                // Apply noise-based displacement
                vec3 pos = position;
                vec2 noiseUV = uv * noiseScale + time * 0.1;
                float noiseValue = noise(noiseUV + driftSpeed.xz * time);
                pos.y += noiseValue * noiseIntensity * noiseEnabled;

                mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            uniform vec3 fogColor;
            uniform float baseOpacity;
            uniform float opacityVariation;
            uniform float time;
            uniform float noiseScale;
            uniform float timeScale;
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec4 mvPosition;

            // Noise function (same as vertex shader)
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            void main() {
                // Create base opacity with edge fade
                float edgeFade = 1.0 - pow(length(vUv - 0.5) * 2.0, 2.0);
                edgeFade = clamp(edgeFade, 0.0, 1.0);

                // Add soft edge based on viewing angle
                vec3 worldNormal = normalize(vec3(0.0, 1.0, 0.0)); // Fog plane normal
                vec3 viewDirection = normalize(-mvPosition.xyz);
                float viewAngleFade = abs(dot(worldNormal, viewDirection));
                viewAngleFade = pow(viewAngleFade, 0.5); // Soften the fade

                // Add noise-based opacity variation
                vec2 noiseUV = vUv * noiseScale + time * timeScale;
                float noiseValue = noise(noiseUV);
                float opacity = baseOpacity + (noiseValue - 0.5) * opacityVariation;
                
                // Apply edge fade and view angle fade
                opacity *= edgeFade * viewAngleFade;
                
                // Distance-based fade for better blending with objects
                float distance = length(mvPosition.xyz);
                float distanceFade = smoothstep(0.5, 5.0, distance);
                opacity *= distanceFade;
                
                // Clamp opacity to reasonable range
                opacity = clamp(opacity, 0.0, 0.6);

                gl_FragColor = vec4(fogColor, opacity);
            }
        `;

        // Convert color from hex to RGB
        const color = new THREE.Color(config.baseColor);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                fogColor: { value: color },
                baseOpacity: { value: planeConfig.opacity },
                opacityVariation: { value: planeConfig.opacityVariation },
                time: { value: 0.0 },
                noiseScale: { value: config.noise.scale },
                noiseIntensity: { value: config.noise.intensity },
                noiseEnabled: { value: config.noise.enabled ? 1.0 : 0.0 },
                timeScale: { value: config.noise.timeScale },
                driftSpeed: { value: new THREE.Vector3(
                    config.driftSpeed.x,
                    config.driftSpeed.y,
                    config.driftSpeed.z
                )}
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: true,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            blendEquationAlpha: THREE.AddEquation,
            blendSrcAlpha: THREE.OneFactor,
            blendDstAlpha: THREE.OneMinusSrcAlphaFactor
        });

        return material;
    }

    /**
     * Create a wireframe debug helper to visualize fog plane positioning
     */
    createDebugHelper(planeConfig, index) {
        try {
            // Create wireframe geometry
            const geometry = new THREE.PlaneGeometry(
                planeConfig.size.width, 
                planeConfig.size.height,
                8, 8 // Fewer segments for cleaner wireframe
            );

            // Create wireframe material with bright color
            const material = new THREE.MeshBasicMaterial({
                color: index % 2 === 0 ? 0xff0000 : 0x00ff00, // Alternate red/green
                wireframe: true,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });

            // Create wireframe mesh
            const wireframeMesh = new THREE.Mesh(geometry, material);

            // Set position (same as fog plane)
            wireframeMesh.position.set(
                planeConfig.position.x,
                planeConfig.position.y,
                planeConfig.position.z
            );

            // Set rotation (same as fog plane)
            wireframeMesh.rotation.set(
                planeConfig.rotation.x,
                planeConfig.rotation.y,
                planeConfig.rotation.z
            );

            // Add text label helper
            const labelHelper = this.createDebugLabel(planeConfig, index);
            if (labelHelper) {
                wireframeMesh.add(labelHelper);
            }

            wireframeMesh.name = `fogDebugHelper_${index}`;
            wireframeMesh.renderOrder = 10000; // Render on top
            wireframeMesh.frustumCulled = false;

            return wireframeMesh;
        } catch (error) {
            Logger.error(`Error creating debug helper ${index}:`, error);
            return null;
        }
    }

    /**
     * Create a text label for the debug helper
     */
    createDebugLabel(planeConfig, index) {
        try {
            // Create a simple sprite with text information
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 128;

            // Set up text style
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            context.fillStyle = 'white';
            context.font = '16px Arial';
            context.textAlign = 'center';

            // Draw text information
            const opacity = (planeConfig.opacity * 100).toFixed(1);
            const size = `${planeConfig.size.width}x${planeConfig.size.height}`;
            
            context.fillText(`Fog Plane ${index}`, canvas.width / 2, 30);
            context.fillText(`Opacity: ${opacity}%`, canvas.width / 2, 55);
            context.fillText(`Size: ${size}`, canvas.width / 2, 80);
            context.fillText(`Z: ${planeConfig.position.z}`, canvas.width / 2, 105);

            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                alphaTest: 0.1
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            // Position sprite above the plane
            sprite.position.set(0, planeConfig.size.height / 2 + 5, 0);
            sprite.scale.set(10, 5, 1);

            return sprite;
        } catch (error) {
            Logger.error(`Error creating debug label ${index}:`, error);
            return null;
        }
    }



    /**
     * Toggle fog visibility
     */
    setFogVisible(visible) {
        this.fogPlanes.forEach((fogData) => {
            fogData.mesh.visible = visible;
        });
    }

    /**
     * Toggle debug helpers visibility
     */
    setDebugVisible(visible) {
        this.debugHelpers.forEach((helper) => {
            helper.visible = visible;
        });
    }

    /**
     * Enable/disable debug mode (creates or removes wireframe helpers)
     */
    setDebugMode(enabled) {
        if (enabled) {
            // Show existing debug helpers or create them
            this.fogPlanes.forEach((fogData, planeId) => {
                const [fogType, index] = planeId.split('_');
                const debugId = `${fogType}_debug_${index}`;
                
                let debugHelper = this.debugHelpers.get(debugId);
                if (!debugHelper) {
                    // Create new debug helper
                    debugHelper = this.createDebugHelper(fogData.planeConfig, parseInt(index));
                    if (debugHelper) {
                        this.debugHelpers.add(debugHelper);
                        this.scene.add(debugHelper);
                    }
                } else {
                    debugHelper.visible = true;
                }
            });
        } else {
            // Hide debug helpers
            this.setDebugVisible(false);
        }
    }

    /**
     * Update fog opacity globally
     */
    setGlobalOpacity(multiplier) {
        this.fogPlanes.forEach((fogData) => {
            if (fogData.mesh.material.uniforms) {
                const originalOpacity = fogData.planeConfig.opacity;
                fogData.mesh.material.uniforms.baseOpacity.value = originalOpacity * multiplier;
            }
        });
    }

    /**
     * Get fog plane by ID
     */
    getFogPlane(planeId) {
        return this.fogPlanes.get(planeId);
    }

    /**
     * Remove all fog planes
     */
    clearAllFog() {
        this.fogPlanes.forEach((fogData) => {
            this.scene.remove(fogData.mesh);
            if (fogData.mesh.material) {
                fogData.mesh.material.dispose();
            }
            if (fogData.mesh.geometry) {
                fogData.mesh.geometry.dispose();
            }
        });
        this.fogPlanes.clear();

        // Clear debug helpers
        this.debugHelpers.forEach((helper) => {
            this.scene.remove(helper);
            if (helper.material) {
                if (Array.isArray(helper.material)) {
                    helper.material.forEach(material => material.dispose());
                } else {
                    helper.material.dispose();
                }
            }
            if (helper.geometry) {
                helper.geometry.dispose();
            }
            // Dispose sprite textures if they exist
            helper.traverse((child) => {
                if (child.material && child.material.map) {
                    child.material.map.dispose();
                }
            });
        });
        this.debugHelpers.clear();
        
        Logger.info('All fog and debug helpers cleared');
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.clearAllFog();
        Logger.info('FogManager disposed');
    }
} 