// App.js - Main application logic for Sonicity

// DOM Elements
const app = document.getElementById('app');
const header = document.getElementById('main-header');
const contentArea = document.getElementById('content-area');
const gamePage = document.getElementById('game-page');
const mintPage = document.getElementById('mint-page');
const navLinks = document.querySelectorAll('nav a');
const walletStatus = document.getElementById('wallet-status');
const connectWalletBtn = document.getElementById('connect-wallet');
const mintButton = document.getElementById('mint-button');

// Wallet connection state
let walletConnected = false;

// Initialize the app
function initApp() {
    // Set up navigation
    setupNavigation();
    
    // Set up wallet connection
    setupWalletConnection();
    
    // Show the game page by default
    showPage('game');
}

// Set up navigation
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get the page to show from the href attribute
            const page = e.target.getAttribute('href').substring(1);
            
            // Show the page
            showPage(page);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

// Show a specific page
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    const pageToShow = document.getElementById(`${pageId}-page`);
    if (pageToShow) {
        pageToShow.classList.add('active');
    }
}

// Set up wallet connection
function setupWalletConnection() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        // Update UI to show MetaMask is available
        walletStatus.textContent = 'MetaMask detected';
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.disabled = false;
        
        // Add click event to connect button
        connectWalletBtn.addEventListener('click', connectWallet);
    } else {
        // Update UI to show MetaMask is not available
        walletStatus.textContent = 'MetaMask not detected';
        connectWalletBtn.textContent = 'Install MetaMask';
        connectWalletBtn.disabled = true;
    }
}

// Connect to MetaMask
async function connectWallet() {
    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Update UI to show connected state
        walletStatus.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
        connectWalletBtn.textContent = 'Connected';
        connectWalletBtn.disabled = true;
        walletConnected = true;
        
        // Enable mint button if wallet is connected
        if (mintButton) {
            mintButton.disabled = false;
        }
        
        // Set up event listeners for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        walletStatus.textContent = 'Connection failed';
    }
}

// Handle account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected their wallet
        walletStatus.textContent = 'Disconnected';
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.disabled = false;
        walletConnected = false;
        
        // Disable mint button if wallet is disconnected
        if (mintButton) {
            mintButton.disabled = true;
        }
    } else {
        // Account changed, update UI
        walletStatus.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
    }
}

// Handle chain changes
function handleChainChanged() {
    // Reload the page to ensure everything is in sync
    window.location.reload();
}

// Mint NFT function (placeholder)
function mintNFT() {
    if (!walletConnected) {
        alert('Please connect your wallet first');
        return;
    }
    
    alert('NFT minting functionality will be implemented in the next phase');
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp); 