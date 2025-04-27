import '../styles/game-page.css';

export class GamePage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'game-page';
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
            <div id="renderDiv"></div>
            <div class="map-container">
                <img src="/images/map1.png" alt="City Map" class="city-map" />
                <div class="city city-bottom-left" title="Click to view dashboard"></div>
                <div class="city city-bottom-right"></div>
                <div class="city city-top-left"></div>
                <div class="city city-top-right"></div>
            </div>
            
            <!-- UI Container -->
            <div id="ui-container">
                <div id="resource-display">
                    Electricity: <span id="electricity-balance" style="color: lightgreen; font-weight: bold;">0</span> (S: <span id="electricity-supply">0</span> / D: <span id="electricity-demand">0</span>)<br>
                    Water: <span id="water-balance" style="color: lightblue; font-weight: bold;">0</span> (S: <span id="water-supply">0</span> / D: <span id="water-demand">0</span>)
                </div>
                <div id="money-display">
                    Money: <span id="money-amount" style="color: #FFD700; font-weight: bold;">$5000</span>
                </div>
            </div>
            
            <!-- Building Selector Container -->
            <div id="building-selector-container">
                <!-- Building buttons will be added dynamically by JavaScript -->
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