import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

// Configure toastr
toastr.options = {
    closeButton: true,
    debug: false,
    newestOnTop: true,
    progressBar: true,
    positionClass: 'toast-top-right',
    preventDuplicates: false,
    onclick: null,
    showDuration: '300',
    hideDuration: '1000',
    timeOut: '5000',
    extendedTimeOut: '1000',
    showEasing: 'swing',
    hideEasing: 'linear',
    showMethod: 'fadeIn',
    hideMethod: 'fadeOut'
};

export class Toast {
    static success(message) {
        toastr.success(message);
    }

    static error(message) {
        toastr.error(message);
    }

    static warning(message) {
        toastr.warning(message);
    }

    static info(message) {
        toastr.info(message);
    }
} 