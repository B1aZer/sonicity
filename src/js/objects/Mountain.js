import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class Mountain {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.width = options.width || 200;
        this.height = options.height || 60;
        this.segments = options.segments || 128;
        this.position = options.position || new THREE.Vector3(0, 0, -120);
        this.textureUrl = options.textureUrl || 'textures/mountain.png';
        this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
        this.mesh = null;
        this.noiseScale = options.noiseScale || 0.15;
        this.noiseHeight = options.noiseHeight || 18;
        this.init();
    }

    async init() {
        // Create geometry
        const geometry = new THREE.PlaneGeometry(this.width, this.height, this.segments, this.segments);
        const noise2D = createNoise2D();

        // Displace vertices for a mountain silhouette
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const x = geometry.attributes.position.getX(i);
            const y = geometry.attributes.position.getY(i);
            // Only displace the top edge (positive y)
            if (y > 0) {
                const nx = (x / this.width) * 2;
                const ny = (y / this.height) * 2;
                const noise = noise2D(nx * this.noiseScale, ny * this.noiseScale);
                geometry.attributes.position.setZ(i, noise * this.noiseHeight * (y / (this.height / 2)));
            }
        }
        geometry.computeVertexNormals();

        // Load texture
        const textureLoader = new THREE.TextureLoader();
        const texture = await new Promise((resolve, reject) => {
            textureLoader.load(this.textureUrl, resolve, undefined, reject);
        });
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Create material
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: this.opacity < 1.0,
            opacity: this.opacity,
            depthWrite: false,
            fog: true,
        });

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.x = -Math.PI / 2.2; // Slight tilt for painterly look
        this.mesh.receiveShadow = false;
        this.mesh.castShadow = false;
        this.mesh.name = 'Mountain';
        this.scene.add(this.mesh);
    }

    setPosition(x, y, z) {
        if (this.mesh) this.mesh.position.set(x, y, z);
    }

    setOpacity(opacity) {
        if (this.mesh) this.mesh.material.opacity = opacity;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
    }
} 