export class MintPage {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'mint-page';
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="mint-container">
                <h1>Mint Your Sonicity Token</h1>
                <p>Get your piece of the Sonicity ecosystem!</p>
                <button id="mint-button" class="mint-button">MINT NOW</button>
            </div>
        `;

        // Add mint button handler
        const mintButton = this.element.querySelector('#mint-button');
        mintButton.addEventListener('click', () => {
            // TODO: Implement minting functionality
            console.log('Mint button clicked');
        });
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 