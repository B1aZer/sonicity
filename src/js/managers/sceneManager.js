import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Logger from '../utils/logger.js';
import { GrassBlades } from '../objects/GrassBlades.js';
import { River } from '../objects/River.js';
import { Trees } from '../objects/Trees.js';
import { SHOW_PERFORMANCE_MONITOR } from '../utils/constants.js';
import GUI from 'lil-gui';

export class SceneManager {
    constructor(gridManager) {
        this.gridManager = gridManager;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.groundPlane = null;
        this.gridHelper = null;
        this.sky = null;
        this.sun = null;
        this.grassBlades = null;
        this.performanceMonitor = null;
        this.birdSound = null;
        this.trees = null;
        this.gui = null;
        this.boundOnKeyDown = null;
        this.boundOnDebugKeyDown = null;
        //this.river = null;
        this.lights = {
            sunLight: null,
            ambientLight: null,
            hemisphereLight: null
        };
        this.boundOnWindowResize = null;
        this.clock = new THREE.Clock();
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
    }

    /**
     * Creates the sky dome with gradient shader
     * @returns {THREE.Mesh} The sky mesh
     */
    createSky() {
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        return new THREE.Mesh(skyGeometry, skyMaterial);
    }

    /**
     * Creates the sun sphere and its light
     * @returns {Object} Object containing sun mesh and light
     */
    createSun() {
        const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(50, 100, -100);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.copy(sun.position);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;

        return { sun, sunLight };
    }

    /**
     * Creates the ground plane using actual GroundPlan geometry from Blender
     * @returns {Promise<THREE.Mesh>} The ground plane mesh
     */
    async createGroundPlane() {
        const gltfLoader = new GLTFLoader();
        
        try {
            Logger.info('SceneManager: Loading GroundPlan geometry from Blender...');
            
            // Load the GroundPlan GLB file
            const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load(
                    '/assets/terrain.glb',
                    resolve,
                    undefined,
                    reject
                );
            });

            // Find the GroundPlan mesh in the loaded scene
            let groundPlan = null;
            gltf.scene.traverse((child) => {
                if (child.name === 'GroundPlan' && child.isMesh) {
                    groundPlan = child;
                }
            });

            if (groundPlan) {
                Logger.info('SceneManager: Successfully loaded GroundPlan geometry from Blender');
                
                // Apply exact Blender scene positioning with proper axis conversion
                // Blender: location (0, 0, 0), rotation X=0.0433853380382061 radians, others 0; scale 49.00396728515625
                // Blender is Z-up; three.js is Y-up. Axis remap: (x, y, z)_blender → (x, z, y)_three
                groundPlan.position.set(0, 0, 0); // Blender position (0, 0, 0) → Three.js (0, 0, 0)
                
                // Convert Blender rotation: Use exact values from scene_report.json
                const blenderRotationX = 0.0433853380382061; // Exact value from Blender (radians)
                groundPlan.rotation.set(blenderRotationX, 0, 0); // Rx, Rz, Ry (but Ry and Rz are 0)
                
                // Scale: Use exact values from scene_report.json
                const blenderScale = 49.00396728515625;
                groundPlan.scale.set(blenderScale, blenderScale, blenderScale);
                
                // Apply proper properties for the game
                groundPlan.receiveShadow = true;
                groundPlan.name = "groundPlane";
                groundPlan.userData.isGround = true;
                
                // Create a grass material for the terrain (same as main branch) - TEMPORARILY DISABLED
                // const textureLoader = new THREE.TextureLoader();
                // const grassTexture = textureLoader.load('/assets/textures/grasslight-big.jpg');
                // grassTexture.wrapS = THREE.RepeatWrapping;
                // grassTexture.wrapT = THREE.RepeatWrapping;
                // grassTexture.repeat.set(15, 15); // Same as main branch
                // grassTexture.colorSpace = THREE.SRGBColorSpace;
                
                const groundMaterial = new THREE.MeshStandardMaterial({ 
                    // map: grassTexture, // Temporarily disabled
                    side: THREE.DoubleSide,
                    roughness: 0.9,
                    metalness: 0.1,
                    color: new THREE.Color(0x7dae8a).convertSRGBToLinear() // Simple green color
                });
                
                groundPlan.material = groundMaterial;
                groundPlan.updateMatrix();
                groundPlan.updateMatrixWorld();
                
                Logger.info('SceneManager: Terrain positioned to match Blender scene:', {
                    position: groundPlan.position,
                    rotation: groundPlan.rotation,
                    scale: groundPlan.scale
                });
                
                return groundPlan;
            } else {
                Logger.warn('SceneManager: GroundPlan not found in GLB file, falling back to simple plane');
                return this.createFallbackGroundPlane();
            }
            
        } catch (error) {
            Logger.error('SceneManager: Error loading GroundPlan geometry:', error);
            Logger.info('SceneManager: Falling back to simple ground plane');
            return this.createFallbackGroundPlane();
        }
    }

    /**
     * Creates a fallback ground plane when GroundPlan geometry fails to load
     * @returns {THREE.Mesh} The fallback ground plane
     */
    createFallbackGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const textureLoader = new THREE.TextureLoader();
        
        try {
            // const grassTexture = textureLoader.load('assets/textures/grasslight-big.jpg'); // Temporarily disabled
            // grassTexture.wrapS = THREE.RepeatWrapping;
            // grassTexture.wrapT = THREE.RepeatWrapping;
            // grassTexture.repeat.set(15, 15);
            // grassTexture.colorSpace = THREE.SRGBColorSpace;

            const groundMaterial = new THREE.MeshStandardMaterial({ 
                // map: grassTexture, // Temporarily disabled
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1,
                color: new THREE.Color(0x7dae8a).convertSRGBToLinear() // Simple green color
            });

            const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
            groundPlane.rotation.x = -Math.PI / 2;
            groundPlane.receiveShadow = true;
            groundPlane.name = "groundPlane";
            groundPlane.userData.isGround = true;
            groundPlane.position.y = 0;
            groundPlane.updateMatrix();
            groundPlane.updateMatrixWorld();

            return groundPlane;
        } catch (error) {
            Logger.error('SceneManager: Error loading fallback ground texture:', error);
            // Final fallback to basic material
            const groundMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color(0x7dae8a).convertSRGBToLinear(),
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1
            });
            const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
            groundPlane.rotation.x = -Math.PI / 2;
            groundPlane.receiveShadow = true;
            return groundPlane;
        }
    }

    /**
     * Creates the grid helper that follows terrain height
     * @returns {THREE.Group} The grid helper group
     */
    createGridHelper() {
        const cellSize = this.gridManager.getCellSize();
        const dimensions = this.gridManager.gridDimensions[this.gridManager.tier];
        const width = dimensions.width;
        const height = dimensions.height;
        const totalWidth = width * cellSize;
        const totalHeight = height * cellSize;
        const group = new THREE.Group();
        const color = 0x000000;
        const material = new THREE.LineBasicMaterial({ color });

        // Function to get terrain height at a given position
        const getTerrainHeight = (x, z) => {
            // Find the ground plane in the scene
            let groundPlane = null;
            this.scene.traverse((child) => {
                if (child.name === "groundPlane" && child.isMesh) {
                    groundPlane = child;
                }
            });

            if (!groundPlane || !groundPlane.geometry) {
                return 0.01; // Fallback height
            }

            // Create a raycaster to find terrain height
            const raycaster = new THREE.Raycaster();
            const rayStart = new THREE.Vector3(x, 100, z); // Start high above
            const rayEnd = new THREE.Vector3(x, -100, z);  // End below terrain
            raycaster.set(rayStart, rayEnd.sub(rayStart).normalize());

            const intersects = raycaster.intersectObject(groundPlane);
            if (intersects.length > 0) {
                return intersects[0].point.y + 0.02; // Slightly above terrain
            }

            return 0.01; // Fallback height
        };

        // Level 2: Create curved grid lines that follow terrain
        const createCurvedLine = (startX, startZ, endX, endZ, samples = 20) => {
            const points = [];
            
            for (let i = 0; i <= samples; i++) {
                const t = i / samples;
                const x = startX + (endX - startX) * t;
                const z = startZ + (endZ - startZ) * t;
                const y = getTerrainHeight(x, z);
                points.push(new THREE.Vector3(x, y, z));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            return new THREE.Line(geometry, material);
        };

        // Draw vertical lines with terrain following curves
        for (let x = 0; x <= width; x++) {
            const xPos = x * cellSize - totalWidth / 2;
            const line = createCurvedLine(
                xPos, -totalHeight / 2,  // Start point
                xPos, totalHeight / 2    // End point
            );
            group.add(line);
        }

        // Draw horizontal lines with terrain following curves
        for (let z = 0; z <= height; z++) {
            const zPos = z * cellSize - totalHeight / 2;
            const line = createCurvedLine(
                -totalWidth / 2, zPos,  // Start point
                totalWidth / 2, zPos    // End point
            );
            group.add(line);
        }

        return group;
    }

    /**
     * Calculates the appropriate FOV and camera position based on screen width
     * @param {number} screenWidth - The screen width in pixels
     * @returns {Object} {fov: number, position: {x, y, z}, rotation: {x, y, z}}
     */
    calculateFOV(screenWidth) {
        // Use exact camera position from user's latest log
        // Position: {x: '0', y: '0.7', z: '13'}
        // Rotation (degrees): {x: '-3', y: '0', z: '-0'}
        // Rotation (radians): {x: '0', y: '0', z: '0'}
        
        // Exact position from the log
        const threePosX = 0;
        const threePosY = 0.7;
        const threePosZ = 13;
        
        // Exact rotation from the log (in radians)
        // TODO: does not seem to work with orbit controls or like at all
        const threeRotX = 0;  // -3 degrees (but radians show 0)
        const threeRotY = 0;
        const threeRotZ = 0;
        
        // Use 35mm lens FOV (approximately 54 degrees)
        const baseFOV = 52;
        
        if (screenWidth < 480) { // Mobile phones
            return {
                fov: 95, // Very wide FOV for mobile devices
                position: { x: threePosX, y: threePosY * 1.2, z: threePosZ * 1.2 }, // Slightly adjusted for mobile
                rotation: { x: threeRotX, y: threeRotY, z: threeRotZ }
            };
        } else if (screenWidth < 768) { // Small desktop/tablet
            return {
                fov: 65, // Wider for small screens
                position: { x: threePosX, y: threePosY * 1.1, z: threePosZ * 1.1 }, // Slightly adjusted
                rotation: { x: threeRotX, y: threeRotY, z: threeRotZ }
            };
        } else if (screenWidth < 1200) { // Medium desktop
            return {
                fov: 60, // Wider for small screens
                position: { x: threePosX, y: threePosY, z: threePosZ },
                rotation: { x: threeRotX, y: threeRotY, z: threeRotZ }
            };
        }
        return {
            fov: baseFOV, // Default 35mm FOV for large screens
            position: { x: threePosX, y: threePosY, z: threePosZ },
            rotation: { x: threeRotX, y: threeRotY, z: threeRotZ }
        };
    }

    /**
     * Sets up the camera
     * @param {HTMLElement} renderDiv - The container element
     * @returns {THREE.PerspectiveCamera} The camera
     */
    setupCamera(renderDiv) {
        // Create camera with dynamic FOV based on screen size
        const screenWidth = window.innerWidth;
        const { fov, position, rotation } = this.calculateFOV(screenWidth);
        
        const camera = new THREE.PerspectiveCamera(
            fov, // Dynamic FOV based on screen size
            renderDiv.clientWidth / renderDiv.clientHeight,
            0.1,
            1000
        );
        
        // Set camera to exact Blender scene position and rotation
        camera.position.set(position.x, position.y, position.z);
        camera.rotation.set(rotation.x, rotation.y, rotation.z);
        
        Logger.info('Camera set to exact position from user log:', {
            position: camera.position,
            rotation: camera.rotation,
            fov: camera.fov,
            aspect: camera.aspect,
            targetPosition: 'x=0, y=0.7, z=13',
            targetRotation: '-3°, 0°, -0°'
        });
        
        return camera;
    }

    createPerformanceMonitor(renderDiv) {
        const monitor = document.createElement('div');
        monitor.style.position = 'absolute';
        monitor.style.top = '10px';
        monitor.style.right = '10px';
        monitor.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        monitor.style.color = '#fff';
        monitor.style.padding = '10px';
        monitor.style.fontFamily = 'monospace';
        monitor.style.fontSize = '12px';
        monitor.style.borderRadius = '5px';
        monitor.style.zIndex = '1000';
        monitor.style.display = SHOW_PERFORMANCE_MONITOR ? 'block' : 'none';
        renderDiv.appendChild(monitor);
        return monitor;
    }

    setupKeyBindings() {
        this.boundOnKeyDown = (event) => {
            if (event.key === 'p') { // Using 'p' key for performance monitor toggle
                this.togglePerformanceMonitor();
            }
        };
        window.addEventListener('keydown', this.boundOnKeyDown);

        // Debug GUI hotkey
        this.boundOnDebugKeyDown = (event) => {
            if (event.key === 'd') {
                this.toggleDebugGUI();
            }
        };
        window.addEventListener('keydown', this.boundOnDebugKeyDown);
    }

    togglePerformanceMonitor() {
        if (this.performanceMonitor) {
            const isVisible = this.performanceMonitor.style.display !== 'none';
            this.performanceMonitor.style.display = isVisible ? 'none' : 'block';
            Logger.info(`Performance monitor ${isVisible ? 'disabled' : 'enabled'}`);
        }
    }

    toggleDebugGUI() {
        if (this.gui) {
            this.gui._hidden ? this.gui.show() : this.gui.hide();
            Logger.info(`Debug GUI ${this.gui._hidden ? 'disabled' : 'enabled'}`);
        }
    }

    updatePerformanceMonitor() {
        if (!this.performanceMonitor) return;

        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastTime = currentTime;

            // Get GPU info if available
            const gl = this.renderer.getContext();
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Not available';
            
            // Update monitor content
            this.performanceMonitor.innerHTML = `
                FPS: ${this.fps}<br>
                GPU: ${renderer}<br>
                Draw Calls: ${this.renderer.info.render.calls}<br>
                Triangles: ${this.renderer.info.render.triangles}<br>
                Points: ${this.renderer.info.render.points}<br>
                Lines: ${this.renderer.info.render.lines}
            `;
        }
    }

    /**
     * Sets up the renderer
     * @param {HTMLElement} renderDiv - The container element
     * @returns {THREE.WebGLRenderer} The renderer
     */
    setupRenderer(renderDiv) {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.physicallyCorrectLights = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderDiv.appendChild(renderer.domElement);

        // Create performance monitor
        this.performanceMonitor = this.createPerformanceMonitor(renderDiv);
        
        // Setup key bindings
        this.setupKeyBindings();

        return renderer;
    }

    /**
     * Sets up the orbit controls
     * @param {THREE.Camera} camera - The camera
     * @param {THREE.WebGLRenderer} renderer - The renderer
     * @returns {OrbitControls} The controls
     */
    setupControls(camera, renderer) {
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        
        // Restrict vertical rotation (up/down)
        //controls.maxPolarAngle = Math.PI / 32; // Limit looking down (was Math.PI / 2 - 0.05)
        //controls.minPolarAngle = -Math.PI / 32; // Limit looking up (new restriction)
        
        // Restrict horizontal rotation (left/right)
        controls.maxAzimuthAngle = Math.PI / 32; // Limit right rotation (45 degrees)
        controls.minAzimuthAngle = -Math.PI / 32; // Limit left rotation (-45 degrees)
        
        controls.minDistance = 5;
        controls.maxDistance = 100;
        controls.enableZoom = false; // Disabled zoom
        controls.zoomSpeed = 1.0;
        controls.enablePan = true;
        controls.panSpeed = 1.0;
        controls.enableRotate = true;
        controls.rotateSpeed = 0.5; // Reduced rotation speed for more control
        controls.target.set(0, 0, 0); // Look at center
        controls.update();
        return controls;
    }

    /**
     * Sets up the lighting
     */
    setupLighting() {
        // Ambient light
        this.lights.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(this.lights.ambientLight);
        
        // Hemisphere light
        this.lights.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x808080, 0.8);
        this.scene.add(this.lights.hemisphereLight);
    }

    /**
     * Sets up the window resize handler
     */
    setupWindowResizeHandler() {
        let resizeTimeout;
        
        this.boundOnWindowResize = () => {
            // Clear the previous timeout
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            // Set a new timeout to delay the FOV update
            resizeTimeout = setTimeout(() => {
                const oldAspect = this.camera.aspect;
                const oldFov = this.camera.fov;
                const oldPosition = this.camera.position.clone();
                
                // Calculate new FOV, position, and rotation based on screen width
                const screenWidth = window.innerWidth;
                const { fov, position, rotation } = this.calculateFOV(screenWidth);
                
                // Only update FOV if it actually changed
                if (Math.abs(fov - oldFov) > 1) {
                    this.camera.fov = fov;
                    Logger.info('Camera FOV updated:', {
                        windowSize: `${window.innerWidth}x${window.innerHeight}`,
                        oldFov: oldFov,
                        newFov: this.camera.fov
                    });
                }
                
                // Update camera position and rotation
                this.camera.position.set(position.x, position.y, position.z);
                this.camera.rotation.set(rotation.x, rotation.y, rotation.z);
                
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                
                Logger.info('Camera resized:', {
                    windowSize: `${window.innerWidth}x${window.innerHeight}`,
                    oldAspect: oldAspect.toFixed(3),
                    newAspect: this.camera.aspect.toFixed(3),
                    fov: this.camera.fov,
                    position: `(${position.x}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`,
                    rotation: `(${(rotation.x * 180 / Math.PI).toFixed(1)}°, ${(rotation.y * 180 / Math.PI).toFixed(1)}°, ${(rotation.z * 180 / Math.PI).toFixed(1)}°)`
                });
            }, 150); // 150ms delay to prevent jarring changes
        };
        window.addEventListener('resize', this.boundOnWindowResize);
    }

    setupAudio() {
        // Create audio listener
        const listener = new THREE.AudioListener();
        this.camera.add(listener);

        // Create bird sound
        this.birdSound = new THREE.Audio(listener);

        // Load bird sound
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
            'assets/sound/bird.wav',  // Updated path to include sound directory
            (buffer) => {
                try {
                    this.birdSound.setBuffer(buffer);
                    this.birdSound.setLoop(true);
                    this.birdSound.setVolume(0.3); // Reduced volume
                    this.birdSound.play();
                    Logger.info('Bird sound loaded and playing');
                } catch (error) {
                    Logger.error('Error setting up bird sound:', error);
                }
            },
            // Progress callback
            (xhr) => {
                Logger.info('Loading bird sound:', (xhr.loaded / xhr.total * 100) + '% loaded');
            },
            // Error callback
            (error) => {
                Logger.error('Error loading bird sound:', error);
                // Try to load a fallback format if available
                audioLoader.load(
                    'assets/sound/bird.mp3',  // Try MP3 as fallback
                    (buffer) => {
                        try {
                            this.birdSound.setBuffer(buffer);
                            this.birdSound.setLoop(true);
                            this.birdSound.setVolume(0.3);
                            this.birdSound.play();
                            Logger.info('Bird sound (MP3) loaded and playing');
                        } catch (error) {
                            Logger.error('Error setting up bird sound (MP3):', error);
                        }
                    },
                    undefined,
                    (error) => {
                        Logger.error('Error loading bird sound (MP3):', error);
                    }
                );
            }
        );
    }

    /**
     * Logs current camera position and rotation
     */
    logCameraPosition() {
        if (!this.camera) {
            Logger.warn('Camera not available for logging');
            return;
        }

        const pos = this.camera.position;
        const rot = this.camera.rotation;
        
        // Convert rotations to degrees for easier reading
        const rotDegrees = {
            x: (rot.x * 180 / Math.PI).toFixed(2),
            y: (rot.y * 180 / Math.PI).toFixed(2),
            z: (rot.z * 180 / Math.PI).toFixed(2)
        };

        Logger.info('=== CAMERA POSITION LOG ===');
        Logger.info('Position:', {
            x: pos.x.toFixed(4),
            y: pos.y.toFixed(4),
            z: pos.z.toFixed(4)
        });
        Logger.info('Rotation (degrees):', rotDegrees);
        Logger.info('Rotation (radians):', {
            x: rot.x.toFixed(6),
            y: rot.y.toFixed(6),
            z: rot.z.toFixed(6)
        });
        Logger.info('FOV:', this.camera.fov.toFixed(2));
        Logger.info('Aspect Ratio:', this.camera.aspect.toFixed(4));
        Logger.info('==========================');
        
        // Also log to console for easy copying
        console.log('=== CAMERA POSITION LOG ===');
        console.log('Position:', { x: pos.x.toFixed(4), y: pos.y.toFixed(4), z: pos.z.toFixed(4) });
        console.log('Rotation (degrees):', rotDegrees);
        console.log('Rotation (radians):', { x: rot.x.toFixed(6), y: rot.y.toFixed(6), z: rot.z.toFixed(6) });
        console.log('FOV:', this.camera.fov.toFixed(2));
        console.log('==========================');
    }



    setupDebugUI() {
        // Create GUI with proper container and styling
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);

        this.gui = new GUI({ 
            container: container,
            width: 300,
            title: 'Debug Controls'
        });
        
        // Ensure GUI is visible when shown
        this.gui.domElement.style.position = 'absolute';
        this.gui.domElement.style.top = '0';
        this.gui.domElement.style.right = '0';
        this.gui.domElement.style.zIndex = '1000';
        
        // Hide by default
        this.gui.hide();

        // Camera Controls
        const cameraFolder = this.gui.addFolder('Camera');
        cameraFolder.add(this.camera.position, 'x', -200, 200).name('Position X');
        cameraFolder.add(this.camera.position, 'y', 0, 200).name('Position Y');
        cameraFolder.add(this.camera.position, 'z', -200, 200).name('Position Z');
        cameraFolder.add(this.camera, 'fov', 30, 120).name('FOV').onChange(() => {
            this.camera.updateProjectionMatrix();
        });
        cameraFolder.add(this.camera, 'near', 0.1, 10).name('Near').onChange(() => {
            this.camera.updateProjectionMatrix();
        });
        cameraFolder.add(this.camera, 'far', 100, 2000).name('Far').onChange(() => {
            this.camera.updateProjectionMatrix();
        });

        // Sun Light
        if (this.lights.sunLight && this.sun) {
            const sunFolder = this.gui.addFolder('Sun Light');
            sunFolder.addColor({ color: this.lights.sunLight.color.getHex() }, 'color')
                .onChange(value => this.lights.sunLight.color.set(value));
            sunFolder.add(this.lights.sunLight, 'intensity', 0, 5);
            sunFolder.add(this.sun.position, 'x', -200, 200);
            sunFolder.add(this.sun.position, 'y', 0, 200);
            sunFolder.add(this.sun.position, 'z', -200, 200);
            sunFolder.add(this.lights.sunLight, 'castShadow').onChange(() => {
                this.lights.sunLight.shadow.mapSize.width = 2048;
                this.lights.sunLight.shadow.mapSize.height = 2048;
                this.lights.sunLight.shadow.camera.updateProjectionMatrix();
            });
        }

        // Ambient Light
        if (this.lights.ambientLight) {
            const ambientFolder = this.gui.addFolder('Ambient Light');
            ambientFolder.addColor({ color: this.lights.ambientLight.color.getHex() }, 'color')
                .onChange(value => this.lights.ambientLight.color.set(value));
            ambientFolder.add(this.lights.ambientLight, 'intensity', 0, 2);
        }

        // Hemisphere Light
        if (this.lights.hemisphereLight) {
            const hemiFolder = this.gui.addFolder('Hemisphere Light');
            hemiFolder.addColor({ color: this.lights.hemisphereLight.color.getHex() }, 'color')
                .onChange(value => this.lights.hemisphereLight.color.set(value));
            hemiFolder.add(this.lights.hemisphereLight, 'intensity', 0, 2);
        }

        // Fog
        if (this.scene && this.scene.fog) {
            const fogFolder = this.gui.addFolder('Fog');
            fogFolder.addColor({ color: this.scene.fog.color.getHex() }, 'color')
                .onChange(value => this.scene.fog.color.set(value));
            fogFolder.add(this.scene.fog, 'near', 1, 200);
            fogFolder.add(this.scene.fog, 'far', 10, 1000);
        }

        // Sky Shader
        if (this.sky && this.sky.material && this.sky.material.uniforms) {
            const skyFolder = this.gui.addFolder('Sky');
            skyFolder.addColor({ value: this.sky.material.uniforms.topColor.value.getHex() }, 'value')
                .name('Top Color')
                .onChange(value => this.sky.material.uniforms.topColor.value.set(value));
            skyFolder.addColor({ value: this.sky.material.uniforms.bottomColor.value.getHex() }, 'value')
                .name('Bottom Color')
                .onChange(value => this.sky.material.uniforms.bottomColor.value.set(value));
            skyFolder.add(this.sky.material.uniforms.exponent, 'value', 0, 2).name('Exponent');
        }

        // Renderer Settings
        const rendererFolder = this.gui.addFolder('Renderer');
        rendererFolder.add(this.renderer, 'toneMappingExposure', 0, 2).name('Exposure');
        
        // Shadow Map Controls
        const shadowMapFolder = rendererFolder.addFolder('Shadow Map');
        shadowMapFolder.add(this.renderer.shadowMap, 'enabled')
            .name('Enabled')
            .onChange((value) => {
                // Update shadow map size when enabling shadows
                if (value && this.lights.sunLight) {
                    this.lights.sunLight.shadow.mapSize.width = 2048;
                    this.lights.sunLight.shadow.mapSize.height = 2048;
                    this.lights.sunLight.shadow.camera.updateProjectionMatrix();
                }
                
                // Toggle shadows on all objects in the scene
                this.scene.traverse((object) => {
                    if (object.isMesh) {
                        object.castShadow = value;
                        object.receiveShadow = value;
                    }
                });

                // Toggle shadow casting on lights
                if (this.lights.sunLight) {
                    this.lights.sunLight.castShadow = value;
                }
            });
        shadowMapFolder.add(this.renderer.shadowMap, 'type', {
            'Basic': THREE.BasicShadowMap,
            'PCF': THREE.PCFShadowMap,
            'PCFSoft': THREE.PCFSoftShadowMap,
            'VSM': THREE.VSMShadowMap
        }).name('Type');

        // Grid Helper
        const gridFolder = this.gui.addFolder('Grid');
        gridFolder.add(this.gridHelper, 'visible').name('Show Grid');

        // Debug Logging Controls
        const debugFolder = this.gui.addFolder('Debug Logging');
        
        // Log current camera position
        debugFolder.add({
            logCameraPosition: () => this.logCameraPosition()
        }, 'logCameraPosition').name('Log Camera Position (C)');
    }

    /**
     * Sets up the scene
     * @param {HTMLElement} renderDiv - The container element
     * @returns {Promise<Object>} Scene components
     */
    async setupScene(renderDiv) {
        try {
            // Create scene
            this.scene = new THREE.Scene();
            
            // Add sky
            this.sky = this.createSky();
            this.scene.add(this.sky);
            
            // Add sun and its light
            const { sun, sunLight } = this.createSun();
            this.sun = sun;
            this.lights.sunLight = sunLight;
            this.scene.add(this.sun);
            this.scene.add(this.lights.sunLight);
            
            // Setup camera
            this.camera = this.setupCamera(renderDiv);
            
            // Setup renderer
            this.renderer = this.setupRenderer(renderDiv);
            
            // Setup controls
            this.controls = this.setupControls(this.camera, this.renderer);
            
            // Create ground plane
            this.groundPlane = await this.createGroundPlane();
            this.scene.add(this.groundPlane);
            
            // Create grid helper
            this.gridHelper = this.createGridHelper();
            this.scene.add(this.gridHelper);
            
            // Create animated grass
            // this.grassBlades = new GrassBlades(this.scene, {
            //     width: this.gridManager.getTotalSize(),
            //     instances: 200000,  // Reduced from 300000 for more subtle density
            //     width: 200,
            //     bladeWidth: 0.08,   // Reduced from 0.15 for thinner blades
            //     bladeHeight: 0.8,   // Reduced from 1.0 for shorter grass
            //     joints: 4,          // Reduced from 6 for simpler bending
            //     density: 0.8        // Reduced from 1.2 for more sparse distribution
            // });

            // Create trees
            // this.trees = new Trees(this.scene, this.gridManager);

            // Create river
            /*
            this.river = new River(this.scene, {
                start: new THREE.Vector3(-80, 0.01, -60),
                end: new THREE.Vector3(80, 0.01, 60),
                numPoints: 8,
                width: 8,
                winding: 18,
                color: 0x3399ff,
                opacity: 0.7
            });
            */
            
            // Setup lighting
            this.setupLighting();
            
            // Setup window resize handler
            this.setupWindowResizeHandler();
            
            // Setup audio
            this.setupAudio();

            // Add debug GUI
            this.setupDebugUI();
            
            Logger.info('Scene setup complete:', {
                gridSize: this.gridManager.getGridSize(),
                cellSize: this.gridManager.getCellSize(),
                totalSize: this.gridManager.getTotalSize()
            });
            
            return { 
                scene: this.scene,
                camera: this.camera,
                renderer: this.renderer,
                controls: this.controls,
                groundPlane: this.groundPlane,
                gridHelper: this.gridHelper
            };
        } catch (error) {
            Logger.error('Error setting up scene:', error);
            throw error;
        }
    }

    /**
     * Updates the scene
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
        
        // Update grass animation
        // if (this.grassBlades) {
        //     this.grassBlades.update(this.clock.getElapsedTime());
        // }

        // Update trees
        // if (this.trees) {
        //     this.trees.update();
        // }

        if (SHOW_PERFORMANCE_MONITOR) {
            this.updatePerformanceMonitor();
        }
    }

    /**
     * Cleans up resources
     */
    dispose() {
        // Remove key bindings
        if (this.boundOnKeyDown) {
            window.removeEventListener('keydown', this.boundOnKeyDown);
        }
        if (this.boundOnDebugKeyDown) {
            window.removeEventListener('keydown', this.boundOnDebugKeyDown);
        }


        // Dispose of debug GUI
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
        }

        // Remove performance monitor
        if (this.performanceMonitor && this.performanceMonitor.parentNode) {
            this.performanceMonitor.parentNode.removeChild(this.performanceMonitor);
        }

        // Remove window resize listener
        if (this.boundOnWindowResize) {
            window.removeEventListener('resize', this.boundOnWindowResize);
        }

        // Stop and dispose of bird sound
        if (this.birdSound) {
            this.birdSound.stop();
            this.birdSound = null;
        }

        // Dispose of grass blades
        if (this.grassBlades) {
            this.grassBlades.dispose();
            this.grassBlades = null;
        }

        // Dispose of trees
        if (this.trees) {
            this.trees.dispose();
            this.trees = null;
        }

        // Dispose of river
        /*
        if (this.river) {
            this.river.dispose();
            this.river = null;
        }
        */

        // Dispose of Three.js resources
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        // Remove renderer from DOM
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }

        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
        }

        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.groundPlane = null;
        this.gridHelper = null;
        this.sky = null;
        this.sun = null;
        this.lights = {
            sunLight: null,
            ambientLight: null,
            hemisphereLight: null
        };
        this.boundOnWindowResize = null;
    }
} 