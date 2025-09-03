import * as THREE from 'three';
import Logger from '../utils/logger.js';

export class GrassMaterial extends THREE.ShaderMaterial {
    constructor(parameters = {}) {
        super({
            uniforms: {
                time: { value: 0 },
                map: { value: null },
                alphaMap: { value: null },
                colorMap: { value: null },
                windStrength: { value: 0.6 },  // Reduced from 2.0 to 0.6 for natural movement
                windSpeed: { value: 0.8 },     // Reduced from 2.5 to 0.8 for natural speed
                tipColor: { value: new THREE.Color(0.35, 0.75, 0.18).convertSRGBToLinear() },
                bottomColor: { value: new THREE.Color(0.15, 0.35, 0.1).convertSRGBToLinear() },
                windDirection: { value: new THREE.Vector2(1.0, 0.0) },
                opacity: { value: 0.3 }  // New: global opacity control
            },
            vertexShader: `
                attribute vec3 offset;
                attribute vec4 orientation;
                attribute float stretch;
                attribute float halfRootAngleSin;
                attribute float halfRootAngleCos;
                attribute vec3 rootPosition;
                
                uniform float time;
                uniform float windStrength;
                uniform float windSpeed;
                uniform vec2 windDirection;
                
                varying vec2 vUv;
                varying float vWindStrength;
                varying float frc;
                varying vec3 vPosition;
                varying vec3 vRootPosition;
                
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
                
                // Improved wind function with more subtle movement
                float wind(float x, float y, float time) {
                    // Primary wind wave with more subtle frequency
                    float wind = sin(time * windSpeed + x * 0.06) * windStrength;
                    
                    // Secondary wind wave (slower, wider)
                    wind += sin(time * windSpeed * 0.3 + x * 0.03) * windStrength * 0.25; // Reduced from 0.5 to 0.25
                    
                    // Tertiary wind wave (very slow, very wide)
                    wind += sin(time * windSpeed * 0.15 + x * 0.015) * windStrength * 0.15; // Reduced from 0.3 to 0.15
                    
                    // Add some very subtle turbulence
                    wind += sin(time * windSpeed * 1.2 + x * 0.12) * windStrength * 0.08; // Reduced from 0.15 to 0.08
                    
                    return wind;
                }
                
                void main() {
                    vUv = uv;
                    frc = position.y;
                    vPosition = position;
                    vRootPosition = rootPosition;
                    
                    // Calculate wind effect with multiple frequencies
                    float windX = wind(position.x, position.y, time) * windDirection.x;
                    float windZ = wind(position.x, position.y, time) * windDirection.y;
                    vWindStrength = length(vec2(windX, windZ));
                    
                    // Apply wind to vertex position with height-based influence
                    vec3 pos = position;
                    float heightFactor = smoothstep(0.0, 1.0, position.y / 1.0);
                    
                    // Apply wind with more natural movement
                    pos.x += windX * heightFactor * heightFactor; // Reduced from heightFactor^3 to heightFactor^2
                    pos.z += windZ * heightFactor * heightFactor;
                    
                    // Add slight vertical movement that follows the wind
                    float verticalWind = sin(time * windSpeed * 0.4 + position.x * 0.08) * windStrength * 0.15;
                    pos.y += verticalWind * heightFactor; // Reduced from heightFactor^2 to heightFactor
                    
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
                uniform sampler2D colorMap;
                uniform vec3 tipColor;
                uniform vec3 bottomColor;
                uniform float opacity;
                
                varying vec2 vUv;
                varying float vWindStrength;
                varying float frc;
                varying vec3 vPosition;
                varying vec3 vRootPosition;
                
                void main() {
                    vec4 color = texture2D(map, vUv);
                    float alpha = texture2D(alphaMap, vUv).r;
                    
                    // If transparent, don't draw
                    if(alpha < 0.4) discard;
                    
                    // Sample grayscale texture for variation
                    vec2 variationUV = vUv * 2.5;
                    // Add some variation to UV based on position
                    variationUV.x += sin(vPosition.x * 0.4) * 0.08;
                    variationUV.y += cos(vPosition.z * 0.4) * 0.08;
                    float variation = texture2D(colorMap, variationUV).r;
                    
                    // Create base color by blending between bottom and tip colors
                    float heightFactor = smoothstep(0.0, 0.8, frc);
                    vec3 baseColor = mix(bottomColor, tipColor, heightFactor);
                    
                    // Apply variation from texture with more subtle effect
                    baseColor *= mix(0.8, 1.2, variation);
                    
                    // Add subtle darkening at the base
                    float baseShadow = (1.0 - frc) * 0.25;
                    baseColor *= (1.0 - baseShadow);
                    
                    // Add very slight brightness variation based on wind
                    float windBrightness = 1.0 + (vWindStrength * 0.2); // Increased from 0.05 to 0.2
                    baseColor *= windBrightness;
                    
                    // Apply global opacity
                    gl_FragColor = vec4(baseColor, alpha * opacity);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Set the textures as uniforms
        if (parameters.map) {
            Logger.info('Setting map texture in GrassMaterial');
            this.uniforms.map.value = parameters.map;
        }
        if (parameters.alphaMap) {
            Logger.info('Setting alphaMap texture in GrassMaterial');
            this.uniforms.alphaMap.value = parameters.alphaMap;
        }
        if (parameters.colorMap) {
            Logger.info('Setting colorMap texture in GrassMaterial');
            this.uniforms.colorMap.value = parameters.colorMap;
            Logger.info('ColorMap texture details:', {
                image: parameters.colorMap.image ? 'present' : 'missing',
                size: parameters.colorMap.image ? `${parameters.colorMap.image.width}x${parameters.colorMap.image.height}` : 'unknown',
                format: parameters.colorMap.format,
                type: parameters.colorMap.type,
                colorSpace: parameters.colorMap.colorSpace
            });
        }
    }
} 