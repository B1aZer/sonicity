import * as THREE from 'three';
import { Game } from './game.js';
import { Layout } from '../../components/Layout.js';
import { Router } from './router.js';
import { musicManager } from '../managers/musicManager.js';
import Logger from '../utils/logger.js';

class App {
    constructor() {
        this.layout = new Layout();
        this.container = document.getElementById('app');
        this.router = new Router(this.layout.content);
        this.init();
    }

    init() {
        // Initialize music manager
        musicManager.init();
        
        // Mount layout
        this.layout.mount(this.container);

        // Setup navigation
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Setup wallet connection listener
        window.addEventListener('walletConnected', (event) => {
            this.handleRoute();
        });

        // Setup ESC key handler to navigate to overview
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const currentPath = window.location.pathname;
                if (currentPath !== '/overview') {
                    Logger.info('ESC pressed, navigating to overview');
                    window.history.pushState({}, '', '/overview');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
            }
        });

        // Add global debug function
        window.setLogLevel = (level) => {
            Logger.setLogLevel(level);
            console.log(`Log level set to: ${level}`);
        };

        // Initial route will be handled by popstate event
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    async handleRoute() {
        const path = window.location.pathname;
        Logger.info('App handling route:', path);
        
        try {
            // Get the current route before navigation
            const currentRoute = this.router.getCurrentRoute();
            
            // Navigate using router
            await this.router.navigate(path);
            
            // Get the new route after navigation
            const newRoute = this.router.getCurrentRoute();
            
            // Only update music if we actually navigated to a different page
            if (currentRoute !== newRoute) {
                musicManager.updatePage(newRoute);
            }
        } catch (error) {
            Logger.error('Error handling route:', error);
            // Fallback to access page on error
            window.history.pushState({}, '', '/access');
            await this.router.navigate('/access');
        }
    }
}

// Initialize the app
new App();