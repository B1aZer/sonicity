// Replace current orbit controls with fixed camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, -35); // Elevated view of village
camera.lookAt(0, 0, 0);
camera.fov = 45; // Narrower FOV for cinematic look

// Create mountain backdrop using existing assets
const backdropGeometry = new THREE.PlaneGeometry(200, 100);
const backdropMaterial = new THREE.MeshBasicMaterial({
    map: mountainTexture, // From your Mountains/texture_mountain_1.png
    side: THREE.DoubleSide
});
const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
backdrop.position.set(0, 50, -80);
backdrop.rotation.x = -Math.PI / 4; // Angled backdrop



// Use existing GroundPlan from Blender scene
// Replace current ground plane with stylized terrain
const terrainGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
const terrainMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture, // Stylized_Grass_basecolor.jpg
    normalMap: grassNormalMap,
    roughnessMap: grassRoughnessMap
});


// Use existing lighting from Blender scene
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(21, 76, 61); // From scene report
sunLight.castShadow = true;

const areaLight = new THREE.AreaLight(0xffffff, 1.0, 62, 62);
areaLight.position.set(0, 6, 20);

// Add atmospheric fog
const fog = new THREE.Fog(0x87CEEB, 50, 200);
scene.fog = fog;


// Add point lights inside buildings (from scene report)
const indoorLights = [];
buildings.forEach(building => {
    const light = new THREE.PointLight(0xffaa44, 0.8, 10);
    light.position.copy(building.position);
    light.position.y += 2;
    indoorLights.push(light);
});

// Set up animation mixer for all building animations
const mixer = new THREE.AnimationMixer(villageScene.scene);
const animations = {
    'house_Lv1_door': mixer.clipAction(villageScene.animations[0]),
    'house_Lv2_door': mixer.clipAction(villageScene.animations[1]),
    'smithy_bellow': mixer.clipAction(villageScene.animations[2])
};

// Trigger animations on building interaction
function playBuildingAnimation(buildingType) {
    const animationName = `${buildingType}_door`;
    if (animations[animationName]) {
        animations[animationName].reset().play();
    }
}

// Add wind animation to trees
const windSpeed = 0.5;
trees.forEach(tree => {
    tree.rotation.z = Math.sin(time * windSpeed) * 0.1;
});

// Add subtle grass movement
grassBlades.material.uniforms.windStrength.value = Math.sin(time * 0.3) * 0.1;


// Create LOD for distant buildings
const buildingLOD = new THREE.LOD();
buildingLOD.addLevel(highDetailModel, 0);
buildingLOD.addLevel(mediumDetailModel, 50);
buildingLOD.addLevel(lowDetailModel, 100);

// Convert TGA textures to optimized formats
// Use texture compression (KTX2, Basis)
// Implement texture streaming for large scenes



// Raycasting for building selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(buildings);
    
    if (intersects.length > 0) {
        const building = intersects[0].object;
        showBuildingInfo(building.userData.buildingType);
    }
}