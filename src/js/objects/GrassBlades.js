import * as THREE from 'three';
import { GrassMaterial } from '../materials/GrassMaterial.js';
import { createNoise2D } from 'simplex-noise';
import Logger from '../utils/logger.js';

export class GrassBlades {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            bladeWidth: 0.12,
            bladeHeight: 2,
            joints: 5,
            instances: 10000,
            width: 100,
            ...options
        };
        
        this.noise2D = createNoise2D(Math.random);
        this.material = null;
        this.mesh = null;
        
        Logger.info('Creating grass blades with options:', this.options);
        this.init();
    }
    
    async init() {
        const textureLoader = new THREE.TextureLoader();
        
        try {
            // Load textures
            Logger.info('Loading grass textures...');
            const [bladeDiffuse, bladeAlpha] = await Promise.all([
                new Promise((resolve, reject) => {
                    textureLoader.load(
                        '/assets/textures/blade_diffuse.jpg',
                        resolve,
                        undefined,
                        reject
                    );
                }),
                new Promise((resolve, reject) => {
                    textureLoader.load(
                        '/assets/textures/blade_alpha.jpg',
                        resolve,
                        undefined,
                        reject
                    );
                })
            ]);
            
            Logger.info('Textures loaded successfully');
            
            // Create base geometry for a single blade
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
            
            // Generate attribute data
            Logger.info('Generating grass blade attributes...');
            const attributeData = this.getAttributeData();
            
            // Add instanced attributes
            instancedGeometry.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.offsets), 3));
            instancedGeometry.setAttribute('orientation', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.orientations), 4));
            instancedGeometry.setAttribute('stretch', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.stretches), 1));
            instancedGeometry.setAttribute('halfRootAngleSin', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.halfRootAngleSin), 1));
            instancedGeometry.setAttribute('halfRootAngleCos', new THREE.InstancedBufferAttribute(new Float32Array(attributeData.halfRootAngleCos), 1));
            
            // Create material
            this.material = new GrassMaterial({
                map: bladeDiffuse,
                alphaMap: bladeAlpha,
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
    
    getAttributeData() {
        const { instances, width } = this.options;
        const offsets = [];
        const orientations = [];
        const stretches = [];
        const halfRootAngleSin = [];
        const halfRootAngleCos = [];
        
        let quaternion_0 = new THREE.Vector4();
        let quaternion_1 = new THREE.Vector4();
        
        const min = -0.25;
        const max = 0.25;
        
        for (let i = 0; i < instances; i++) {
            // Offset of the roots
            const offsetX = Math.random() * width - width / 2;
            const offsetZ = Math.random() * width - width / 2;
            const offsetY = this.getYPosition(offsetX, offsetZ);
            offsets.push(offsetX, offsetY, offsetZ);
            
            // Define random growth directions
            let angle = Math.PI - Math.random() * (2 * Math.PI);
            halfRootAngleSin.push(Math.sin(0.5 * angle));
            halfRootAngleCos.push(Math.cos(0.5 * angle));
            
            // Rotate around Y
            let rotationAxis = new THREE.Vector3(0, 1, 0);
            let x = rotationAxis.x * Math.sin(angle / 2.0);
            let y = rotationAxis.y * Math.sin(angle / 2.0);
            let z = rotationAxis.z * Math.sin(angle / 2.0);
            let w = Math.cos(angle / 2.0);
            quaternion_0.set(x, y, z, w).normalize();
            
            // Rotate around X
            angle = Math.random() * (max - min) + min;
            rotationAxis = new THREE.Vector3(1, 0, 0);
            x = rotationAxis.x * Math.sin(angle / 2.0);
            y = rotationAxis.y * Math.sin(angle / 2.0);
            z = rotationAxis.z * Math.sin(angle / 2.0);
            w = Math.cos(angle / 2.0);
            quaternion_1.set(x, y, z, w).normalize();
            
            quaternion_0 = this.multiplyQuaternions(quaternion_0, quaternion_1);
            
            // Rotate around Z
            angle = Math.random() * (max - min) + min;
            rotationAxis = new THREE.Vector3(0, 0, 1);
            x = rotationAxis.x * Math.sin(angle / 2.0);
            y = rotationAxis.y * Math.sin(angle / 2.0);
            z = rotationAxis.z * Math.sin(angle / 2.0);
            w = Math.cos(angle / 2.0);
            quaternion_1.set(x, y, z, w).normalize();
            
            quaternion_0 = this.multiplyQuaternions(quaternion_0, quaternion_1);
            
            orientations.push(quaternion_0.x, quaternion_0.y, quaternion_0.z, quaternion_0.w);
            
            // Define variety in height
            if (i < instances / 3) {
                stretches.push(Math.random() * 1.8);
            } else {
                stretches.push(Math.random());
            }
        }
        
        return {
            offsets,
            orientations,
            stretches,
            halfRootAngleCos,
            halfRootAngleSin
        };
    }
    
    multiplyQuaternions(q1, q2) {
        const x = q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x;
        const y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y;
        const z = q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z;
        const w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w;
        return new THREE.Vector4(x, y, z, w);
    }
    
    getYPosition(x, z) {
        // Minimal variation for flat ground
        let y = 0.03 * this.noise2D(x / 50, z / 50);
        y += 0.05 * this.noise2D(x / 100, z / 100);
        y += 0.01 * this.noise2D(x / 10, z / 10);
        return y;
    }
    
    update(time) {
        if (this.material) {
            this.material.uniforms.time.value = time;
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