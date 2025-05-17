import { BasePage } from './BasePage.js';
import '../styles/building.css';

export class WorkshopPage extends BasePage {
    constructor() {
        super();
        this.element = document.createElement('div');
        this.element.className = 'base-page';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1 class="page-title">Workshop</h1>
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