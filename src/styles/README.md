# Page Description Styling System

## Overview

The page description system provides a consistent way to display descriptive text after page headers (h1) across all pages in the Sonicity application. This text provides context, guidance, and game lore to users.

## Usage

### HTML Structure

```html
<div class="page-container">
    <h1>Page Title</h1>
    <p class="page-description">
        <strong>Key information goes here.</strong> Additional context and explanation. 
        <em>Important tips or highlights.</em>
    </p>
    <!-- Rest of page content -->
</div>
```

### CSS Class

The `.page-description` class provides:

- **Centered text** with max-width of 600px
- **Gradient background** with subtle gold/parchment theme
- **Animated border** with shimmer effect
- **Italic styling** for elegant appearance
- **Responsive design** that works on all screen sizes

### Styling Features

1. **Background**: Subtle gradient from gold to parchment colors
2. **Border**: Animated shimmer effect that pulses every 3 seconds
3. **Typography**: Italic text with proper line height and spacing
4. **Text Styling**: 
   - `<strong>` tags render in primary text color
   - `<em>` tags render in accent color (gold)
5. **Backdrop Filter**: Subtle blur effect for depth

## Examples

### House Page
```html
<p class="page-description">
    <strong>Gold is stored in your vault for 24 hours.</strong> After that, workers rest and production stops until you collect. 
    <em>Upgrade your houses to increase production rates and unlock new features.</em>
</p>
```

### Farm Page
```html
<p class="page-description">
    <strong>Food sustains your population and fuels your economy.</strong> Farms produce food continuously, but you must collect it regularly. 
    <em>Larger farms produce more food and can support bigger cities.</em>
</p>
```

### Access Page
```html
<p class="page-description">
    Please connect your wallet using the button in the navbar and verify your NFT to access the game. 
    <em>You'll need a Sonicity NFT to start building your empire.</em>
</p>
```

### Mint Page
```html
<p class="page-description">
    <strong>NFTs are the foundation of your Sonicity empire.</strong> Each NFT represents a plot of land that you can build upon. 
    <em>Choose your tier wisely - higher tiers unlock more advanced buildings and features.</em>
</p>
```

## Design Principles

1. **Consistency**: All pages use the same styling for descriptions
2. **Game Theme**: Styling matches the medieval/fantasy theme
3. **Readability**: Clear contrast and proper spacing
4. **Engagement**: Subtle animations add visual interest
5. **Information Hierarchy**: Uses `<strong>` and `<em>` for emphasis

## Best Practices

1. **Keep it concise**: 1-2 sentences maximum
2. **Use strong tags**: Highlight key mechanics or rules
3. **Use em tags**: Emphasize tips or important information
4. **Game-focused**: Explain mechanics, not just UI
5. **Actionable**: Help users understand what they can do

## CSS Variables Used

- `--text-secondary`: Main description text color
- `--text-primary`: Strong tag color
- `--color-accent`: Em tag color (gold)
- `--spacing-xl`: Bottom margin
- `--radius-lg`: Border radius
- `--font-size-md`: Font size
- `--line-height-relaxed`: Line height

## Animation

The shimmer border animation:
- Duration: 3 seconds
- Easing: ease-in-out
- Opacity: 0.3 to 0.8
- Creates a subtle "magical" effect fitting the game theme 