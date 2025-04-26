export class GamePage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'game-page';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div id="renderDiv"></div>
            
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