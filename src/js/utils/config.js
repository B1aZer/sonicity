// Environment configuration utility
// This file centralizes all environment-based configuration

export const config = {
    // Application environment
    env: import.meta.env.VITE_APP_ENV || 'development',
    
    // Network configuration
    network: {
        name: import.meta.env.VITE_NETWORK_NAME || 'localhost',
        rpcUrl: import.meta.env.VITE_RPC_URL || 'http://localhost:8545',
        chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '146'),
    },
    
    // Application URLs
    urls: {
        app: import.meta.env.VITE_APP_URL || 'http://localhost:3000',
        metadata: import.meta.env.VITE_METADATA_BASE_URL || 'http://localhost:3000',
        blockExplorer: import.meta.env.VITE_BLOCK_EXPLORER_URL || 'http://localhost:8545',
    },
    
    // Feature flags
    features: {
        debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
        performanceMonitor: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true',
        analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    },
    
    // Development settings
    dev: {
        mode: import.meta.env.VITE_DEV_MODE === 'true',
        hotReload: import.meta.env.VITE_HOT_RELOAD === 'true',
    },
    
    // Faucet settings
    faucet: {
        amount: import.meta.env.VITE_FAUCET_AMOUNT || '10',
        privateKey: import.meta.env.VITE_FAUCET_PRIVATE_KEY
    }
};

// Get current network configuration (uses environment variables)
export function getCurrentNetworkConfig() {
    // Use environment variables for current network
    return {
        name: config.network.name,
        rpcUrl: config.network.rpcUrl,
        chainId: config.network.chainId,
        blockExplorer: config.urls.blockExplorer,
        isTestnet: config.network.name !== 'sonic'
    };
}

// Check if running in development
export function isDevelopment() {
    return config.env === 'development' || config.dev.mode;
}

// Check if running on testnet
export function isTestnet() {
    const networkConfig = getCurrentNetworkConfig();
    return networkConfig.isTestnet;
}

// Get metadata base URL for current environment
export function getMetadataBaseUrl() {
    if (isDevelopment()) {
        return 'http://localhost:3000';
    }
    return config.urls.metadata;
}

// Get block explorer URL for addresses
export function getBlockExplorerUrl(address) {
    const networkConfig = getCurrentNetworkConfig();
    return `${networkConfig.blockExplorer}/address/${address}`;
}

// Get block explorer URL for transactions
export function getBlockExplorerTxUrl(txHash) {
    const networkConfig = getCurrentNetworkConfig();
    return `${networkConfig.blockExplorer}/tx/${txHash}`;
}

// Debug logging
export function debugLog(...args) {
    if (config.features.debug) {
        console.log('[Sonicity Debug]', ...args);
    }
}

// Performance monitoring
export function performanceLog(label, fn) {
    if (config.features.performanceMonitor) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
    return fn();
}
