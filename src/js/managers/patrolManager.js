import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BattleSystemContract } from '../contracts/BattleSystemContract.js';
import { PATROL_CONFIG, BUILDINGS, UNIT_MODELS } from '../utils/constants.js';
import Logger from '../utils/logger.js';
import { getConfiguredGLTFLoader } from '../utils/gltfLoader.js';

export class PatrolManager {
    constructor(scene, assetLoader, battleSystemContract) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.battleSystemContract = battleSystemContract;
        this.gltfLoader = getConfiguredGLTFLoader();
        
        // Track patrol units and their states
        this.patrolUnits = new Map(); // unitId -> unit object
        this.unitMixers = new Map(); // unitId -> animation mixer
        this.patrolRoutes = new Map(); // routeId -> waypoints array
        this.routeAssignments = new Map(); // unitId -> routeId
        
        // Unit templates cache
        this.unitTemplates = new Map();
        
        // Patrol settings from constants
        this.waypointPauseTime = PATROL_CONFIG.WAYPOINT_PAUSE_TIME;
        this.unitIdCounter = 0;
        
        // Update tracking (like other managers)
        this.updateTimer = 0;
        this.updateInterval = PATROL_CONFIG.UPDATE_INTERVAL;
        this.lastTroopCounts = { infantry: 0, cavalry: 0, siege: 0 };
        
        this.setupPatrolRoutes();
        Logger.info('PatrolManager initialized');
    }
    
    /**
     * Setup predefined patrol routes that avoid building collisions
     * Routes are designed to flow around buildings naturally
     */
    setupPatrolRoutes() {
        // Get barracks spawn position
        const barracksPos = BUILDINGS.BARRACKS.position;
        
        // Create separate spawn points for each unit type
        this.spawnPoints = {
            infantry: new THREE.Vector3(barracksPos.x + 0.1, 0, barracksPos.z + 0.1),   // Close to barracks
            cavalry: new THREE.Vector3(barracksPos.x - 1, 0, barracksPos.z - 2),   // Slightly further east
            siege: new THREE.Vector3(barracksPos.x + 2, 0, barracksPos.z - 3)      // Slightly further south
        };
        
        // City Center Patrol - flows around main buildings avoiding collisions
        this.patrolRoutes.set('city_center', [
            new THREE.Vector3(-5, 0, -2),   // Closer to barracks area
            new THREE.Vector3(-8, 0, -5),   // West of Altar (safe corridor)
            new THREE.Vector3(-8, 0, -10),  // South of Altar  
            new THREE.Vector3(-3, 0, -15),  // West of City Hall (avoiding building)
            new THREE.Vector3(3, 0, -15),   // East of City Hall
            new THREE.Vector3(8, 0, -10),   // North of Mine (safe passage)
            new THREE.Vector3(8, 0, -5),    // Around Mine area
            new THREE.Vector3(0, 0, 0),     // Return to barracks area
        ]);
        
        // Perimeter Patrol - outer defensive ring with safe clearance
        this.patrolRoutes.set('perimeter', [
            new THREE.Vector3(-25, 0, 5),   // Far west (clear of all buildings)
            new THREE.Vector3(25, 0, 5),    // Far east  
            new THREE.Vector3(25, 0, -15),  // East side mid
            new THREE.Vector3(20, 0, -25),  // Southeast approach
            new THREE.Vector3(12, 0, -45),  // South of garrison area
            new THREE.Vector3(-15, 0, -45), // Southwest corner
            new THREE.Vector3(-25, 0, -25), // West side return
            new THREE.Vector3(-25, 0, -5),  // Northwest corner
        ]);
        
        // Military Corridor - connects military buildings with safe passages
        this.patrolRoutes.set('military_corridor', [
            new THREE.Vector3(5, 0, -5),    // Close to barracks area
            new THREE.Vector3(12, 0, -8),   // East of Barracks (safe side)
            new THREE.Vector3(15, 0, -15),  // Clear corridor east
            new THREE.Vector3(15, 0, -25),  // Midway south
            new THREE.Vector3(10, 0, -30),  // Approach to Garrison (avoiding building)
            new THREE.Vector3(4, 0, -32),   // West of Garrison (safe passage)
            new THREE.Vector3(4, 0, -38),   // South of Garrison
            new THREE.Vector3(8, 0, -42),   // Return path east
            new THREE.Vector3(12, 0, -35),  // Return north avoiding buildings
            new THREE.Vector3(8, 0, -20),   // Return corridor
            new THREE.Vector3(2, 0, -5),    // Return to barracks area
        ]);
        
        // Scout Route - wide reconnaissance avoiding all major structures
        this.patrolRoutes.set('scout_route', [
            new THREE.Vector3(3, 0, -8),    // Close to barracks area
            new THREE.Vector3(15, 0, -12),  // East of Scout Guild (safe approach)
            new THREE.Vector3(20, 0, -25),  // Eastern outpost clear area
            new THREE.Vector3(25, 0, -20),  // Far east observation
            new THREE.Vector3(20, 0, -10),  // Northeast sweep
            new THREE.Vector3(12, 0, -5),   // Central east (avoiding Mine)
            new THREE.Vector3(0, 0, -2),    // Central north (clear corridor)
            new THREE.Vector3(-12, 0, -5),  // Central west
            new THREE.Vector3(-20, 0, -15), // Western observation
            new THREE.Vector3(-15, 0, -25), // Southwest sweep
            new THREE.Vector3(-5, 0, -35),  // South central
            new THREE.Vector3(5, 0, -40),   // Return east (clear of buildings)
            new THREE.Vector3(10, 0, -35),  // Approach return
            new THREE.Vector3(1, 0, -5),    // Return to barracks area
        ]);
        
        // Siege Edge Route - minimal movement for heavy siege equipment on town edges
        this.patrolRoutes.set('siege_edge', [
            new THREE.Vector3(5, 0, -8),    // Close to barracks area
            new THREE.Vector3(8, 0, -12),   // East edge of town
            new THREE.Vector3(8, 0, -20),   // South along east edge
            new THREE.Vector3(5, 0, -25),   // Return west slightly
            new THREE.Vector3(2, 0, -20),   // Back toward barracks area
            new THREE.Vector3(1, 0, -8),    // Return to spawn area
        ]);
        
        Logger.info(`Setup ${this.patrolRoutes.size} building-aware patrol routes`);
        Logger.info(`Spawn points - Infantry: (${this.spawnPoints.infantry.x}, ${this.spawnPoints.infantry.z}), Cavalry: (${this.spawnPoints.cavalry.x}, ${this.spawnPoints.cavalry.z}), Siege: (${this.spawnPoints.siege.x}, ${this.spawnPoints.siege.z})`);
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
            const terrainHeight = intersects[0].point.y + PATROL_CONFIG.TERRAIN_OFFSET;
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
            'infantry': UNIT_MODELS.INFANTRY.modelPath,
            'cavalry': UNIT_MODELS.CAVALRY.modelPath,
            'siege': UNIT_MODELS.SIEGE.modelPath
        };
        
        return modelPaths[unitType] || modelPaths['infantry'];
    }
    
    /**
     * Get size configuration for unit type
     */
    getUnitSize(unitType) {
        const unitSizes = {
            'infantry': UNIT_MODELS.INFANTRY.size,
            'cavalry': UNIT_MODELS.CAVALRY.size,
            'siege': UNIT_MODELS.SIEGE.size
        };
        
        return unitSizes[unitType] || unitSizes['infantry'];
    }
    
    /**
     * Get patrol speed for unit type from configuration
     */
    getUnitSpeed(unitType) {
        const speeds = {
            'infantry': PATROL_CONFIG.INFANTRY_SPEED,
            'cavalry': PATROL_CONFIG.CAVALRY_SPEED,
            'siege': PATROL_CONFIG.SIEGE_SPEED
        };
        
        return speeds[unitType] || PATROL_CONFIG.INFANTRY_SPEED;
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
            
            // Set initial position - always spawn near barracks
            const baseRoute = this.patrolRoutes.get(routeId);
            if (!baseRoute || baseRoute.length === 0) {
                Logger.error(`Invalid route: ${routeId}`);
                return null;
            }

            // Start at unit-specific spawn point, then create route: spawn -> patrol route -> loop patrol
            const unitSpawnPoint = this.spawnPoints[unitType] || this.spawnPoints.infantry;
            const deploymentRoute = [unitSpawnPoint.clone(), ...baseRoute]; // Add spawn point as first waypoint
            
            // Update route to follow terrain height
            const terrainRoute = this.updateRouteToTerrain(deploymentRoute);
            const startPosition = position || terrainRoute[0].clone(); // Start at unit-specific spawn point
            
            Logger.info(`Spawning ${unitType} unit at spawn point: (${startPosition.x}, ${startPosition.y}, ${startPosition.z}) for route: ${routeId}`);
            unit.position.copy(startPosition);
            
            // Scale unit appropriately using unit-specific size
            const unitSize = this.getUnitSize(unitType);
            unit.scale.copy(unitSize);
            
            // Setup unit data
            unit.userData = {
                id: unitId,
                type: unitType,
                route: terrainRoute, // Use terrain-adjusted route (includes barracks start)
                patrolStartIndex: 1, // Index where actual patrol loop begins (after barracks)
                currentWaypoint: 0, // Start at barracks
                isPaused: false,
                pauseTimer: 0,
                speed: this.getUnitSpeed(unitType), // Use configurable speed per unit type
                state: 'walking', // walking, paused, idle
                hasReachedPatrol: false // Track if unit has left barracks area
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
        
        // Find and setup walk animation (prioritize walk over run, but also check for 'move')
        const walkClip = unit.animations.find(clip => 
            clip.name.toLowerCase().includes('walk') ||
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
        
        // Spawn infantry patrols using configurable ratio
        const infantryPatrols = Math.min(
            Math.floor(troopCounts.infantry / PATROL_CONFIG.INFANTRY_PER_PATROL), 
            PATROL_CONFIG.MAX_PATROLS.INFANTRY
        );
        Logger.info(`Calculating patrols: ${troopCounts.infantry} infantry ÷ ${PATROL_CONFIG.INFANTRY_PER_PATROL} = ${infantryPatrols} patrols (max ${PATROL_CONFIG.MAX_PATROLS.INFANTRY})`);
        
        for (let i = 0; i < infantryPatrols; i++) {
            const routes = ['city_center', 'perimeter', 'military_corridor', 'scout_route'];
            const routeId = routes[i % routes.length];
            await this.spawnPatrolUnit('infantry', routeId);
            
            // Small delay between spawns to spread them out on routes
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        Logger.info(`Spawned ${infantryPatrols} infantry patrols from ${troopCounts.infantry} total infantry`);
        
        // Spawn cavalry patrols using configurable ratio
        const cavalryPatrols = Math.min(
            Math.floor(troopCounts.cavalry / PATROL_CONFIG.CAVALRY_PER_PATROL), 
            PATROL_CONFIG.MAX_PATROLS.CAVALRY
        );
        Logger.info(`Calculating patrols: ${troopCounts.cavalry} cavalry ÷ ${PATROL_CONFIG.CAVALRY_PER_PATROL} = ${cavalryPatrols} patrols (max ${PATROL_CONFIG.MAX_PATROLS.CAVALRY})`);
        
        for (let i = 0; i < cavalryPatrols; i++) {
            const routes = ['perimeter', 'military_corridor', 'scout_route', 'city_center'];
            const routeId = routes[i % routes.length];
            await this.spawnPatrolUnit('cavalry', routeId);
            
            // Small delay between spawns to spread them out on routes
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        Logger.info(`Spawned ${cavalryPatrols} cavalry patrols from ${troopCounts.cavalry} total cavalry`);
        
        // Spawn siege patrols using configurable ratio
        const siegePatrols = Math.min(
            Math.floor(troopCounts.siege / PATROL_CONFIG.SIEGE_PER_PATROL), 
            PATROL_CONFIG.MAX_PATROLS.SIEGE
        );
        Logger.info(`Calculating patrols: ${troopCounts.siege} siege ÷ ${PATROL_CONFIG.SIEGE_PER_PATROL} = ${siegePatrols} patrols (max ${PATROL_CONFIG.MAX_PATROLS.SIEGE})`);
        
        for (let i = 0; i < siegePatrols; i++) {
            // Siege units use minimal edge movement only
            const routeId = 'siege_edge';
            await this.spawnPatrolUnit('siege', routeId);
            
            // Small delay between spawns to spread them out on routes
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        Logger.info(`Spawned ${siegePatrols} siege patrols from ${troopCounts.siege} total siege`);
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
            
            // Handle waypoint progression with proper patrol looping
            const nextWaypoint = userData.currentWaypoint + 1;
            
            if (!userData.hasReachedPatrol && nextWaypoint >= userData.patrolStartIndex) {
                // Unit has left barracks area and reached patrol route
                userData.hasReachedPatrol = true;
                userData.currentWaypoint = nextWaypoint;
                Logger.debug(`Unit ${userData.id} has reached patrol area, beginning patrol loop`);
            } else if (userData.hasReachedPatrol && nextWaypoint >= userData.route.length) {
                // Loop back to start of patrol (skip barracks spawn point)
                userData.currentWaypoint = userData.patrolStartIndex;
                Logger.debug(`Unit ${userData.id} completed patrol loop, restarting`);
            } else {
                // Normal progression
                userData.currentWaypoint = nextWaypoint;
            }
            
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
            unit.userData.idleAction.fadeOut(PATROL_CONFIG.ANIMATION_FADE_TIME);
            unit.userData.walkAction.reset().fadeIn(PATROL_CONFIG.ANIMATION_FADE_TIME).play();
        }
    }
    
    /**
     * Switch unit to idle animation
     */
    switchToIdleAnimation(unit) {
        if (unit.userData.walkAction && unit.userData.idleAction) {
            unit.userData.walkAction.fadeOut(PATROL_CONFIG.ANIMATION_FADE_TIME);
            unit.userData.idleAction.reset().fadeIn(PATROL_CONFIG.ANIMATION_FADE_TIME).play();
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
