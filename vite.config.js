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
        drop_console: false, // Remove console.log statements
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
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
        toplevel: false, // enable later
        properties: {
          regex: /^_/
        },
        // More aggressive mangling
        keep_fnames: false,
        reserved: ['THREE', 'ethers', 'window', 'document']
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