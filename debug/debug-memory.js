/**
 * Memory Leak Detection Utilities for Sonicity Game
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. Call startMemoryMonitoring() when entering game
 * 3. Call stopMemoryMonitoring() when leaving
 * 4. Use checkForLeaks() to get detailed analysis
 */

class MemoryMonitor {
    constructor() {
        this.monitoring = false;
        this.samples = [];
        this.interval = null;
        this.threeObjects = new Map();
        this.initialCounts = {};
        this.startTime = null;
        
        // Track Three.js object types
        this.trackedTypes = [
            'BufferGeometry',
            'Material', 
            'Texture',
            'Mesh',
            'Group',
            'Scene',
            'Camera',
            'Light',
            'WebGLRenderer'
        ];
    }

    /**
     * Start monitoring memory usage
     */
    startMemoryMonitoring(sampleInterval = 1000) {
        console.log('🔍 Starting memory monitoring...');
        this.monitoring = true;
        this.startTime = Date.now();
        this.samples = [];
        this.captureInitialCounts();
        
        this.interval = setInterval(() => {
            this.takeSample();
        }, sampleInterval);
        
        // Take initial sample
        this.takeSample();
    }

    /**
     * Stop monitoring and return analysis
     */
    stopMemoryMonitoring() {
        if (!this.monitoring) return null;
        
        console.log('🛑 Stopping memory monitoring...');
        this.monitoring = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        return this.generateReport();
    }

    /**
     * Capture current memory sample
     */
    takeSample() {
        if (!this.monitoring) return;
        
        const sample = {
            timestamp: Date.now() - this.startTime,
            heap: this.getHeapInfo(),
            threejs: this.getThreeJSCounts(),
            dom: this.getDOMCounts(),
            performance: this.getPerformanceInfo()
        };
        
        this.samples.push(sample);
        
        // Keep only last 100 samples to prevent memory issues
        if (this.samples.length > 100) {
            this.samples.shift();
        }
    }

    /**
     * Get heap memory information
     */
    getHeapInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }

    /**
     * Count Three.js objects by traversing global THREE object
     */
    getThreeJSCounts() {
        const counts = {};
        
        this.trackedTypes.forEach(type => {
            counts[type] = 0;
        });
        
        // If Three.js is available, count objects
        if (typeof THREE !== 'undefined' && window.game?.scene) {
            // Count scene objects
            window.game.scene.traverse((object) => {
                const type = object.constructor.name;
                if (counts.hasOwnProperty(type)) {
                    counts[type]++;
                }
                
                // Count geometries and materials
                if (object.geometry) {
                    counts['BufferGeometry']++;
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        counts['Material'] += object.material.length;
                    } else {
                        counts['Material']++;
                    }
                }
            });
        }
        
        return counts;
    }

    /**
     * Get DOM node counts
     */
    getDOMCounts() {
        return {
            total: document.getElementsByTagName('*').length,
            canvas: document.getElementsByTagName('canvas').length,
            eventListeners: this.estimateEventListeners()
        };
    }

    /**
     * Estimate event listeners (approximation)
     */
    estimateEventListeners() {
        // This is an approximation - real detection would require browser internals
        const elements = document.getElementsByTagName('*');
        let estimated = 0;
        
        for (let element of elements) {
            // Check for common event attributes
            const events = ['onclick', 'onload', 'onmouseover', 'onkeydown'];
            for (let event of events) {
                if (element[event]) estimated++;
            }
        }
        
        return estimated;
    }

    /**
     * Get performance metrics
     */
    getPerformanceInfo() {
        return {
            fps: this.getCurrentFPS(),
            drawCalls: this.getDrawCalls()
        };
    }

    /**
     * Estimate current FPS
     */
    getCurrentFPS() {
        // This would need to be implemented with a frame counter
        // For now, return 0 as placeholder
        return 0;
    }

    /**
     * Get WebGL draw calls if available
     */
    getDrawCalls() {
        if (window.game?.renderer?.info) {
            return window.game.renderer.info.render.calls;
        }
        return 0;
    }

    /**
     * Capture initial object counts for comparison
     */
    captureInitialCounts() {
        this.initialCounts = {
            heap: this.getHeapInfo(),
            threejs: this.getThreeJSCounts(),
            dom: this.getDOMCounts()
        };
        console.log('📊 Initial counts captured:', this.initialCounts);
    }

    /**
     * Generate comprehensive memory report
     */
    generateReport() {
        if (this.samples.length === 0) {
            return { error: 'No samples collected' };
        }

        const firstSample = this.samples[0];
        const lastSample = this.samples[this.samples.length - 1];
        const duration = (lastSample.timestamp - firstSample.timestamp) / 1000;

        const report = {
            duration: duration,
            samples: this.samples.length,
            memory: this.analyzeMemoryTrend(),
            threejs: this.analyzeThreeJSObjects(),
            dom: this.analyzeDOMChanges(),
            recommendations: []
        };

        // Generate recommendations
        report.recommendations = this.generateRecommendations(report);

        return report;
    }

    /**
     * Analyze memory usage trends
     */
    analyzeMemoryTrend() {
        const firstHeap = this.samples[0].heap.used;
        const lastHeap = this.samples[this.samples.length - 1].heap.used;
        const maxHeap = Math.max(...this.samples.map(s => s.heap.used));
        
        const trend = lastHeap - firstHeap;
        const growthRate = (trend / firstHeap) * 100;

        return {
            initial: firstHeap,
            final: lastHeap,
            max: maxHeap,
            trend: trend,
            growthRate: growthRate.toFixed(2) + '%',
            isLeaking: trend > 10 && growthRate > 20 // Heuristic for leak detection
        };
    }

    /**
     * Analyze Three.js object changes
     */
    analyzeThreeJSObjects() {
        const initial = this.samples[0].threejs;
        const final = this.samples[this.samples.length - 1].threejs;
        const changes = {};

        this.trackedTypes.forEach(type => {
            const change = final[type] - initial[type];
            if (change !== 0) {
                changes[type] = {
                    initial: initial[type],
                    final: final[type],
                    change: change
                };
            }
        });

        return changes;
    }

    /**
     * Analyze DOM changes
     */
    analyzeDOMChanges() {
        const initial = this.samples[0].dom;
        const final = this.samples[this.samples.length - 1].dom;

        return {
            totalNodes: {
                initial: initial.total,
                final: final.total,
                change: final.total - initial.total
            },
            canvasElements: {
                initial: initial.canvas,
                final: final.canvas,
                change: final.canvas - initial.canvas
            }
        };
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(report) {
        const recommendations = [];

        // Memory leak detection
        if (report.memory.isLeaking) {
            recommendations.push({
                type: 'critical',
                message: `Potential memory leak detected: ${report.memory.growthRate} growth over ${report.duration}s`
            });
        }

        // Three.js object leaks
        Object.entries(report.threejs).forEach(([type, data]) => {
            if (data.change > 0) {
                recommendations.push({
                    type: 'warning',
                    message: `${type} objects increased by ${data.change} (${data.initial} → ${data.final})`
                });
            }
        });

        // DOM node leaks
        if (report.dom.totalNodes.change > 100) {
            recommendations.push({
                type: 'warning',
                message: `DOM nodes increased by ${report.dom.totalNodes.change}`
            });
        }

        return recommendations;
    }

    /**
     * Quick leak check without full monitoring
     */
    static quickLeakCheck() {
        const monitor = new MemoryMonitor();
        monitor.captureInitialCounts();
        
        console.log('🔍 Quick memory snapshot:');
        console.log('Heap usage:', monitor.getHeapInfo());
        console.log('Three.js objects:', monitor.getThreeJSCounts());
        console.log('DOM nodes:', monitor.getDOMCounts());
        
        return {
            heap: monitor.getHeapInfo(),
            threejs: monitor.getThreeJSCounts(),
            dom: monitor.getDOMCounts()
        };
    }
}

// Global instance
window.memoryMonitor = new MemoryMonitor();

// Convenience functions
window.startMemoryMonitoring = (interval) => window.memoryMonitor.startMemoryMonitoring(interval);
window.stopMemoryMonitoring = () => window.memoryMonitor.stopMemoryMonitoring();
window.checkMemory = () => MemoryMonitor.quickLeakCheck();

// Auto-start monitoring when game is detected
document.addEventListener('DOMContentLoaded', () => {
    // Check for game initialization
    const checkForGame = setInterval(() => {
        if (window.game && window.game.scene) {
            console.log('🎮 Game detected! Memory monitoring available.');
            console.log('Use startMemoryMonitoring() to begin monitoring');
            console.log('Use stopMemoryMonitoring() to get analysis');
            console.log('Use checkMemory() for quick snapshot');
            clearInterval(checkForGame);
        }
    }, 1000);
    
    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkForGame), 30000);
});

console.log('🧠 Memory monitoring utilities loaded'); 