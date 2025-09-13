import Logger from '../utils/logger.js';

// Global grass placement cache - singleton pattern
class GrassPlacementCache {
    constructor() {
        if (GrassPlacementCache.instance) {
            return GrassPlacementCache.instance;
        }
        
        this.cachedPlacements = null;
        this.cacheKey = null;
        this.isPlacementComplete = false;
        
        GrassPlacementCache.instance = this;
        Logger.info('GrassPlacementCache: Initialized');
    }
    
    // Generate cache key based on terrain and grass parameters
    generateCacheKey(options) {
        const key = {
            instances: options.instances,
            width: options.width,
            density: options.density,
            slopeThreshold: options.slopeThreshold,
            bladeWidth: options.bladeWidth,
            bladeHeight: options.bladeHeight,
            joints: options.joints,
            // Include terrain mesh hash if available
            terrainHash: options.terrainMesh ? this.getTerrainHash(options.terrainMesh) : 'no-terrain'
        };
        
        return JSON.stringify(key);
    }
    
    // Simple terrain hash based on geometry
    getTerrainHash(terrainMesh) {
        if (!terrainMesh || !terrainMesh.geometry) return 'no-geometry';
        
        const geometry = terrainMesh.geometry;
        const position = geometry.attributes.position;
        
        if (!position) return 'no-position';
        
        // Create a simple hash from first few vertices
        let hash = 0;
        const count = Math.min(100, position.count); // Sample first 100 vertices
        
        for (let i = 0; i < count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            hash = ((hash << 5) - hash + x + y + z) & 0xffffffff;
        }
        
        return hash.toString();
    }
    
    // Check if we have cached placement data for these parameters
    hasCachedPlacement(options) {
        const currentKey = this.generateCacheKey(options);
        
        if (this.cacheKey === currentKey && this.cachedPlacements && this.isPlacementComplete) {
            Logger.info('GrassPlacementCache: Found cached placement data');
            return true;
        }
        
        return false;
    }
    
    // Get cached placement data
    getCachedPlacement() {
        if (this.cachedPlacements && this.isPlacementComplete) {
            Logger.info('GrassPlacementCache: Returning cached placement data');
            return this.cachedPlacements;
        }
        
        return null;
    }
    
    // Cache placement data
    cachePlacement(options, placementData) {
        this.cacheKey = this.generateCacheKey(options);
        this.cachedPlacements = placementData;
        this.isPlacementComplete = true;
        
        Logger.info('GrassPlacementCache: Cached placement data', {
            instances: placementData.offsets.length / 3,
            cacheKey: this.cacheKey.substring(0, 50) + '...'
        });
    }
    
    // Clear cache (for testing or when terrain changes)
    clearCache() {
        this.cachedPlacements = null;
        this.cacheKey = null;
        this.isPlacementComplete = false;
        Logger.info('GrassPlacementCache: Cache cleared');
    }
    
    // Get cache status for debugging
    getCacheStatus() {
        return {
            hasCache: !!this.cachedPlacements,
            isComplete: this.isPlacementComplete,
            cacheKey: this.cacheKey,
            instanceCount: this.cachedPlacements ? this.cachedPlacements.offsets.length / 3 : 0
        };
    }
}

// Export singleton instance
export const grassPlacementCache = new GrassPlacementCache();
export default grassPlacementCache;
