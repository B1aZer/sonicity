import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function setupScene(renderDiv) {
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 20, 25); // Elevated view
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderDiv.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 50, 30);
    directionalLight.castShadow = true;
    // Configure shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    // const helper = new THREE.CameraHelper( directionalLight.shadow.camera );
    // scene.add( helper ); // Optional: Visualize shadow camera

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('src/assets/textures/grasslight-big.jpg');
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
    scene.add(groundPlane);
    // Grid Helper
    const gridSize = 8; // 8x8 grid
    const gridDivisions = 8;
    const gridCellSize = 2; // Size of each cell
    const totalGridSize = gridSize * gridCellSize; // Total physical size of the grid area
    const gridHelper = new THREE.GridHelper(totalGridSize, gridDivisions, 0x000000, 0x000000); // Black lines
    gridHelper.position.y = 0.01; // Slightly above the ground plane to avoid z-fighting
    scene.add(gridHelper);
    // Adjust ground plane size to match grid or be larger
    // For now, let's keep the large ground plane, grid helps visualize placement area.
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Pan parallel to ground
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't look below ground
    controls.minDistance = 5; // Allow closer zoom
    controls.maxDistance = 100;
    controls.enableZoom = true; // Explicitly enable zoom
    controls.zoomSpeed = 1.0; // Adjust zoom speed
    controls.enablePan = true; // Enable panning
    controls.panSpeed = 1.0; // Adjust pan speed
    controls.enableRotate = true; // Enable rotation
    controls.rotateSpeed = 1.0; // Adjust rotation speed
    controls.target.set(0, 0, 0); // Set the target point to look at
    controls.update(); // Initial update

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls, groundPlane, gridSize, gridCellSize }; // Return grid params
}