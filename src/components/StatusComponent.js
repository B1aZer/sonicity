export class StatusComponent {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'status-component';
    }

    show(message, type = 'info') {
        // Remove any existing status
        const existingStatus = document.querySelector('.status-component');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Reset classes
        this.element.className = 'status-component';
        this.element.classList.add(type);
        
        if (type === 'loading') {
            this.element.innerHTML = `
                <div class="loading-spinner"></div>
                <div>
                    <div class="step">${message}</div>
                    <div class="description">Please wait while we process your request...</div>
                </div>
            `;
        } else if (type === 'success') {
            this.element.innerHTML = `
                <div class="status-content">
                    <div class="title">Success!</div>
                    <div class="description">${message}</div>
                </div>
            `;
        } else if (type === 'error') {
            this.element.innerHTML = `
                <div class="status-content">
                    <div class="title">Error</div>
                    <div class="description">${message}</div>
                </div>
            `;
        }

        // Auto-remove success/error messages after 5 seconds
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                this.element.remove();
            }, 5000);
        }

        return this.element;
    }

    mount(container) {
        container.appendChild(this.element);
    }

    unmount() {
        this.element.remove();
    }
} 