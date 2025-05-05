export class Modal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <div class="modal-body"></div>
            </div>
        `;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal when clicking the close button
        const closeButton = this.modal.querySelector('.close-button');
        closeButton.addEventListener('click', () => this.close());

        // Close modal when clicking outside the content
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close modal when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    setContent(content) {
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.innerHTML = '';
        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            modalBody.appendChild(content);
        }
    }

    open() {
        document.body.appendChild(this.modal);
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        this.modal.classList.add('active');
    }

    close() {
        this.modal.classList.remove('active');
        setTimeout(() => {
            if (this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            document.body.style.overflow = ''; // Restore scrolling
        }, 300); // Match the transition duration
    }
} 