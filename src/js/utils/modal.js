import Swal from 'sweetalert2';

export class Modal {
    constructor() {
        // No need to create DOM elements since SweetAlert2 handles that
    }

    show(content, options = {}) {
        const defaultOptions = {
            title: options.title || 'Info',
            html: content,
            icon: options.icon || 'info',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            confirmButtonColor: options.confirmButtonColor || '#4CAF50',
            backdrop: 'rgba(0, 0, 0, 0.5)',
            customClass: {
                popup: 'swal2-popup-custom',
                title: 'swal2-title-custom',
                content: 'swal2-content-custom',
                confirmButton: 'swal2-confirm-custom'
            }
        };

        return Swal.fire({ ...defaultOptions, ...options });
    }

    // Alias for show method to make it clearer it's for displaying info messages
    info(content, options = {}) {
        return this.show(content, options);
    }

    confirm(content, options = {}) {
        const defaultOptions = {
            title: options.title || 'Confirm',
            html: content,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#f44336',
            backdrop: 'rgba(0, 0, 0, 0.5)',
            customClass: {
                popup: 'swal2-popup-custom',
                title: 'swal2-title-custom',
                content: 'swal2-content-custom',
                confirmButton: 'swal2-confirm-custom',
                cancelButton: 'swal2-cancel-custom'
            }
        };

        return Swal.fire({ ...defaultOptions, ...options });
    }

    error(content, options = {}) {
        return this.show(content, { 
            title: 'Error',
            icon: 'error',
            confirmButtonColor: '#f44336',
            ...options 
        });
    }

    success(content, options = {}) {
        return this.show(content, { 
            title: 'Success',
            icon: 'success',
            confirmButtonColor: '#4CAF50',
            ...options 
        });
    }

    loading(content = 'Loading...', options = {}) {
        return Swal.fire({
            title: content,
            icon: 'info',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            showConfirmButton: false,
            allowOutsideClick: false,
            backdrop: 'rgba(0, 0, 0, 0.5)',
            ...options
        });
    }

    close() {
        Swal.close();
    }
} 