import * as THREE from 'three';
import { GrassMaterial } from '../materials/GrassMaterial.js';
import { createNoise2D } from 'simplex-noise';
import Logger from '../utils/logger.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

export class GrassBlades {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            bladeWidth: 0.12,
            bladeHeight: 2,
            joints: 5,
            instances: 10000,
            width: 100,
            density: 1.0,
            slopeThreshold: 0.6,      // New: slope filtering for natural placement
            terrainMesh: null,         // New: terrain mesh for surface sampling
            ...options
        };
        
        this.noise2D = createNoise2D(Math.random);
        this.material = null;
        this.mesh = null;
        this.terrainMesh = this.options.terrainMesh;
        this.sampler = null; // MeshSurfaceSampler instance
        
        Logger.info('Creating grass blades with terrain following:', this.options);
        this.init();
    }
    
    async init() {
        const textureLoader = new THREE.TextureLoader();
        
        try {
            // Load textures
            Logger.info('Loading grass textures...');
            const [bladeDiffuse, bladeAlpha, colorMap] = await Promise.all([
                new Promise((resolve, reject) => {
                    textureLoader.load(
                        '/assets/textures/blade_diffuse.jpg',
                        (texture) => {
                            Logger.info('Blade diffuse texture loaded successfully');
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            resolve(texture);
                        },
                        undefined,
                        reject
                    );
                }),
                new Promise((resolve, reject) => {
                    textureLoader.load(
                        '/assets/textures/blade_alpha.jpg',
                        (texture) => {
                            Logger.info('Blade alpha texture loaded successfully');
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            resolve(texture);
                        },
                        undefined,
                        reject
                    );
                }),
                new Promise((resolve, reject) => {
                    textureLoader.load(
                        '/assets/textures/test.png',
                        (texture) => {
                            Logger.info('Color texture loaded successfully');
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            texture.colorSpace = THREE.SRGBColorSpace;
                            texture.needsUpdate = true;
                            resolve(texture);
                        },
                        undefined,
                        reject
                    );
                })
            ]);
            
            Logger.info('All textures loaded successfully');
            
            // Create base geometry for a single blade using triangles
            const baseGeom = new THREE.PlaneGeometry(
                this.options.bladeWidth,
                this.options.bladeHeight,
                1,
                this.options.joints
            ).translate(0, this.options.bladeHeight / 2, 0);
            
            // Create instanced geometry
            const instancedGeometry = new THREE.InstancedBufferGeometry();
            instancedGeometry.index = baseGeom.index;
            instancedGeometry.attributes.position = baseGeom.attributes.position;
            instancedGeometry.attributes.uv = baseGeom.attributes.uv;
            
            // Generate attribute data using terrain sampling if available
            Logger.info('Generating grass blade attributes...');
            let attributeData;
            
            if (this.terrainMesh) {
                try {
                    Logger.info('Using terrain-following placement...');
                    attributeData = await this.generateTerrainFollowingAttributes();
                    Logger.info('✅ Terrain sampling completed successfully');
                } catch (error) {
                    Logger.error('❌ Terrain sampling failed, using fallback:', error);
                    attributeData = this.getFallbackAttributeData();
                }
            } else {
                Logger.info('No terrain mesh provided, using fallback placement...');
                attributeData = this.getFallbackAttributeData();
            }
            
            // Add instanced attributes
            instancedGeometry.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.offsets), 3));
            instancedGeometry.setAttribute('orientation', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.orientations), 4));
            instancedGeometry.setAttribute('stretch', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.stretches), 1));
            instancedGeometry.setAttribute('halfRootAngleSin', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.halfRootAngleSin), 1));
            instancedGeometry.setAttribute('halfRootAngleCos', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.halfRootAngleCos), 1));
            // Add root position for color lookup
            instancedGeometry.setAttribute('rootPosition', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.offsets), 3));
            
            // Create material
            this.material = new GrassMaterial({
                map: bladeDiffuse,
                alphaMap: bladeAlpha,
                colorMap: colorMap,
                toneMapped: false
            });
            
            // Create mesh
            this.mesh = new THREE.Mesh(instancedGeometry, this.material);
            this.scene.add(this.mesh);
            
            Logger.info('Grass blades created and added to scene');
        } catch (error) {
            Logger.error('Error creating grass blades:', error);
        }
    }
    
    /**
     * Generate terrain-following attributes using MeshSurfaceSampler
     * This samples the terrain once and creates all grass blade data
     */
    async generateTerrainFollowingAttributes() {
        const { instances, density, slopeThreshold } = this.options;
        
        Logger.info('Setting up MeshSurfaceSampler for terrain following...');
        
        // Check if we have terrain mesh for sampling
        if (!this.terrainMesh) {
            Logger.warn('⚠️ No terrain mesh available, using fallback placement...');
            return this.getFallbackAttributeData();
        }
        
        try {
            // Update terrain mesh world matrix before sampling to ensure current state
            this.terrainMesh.updateMatrixWorld(true);
            Logger.info('✅ Terrain world matrix updated');
            
            // Create surface sampler from terrain mesh
            this.sampler = new MeshSurfaceSampler(this.terrainMesh).build();
            Logger.info('✅ MeshSurfaceSampler built successfully');
            
            // Debug terrain mesh bounds
            const terrainBounds = new THREE.Box3().setFromObject(this.terrainMesh);
            Logger.info('Terrain mesh bounds:', {
                min: terrainBounds.min.toArray().map(v => v.toFixed(2)),
                max: terrainBounds.max.toArray().map(v => v.toFixed(2)),
                size: terrainBounds.getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(2)),
                center: terrainBounds.getCenter(new THREE.Vector3()).toArray().map(v => v.toFixed(2))
            });
            
            // Define simple grass area manually (easy to configure) - same as feat/grass-ref
            const grassArea = {
                minX: -30,   // Left boundary
                maxX: 30,    // Right boundary  
                minZ: -50,   // Start at Z=-50 (forward from camera)
                maxZ: 10      // End at Z=0 (camera position)
            };
            
            Logger.info('Manual grass coverage area (Z-axis corrected):', grassArea);
            Logger.info('Note: Z-axis is inverted - negative Z is forward, positive Z is backward');
            Logger.info('Adjust these values in GrassBlades.js to change grass coverage');
            
            const offsets = [];
            const orientations = [];
            const stretches = [];
            const halfRootAngleSin = [];
            const halfRootAngleCos = [];
            
            // Temporary vectors for sampling
            const position = new THREE.Vector3();
            const normal = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            
            Logger.info('Sampling terrain surface for area-based grass placement...');
            
            let placedCount = 0;
            let maxAttempts = instances * 4; // Allow more retries for better distribution
            let coverageStats = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
            let rejectionStats = { areaRejected: 0, slopeRejected: 0, densityRejected: 0, totalAttempts: 0 };
            
            Logger.info('Starting grass placement with filtering...');
            
            for (let attempt = 0; attempt < maxAttempts && placedCount < instances; attempt++) {
                rejectionStats.totalAttempts++;
                
                // Sample random point on terrain surface
                this.sampler.sample(position, normal);
                
                // Transform from local terrain coordinates to world coordinates
                const worldPosition = position.clone().applyMatrix4(this.terrainMesh.matrixWorld);
                const worldNormal = normal.clone().transformDirection(this.terrainMesh.matrixWorld).normalize();
                
                // Seat slightly into ground along normal (avoid z-fighting & floaters)
                worldPosition.addScaledVector(worldNormal, 0.005);
                
                // SIMPLE AREA FILTERING: Only place grass in defined area in front of camera
                if (worldPosition.x < grassArea.minX || worldPosition.x > grassArea.maxX ||
                    worldPosition.z < grassArea.minZ || worldPosition.z > grassArea.maxZ) {
                    rejectionStats.areaRejected++;
                    
                    // Log first few rejections to see what's happening
                    if (rejectionStats.areaRejected <= 5) {
                        Logger.info(`Area rejection ${rejectionStats.areaRejected}: pos(${worldPosition.x.toFixed(2)}, ${worldPosition.z.toFixed(2)}) outside area [${grassArea.minX.toFixed(2)} to ${grassArea.maxX.toFixed(2)}] x [${grassArea.minZ.toFixed(2)} to ${grassArea.maxZ.toFixed(2)}]`);
                    }
                    continue; // Skip positions outside the defined grass area
                }
                
                // Slope filtering for natural placement
                const upness = Math.abs(worldNormal.y); // 1 = flat, 0 = vertical
                if (upness < slopeThreshold) {
                    rejectionStats.slopeRejected++;
                    continue; // Reject steep slopes
                }
                
                // Hash-based density filtering (blue-noise-like, stable in world space)
                const targetDensity = 0.80; // Keep ~80% on flat areas
                if (this.hash2(worldPosition.x, worldPosition.z) > targetDensity) {
                    rejectionStats.densityRejected++;
                    continue; // Reject based on hash density
                }
                
                // If we get here, place the grass blade
                offsets.push(worldPosition.x, worldPosition.y + 0.02, worldPosition.z); // Slightly above surface
                
                // Track coverage area for debugging
                coverageStats.minX = Math.min(coverageStats.minX, worldPosition.x);
                coverageStats.maxX = Math.max(coverageStats.maxX, worldPosition.x);
                coverageStats.minZ = Math.min(coverageStats.minZ, worldPosition.z);
                coverageStats.maxZ = Math.max(coverageStats.maxZ, worldPosition.z);
                
                // Create orientation based on surface normal
                // Align grass to surface normal, then add random rotation
                quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), worldNormal);
                
                // Add random rotation around the up axis
                const randomRotation = Math.random() * Math.PI * 2;
                quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(worldNormal, randomRotation));
                
                orientations.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                
                // Height variation for natural look
                const heightVariation = Math.random();
                if (heightVariation < 0.2) {
                    // Some very tall blades
                    stretches.push(1.6 + Math.random() * 0.4);
                } else if (heightVariation < 0.4) {
                    // Medium height blades
                    stretches.push(1.1 + Math.random() * 0.3);
                } else {
                    // Regular height blades
                    stretches.push(0.9 + Math.random() * 0.3);
                }
                
                // Simple angle calculations for compatibility
                const angle = Math.random() * Math.PI * 2;
                halfRootAngleSin.push(Math.sin(0.5 * angle));
                halfRootAngleCos.push(Math.cos(0.5 * angle));
                
                placedCount++;
                
                // Log progress every 10000 blades
                if (placedCount % 10000 === 0) {
                    Logger.info(`Placed ${placedCount} area-focused grass blades...`);
                }
            }
            
            Logger.info(`✅ Area-based terrain sampling complete: ${placedCount} blades placed`);
            Logger.info('=== REJECTION STATS ===');
            Logger.info('Rejection breakdown:', {
                areaRejected: rejectionStats.areaRejected,
                slopeRejected: rejectionStats.slopeRejected,
                densityRejected: rejectionStats.densityRejected,
                totalAttempts: rejectionStats.totalAttempts,
                successRate: ((placedCount / rejectionStats.totalAttempts) * 100).toFixed(2) + '%'
            });
            Logger.info('Area coverage stats:', {
                xRange: `${coverageStats.minX.toFixed(2)} to ${coverageStats.maxX.toFixed(2)}`,
                zRange: `${coverageStats.minZ.toFixed(2)} to ${coverageStats.maxZ.toFixed(2)}`,
                actualWidth: (coverageStats.maxX - coverageStats.minX).toFixed(2),
                actualDepth: (coverageStats.maxZ - coverageStats.minZ).toFixed(2),
                targetArea: `${grassArea.maxX - grassArea.minX} × ${grassArea.maxZ - grassArea.minZ} units`,
                note: 'Grass only grows in defined area in front of camera'
            });
            
            // If we didn't place enough, use fallback
            if (placedCount < instances * 0.8) {
                Logger.warn(`⚠️ Only placed ${placedCount} blades, using fallback for remaining...`);
                const fallbackData = this.getFallbackAttributeData();
                
                // Combine with fallback data
                const remainingNeeded = instances - placedCount;
                for (let i = 0; i < remainingNeeded && i < fallbackData.offsets.length; i++) {
                    offsets.push(fallbackData.offsets[i * 3], fallbackData.offsets[i * 3 + 1], fallbackData.offsets[i * 3 + 2]);
                    orientations.push(fallbackData.orientations[i * 4], fallbackData.orientations[i * 4 + 1], fallbackData.orientations[i * 4 + 2], fallbackData.orientations[i * 4 + 3]);
                    stretches.push(fallbackData.stretches[i]);
                    halfRootAngleSin.push(fallbackData.halfRootAngleSin[i]);
                    halfRootAngleCos.push(fallbackData.halfRootAngleCos[i]);
                }
            }
            
            return {
                offsets,
                orientations,
                stretches,
                halfRootAngleCos,
                halfRootAngleSin
            };
            
        } catch (error) {
            Logger.error('Error with MeshSurfaceSampler, using fallback:', error);
            return this.getFallbackAttributeData();
        }
    }
    
    /**
     * Hash-based density function (blue-noise-like, stable in world space)
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} Hash value 0..1
     */
    hash2(x, z) {
        const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return s - Math.floor(s); // 0..1
    }
    
    /**
     * Fallback attribute data generation with minimal filtering
     */
    getFallbackAttributeData() {
        Logger.info('=== FALLBACK ATTRIBUTE DATA GENERATION ===');
        
        const { instances, width } = this.options;
        const offsets = [];
        const orientations = [];
        const stretches = [];
        const halfRootAngleSin = [];
        const halfRootAngleCos = [];
        
        Logger.info('Using fallback placement with minimal filtering...');
        
        for (let i = 0; i < instances; i++) {
            // Simple grid placement with minimal jitter
            const gridX = i % Math.ceil(Math.sqrt(instances));
            const gridZ = Math.floor(i / Math.ceil(Math.sqrt(instances)));
            
            const cellSize = width / Math.ceil(Math.sqrt(instances));
            const offsetX = (gridX * cellSize - width / 2) + (Math.random() - 0.5) * cellSize * 0.5;
            const offsetZ = (gridZ * cellSize - width / 2) + (Math.random() - 0.5) * cellSize * 0.5;
            const offsetY = 0.01; // Slightly above ground
            
            offsets.push(offsetX, offsetY, offsetZ);
            
            // Simple random rotation
            const angle = Math.random() * Math.PI * 2;
            halfRootAngleSin.push(Math.sin(0.5 * angle));
            halfRootAngleCos.push(Math.cos(0.5 * angle));
            
            // Simple quaternion
            orientations.push(0, 0, 0, 1);
            
            // Simple stretch
            stretches.push(0.8 + Math.random() * 0.4);
        }
        
        Logger.info(`✅ Fallback placement complete: ${instances} blades placed`);
        
        return {
            offsets,
            orientations,
            stretches,
            halfRootAngleCos,
            halfRootAngleSin
        };
    }
    
    getAttributeData() {
        // This method is now deprecated in favor of generateTerrainFollowingAttributes
        // Keep for backward compatibility but log a warning
        Logger.warn('getAttributeData() is deprecated, use generateTerrainFollowingAttributes() instead');
        return this.getFallbackAttributeData();
    }
    
    multiplyQuaternions(q1, q2) {
        const x = q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x;
        const y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y;
        const z = q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z;
        const w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w;
        return new THREE.Vector4(x, y, z, w);
    }
    
    getYPosition(x, z) {
        // Enhanced terrain variation - now uses terrain sampling if available
        if (this.terrainMesh && this.sampler) {
            // Use terrain sampling for accurate height
            const position = new THREE.Vector3(x, 0, z);
            const normal = new THREE.Vector3();
            
            // Find the closest point on the terrain surface
            // This is a simplified approach - in practice, you'd want more sophisticated sampling
            const terrainBounds = new THREE.Box3().setFromObject(this.terrainMesh);
            if (terrainBounds.containsPoint(position)) {
                // Sample the terrain at this position
                this.sampler.sample(position, normal);
                const worldPosition = position.clone().applyMatrix4(this.terrainMesh.matrixWorld);
                return worldPosition.y;
            }
        }
        
        // Fallback to noise-based height if no terrain sampling available
        let y = 0.05 * this.noise2D(x / 50, z / 50);
        y += 0.1 * this.noise2D(x / 100, z / 100);
        y += 0.02 * this.noise2D(x / 10, z / 10);
        return y;
    }
    
    update(time) {
        if (this.material) {
            // Use raw time for consistent animation
            this.material.uniforms.time.value = time;
            
            // Update wind direction with more natural variation
            const angle = Math.sin(time * 0.03) * Math.PI * 0.3;
            const strength = 0.5 + Math.sin(time * 0.015) * 0.15;
            
            this.material.uniforms.windDirection.value.set(
                Math.cos(angle) * strength,
                Math.sin(angle) * strength
            );
            
            // Use more natural wind parameters
            this.material.uniforms.windStrength.value = 0.25;
            this.material.uniforms.windSpeed.value = 0.4;
        }
    }
    
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.material.dispose();
        }
    }
} 