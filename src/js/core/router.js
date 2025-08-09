import { AccessControl } from '../utils/accessControl.js';
import { StartPage } from '../../pages/StartPage.js';
import { GamePage } from '../../pages/GamePage.js';
import { MintPage } from '../../pages/MintPage.js';
import { AccessPage } from '../../pages/AccessPage.js';
import { StakePage } from '../../pages/StakeHubPage.js';
import { HousePage } from '../../pages/HousePage.js';
import { FarmPage } from '../../pages/FarmPage.js';
import { DiamondStationPage } from '../../pages/DiamondStationPage.js';
import { RepForgePage } from '../../pages/RepForgePage.js';
import { CityPage } from '../../pages/CityPage.js';
import { ShopPage } from '../../pages/ShopPage.js';
import { WorkshopPage } from '../../pages/WorkshopPage.js';
import { BarracksPage } from '../../pages/BarracksPage.js';
import { ScoutGuildPage } from '../../pages/ScoutGuildPage.js';
import { CommandCenterPage } from '../../pages/CommandCenterPage.js';
import Logger from '../utils/logger.js';

export class Router {
    constructor(container) {
        this.container = container;
        this.currentPage = null;
        // TODO: Page caching disabled for now to ensure reliable page state management
        // To re-enable caching later:
        // 1. Uncomment: this.pageCache = new Map();
        // 2. Add pages to cache in getPageInstance()
        // 3. Consider excluding complex pages (3D, heavy resources) from caching
        // this.pageCache = new Map();
        this.game = null;
        
        // Pages that don't require wallet connection
        this.publicPages = new Set(['mint', 'access']);
        
        // Pages that don't require player initialization
        this.uninitializedPages = new Set(['', 'mint', 'access']);
        
        // Route to page class mapping
        this.routeMap = {
            '': StartPage,
            'overview': GamePage,
            'mint': MintPage,
            'access': AccessPage,
            'stake': StakePage,
            'house': HousePage,
            'farm': FarmPage,
            'diamond-station': DiamondStationPage,
            'rep-forge': RepForgePage,
            'city': CityPage,
            'shop': ShopPage,
            'workshop': WorkshopPage,
            'barracks': BarracksPage,
            'scout-guild': ScoutGuildPage,
            'command-center': CommandCenterPage
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
     * Get or create page instance (no caching for now)
     */
    async getPageInstance(route) {
        // Create new page instance (caching disabled for reliability)
        const PageClass = this.routeMap[route];
        if (!PageClass) {
            Logger.error('Unknown route:', route);
            throw new Error(`Unknown route: ${route}`);
        }

        Logger.info('Creating new page instance for:', route);
        const pageInstance = new PageClass();
        pageInstance.route = route; // Add route property for identification
        
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
} 