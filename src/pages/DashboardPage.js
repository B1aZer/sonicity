import '../styles/dashboard-page.css';

export class DashboardPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'dashboard-page';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="dashboard-container">
                <h1>Dashboard</h1>
                <p>Welcome to your city dashboard!</p>
            </div>
        `;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 