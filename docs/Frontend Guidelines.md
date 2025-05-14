# Frontend Guidelines - Sonicity\n\nThis document outlines the frontend design system and guidelines for the Sonicity project to ensure a consistent and polished user interface.\n\n## 1. Color Palette\n\n*(Inferred from `navbar.css` and common dark theme practices. Specific values should be defined and centralized in a global CSS variables file, e.g., `src/styles/variables.css` or `src/styles/theme.css`)*\n\n*   **Primary Text:** `var(--text-primary)` (e.g., `#FFFFFF` or a light gray for dark themes)\n*   **Secondary Text / Muted:** `var(--text-muted)` (e.g., a medium gray)\n*   **Primary Color (Accent):** `var(--color-primary)` (e.g., a vibrant green, seen in `.nav-link::after`, `.wallet-indicator.connected`)\n*   **Secondary Color (Accent):** `var(--color-secondary)` (e.g., used for `.network-badge` background)\n*   **Danger/Error Color:** `var(--color-danger)` (e.g., a red, seen in `.wallet-indicator.disconnected`, `.sign-out` text)\n*   **Background - Dark:** `var(--bg-dark)` (e.g., a very dark gray or near black, used for navbar, dropdowns, tooltips)\n*   **Background - Lighter:** `var(--bg-lighter)` (e.g., a slightly lighter gray than `bg-dark`, used for borders, hover states, input backgrounds)\n*   **Background - Light (for contrasting sections):** `var(--bg-light)` (e.g., used in `.access-status` background in `access-page.css`)\n*   **Navbar Background:** `rgba(0, 0, 0, 0.8)` (semi-transparent black with blur)\n\n**Recommendation:** Centralize all color definitions as CSS custom properties (variables) in a global stylesheet for easy theming and maintenance.\n\n## 2. Typography\n\n*   **Primary Font Family:** (Not explicitly defined in `navbar.css`, but a common sans-serif like 'Inter', 'Roboto', or 'Open Sans' is recommended for modern UIs.) Define as `var(--font-primary)`.
*   **Monospace Font Family:** `monospace` (used for `.dropdown-address .full-address`). Define as `var(--font-monospace)`.
*   **Font Sizes:**
    *   Brand/Logo: `1.5rem` (`.nav-brand`)
    *   Links/Buttons: `0.9rem` - `1rem` (e.g., `.connect-wallet-btn`, `.dropdown-action .action-icon`)
    *   Body/Standard Text: (Define a base, e.g., `1rem` or `16px`)
    *   Small Text/Badges: `0.7rem` - `0.8rem` (e.g., `.network-badge`, `.dropdown-arrow`, `.tooltip`)
    *   Headings: Define a scale (e.g., H1: `2.5rem`, H2: `2rem`, etc.)
*   **Font Weights:**
    *   Bold: Used for brand, badges.
    *   Normal: Default for most text.

**Recommendation:** Define a clear typographic scale and use CSS custom properties for font families and common sizes.\n\n## 3. Spacing & Sizing\n\n*   **Consistent Spacing System:** Use CSS custom properties for spacing units.
    *   `--spacing-xs` (e.g., 4px)
    *   `--spacing-sm` (e.g., 8px)
    *   `--spacing-md` (e.g., 12px or 16px)
    *   `--spacing-lg` (e.g., 20px or 24px)
    *   `--spacing-xl` (e.g., 28px or 32px)
    *   `--spacing-xxl` (e.g., 40px or 48px)
    *(These are used extensively in `navbar.css` and `access-page.css`)*
*   **Container Max Width:** `var(--container-max-width)` (e.g., `1200px` or `1440px`) for main content areas to ensure readability on large screens.
*   **Button/Link Padding:** `var(--spacing-xs) var(--spacing-md)` is a common pattern.
*   **Heights:** Maintain consistent heights for interactive elements where appropriate (e.g., `Navbar` elements `height: 40px`).

## 4. Border Radius\n
*   **Small Radius:** `var(--radius-sm)` (e.g., 4px, used for buttons, tooltips, input fields)
*   **Medium Radius:** `var(--radius-md)` (e.g., 8px, used for dropdowns)
*   **Large Radius:** `var(--radius-lg)` (e.g., 12px or 16px, used in `access-page.css`)
*   **Extra Large Radius:** `var(--radius-xl)` (e.g., 20px or 24px, used in `access-page.css`)
*   **Circular:** `50%` (for indicators like `.wallet-indicator`) or specific pixel values for small circular elements (e.g., `12px` for `.network-badge` to make it pill-shaped depending on content).

## 5. Shadows\n
*   **Standard Shadow:** `var(--shadow-md)` (e.g., for tooltips, hover effects)
*   **Large Shadow:** `var(--shadow-lg)` (e.g., for dropdowns, modals, containers like `.access-container`)

**Recommendation:** Define a few standard shadow levels as CSS custom properties.\n
## 6. Transitions & Animations\n
*   **Standard Transition Duration:** `var(--transition-normal)` (e.g., `0.2s` or `0.3s`)
*   **Easing Function:** `ease` or `ease-in-out` are common defaults.
*   **Specific Transitions Used:**
    *   `background-color`, `transform` for button/link hovers.
    *   `width` for underline effect on nav links.
    *   `opacity`, `transform`, `visibility` for dropdowns.
    *   `@keyframes fadeIn` for tooltips.

## 7. UI Patterns & Components (Based on `navbar.css` and general structure)\n
*   **Navbar:** Fixed position, blurred background, consistent height, clear branding, navigation links, wallet connect/status button.
*   **Buttons:** Clear hover and active states, optional underline effect on hover, consistent padding and border-radius.
*   **Dropdown Menus:** Appear on hover or click, positioned relative to the trigger, clear separation from other content (background, border, shadow).
*   **Badges/Tags:** Small, rounded elements for concise status information (e.g., `network-badge`).
*   **Indicators:** Small visual cues (e.g., `wallet-indicator` dots for connected/disconnected status).
*   **Tooltips:** Provide contextual information on hover, non-interactive.
*   **Modals:** (Assumed from `Modal.js`) For important messages, confirmations, or forms that require focused user attention.
*   **Cards:** (Assumed for displaying NFTs, buildings, etc.) Consistent structure with image/icon, title, description, actions.
*   **Forms:** (Assumed for minting, staking, city management) Clear labels, input fields, and action buttons.

## 8. Icons

*   Use an icon font library (e.g., Font Awesome, Material Icons) or SVG icons for clarity and scalability.
*   Example: `<i class="fas fa-chevron-down"></i>` for dropdown arrow in `navbar.css` (implies Font Awesome).
*   Define consistent sizing and styling for icons.

## 9. Accessibility (General Principles)

*   Ensure sufficient color contrast between text and background.
*   Provide ARIA attributes where necessary for interactive elements.
*   Ensure keyboard navigability for all interactive components.
*   Use semantic HTML elements.

## 10. File Structure for Styles\n
*   A global `variables.css` or `theme.css` for colors, fonts, spacing, etc.
*   A `base.css` or `reset.css` for global resets and base element styling.
*   Component-specific stylesheets (e.g., `navbar.css`, `button.css`) or page-specific styles (`game-page.css`).

This document should be the source of truth for the visual language of Sonicity. All new components and UI elements should adhere to these guidelines.\n 