import { AccessControl } from '../utils/accessControl.js';
import { StartPage } from '../../pages/StartPage.js';
import { GamePage } from '../../pages/GamePage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import { StakePage } from '../../pages/StakeHubPage.js';
import { HousePage } from '../../pages/HousePage.js';
import { FarmPage } from '../../pages/FarmPage.js';
import { DiamondStationPage } from '../../pages/DiamondStationPage.js';
import { RepForgePage } from '../../pages/RepForgePage.js';
import { ArcanumPage } from '../../pages/ArcanumPage.js';
import { CityPage } from '../../pages/CityPage.js';
import { ShopPage } from '../../pages/ShopPage.js';
import { WorkshopPage } from '../../pages/WorkshopPage.js';
import { BarracksPage } from '../../pages/BarracksPage.js';
import { ScoutGuildPage } from '../../pages/ScoutGuildPage.js';
import { CommandCenterPage } from '../../pages/CommandCenterPage.js';
import { GarrisonPage } from '../../pages/GarrisonPage.js';
import { OutpostPage } from '../../pages/OutpostPage.js';
import { RevenueHubPage } from '../../pages/RevenueHubPage.js';
import { TavernPage } from '../../pages/TavernPage.js';
import { TacticsCenterPage } from '../../pages/TacticsCenterPage.js';
import Logger from '../utils/logger.js';

export class Router {
    constructor(container) {
        this.container = container;
        this.currentPage = null;
        // Re-enable page caching for lightweight pages (excluding complex 3D pages)
        this.pageCache = new Map();
        this.game = null;
        
        // Pages that don't require wallet connection
        this.publicPages = new Set(['access']);
        
        // Pages that don't require player initialization
        this.uninitializedPages = new Set(['', 'access']);
        
        // Pages that should NOT be cached (complex pages with heavy resources)
        this.noCachePages = new Set(['', 'overview']); // StartPage and GamePage
        
        // Route to page class mapping
        this.routeMap = {
            '': StartPage,
            'overview': GamePage,
            'access': AccessPage,
            'stake': StakePage,
            'house': HousePage,
            'farm': FarmPage,
            'diamond-station': DiamondStationPage,
            'rep-forge': RepForgePage,
            'arcanum': ArcanumPage,
            'city': CityPage,
            'shop': ShopPage,
            'workshop': WorkshopPage,
            'barracks': BarracksPage,
            'scout-guild': ScoutGuildPage,
            'command-center': CommandCenterPage,
            'garrison': GarrisonPage,
            'outpost': OutpostPage,
            'revenue-hub': RevenueHubPage,
            'tavern': TavernPage,
            'tactics-center': TacticsCenterPage
        };
    }

    /**
     * Main routing method
     */
    async navigate(path) {
        const route = this.getRouteFromPath(path);
        Logger.info('Router navigating to:', route);

        // Check if we're already on this page
        if (this.currentPage && this.currentPage.route === route) {
            Logger.info('Already on page:', route);
            return;
        }

        // Handle access control
        const accessResult = await this.checkAccess(route);
        if (!accessResult.allowed) {
            Logger.info('Access denied, redirecting to:', accessResult.redirectTo);
            window.history.pushState({}, '', `/${accessResult.redirectTo}`);
            await this.navigate(accessResult.redirectTo);
            return;
        }

        // Clean up current page
        await this.cleanupCurrentPage();

        // Get or create page instance
        const pageInstance = await this.getPageInstance(route);
        
        // Mount the page
        this.currentPage = pageInstance;
        pageInstance.mount(this.container);
        
        Logger.info('Successfully navigated to:', route);
    }

    /**
     * Get route from path
     */
    getRouteFromPath(path) {
        // Remove leading slash if present
        return path.startsWith('/') ? path.slice(1) : path;
    }

    /**
     * Check access for a route
     */
    async checkAccess(route) {
        // Public pages are always allowed
        if (this.publicPages.has(route)) {
            return { allowed: true };
        }

        // Check wallet connection
        if (!AccessControl.isWalletConnected()) {
            Logger.info('Wallet not connected, redirecting to access');
            return { 
                allowed: false, 
                redirectTo: 'access',
                reason: 'wallet_not_connected'
            };
        }

        // Check player initialization
        if (!this.uninitializedPages.has(route)) {
            const isInitialized = await AccessControl.isPlayerInitialized();
            if (!isInitialized) {
                Logger.info('Player not initialized, redirecting to start');
                return { 
                    allowed: false, 
                    redirectTo: '',
                    reason: 'player_not_initialized'
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Get or create page instance with selective caching
     */
    async getPageInstance(route) {
        // Check if this page should be cached
        const shouldCache = !this.noCachePages.has(route);
        
        // Try to get from cache first if caching is enabled for this page
        if (shouldCache && this.pageCache.has(route)) {
            Logger.info('Using cached page instance for:', route);
            return this.pageCache.get(route);
        }
        
        // Create new page instance
        const PageClass = this.routeMap[route];
        if (!PageClass) {
            Logger.error('Unknown route:', route);
            throw new Error(`Unknown route: ${route}`);
        }

        Logger.info('Creating new page instance for:', route);
        const pageInstance = new PageClass();
        pageInstance.route = route; // Add route property for identification
        
        // Cache the instance if caching is enabled for this page
        if (shouldCache) {
            this.pageCache.set(route, pageInstance);
            Logger.info('Cached page instance for:', route);
        }
        
        return pageInstance;
    }

    /**
     * Clean up current page and game
     */
    async cleanupCurrentPage() {
        if (this.currentPage) {
            Logger.info('Cleaning up current page:', this.currentPage.route);
            
            // Clean up game if it exists and we're not going to the overview page
            const nextRoute = this.getRouteFromPath(window.location.pathname);
            if (this.game && nextRoute !== 'overview') {
                Logger.info('Disposing game instance');
                this.game.dispose();
                this.game = null;
            }
            
            // Unmount current page
            this.currentPage.unmount();
            this.currentPage = null;
        }
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentPage ? this.currentPage.route : null;
    }

    /**
     * Check if a route is public
     */
    isPublicRoute(route) {
        return this.publicPages.has(route);
    }

    /**
     * Check if a route requires initialization
     */
    requiresInitialization(route) {
        return !this.uninitializedPages.has(route);
    }

    /**
     * Get the route to page class mapping (for dynamic imports)
     * This returns a map of routes to their corresponding dynamic import functions
     */
    getRouteToPageClassMap() {
        return {
            'house': () => import('../../pages/HousePage.js').then(m => m.HousePage),
            'farm': () => import('../../pages/FarmPage.js').then(m => m.FarmPage),
            'diamond-station': () => import('../../pages/DiamondStationPage.js').then(m => m.DiamondStationPage),
            'rep-forge': () => import('../../pages/RepForgePage.js').then(m => m.RepForgePage),
            'arcanum': () => import('../../pages/ArcanumPage.js').then(m => m.ArcanumPage),
            'city': () => import('../../pages/CityPage.js').then(m => m.CityPage),
            'shop': () => import('../../pages/ShopPage.js').then(m => m.ShopPage),
            'workshop': () => import('../../pages/WorkshopPage.js').then(m => m.WorkshopPage),
            'barracks': () => import('../../pages/BarracksPage.js').then(m => m.BarracksPage),
            'scout-guild': () => import('../../pages/ScoutGuildPage.js').then(m => m.ScoutGuildPage),
            'command-center': () => import('../../pages/CommandCenterPage.js').then(m => m.CommandCenterPage),
            'garrison': () => import('../../pages/GarrisonPage.js').then(m => m.GarrisonPage),
            'outpost': () => import('../../pages/OutpostPage.js').then(m => m.OutpostPage),
            'revenue-hub': () => import('../../pages/RevenueHubPage.js').then(m => m.RevenueHubPage),
            'stake': () => import('../../pages/StakeHubPage.js').then(m => m.StakePage),
            'tavern': () => import('../../pages/TavernPage.js').then(m => m.TavernPage),
            'tactics-center': () => import('../../pages/TacticsCenterPage.js').then(m => m.TacticsCenterPage)
        };
    }

    /**
     * Clear page cache (useful for memory management)
     * @param {string} route - Optional specific route to clear, or all if not specified
     */
    clearPageCache(route = null) {
        if (route) {
            if (this.pageCache.has(route)) {
                Logger.info(`Router: Clearing cache for route: ${route}`);
                this.pageCache.delete(route);
            }
        } else {
            Logger.info('Router: Clearing all page cache');
            this.pageCache.clear();
        }
    }

    /**
     * Get cache info for debugging
     */
    getCacheInfo() {
        return {
            cachedRoutes: Array.from(this.pageCache.keys()),
            cacheSize: this.pageCache.size
        };
    }

    /**
     * Preload a page and its data in the background
     * @param {string} route - The route to preload (without leading slash)
     * @returns {Promise} - Promise that resolves when preloading is complete
     */
    async preloadPage(route) {
        try {
            Logger.info(`Router: Starting to preload page: ${route}`);
            
            // Check if we should cache this page
            const shouldCache = !this.noCachePages.has(route);
            if (!shouldCache) {
                Logger.info(`Router: Skipping preload for non-cacheable page: ${route}`);
                return;
            }
            
            // Check if already cached
            if (this.pageCache.has(route)) {
                Logger.info(`Router: Page already preloaded: ${route}`);
                return;
            }
            
            const routeMap = this.getRouteToPageClassMap();
            const pageLoader = routeMap[route];
            
            if (!pageLoader) {
                Logger.warn(`Router: No preloader available for route: ${route}`);
                return;
            }

            // Load the page class and create instance using getPageInstance for consistency
            const PageClass = await pageLoader();
            
            // Temporarily add to routeMap for getPageInstance to work
            const originalClass = this.routeMap[route];
            this.routeMap[route] = PageClass;
            
            try {
                // Use getPageInstance to create and cache the page
                const pageInstance = await this.getPageInstance(route);
                
                // Import WalletManager for wallet checking
                const { WalletManager } = await import('../utils/wallet.js');
                
                // Initialize contracts if wallet is connected
                if (WalletManager.isWalletConnected() && WalletManager.getCurrentWallet()) {
                    await pageInstance.initializeContracts();
                    
                    // Start the onInitialized process to load data
                    pageInstance.onInitialized({ 
                        success: true, 
                        address: WalletManager.getCurrentWallet() 
                    }).catch(error => {
                        Logger.warn(`Router: Error preloading data for ${route}:`, error);
                    });
                }
                
                Logger.info(`Router: Successfully started preloading for: ${route}`);
                
            } finally {
                // Restore original class mapping
                this.routeMap[route] = originalClass;
            }
            
        } catch (error) {
            Logger.warn(`Router: Failed to preload page ${route}:`, error);
        }
    }
} 