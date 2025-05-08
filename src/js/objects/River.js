import * as THREE from 'three';

export class River {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            start: new THREE.Vector3(-80, 0.01, -60),
            end: new THREE.Vector3(80, 0.01, 60),
            numPoints: 8,
            width: 8,
            winding: 18, // higher = more winding
            color: 0x3399ff,
            opacity: 0.7,
            ...options
        };
        this.mesh = null;
        this.createRiver();
    }

    createRiver() {
        // Generate control points for the spline
        const points = [];
        for (let i = 0; i < this.options.numPoints; i++) {
            const t = i / (this.options.numPoints - 1);
            // Linear interpolation between start and end
            const x = THREE.MathUtils.lerp(this.options.start.x, this.options.end.x, t);
            const z = THREE.MathUtils.lerp(this.options.start.z, this.options.end.z, t);
            // Add some procedural winding
            const offset = Math.sin(t * Math.PI * 2) * this.options.winding * (Math.random() * 0.5 + 0.5);
            points.push(new THREE.Vector3(x + offset, this.options.start.y, z));
        }
        const curve = new THREE.CatmullRomCurve3(points);

        // Sample points along the curve
        const riverPoints = curve.getPoints(100);
        const left = [], right = [];
        for (let i = 0; i < riverPoints.length; i++) {
            // Get tangent for direction
            const tangent = curve.getTangent(i / (riverPoints.length - 1));
            // Get perpendicular vector (XZ plane)
            const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            left.push(riverPoints[i].clone().add(perp.clone().multiplyScalar(this.options.width / 2)));
            right.push(riverPoints[i].clone().add(perp.clone().multiplyScalar(-this.options.width / 2)));
        }

        // Build geometry (as a strip)
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < riverPoints.length; i++) {
            vertices.push(left[i].x, left[i].y, left[i].z);
            vertices.push(right[i].x, right[i].y, right[i].z);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Build indices for triangle strip
        const indices = [];
        for (let i = 0; i < riverPoints.length - 1; i++) {
            const a = i * 2;
            const b = i * 2 + 1;
            const c = i * 2 + 2;
            const d = i * 2 + 3;
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Simple water material
        const material = new THREE.MeshStandardMaterial({
            color: this.options.color,
            transparent: true,
            opacity: this.options.opacity,
            roughness: 0.2,
            metalness: 0.7,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = false;
        this.mesh.name = 'river';
        this.scene.add(this.mesh);
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