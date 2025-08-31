import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 15, 20);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add lighting
    setupLighting();
    
    // Add grid helper
    setupGrid();
    
    statusEl.textContent = 'Scene ready';
    
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

// Load a simple ground plane for now
function loadGroundPlane() {
    statusEl.textContent = 'Loading ground plane...';
    
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
    statusEl.textContent = 'Ground plane loaded';
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
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
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
    controls.reset();
};

// Initialize everything
init();
loadGroundPlane();
