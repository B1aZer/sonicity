import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getConfiguredGLTFLoader } from '../js/utils/gltfLoader.js';

// Global variables for easy access
let scene, camera, renderer, controls;
let gridHelper, wireframeMode = false;
const statusEl = document.getElementById('status');

// Initialize the scene
function init() {
    statusEl.textContent = 'Setting up scene...';
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1012);
    scene.fog = new THREE.FogExp2(0x0e1012, 0.02);
    
    // Create camera with Blender settings
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Set camera position to match Blender camera
    // Blender camera: loc: [0.0, -27.852283477783203, 5.7505388259887695]
    // Blender camera: rot: [1.5009832382202148, -0.0, 0.0]
    camera.position.set(0, -27.85, 5.75);
    camera.rotation.set(1.501, 0, 0); // Convert from radians
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Create controls but disable them for fixed camera
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false; // Disable orbit controls for fixed camera
    controls.enableDamping = false;
    
    // Add lighting
    setupLighting();
    
    // Add grid helper
    setupGrid();
    
    statusEl.textContent = 'Scene ready with fixed Blender camera';
    
    // Start rendering
    animate();
}

// Setup lighting
function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Hemisphere light for sky/ground lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);
}

// Setup grid helper
function setupGrid() {
    gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(gridHelper);
}

// Load the actual GroundPlan geometry from Blender
async function loadGroundPlane() {
    statusEl.textContent = 'Loading GroundPlan geometry...';
    
    const gltfLoader = getConfiguredGLTFLoader();
    
    try {
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
            statusEl.textContent = 'GroundPlan loaded, setting up materials...';
            
            // Recreate the material system from Blender
            await setupGroundPlanMaterial(groundPlan);
            
            // Apply proper properties
            groundPlan.receiveShadow = true;
            groundPlan.name = "groundPlane";
            groundPlan.updateMatrix();
            groundPlan.updateMatrixWorld();
            
            scene.add(groundPlan);
            
            // Keep the fixed Blender camera position
            // camera.position.set(30, 25, 30);
            // camera.lookAt(0, 0, 0);
            // controls.reset();
            
            statusEl.textContent = 'GroundPlan with materials loaded successfully!';
            console.log('GroundPlan loaded:', groundPlan);
            
        } else {
            throw new Error('GroundPlan mesh not found in GLB file');
        }
        
    } catch (error) {
        console.error('Error loading GroundPlan:', error);
        statusEl.textContent = 'Failed to load GroundPlan, using fallback';
        
        // Fallback to simple ground plane
        const geometry = new THREE.PlaneGeometry(50, 50, 32, 32);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x7dae8a,
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const groundPlane = new THREE.Mesh(geometry, material);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.receiveShadow = true;
        groundPlane.name = "groundPlane";
        
        scene.add(groundPlane);
    }
}

// Setup the material system for GroundPlan (recreating Blender's material setup)
async function setupGroundPlanMaterial(groundPlan) {
    const textureLoader = new THREE.TextureLoader();
    
    try {
        // Load multiple textures for blending
        const [
            grassTexture, 
            grassNormalMap, 
            grassRoughnessMap,
            cloverTexture,
            cloverNormalMap,
            cloverRoughnessMap,
            rockTexture,
            rockNormalMap,
            rockRoughnessMap,
            pathMask
        ] = await Promise.all([
            // Grass textures
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Grass_With_Yellow_Flowers_basecolor.jpg', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Grass_With_Yellow_Flowers_normal.jpg', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Grass_With_Yellow_Flowers_roughness.jpg', resolve, undefined, reject);
            }),
            // Clover textures
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Clover_Ground_basecolor.jpg', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Clover_Ground_normalogl.jpg', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Clover_Ground_roughness.jpg', resolve, undefined, reject);
            }),
            // Rock textures
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Rock and Grass Ground_Albedo.jpg', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Rock and Grass Ground_Normal.jpg', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/Rock and Grass Ground_Roughness.jpg', resolve, undefined, reject);
            }),
            // Path mask
            new Promise((resolve, reject) => {
                textureLoader.load('./textures/PathMask.png', resolve, undefined, reject);
            })
        ]);

        // Configure texture properties
        [grassTexture, grassNormalMap, grassRoughnessMap, cloverTexture, cloverNormalMap, cloverRoughnessMap, rockTexture, rockNormalMap, rockRoughnessMap, pathMask].forEach(texture => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(8, 8); // Adjust tiling as needed
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        // Create a custom shader material that blends multiple textures
        const groundMaterial = new THREE.ShaderMaterial({
            uniforms: {
                grassTexture: { value: grassTexture },
                grassNormalMap: { value: grassNormalMap },
                grassRoughnessMap: { value: grassRoughnessMap },
                cloverTexture: { value: cloverTexture },
                cloverNormalMap: { value: cloverNormalMap },
                cloverRoughnessMap: { value: cloverRoughnessMap },
                rockTexture: { value: rockTexture },
                rockNormalMap: { value: rockNormalMap },
                rockRoughnessMap: { value: rockRoughnessMap },
                pathMask: { value: pathMask },
                dirtColor: { value: new THREE.Color(0x8B4513) }, // Brown dirt color
                roadColor: { value: new THREE.Color(0x696969) },   // Gray road color
                debugMode: { value: 0.0 }, // 0 = normal, 1 = show mask, 2 = show grass only
                time: { value: 0.0 } // For animated variation
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vRandom;
                
                // Random function
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    
                    // Generate random value based on position
                    vRandom = random(position.xz * 100.0);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D grassTexture;
                uniform sampler2D grassNormalMap;
                uniform sampler2D grassRoughnessMap;
                uniform sampler2D cloverTexture;
                uniform sampler2D cloverNormalMap;
                uniform sampler2D cloverRoughnessMap;
                uniform sampler2D rockTexture;
                uniform sampler2D rockNormalMap;
                uniform sampler2D rockRoughnessMap;
                uniform sampler2D pathMask;
                uniform vec3 dirtColor;
                uniform vec3 roadColor;
                uniform float debugMode;
                uniform float time;
                
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vRandom;
                
                // Random function
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                // Noise function for texture variation
                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));
                    
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }
                
                void main() {
                    vec4 mask = texture2D(pathMask, vUv);
                    
                    // Debug mode: show the mask
                    if (debugMode > 0.5) {
                        if (debugMode > 1.5) {
                            // Show grass texture only
                            vec4 grass = texture2D(grassTexture, vUv);
                            gl_FragColor = grass;
                        } else {
                            // Show mask
                            gl_FragColor = mask;
                        }
                        return;
                    }
                    
                    // Generate random variation
                    float noiseValue = noise(vUv * 50.0 + time * 0.1);
                    float randomVariation = random(vUv * 100.0);
                    
                    // Sample all textures with random UV offsets
                    vec2 grassUV = vUv + vec2(randomVariation * 0.01, noiseValue * 0.01);
                    vec2 cloverUV = vUv + vec2(noiseValue * 0.02, randomVariation * 0.02);
                    vec2 rockUV = vUv + vec2(randomVariation * 0.015, noiseValue * 0.015);
                    
                    vec4 grass = texture2D(grassTexture, grassUV);
                    vec4 clover = texture2D(cloverTexture, cloverUV);
                    vec4 rock = texture2D(rockTexture, rockUV);
                    
                    // Use the RGB channels of the mask to determine material areas
                    float grassAmount = mask.r;
                    float dirtAmount = mask.g;
                    float roadAmount = mask.b;
                    
                    // If mask is mostly black/transparent, default to grass
                    float maskTotal = grassAmount + dirtAmount + roadAmount;
                    if (maskTotal < 0.1) {
                        grassAmount = 1.0;
                        dirtAmount = 0.0;
                        roadAmount = 0.0;
                    }
                    
                    // Create random texture multiplication factors
                    float grassMultiplier = 0.8 + randomVariation * 0.4; // 0.8 to 1.2
                    float cloverMultiplier = 0.7 + noiseValue * 0.6; // 0.7 to 1.3
                    float rockMultiplier = 0.9 + randomVariation * 0.2; // 0.9 to 1.1
                    
                    // Apply random multiplication to textures
                    grass.rgb *= grassMultiplier;
                    clover.rgb *= cloverMultiplier;
                    rock.rgb *= rockMultiplier;
                    
                    // Blend grass and clover textures with random variation
                    float grassCloverBlend = sin(vUv.x * 50.0 + randomVariation * 10.0) * 0.5 + 0.5;
                    grassCloverBlend += noiseValue * 0.3; // Add noise variation
                    grassCloverBlend = clamp(grassCloverBlend, 0.0, 1.0);
                    
                    vec3 grassBlend = mix(grass.rgb, clover.rgb, grassCloverBlend * 0.4);
                    
                    // Blend materials based on mask
                    vec3 finalColor = grassBlend * grassAmount + 
                                     rock.rgb * dirtAmount + 
                                     roadColor * roadAmount;
                    
                    // Add some rock texture to grass areas for realism
                    finalColor = mix(finalColor, rock.rgb * 0.2, grassAmount * 0.1);
                    
                    // Add subtle random color variation
                    float colorVariation = (randomVariation - 0.5) * 0.1;
                    finalColor += vec3(colorVariation);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            side: THREE.DoubleSide
        });

        groundPlan.material = groundMaterial;
        console.log('GroundPlan material setup complete with texture blending');
        
        // Add debug controls
        window.debugMask = function() {
            groundMaterial.uniforms.debugMode.value = 1.0;
        };
        
        window.debugGrass = function() {
            groundMaterial.uniforms.debugMode.value = 2.0;
        };
        
        window.normalMode = function() {
            groundMaterial.uniforms.debugMode.value = 0.0;
        };
        
    } catch (error) {
        console.error('Error setting up GroundPlan material:', error);
        
        // Fallback to simple material with grass texture
        try {
            const grassTexture = await new Promise((resolve, reject) => {
                textureLoader.load('./textures/Stylized_Grass_With_Yellow_Flowers_basecolor.jpg', resolve, undefined, reject);
            });
            
            grassTexture.wrapS = THREE.RepeatWrapping;
            grassTexture.wrapT = THREE.RepeatWrapping;
            grassTexture.repeat.set(8, 8);
            grassTexture.colorSpace = THREE.SRGBColorSpace;
            
            groundPlan.material = new THREE.MeshStandardMaterial({ 
                map: grassTexture,
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1
            });
            
        } catch (textureError) {
            console.error('Error loading grass texture:', textureError);
            // Final fallback to simple material
            groundPlan.material = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color(0x7dae8a),
                side: THREE.DoubleSide,
                roughness: 0.9,
                metalness: 0.1
            });
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Update time uniform for animated texture variation
    if (scene) {
        scene.traverse((child) => {
            if (child.material && child.material.uniforms && child.material.uniforms.time) {
                child.material.uniforms.time.value += 0.01;
            }
        });
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Control functions (called from HTML buttons)
window.toggleWireframe = function() {
    wireframeMode = !wireframeMode;
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.wireframe = wireframeMode);
            } else {
                child.material.wireframe = wireframeMode;
            }
        }
    });
};

window.toggleGrid = function() {
    if (gridHelper) {
        gridHelper.visible = !gridHelper.visible;
    }
};

window.resetCamera = function() {
    camera.position.set(0, -27.85, 5.75);
    camera.rotation.set(1.501, 0, 0);
    controls.reset();
};

window.toggleFixedCamera = function() {
    controls.enabled = !controls.enabled;
    if (!controls.enabled) {
        // Reset to Blender camera position when enabling fixed mode
        camera.position.set(0, -27.85, 5.75);
        camera.rotation.set(1.501, 0, 0);
    }
};

// Initialize everything
init();
loadGroundPlane();
