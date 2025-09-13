import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from the public directory
      allow: ['..']
    },
    hmr: false // Completely disable hot module replacement
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps for production security
    minify: 'terser',
    terserOptions: {
        compress: {
          drop_console: false, // Keep console.log for debugging
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.debug'], // Only remove debug logs
        // Advanced compression for better obfuscation
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        collapse_vars: true,
        reduce_vars: true,
        passes: 3 // Multiple passes for better compression
      },
        mangle: {
          toplevel: false, // Disable toplevel mangling to prevent Three.js issues
          properties: {
            regex: /^_/
          },
          // Keep function names to prevent Three.js/GLTF loading issues
          keep_fnames: true,
          reserved: [
            'THREE', 'ethers', 'window', 'document',
            // Three.js core classes and methods
            'Object3D', 'Mesh', 'Geometry', 'Material', 'Scene', 'Camera', 'Renderer',
            'BufferGeometry', 'BufferAttribute', 'Float32Array', 'Uint16Array',
            'GLTFLoader', 'DRACOLoader', 'TextureLoader', 'CubeTextureLoader',
            'WebGLRenderer', 'PerspectiveCamera', 'OrthographicCamera',
            'AmbientLight', 'DirectionalLight', 'PointLight', 'SpotLight',
            'BoxGeometry', 'SphereGeometry', 'PlaneGeometry', 'CylinderGeometry',
            'MeshBasicMaterial', 'MeshStandardMaterial', 'MeshPhongMaterial',
            'Vector3', 'Vector2', 'Vector4', 'Matrix4', 'Matrix3', 'Quaternion',
            'Euler', 'Color', 'Raycaster', 'Clock', 'AnimationMixer', 'AnimationClip',
            // GLTF/GLB loading methods
            '_i', '_j', '_k', '_l', '_m', '_n', '_o', '_p', '_q', '_r', '_s', '_t',
            'parse', 'load', 'setPath', 'setDRACOLoader', 'setKTX2Loader',
            'onLoad', 'onProgress', 'onError', 'onStart', 'onComplete',
            // WebGL context methods
            'createBuffer', 'bindBuffer', 'bufferData', 'createShader', 'shaderSource',
            'compileShader', 'createProgram', 'attachShader', 'linkProgram', 'useProgram',
            'getAttribLocation', 'getUniformLocation', 'enableVertexAttribArray',
            'vertexAttribPointer', 'drawArrays', 'drawElements', 'createTexture',
            'bindTexture', 'texImage2D', 'texParameteri', 'generateMipmap',
            // Event handling
            'addEventListener', 'removeEventListener', 'dispatchEvent',
            'onmessage', 'postMessage', 'onerror', 'onload', 'onprogress'
          ]
        },
      format: {
        comments: false, // Remove all comments
        beautify: false,
        ascii_only: true
      }
    },
    rollupOptions: {
      output: {
        // Obfuscate chunk names
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    }
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  optimizeDeps: {
    exclude: ['three']
  }
}); 