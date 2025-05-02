export class LoadingScreen {
    static show(container) {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.style.position = 'absolute';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.width = '100%';
        loadingScreen.style.height = '100%';
        loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        loadingScreen.style.color = 'white';
        loadingScreen.style.display = 'flex';
        loadingScreen.style.justifyContent = 'center';
        loadingScreen.style.alignItems = 'center';
        loadingScreen.style.fontSize = '24px';
        loadingScreen.style.fontFamily = 'Arial, sans-serif';
        loadingScreen.textContent = 'Loading Assets...';
        container.appendChild(loadingScreen);
    }

    static hide(container) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && loadingScreen.parentNode === container) {
            container.removeChild(loadingScreen);
        }
    }
} 