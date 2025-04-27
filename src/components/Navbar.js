export class Navbar {
    constructor() {
        this.element = document.createElement('nav');
        this.element.className = 'navbar';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="nav-content">
                <div class="nav-brand">Sonicity</div>
                <div class="nav-links">
                    <a href="/" class="nav-link" data-page="dashboard">Dashboard</a>
                    <a href="/overview" class="nav-link" data-page="overview">Overview</a>
                    <a href="/mint" class="nav-link" data-page="mint">Mint</a>
                </div>
            </div>
        `;

        // Add click handlers for navigation
        this.element.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                window.history.pushState({}, '', `/${page}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        });
    }

    mount(container) {
        container.appendChild(this.element);
    }
} 