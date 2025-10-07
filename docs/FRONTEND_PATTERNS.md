# 🎨 Frontend Patterns Summary

## 📋 Page Structure Pattern

### 1. **File Structure**
```
src/pages/YourPage.js
src/styles/your-page.css
```

### 2. **Class Pattern**
```javascript
import { BasePage } from './BasePage.js';
import('../styles/your-page.css');

export class YourPage extends BasePage {
    constructor() {
        super();
        this.requiredDistrictBuilding = 'BuildingName'; // Optional
        this.element.className = 'base-page your-page';
        
        // Initialize state
        this.setState({
            // ... state properties
        });
        
        this.render();
    }

    async onInitialized(walletResult) {
        // Load data and setup handlers
        await this.loadData();
        this.setupHandlers();
    }

    render() {
        this.element.innerHTML = `
            <div class="page-container">
                <h1>Page Title</h1>
                <div class="page-description">Description</div>
                <!-- Content -->
            </div>
        `;
    }
}
```

---

## 🎨 CSS Structure Pattern

### 1. **Base Page Classes**
- `.base-page` - Main page wrapper (padding, overflow)
- `.page-container` - Content container (ornamental borders, background)
- `.page-section` - Section divider
- `.page-description` - Styled description text below title

### 2. **Common Utilities**
- `.loading-spinner` - Animated loading spinner
- `.loading-container` - Spinner + text container
- `data-state="key"` - Auto-update elements from state

---

## 🔧 BasePage Features

### **Contract Initialization**
```javascript
this.contracts = {
    gameState: new GameStateContract(),
    altar: new AltarContract(),
    // ... etc
};
```

### **State Management**
```javascript
this.setState({
    gold: 0,
    isLoading: false
});
// Automatically updates elements with data-state="gold"
```

### **Event Listeners**
```javascript
this.addEventListener('.my-button', 'click', async (e) => {
    // Handler
});
// Auto-cleanup on unmount
```

### **Intervals**
```javascript
this.setInterval('updateTimer', () => {
    // Update code
}, 1000);
// Auto-cleanup on unmount
```

### **Modals**
```javascript
this.modal.success('Success message');
this.modal.error('Error message');
this.modal.confirm('Confirm?').then(result => {});
```

---

## 📦 Contract Integration Pattern

### **Loading Data**
```javascript
async loadData() {
    try {
        const [gold, food] = await Promise.all([
            this.contracts.gameState.getPlayerGold(),
            this.contracts.gameState.getPlayerFood()
        ]);
        
        this.setState({ gold, food });
    } catch (error) {
        this.handleContractError(error, 'load data');
    }
}
```

### **Calling Contract Methods**
```javascript
async handleAction() {
    try {
        const receipt = await this.contracts.yourContract.doSomething(param);
        this.modal.success('Action successful!');
        await this.loadData(); // Refresh
    } catch (error) {
        this.handleContractError(error, 'perform action');
    }
}
```

---

## 🎨 HTML Patterns

### **Page Container**
```html
<div class="page-container container-min-width-800">
    <h1>Page Title</h1>
    <div class="page-description">
        Descriptive text with <strong>emphasis</strong> and <em>highlights</em>
    </div>
    
    <div class="page-section">
        <h2>Section Title</h2>
        <!-- Section content -->
    </div>
</div>
```

### **Resource Display**
```html
<div class="resource-display">
    <div class="resource-item">
        <i class="fas fa-coins"></i>
        <span data-state="gold">0</span>
    </div>
</div>
```

### **Button Patterns**
```html
<button class="btn btn-primary" id="action-btn">
    <i class="fas fa-play"></i>
    Action Text
</button>
```

### **Cards/Items**
```html
<div class="item-card">
    <div class="item-header">
        <h3>Item Name</h3>
    </div>
    <div class="item-body">
        <!-- Content -->
    </div>
    <div class="item-footer">
        <button class="btn">Action</button>
    </div>
</div>
```

---

## 🎯 CSS Variable Usage

### **Colors**
- `var(--color-primary)` - Primary accent
- `var(--color-success)` - Success green
- `var(--color-danger)` - Error red
- `var(--text-primary)` - Main text
- `var(--text-secondary)` - Secondary text
- `var(--text-muted)` - Muted text
- `var(--bg-dark)` - Dark background
- `var(--bg-light)` - Light background

### **Spacing**
- `var(--spacing-xs)` to `var(--spacing-xxl)`
- `var(--radius-sm)` to `var(--radius-xl)`

### **Typography**
- `var(--font-size-xs)` to `var(--font-size-4xl)`
- `var(--font-weight-normal)` to `var(--font-weight-bold)`

---

## 🚀 Common Page Features

### **Loading States**
```javascript
render() {
    this.element.innerHTML = `
        <div class="page-container">
            ${this.getLoadingContainerHTML('Loading data...')}
        </div>
    `;
}
```

### **Empty States**
```html
<div class="empty-state">
    <i class="fas fa-inbox fa-3x"></i>
    <p>No items found</p>
</div>
```

### **Error States**
```javascript
try {
    // Action
} catch (error) {
    this.handleContractError(error, 'action name');
}
```

---

## 📱 Responsive Design

### **Breakpoints**
```css
@media (max-width: 768px) {
    /* Tablet */
}

@media (max-width: 480px) {
    /* Mobile */
}
```

### **Container Utilities**
- `.container-min-width-800` - 800px min width (responsive)
- `.container-min-width-1000` - 1000px min width (responsive)

---

## ✨ Animations

### **Page Entry**
```css
.page-container {
    animation: slideUpFromBottom 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}
```

### **Hover Effects**
```css
.btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}
```

---

## 🎯 Best Practices

1. **Always extend BasePage**
2. **Use setState() for reactive updates**
3. **Cleanup with onUnmount()**
4. **Handle errors with handleContractError()**
5. **Use semantic HTML**
6. **Follow CSS variable patterns**
7. **Add loading states**
8. **Mobile-first responsive design**
9. **Use Font Awesome icons**
10. **Test wallet connection/disconnection**

---

**This pattern ensures consistency across all pages!** 🎨

