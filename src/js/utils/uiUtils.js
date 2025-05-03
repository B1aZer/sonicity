export function showMessage(message, container) {
    // Remove any existing message
    const existingMessage = container.querySelector('.message-popup');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-popup';
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;

    // Add to container
    container.appendChild(messageDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
} 