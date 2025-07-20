// Logging utility with configurable levels
class Logger {
    static #logLevel = 'warn'; // Default level: 'debug', 'info', 'warn', 'error', 'none'
    static #isDebugEnabled = false;

    static setLogLevel(level) {
        this.#logLevel = level;
        this.#isDebugEnabled = level === 'debug';
    }

    static getLogLevel() {
        return this.#logLevel;
    }

    static debug(message, ...args) {
        if (this.#isDebugEnabled) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }

    static info(message, ...args) {
        if (['debug', 'info'].includes(this.#logLevel)) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }

    static warn(message, ...args) {
        if (['debug', 'info', 'warn'].includes(this.#logLevel)) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    static error(message, ...args) {
        if (['debug', 'info', 'warn', 'error'].includes(this.#logLevel)) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}

export default Logger; 