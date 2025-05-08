import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Logger from '../utils/logger.js';
import { GrassBlades } from '../objects/GrassBlades.js';

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
        this.lights = {
            sunLight: null,
            ambientLight: null,
            hemisphereLight: null
        };
        this.boundOnWindowResize = null;
        this.clock = new THREE.Clock();
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
     * Creates the ground plane with grass texture
     * @returns {Promise<THREE.Mesh>} The ground plane mesh
     */
    async createGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const textureLoader = new THREE.TextureLoader();
        
        try {
            const grassTexture = await new Promise((resolve, reject) => {
                textureLoader.load(
                    'assets/textures/grasslight-big.jpg',
                    resolve,
                    undefined,
                    reject
                );
            });

            grassTexture.wrapS = THREE.RepeatWrapping;
            grassTexture.wrapT = THREE.RepeatWrapping;
            grassTexture.repeat.set(25, 25);

            const groundMaterial = new THREE.MeshStandardMaterial({ 
                map: grassTexture,
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.2
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
            Logger.error('Error loading ground texture:', error);
            // Fallback to basic material if texture fails to load
            const groundMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                side: THREE.DoubleSide,
                roughness: 0.8,
                metalness: 0.2
            });
            const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
            groundPlane.rotation.x = -Math.PI / 2;
            groundPlane.receiveShadow = true;
            return groundPlane;
        }
    }

    /**
     * Creates the grid helper
     * @returns {THREE.GridHelper} The grid helper
     */
    createGridHelper() {
        const gridSize = this.gridManager.getGridSize();
        const cellSize = this.gridManager.getCellSize();
        const totalGridSize = gridSize * cellSize;
        const gridHelper = new THREE.GridHelper(totalGridSize, gridSize, 0x000000, 0x000000);
        gridHelper.position.y = 0.01;
        return gridHelper;
    }

    /**
     * Sets up the camera
     * @param {HTMLElement} renderDiv - The container element
     * @returns {THREE.PerspectiveCamera} The camera
     */
    setupCamera(renderDiv) {
        // Calculate grid dimensions
        const gridSize = this.gridManager.getGridSize();
        const cellSize = this.gridManager.getCellSize();
        const totalSize = gridSize * cellSize;
        const radius = totalSize / 2;

        // Create camera
        const camera = new THREE.PerspectiveCamera(
            75,
            renderDiv.clientWidth / renderDiv.clientHeight,
            0.1,
            1000
        );
        
        // Position camera to look at City Hall
        const height = 28; // Height for overview
        const distance = 35; // Distance from center
        camera.position.set(0, height, distance); // Position camera behind City Hall
        
        return camera;
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
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.minDistance = 5;
        controls.maxDistance = 100;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.0;
        controls.enablePan = true;
        controls.panSpeed = 1.0;
        controls.enableRotate = true;
        controls.rotateSpeed = 1.0;
        controls.target.set(0, 0, 0); // Look at City Hall position
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
        this.boundOnWindowResize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', this.boundOnWindowResize);
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
            this.grassBlades = new GrassBlades(this.scene, {
                width: this.gridManager.getTotalSize(),
                instances: 80000, // Adjust based on performance
                width: 200,
                bladeWidth: 0.04,
                bladeHeight: 1.8,
            });
            
            // Setup lighting
            this.setupLighting();
            
            // Setup window resize handler
            this.setupWindowResizeHandler();
            
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
        
        if (this.grassBlades) {
            this.grassBlades.update(this.clock.getElapsedTime());
        }
    }

    /**
     * Cleans up resources
     */
    dispose() {
        // Remove window resize listener
        if (this.boundOnWindowResize) {
            window.removeEventListener('resize', this.boundOnWindowResize);
        }

        // Dispose of grass blades
        if (this.grassBlades) {
            this.grassBlades.dispose();
            this.grassBlades = null;
        }

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