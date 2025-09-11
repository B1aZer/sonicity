import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BattleSystemContract } from '../contracts/BattleSystemContract.js';
import Logger from '../utils/logger.js';

export class PatrolManager {
    constructor(scene, assetLoader, battleSystemContract) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.battleSystemContract = battleSystemContract;
        this.gltfLoader = new GLTFLoader();
        
        // Track patrol units and their states
        this.patrolUnits = new Map(); // unitId -> unit object
        this.unitMixers = new Map(); // unitId -> animation mixer
        this.patrolRoutes = new Map(); // routeId -> waypoints array
        this.routeAssignments = new Map(); // unitId -> routeId
        
        // Unit templates cache
        this.unitTemplates = new Map();
        
        // Patrol settings
        this.patrolSpeed = 2.0; // units per second
        this.waypointPauseTime = 2.0; // seconds to pause at waypoints
        this.unitIdCounter = 0;
        
        // Update tracking (like other managers)
        this.updateTimer = 0;
        this.updateInterval = 5.0; // Update patrols every 5 seconds
        this.lastTroopCounts = { infantry: 0, cavalry: 0, siege: 0 };
        
        this.setupPatrolRoutes();
        Logger.info('PatrolManager initialized');
    }
    
    /**
     * Setup predefined patrol routes based on building positions
     * Y coordinates will be updated to terrain height when units spawn
     */
    setupPatrolRoutes() {
        // City Center Patrol - around main buildings
        this.patrolRoutes.set('city_center', [
            new THREE.Vector3(-5, 0, -5),   // Near Altar
            new THREE.Vector3(5, 0, -5),    // Near Mine
            new THREE.Vector3(5, 0, -15),   // Toward Barracks
            new THREE.Vector3(-5, 0, -15),  // Near City Hall
        ]);
        
        // Perimeter Patrol - outer defensive ring
        this.patrolRoutes.set('perimeter', [
            new THREE.Vector3(-20, 0, -5),  // West side
            new THREE.Vector3(20, 0, -5),   // East side
            new THREE.Vector3(20, 0, -40),  // Southeast corner
            new THREE.Vector3(-20, 0, -40), // Southwest corner
        ]);
        
        // Barracks to Garrison Patrol - military corridor
        this.patrolRoutes.set('military_corridor', [
            new THREE.Vector3(12, 0, -10),  // Barracks position
            new THREE.Vector3(10, 0, -20),  // Midpoint
            new THREE.Vector3(7, 0, -35),   // Garrison position
            new THREE.Vector3(15, 0, -30),  // Return path
        ]);
        
        // Scout Route - wider area reconnaissance
        this.patrolRoutes.set('scout_route', [
            new THREE.Vector3(16, 0, -38),  // Scout Guild
            new THREE.Vector3(25, 0, -20),  // Eastern outpost
            new THREE.Vector3(0, 0, -50),   // Southern point
            new THREE.Vector3(-25, 0, -25), // Western point
        ]);
        
        Logger.info(`Setup ${this.patrolRoutes.size} patrol routes`);
    }
    
    /**
     * Get terrain height at a given world position
     * Same logic as BuildingManager.getTerrainHeightAt()
     */
    getTerrainHeightAt(x, z) {
        // Find the ground plane in the scene
        let groundPlane = null;
        this.scene.traverse((child) => {
            if (child.name === "groundPlane" && child.isMesh) {
                groundPlane = child;
            }
        });

        if (!groundPlane || !groundPlane.geometry) {
            Logger.debug(`No ground plane found, using fallback height for position (${x}, ${z})`);
            return 0; // Fallback height
        }

        // Create a raycaster to find terrain height
        const raycaster = new THREE.Raycaster();
        const rayStart = new THREE.Vector3(x, 100, z); // Start high above
        const rayEnd = new THREE.Vector3(x, -100, z);  // End below terrain
        raycaster.set(rayStart, rayEnd.sub(rayStart).normalize());

        const intersects = raycaster.intersectObject(groundPlane);
        if (intersects.length > 0) {
            const terrainHeight = intersects[0].point.y + 0.1; // Slightly above terrain
            Logger.debug(`Terrain height at (${x}, ${z}): ${terrainHeight}`);
            return terrainHeight;
        }

        Logger.debug(`No terrain intersection found at (${x}, ${z}), using fallback`);
        return 0; // Fallback height
    }
    
    /**
     * Update patrol route waypoints to follow terrain height
     */
    updateRouteToTerrain(route) {
        return route.map(waypoint => {
            const terrainHeight = this.getTerrainHeightAt(waypoint.x, waypoint.z);
            return new THREE.Vector3(waypoint.x, terrainHeight, waypoint.z);
        });
    }
    
    /**
     * Load unit model template
     */
    async loadUnitTemplate(unitType) {
        if (this.unitTemplates.has(unitType)) {
            return this.unitTemplates.get(unitType);
        }
        
        try {
            const modelPath = this.getUnitModelPath(unitType);
            Logger.info(`Loading unit template: ${unitType} from ${modelPath}`);
            
            const gltf = await this.gltfLoader.loadAsync(modelPath);
            const template = gltf.scene;
            
            // Store animations
            template.animations = gltf.animations;
            
            // Configure the template
            template.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
                if (child.isSkinnedMesh) {
                    child.frustumCulled = false;
                }
            });
            
            this.unitTemplates.set(unitType, template);
            Logger.info(`✅ Unit template loaded: ${unitType}`);
            return template;
            
        } catch (error) {
            Logger.error(`Failed to load unit template ${unitType}:`, error);
            return null;
        }
    }
    
    /**
     * Get model path for unit type
     */
    getUnitModelPath(unitType) {
        const modelPaths = {
            'infantry': 'assets/Infantry_A.glb',
            // Add more when you have them
            // 'cavalry': 'assets/Cavalry_A.glb',
            // 'siege': 'assets/Siege_A.glb'
        };
        
        return modelPaths[unitType] || modelPaths['infantry'];
    }
    
    /**
     * Spawn a patrol unit
     */
    async spawnPatrolUnit(unitType, routeId, position = null) {
        try {
            // Load template if needed
            const template = await this.loadUnitTemplate(unitType);
            if (!template) {
                Logger.error(`Cannot spawn unit - template not found: ${unitType}`);
                return null;
            }
            
            // Clone the template
            const unit = SkeletonUtils.clone(template);
            const unitId = `${unitType}_patrol_${this.unitIdCounter++}`;
            unit.name = unitId;
            
            // Set initial position with terrain adjustment
            const baseRoute = this.patrolRoutes.get(routeId);
            if (!baseRoute || baseRoute.length === 0) {
                Logger.error(`Invalid route: ${routeId}`);
                return null;
            }

            // Update route to follow terrain height
            const terrainRoute = this.updateRouteToTerrain(baseRoute);
            const startPosition = position || terrainRoute[0].clone();
            
            Logger.info(`Spawning unit at terrain-adjusted position: (${startPosition.x}, ${startPosition.y}, ${startPosition.z})`);
            unit.position.copy(startPosition);
            
            // Scale unit appropriately
            unit.scale.setScalar(0.8); // Adjust based on your scene scale
            
            // Setup unit data
            unit.userData = {
                id: unitId,
                type: unitType,
                route: terrainRoute, // Use terrain-adjusted route
                currentWaypoint: 0,
                isPaused: false,
                pauseTimer: 0,
                speed: this.patrolSpeed,
                state: 'walking' // walking, paused, idle
            };
            
            // Setup animations
            this.setupUnitAnimations(unit);
            
            // Add to scene and tracking
            this.scene.add(unit);
            this.patrolUnits.set(unitId, unit);
            this.routeAssignments.set(unitId, routeId);
            
            Logger.info(`✅ Spawned patrol unit: ${unitId} on route ${routeId}`);
            return unit;
            
        } catch (error) {
            Logger.error(`Error spawning patrol unit:`, error);
            return null;
        }
    }
    
    /**
     * Setup animations for a unit
     */
    setupUnitAnimations(unit) {
        if (!unit.animations || unit.animations.length === 0) {
            Logger.warn(`No animations found for unit: ${unit.name}`);
            return;
        }
        
        const mixer = new THREE.AnimationMixer(unit);
        
        // Find and setup walk animation
        const walkClip = unit.animations.find(clip => 
            clip.name.toLowerCase().includes('walk') || 
            clip.name.toLowerCase().includes('run') ||
            clip.name.toLowerCase().includes('move')
        );
        
        if (walkClip) {
            const walkAction = mixer.clipAction(walkClip);
            walkAction.setLoop(THREE.LoopRepeat);
            walkAction.play();
            unit.userData.walkAction = walkAction;
            Logger.debug(`Setup walk animation: ${walkClip.name}`);
        }
        
        // Find and setup idle animation
        const idleClip = unit.animations.find(clip => 
            clip.name.toLowerCase().includes('idle') ||
            clip.name.toLowerCase().includes('stand')
        );
        
        if (idleClip) {
            const idleAction = mixer.clipAction(idleClip);
            idleAction.setLoop(THREE.LoopRepeat);
            unit.userData.idleAction = idleAction;
            Logger.debug(`Setup idle animation: ${idleClip.name}`);
        }
        
        this.unitMixers.set(unit.userData.id, mixer);
    }
    
    /**
     * Update all patrol units and check for troop count changes
     */
    update(deltaTime) {
        // Update animation mixers
        this.unitMixers.forEach((mixer) => {
            mixer.update(deltaTime);
        });
        
        // Update patrol movements
        this.patrolUnits.forEach((unit) => {
            this.updateUnitPatrol(unit, deltaTime);
        });
        
        // Periodically check for troop count changes (like other managers)
        this.updateTimer += deltaTime;
        if (this.updateTimer >= this.updateInterval) {
            this.updateTimer = 0;
            this.checkAndUpdatePatrols();
        }
    }
    
    /**
     * Check troop counts from contract and update patrols if needed
     * Similar to how CosmeticManager.loadPlayerCosmetics() works
     */
    async checkAndUpdatePatrols() {
        try {
            // Get current player address (similar to other managers)
            const signer = await this.battleSystemContract.getSigner();
            if (!signer) {
                // No wallet connected, clear patrols
                if (this.patrolUnits.size > 0) {
                    Logger.info('No wallet connected, clearing patrols');
                    this.clearAllPatrols();
                }
                return;
            }
            
            const playerAddress = await signer.getAddress();
            
            // Query contract for current troop counts (like CosmeticManager checks ownership)
            const [infantryCount, cavalryCount, siegeCount] = await Promise.all([
                this.battleSystemContract.playerTroops(playerAddress, BattleSystemContract.TROOP_TYPES.INFANTRY),
                this.battleSystemContract.playerTroops(playerAddress, BattleSystemContract.TROOP_TYPES.CAVALRY),
                this.battleSystemContract.playerTroops(playerAddress, BattleSystemContract.TROOP_TYPES.SIEGE)
            ]);
            
            const currentTroopCounts = {
                infantry: Number(infantryCount),
                cavalry: Number(cavalryCount),
                siege: Number(siegeCount)
            };
            
            // Check if troop counts have changed
            const hasChanged = 
                currentTroopCounts.infantry !== this.lastTroopCounts.infantry ||
                currentTroopCounts.cavalry !== this.lastTroopCounts.cavalry ||
                currentTroopCounts.siege !== this.lastTroopCounts.siege;
            
            if (hasChanged) {
                Logger.info('Troop counts changed, updating patrols:', currentTroopCounts);
                await this.updatePatrolsFromTroopCounts(currentTroopCounts);
                this.lastTroopCounts = currentTroopCounts;
            }
            
        } catch (error) {
            Logger.error('Error checking troop counts for patrols:', error);
        }
    }
    
    /**
     * Update patrols based on current troop counts
     * Similar to CosmeticManager.loadPlayerCosmetics()
     */
    async updatePatrolsFromTroopCounts(troopCounts) {
        Logger.info('Updating patrol units based on troop counts:', troopCounts);
        
        // Clear existing patrols (similar to cosmetic manager removing old cosmetics)
        this.clearAllPatrols();
        
        // Only spawn patrols if player has troops
        const totalTroops = troopCounts.infantry + troopCounts.cavalry + troopCounts.siege;
        if (totalTroops === 0) {
            Logger.info('No troops available, no patrols spawned');
            return;
        }
        
        // Spawn infantry patrols (1 patrol per 1 infantry, max 4 patrols)
        const infantryPatrols = Math.min(troopCounts.infantry, 4);
        Logger.info(`Calculating patrols: ${troopCounts.infantry} infantry = ${infantryPatrols} patrols (max 4)`);
        
        for (let i = 0; i < infantryPatrols; i++) {
            const routes = ['city_center', 'perimeter', 'military_corridor', 'scout_route'];
            const routeId = routes[i % routes.length];
            await this.spawnPatrolUnit('infantry', routeId);
            
            // Small delay between spawns to spread them out on routes
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        Logger.info(`Spawned ${infantryPatrols} infantry patrols from ${troopCounts.infantry} total infantry`);
    }
    
    /**
     * Update individual unit patrol behavior
     */
    updateUnitPatrol(unit, deltaTime) {
        const userData = unit.userData;
        
        if (userData.isPaused) {
            userData.pauseTimer -= deltaTime;
            if (userData.pauseTimer <= 0) {
                userData.isPaused = false;
                userData.state = 'walking';
                this.switchToWalkAnimation(unit);
            }
            return;
        }
        
        // Get current target waypoint
        const targetWaypoint = userData.route[userData.currentWaypoint];
        if (!targetWaypoint) return;
        
        // Calculate movement
        const direction = targetWaypoint.clone().sub(unit.position);
        const distance = direction.length();
        
        // Check if reached waypoint
        if (distance < 0.5) {
            // Reached waypoint - pause and look around
            userData.isPaused = true;
            userData.pauseTimer = this.waypointPauseTime;
            userData.state = 'paused';
            userData.currentWaypoint = (userData.currentWaypoint + 1) % userData.route.length;
            
            this.switchToIdleAnimation(unit);
            return;
        }
        
        // Move towards waypoint
        direction.normalize();
        const moveDistance = userData.speed * deltaTime;
        unit.position.add(direction.multiplyScalar(moveDistance));
        
        // Adjust Y position to follow terrain
        const terrainHeight = this.getTerrainHeightAt(unit.position.x, unit.position.z);
        unit.position.y = terrainHeight;
        
        // Rotate to face movement direction
        const lookTarget = unit.position.clone().add(direction);
        lookTarget.y = unit.position.y; // Keep same height for look target
        unit.lookAt(lookTarget);
    }
    
    /**
     * Switch unit to walk animation
     */
    switchToWalkAnimation(unit) {
        if (unit.userData.walkAction && unit.userData.idleAction) {
            unit.userData.idleAction.fadeOut(0.3);
            unit.userData.walkAction.reset().fadeIn(0.3).play();
        }
    }
    
    /**
     * Switch unit to idle animation
     */
    switchToIdleAnimation(unit) {
        if (unit.userData.walkAction && unit.userData.idleAction) {
            unit.userData.walkAction.fadeOut(0.3);
            unit.userData.idleAction.reset().fadeIn(0.3).play();
        }
    }
    
    
    /**
     * Clear all patrol units
     */
    clearAllPatrols() {
        this.patrolUnits.forEach((unit, unitId) => {
            this.scene.remove(unit);
            
            // Clean up animations
            const mixer = this.unitMixers.get(unitId);
            if (mixer) {
                mixer.stopAllAction();
            }
        });
        
        this.patrolUnits.clear();
        this.unitMixers.clear();
        this.routeAssignments.clear();
        
        Logger.info('Cleared all patrol units');
    }
    
    /**
     * Get patrol statistics
     */
    getPatrolStats() {
        return {
            totalUnits: this.patrolUnits.size,
            activeRoutes: new Set(this.routeAssignments.values()).size,
            unitsByType: this.getUnitCountsByType()
        };
    }
    
    /**
     * Get unit counts by type
     */
    getUnitCountsByType() {
        const counts = {};
        this.patrolUnits.forEach((unit) => {
            const type = unit.userData.type;
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }
    
    /**
     * Cleanup resources
     */
    dispose() {
        this.clearAllPatrols();
        this.unitTemplates.clear();
        this.patrolRoutes.clear();
        Logger.info('PatrolManager disposed');
    }
}
