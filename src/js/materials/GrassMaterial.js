import * as THREE from 'three';

export class GrassMaterial extends THREE.ShaderMaterial {
    constructor(parameters = {}) {
        super({
            uniforms: {
                time: { value: 0 },
                map: { value: null },
                alphaMap: { value: null },
                windStrength: { value: 0.2 },
                windSpeed: { value: 0.5 },
                tipColor: { value: new THREE.Color(0.0, 0.6, 0.0).convertSRGBToLinear() },
                bottomColor: { value: new THREE.Color(0.0, 0.1, 0.0).convertSRGBToLinear() },
                windDirection: { value: new THREE.Vector2(1.0, 0.0) }
            },
            vertexShader: `
                attribute vec3 offset;
                attribute vec4 orientation;
                attribute float stretch;
                attribute float halfRootAngleSin;
                attribute float halfRootAngleCos;
                
                uniform float time;
                uniform float windStrength;
                uniform float windSpeed;
                uniform vec2 windDirection;
                
                varying vec2 vUv;
                varying float vWindStrength;
                varying float frc;
                varying vec3 vPosition;
                
                // Quaternion multiplication
                vec4 qmul(vec4 q1, vec4 q2) {
                    return vec4(
                        q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
                        q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
                        q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
                        q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
                    );
                }
                
                // Quaternion to rotation matrix
                mat3 quaternionToMatrix(vec4 q) {
                    float x = q.x, y = q.y, z = q.z, w = q.w;
                    float x2 = x + x, y2 = y + y, z2 = z + z;
                    float xx = x * x2, xy = x * y2, xz = x * z2;
                    float yy = y * y2, yz = y * z2, zz = z * z2;
                    float wx = w * x2, wy = w * y2, wz = w * z2;
                    
                    return mat3(
                        1.0 - (yy + zz), xy - wz, xz + wy,
                        xy + wz, 1.0 - (xx + zz), yz - wx,
                        xz - wy, yz + wx, 1.0 - (xx + yy)
                    );
                }
                
                // Improved wind function with more natural movement
                float wind(float x, float y, float time) {
                    // Primary wind wave
                    float wind = sin(time * windSpeed + x * 0.1) * windStrength;
                    
                    // Secondary wind wave (slower, wider)
                    wind += sin(time * windSpeed * 0.5 + x * 0.05) * windStrength * 0.3;
                    
                    // Tertiary wind wave (very slow, very wide)
                    wind += sin(time * windSpeed * 0.25 + x * 0.025) * windStrength * 0.15;
                    
                    // Add some turbulence
                    wind += sin(time * windSpeed * 2.0 + x * 0.2) * windStrength * 0.05;
                    
                    return wind;
                }
                
                void main() {
                    vUv = uv;
                    frc = position.y;
                    vPosition = position;
                    
                    // Calculate wind effect with multiple frequencies
                    float windX = wind(position.x, position.y, time) * windDirection.x;
                    float windZ = wind(position.x, position.y, time) * windDirection.y;
                    vWindStrength = length(vec2(windX, windZ));
                    
                    // Apply wind to vertex position with height-based influence
                    vec3 pos = position;
                    float heightFactor = smoothstep(0.0, 1.0, position.y / 1.0);
                    
                    // Apply wind with more natural movement
                    pos.x += windX * heightFactor * heightFactor; // Square the height factor for more natural movement
                    pos.z += windZ * heightFactor * heightFactor;
                    
                    // Add slight vertical movement that follows the wind
                    float verticalWind = sin(time * windSpeed * 0.5 + position.x * 0.1) * windStrength * 0.1;
                    pos.y += verticalWind * heightFactor * heightFactor;
                    
                    // Apply stretch
                    pos.y *= stretch;
                    
                    // Apply orientation
                    vec4 q = orientation;
                    mat3 rot = quaternionToMatrix(q);
                    pos = rot * pos;
                    
                    // Add offset
                    pos += offset;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                uniform sampler2D alphaMap;
                uniform vec3 tipColor;
                uniform vec3 bottomColor;
                
                varying vec2 vUv;
                varying float vWindStrength;
                varying float frc;
                varying vec3 vPosition;
                
                void main() {
                    vec4 color = texture2D(map, vUv);
                    float alpha = texture2D(alphaMap, vUv).r;
                    
                    // If transparent, don't draw
                    if(alpha < 0.15) discard;
                    
                    // Add color variation based on height with smooth transition
                    float heightFactor = smoothstep(0.0, 1.0, frc);
                    color = mix(vec4(bottomColor, 1.0), vec4(tipColor, 1.0), heightFactor);
                    
                    // Add some color variation based on wind
                    float windFactor = smoothstep(0.0, 0.5, vWindStrength);
                    color.rgb *= 1.0 + windFactor * 0.2;
                    
                    // Add slight color variation based on position
                    float noise = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
                    color.rgb *= 1.0 + (noise - 0.5) * 0.1;
                    
                    gl_FragColor = color;
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Set the textures as uniforms
        if (parameters.map) {
            this.uniforms.map.value = parameters.map;
        }
        if (parameters.alphaMap) {
            this.uniforms.alphaMap.value = parameters.alphaMap;
        }
    }
} 