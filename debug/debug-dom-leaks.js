/**
 * DOM Memory Leak Detection Script
 * 
 * Usage:
 * 1. Call trackDOMBaseline() before entering game
 * 2. Navigate between pages/game multiple times
 * 3. Call analyzeNodeGrowth() to see what's accumulating
 */

class DOMLeakDetector {
    constructor() {
        this.baseline = null;
        this.snapshots = [];
        this.nodeTypes = [
            'DIV', 'CANVAS', 'SCRIPT', 'STYLE', 'IMG', 'AUDIO', 'VIDEO',
            'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM', 'A', 'SPAN',
            'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'LI', 'TABLE',
            'TR', 'TD', 'TH', 'THEAD', 'TBODY', 'IFRAME', 'SVG'
        ];
    }

    /**
     * Take a baseline measurement of DOM nodes
     */
    trackDOMBaseline() {
        this.baseline = this.takeSnapshot();
        console.log('📊 DOM baseline captured:', this.baseline.summary);
        return this.baseline;
    }

    /**
     * Take a current snapshot and compare to baseline
     */
    takeSnapshot() {
        const snapshot = {
            timestamp: new Date().toISOString(),
            total: document.getElementsByTagName('*').length,
            byType: {},
            classes: {},
            ids: {},
            eventListeners: this.estimateEventListeners(),
            summary: {}
        };

        // Count by tag type
        this.nodeTypes.forEach(tagName => {
            const elements = document.getElementsByTagName(tagName);
            if (elements.length > 0) {
                snapshot.byType[tagName] = elements.length;
            }
        });

        // Count by common class patterns
        this.countByClassPatterns(snapshot);

        // Count by ID patterns
        this.countByIdPatterns(snapshot);

        // Create summary
        snapshot.summary = {
            total: snapshot.total,
            canvas: snapshot.byType.CANVAS || 0,
            scripts: snapshot.byType.SCRIPT || 0,
            divs: snapshot.byType.DIV || 0,
            eventListeners: snapshot.eventListeners
        };

        return snapshot;
    }

    /**
     * Count elements by common class patterns
     */
    countByClassPatterns(snapshot) {
        const classPatterns = [
            'game-', 'ui-', 'three-', 'modal-', 'loading-', 'building-',
            'tooltip-', 'button-', 'menu-', 'overlay-', 'popup-', 'dialog-'
        ];

        classPatterns.forEach(pattern => {
            const elements = document.querySelectorAll(`[class*="${pattern}"]`);
            if (elements.length > 0) {
                snapshot.classes[pattern] = elements.length;
            }
        });
    }

    /**
     * Count elements by ID patterns
     */
    countByIdPatterns(snapshot) {
        const idPatterns = [
            'game', 'render', 'ui', 'modal', 'loading', 'building',
            'tooltip', 'menu', 'overlay', 'popup', 'dialog'
        ];

        idPatterns.forEach(pattern => {
            const elements = document.querySelectorAll(`[id*="${pattern}"]`);
            if (elements.length > 0) {
                snapshot.ids[pattern] = elements.length;
            }
        });
    }

    /**
     * Estimate event listeners attached to elements
     */
    estimateEventListeners() {
        const elements = document.getElementsByTagName('*');
        let count = 0;

        for (let element of elements) {
            // Check for common event attributes
            const events = [
                'onclick', 'onload', 'onmouseover', 'onmouseout', 'onmousedown',
                'onmouseup', 'onkeydown', 'onkeyup', 'onchange', 'onsubmit',
                'onfocus', 'onblur', 'onresize', 'onscroll'
            ];
            
            for (let event of events) {
                if (element[event]) count++;
            }

            // Check for data attributes that might indicate event listeners
            if (element.dataset && Object.keys(element.dataset).length > 0) {
                count += Object.keys(element.dataset).length * 0.1; // Rough estimate
            }
        }

        return Math.round(count);
    }

    /**
     * Analyze growth since baseline
     */
    analyzeNodeGrowth() {
        if (!this.baseline) {
            console.warn('⚠️ No baseline captured. Call trackDOMBaseline() first.');
            return null;
        }

        const current = this.takeSnapshot();
        const analysis = this.compareSnapshots(this.baseline, current);
        
        console.log('🔍 DOM Growth Analysis:');
        console.log('═══════════════════════════════════');
        
        if (analysis.totalGrowth > 0) {
            console.log(`🚨 NODES INCREASED: +${analysis.totalGrowth} (${this.baseline.total} → ${current.total})`);
        } else if (analysis.totalGrowth < 0) {
            console.log(`✅ NODES DECREASED: ${analysis.totalGrowth} (${this.baseline.total} → ${current.total})`);
        } else {
            console.log(`✅ NO CHANGE: ${current.total} nodes`);
        }

        if (analysis.significantChanges.length > 0) {
            console.log('\n📈 Significant Changes:');
            analysis.significantChanges.forEach(change => {
                const indicator = change.change > 0 ? '🔺' : '🔻';
                console.log(`  ${indicator} ${change.type}: ${change.change > 0 ? '+' : ''}${change.change} (${change.before} → ${change.after})`);
            });
        }

        if (analysis.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            analysis.recommendations.forEach(rec => {
                console.log(`  • ${rec}`);
            });
        }

        return analysis;
    }

    /**
     * Compare two snapshots
     */
    compareSnapshots(baseline, current) {
        const analysis = {
            totalGrowth: current.total - baseline.total,
            significantChanges: [],
            recommendations: []
        };

        // Compare by type
        this.nodeTypes.forEach(type => {
            const before = baseline.byType[type] || 0;
            const after = current.byType[type] || 0;
            const change = after - before;

            if (Math.abs(change) > 2) { // Significant if more than 2 nodes
                analysis.significantChanges.push({
                    type: type,
                    before: before,
                    after: after,
                    change: change
                });
            }
        });

        // Compare classes
        const allClassPatterns = new Set([
            ...Object.keys(baseline.classes || {}),
            ...Object.keys(current.classes || {})
        ]);

        allClassPatterns.forEach(pattern => {
            const before = baseline.classes[pattern] || 0;
            const after = current.classes[pattern] || 0;
            const change = after - before;

            if (change > 0) {
                analysis.significantChanges.push({
                    type: `Class: ${pattern}*`,
                    before: before,
                    after: after,
                    change: change
                });
            }
        });

        // Generate recommendations
        if (analysis.totalGrowth > 10) {
            analysis.recommendations.push('Significant DOM growth detected - check for element cleanup');
        }

        const canvasGrowth = (current.byType.CANVAS || 0) - (baseline.byType.CANVAS || 0);
        if (canvasGrowth > 0) {
            analysis.recommendations.push(`Canvas elements increased by ${canvasGrowth} - check renderer cleanup`);
        }

        const scriptGrowth = (current.byType.SCRIPT || 0) - (baseline.byType.SCRIPT || 0);
        if (scriptGrowth > 2) {
            analysis.recommendations.push(`Script tags increased by ${scriptGrowth} - check for dynamic script loading`);
        }

        return analysis;
    }

    /**
     * Track specific elements that match a selector
     */
    trackSpecificElements(selector, description = 'elements') {
        const elements = document.querySelectorAll(selector);
        console.log(`🎯 ${description}: ${elements.length} found`);
        
        if (elements.length > 0) {
            console.log('Sample elements:');
            Array.from(elements).slice(0, 3).forEach((el, index) => {
                console.log(`  ${index + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').join('.') : ''}`);
            });
        }
        
        return elements.length;
    }

    /**
     * Start continuous monitoring
     */
    startContinuousMonitoring(intervalMs = 5000) {
        if (!this.baseline) {
            this.trackDOMBaseline();
        }

        this.monitoringInterval = setInterval(() => {
            const current = this.takeSnapshot();
            const growth = current.total - this.baseline.total;
            
            if (growth > 0) {
                console.log(`📊 DOM Monitor: +${growth} nodes (${current.total} total)`);
                
                // Alert on significant growth
                if (growth > 50) {
                    console.warn(`⚠️ HIGH GROWTH: +${growth} nodes detected!`);
                }
            }
        }, intervalMs);

        console.log(`🔄 Started continuous DOM monitoring (every ${intervalMs}ms)`);
    }

    /**
     * Stop continuous monitoring
     */
    stopContinuousMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 Stopped continuous DOM monitoring');
        }
    }
}

// Global instance
window.domLeakDetector = new DOMLeakDetector();

// Convenience functions
window.trackDOMBaseline = () => window.domLeakDetector.trackDOMBaseline();
window.analyzeNodeGrowth = () => window.domLeakDetector.analyzeNodeGrowth();
window.trackElements = (selector, desc) => window.domLeakDetector.trackSpecificElements(selector, desc);
window.startDOMMonitoring = (interval) => window.domLeakDetector.startContinuousMonitoring(interval);
window.stopDOMMonitoring = () => window.domLeakDetector.stopContinuousMonitoring();

console.log('🔍 DOM Leak Detector loaded');
console.log('📋 Available commands:');
console.log('  • trackDOMBaseline() - Set baseline before testing');
console.log('  • analyzeNodeGrowth() - Check what changed');
console.log('  • trackElements("selector", "description") - Count specific elements');
console.log('  • startDOMMonitoring(5000) - Monitor continuously');
console.log('  • stopDOMMonitoring() - Stop monitoring'); 