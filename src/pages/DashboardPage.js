export class DashboardPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'dashboard-page';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="dashboard-container">
                <div class="map-container">
                    <img src="/images/map2.png" alt="City Map" class="city-map" />
                </div>
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