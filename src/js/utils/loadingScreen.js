export class LoadingScreen {
    static show(container, showProgress = true) {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.style.position = 'absolute';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.width = '100%';
        loadingScreen.style.height = '100%';
        loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        loadingScreen.style.color = 'white';
        loadingScreen.style.display = 'flex';
        loadingScreen.style.flexDirection = 'column';
        loadingScreen.style.justifyContent = 'center';
        loadingScreen.style.alignItems = 'center';
        loadingScreen.style.fontSize = '24px';
        loadingScreen.style.fontFamily = 'Arial, sans-serif';
        loadingScreen.style.zIndex = '1000';
        
        // Main loading text
        const loadingText = document.createElement('div');
        loadingText.id = 'loading-text';
        loadingText.textContent = 'Loading Game Assets...';
        loadingText.style.marginBottom = '20px';
        loadingText.style.fontSize = '28px';
        loadingText.style.fontWeight = 'bold';
        
        // Progress container
        const progressContainer = document.createElement('div');
        progressContainer.id = 'progress-container';
        progressContainer.style.width = '400px';
        progressContainer.style.marginBottom = '10px';
        
        // Progress bar background
        const progressBarBg = document.createElement('div');
        progressBarBg.style.width = '100%';
        progressBarBg.style.height = '8px';
        progressBarBg.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        progressBarBg.style.borderRadius = '4px';
        progressBarBg.style.overflow = 'hidden';
        
        // Progress bar fill
        const progressBarFill = document.createElement('div');
        progressBarFill.id = 'progress-bar-fill';
        progressBarFill.style.width = '0%';
        progressBarFill.style.height = '100%';
        progressBarFill.style.backgroundColor = '#4CAF50';
        progressBarFill.style.transition = 'width 0.3s ease';
        progressBarFill.style.borderRadius = '4px';
        
        progressBarBg.appendChild(progressBarFill);
        progressContainer.appendChild(progressBarBg);
        
        // Progress text
        const progressText = document.createElement('div');
        progressText.id = 'progress-text';
        progressText.textContent = '0%';
        progressText.style.fontSize = '16px';
        progressText.style.textAlign = 'center';
        progressText.style.marginTop = '10px';
        
        // Status text
        const statusText = document.createElement('div');
        statusText.id = 'status-text';
        statusText.textContent = 'Initializing...';
        statusText.style.fontSize = '14px';
        statusText.style.opacity = '0.8';
        statusText.style.textAlign = 'center';
        
        loadingScreen.appendChild(loadingText);
        if (showProgress) {
            loadingScreen.appendChild(progressContainer);
            loadingScreen.appendChild(progressText);
        }
        loadingScreen.appendChild(statusText);
        
        container.appendChild(loadingScreen);
        
        // Store reference for updates
        loadingScreen.progressBarFill = progressBarFill;
        loadingScreen.progressText = progressText;
        loadingScreen.statusText = statusText;
        loadingScreen.loadingText = loadingText;
    }

    static updateProgress(progress, loaded, total, status = '') {
        const loadingScreen = document.getElementById('loading-screen');
        if (!loadingScreen) return;
        
        const progressBarFill = loadingScreen.progressBarFill;
        const progressText = loadingScreen.progressText;
        const statusText = loadingScreen.statusText;
        
        if (progressBarFill) {
            progressBarFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}% (${loaded}/${total})`;
        }
        
        if (statusText && status) {
            statusText.textContent = status;
        }
    }

    static hide(container) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && loadingScreen.parentNode === container) {
            // Add fade out effect
            loadingScreen.style.transition = 'opacity 0.5s ease';
            loadingScreen.style.opacity = '0';
            
            setTimeout(() => {
                if (loadingScreen.parentNode === container) {
                    container.removeChild(loadingScreen);
                }
            }, 500);
        }
    }
} 