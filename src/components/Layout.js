import { Navbar } from './Navbar.js';
import '../styles/layout.css';

export class Layout {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'layout';
        this.navbar = new Navbar();
        this.content = document.createElement('div');
        this.content.className = 'layout-content';
        this.footer = document.createElement('footer');
        this.footer.className = 'layout-footer';
        
        this.render();
    }

    render() {
        // Create footer content
        this.footer.innerHTML = `
            <div class="footer-content">
                <div class="footer-social">
                    <a href="https://x.com/SonicityFi" target="_blank" rel="noopener noreferrer" title="Follow us on X (Twitter)">
                        <i class="fab fa-x-twitter fa-lg"></i>
                    </a>
                    <a href="https://t.me/+mG5GwkGPzocyOTY8" target="_blank" rel="noopener noreferrer" title="Join our Telegram">
                        <i class="fab fa-telegram fa-lg"></i>
                    </a>
                </div>
                <p>&copy; ${new Date().getFullYear()} Sonicity. All rights reserved.</p>
            </div>
        `;

        // Assemble layout
        this.element.appendChild(this.navbar.element);
        this.element.appendChild(this.content);
        this.element.appendChild(this.footer);
    }

    mount(container) {
        container.appendChild(this.element);
        this.navbar.mount(this.element);
    }

    unmount() {
        this.element.remove();
    }

    /**
     * Update the navbar based on the current route
     * @param {string} route - The current route
     */
    updateNavbarRoute(route) {
        if (this.navbar) {
            this.navbar.updateRoute(route);
        }
    }
} 