import '../styles/map-page.css';

export class MapPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'map-page';
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add click event listener for the bottom left city
        const bottomLeftCity = this.element.querySelector('.city-bottom-left');
        if (bottomLeftCity) {
            bottomLeftCity.addEventListener('click', () => {
                window.history.pushState({}, '', '/dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="map-container">
                <img src="/images/map1.png" alt="City Map" class="city-map" />
                <div class="city city-bottom-left" data-city="bottom-left" title="Click to view dashboard"></div>
                <div class="city city-bottom-right" data-city="bottom-right"></div>
                <div class="city city-top-left" data-city="top-left"></div>
                <div class="city city-top-right" data-city="top-right"></div>
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