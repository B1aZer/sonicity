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

        // Initial route will be handled by popstate event
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    async handleRoute() {
        const path = window.location.pathname;
        Logger.info('App handling route:', path);
        
        try {
            // Update music manager with new page
            const route = this.router.getRouteFromPath(path);
            musicManager.updatePage(route);
            
            // Navigate using router
            await this.router.navigate(path);
        } catch (error) {
            Logger.error('Error handling route:', error);
            // Fallback to access page on error
            window.history.pushState({}, '', '/access');
            await this.router.navigate('/access');
        }
    }
}

// Initialize app
new App();