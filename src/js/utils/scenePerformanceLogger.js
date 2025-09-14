import { config } from './config.js';
import Logger from './logger.js';

/**
 * Simple 3D Scene Performance Logger
 * Tracks only 3D scene loading times
 */
class ScenePerformanceLogger {
    constructor() {
        this.timings = {};
        this.startTimes = {};
        this.enabled = config.features.performanceLogging;
    }

    // Start timing a 3D scene operation
    start(label) {
        if (!this.enabled) return;
        
        this.startTimes[label] = performance.now();
        Logger.info(`[3D Perf] Starting: ${label}`);
    }

    // End timing and log duration
    end(label) {
        if (!this.enabled) return;
        
        if (!this.startTimes[label]) {
            Logger.warn(`[3D Perf] No start time found for: ${label}`);
            return;
        }

        const duration = performance.now() - this.startTimes[label];
        this.timings[label] = duration;
        
        Logger.info(`[3D Perf] Completed: ${label} - ${duration.toFixed(2)}ms`);
        
        delete this.startTimes[label];
        return duration;
    }

    // Log a milestone
    milestone(label, data = {}) {
        if (!this.enabled) return;
        
        Logger.info(`[3D Perf] Milestone: ${label}`, data);
    }

    // Get 3D scene performance summary
    getSceneSummary() {
        if (!this.enabled) {
            Logger.info('[3D Perf] Performance logging is disabled');
            return { enabled: false };
        }
        
        const summary = {
            enabled: true,
            totalSceneTime: this.timings['scene-setup'] || 0,
            assetLoadingTime: this.timings['asset-loading'] || 0,
            modelLoadingTime: this.timings['model-loading'] || 0,
            textureLoadingTime: this.timings['texture-loading'] || 0,
            slowestOperation: Object.entries(this.timings)
                .sort(([,a], [,b]) => b - a)[0] || ['none', 0]
        };

        Logger.info('[3D Perf] Performance Summary:', summary);
        return summary;
    }

    // Log Web Vitals related to 3D rendering
    log3DWebVitals() {
        if (!this.enabled) return;
        
        // First Contentful Paint (when 3D scene first renders)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (entry.name.includes('3d') || entry.name.includes('scene')) {
                    Logger.info(`[3D Perf] FCP: ${entry.startTime.toFixed(2)}ms`);
                }
            });
        }).observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint (when main 3D content loads)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            Logger.info(`[3D Perf] LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
    }
}

// Create global instance
window.scenePerformanceLogger = new ScenePerformanceLogger();

export default window.scenePerformanceLogger;
