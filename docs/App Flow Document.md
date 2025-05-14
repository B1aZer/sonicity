# App Flow Document - Sonicity

This document outlines the typical user flows within the Sonicity application.

## 1. Initial Visit & Wallet Connection (Access & Onboarding)

1.  **User lands on the application.**
    *   If the user is visiting for the first time or their wallet is not connected, they might be directed to an `AccessPage` or see prompts to connect their wallet.
    *   The `Navbar` will prominently display a "Connect Wallet" button.
2.  **User clicks "Connect Wallet".**
    *   The `WalletButton` component initiates the wallet connection process (e.g., prompting MetaMask or other wallet providers).
    *   The user selects their account and approves the connection in their wallet.
3.  **Wallet Connection Status Update:**
    *   Once connected, the `Navbar` updates to show the user's truncated wallet address, network (if applicable), and potentially a connection status indicator (e.g., a green dot).
    *   The `AccessControl` system registers that a wallet is connected (`appState.walletConnected` becomes true).
4.  **NFT Verification (Access Control):**
    *   The `AccessControl` system checks if the user possesses the required NFT(s) for full game access.
    *   If the user does not have the NFT:
        *   They might be restricted to certain pages (e.g., `MintPage`, `AccessPage`).
        *   The `AccessPage` might display messages like "Please connect your wallet... and verify your NFT to access the game."
        *   A link to the `MintPage` is provided for the user to acquire an NFT.
    *   If the user has the NFT (or acquires one and it's verified):
        *   `appState.hasVerifiedNFT` becomes true.
        *   The user might be automatically redirected from the `AccessPage` to a default authenticated page (e.g., `MapPage` or `DashboardPage`).

## 2. Minting an NFT (If Required)

1.  **User navigates to the `MintPage`.**
    *   This can be via a direct link (e.g., from `AccessPage`) or through the `Navbar` (if a link is present).
2.  **User interacts with the minting interface on `MintPage`.**
    *   The page displays information about the NFT collection, price, and a "Mint" button.
3.  **User initiates minting.**
    *   Clicking "Mint" triggers a transaction that the user needs to approve in their connected wallet.
4.  **Minting Process & Feedback:**
    *   The UI provides feedback on the transaction status (pending, success, failure).
    *   Upon successful minting, the `appState` is updated, and `AccessControl` should recognize the new NFT ownership (this might involve a refresh or an event listener).

## 3. Navigating the Application (Post-Authentication)

*   **Navbar:** The primary navigation tool.
    *   **Links:** Provides links to different sections of the game, such as:
        *   `Map` (e.g., navigating to `/` or a dedicated map page)
        *   `Dashboard` (e.g., `/dashboard`)
        *   `Game/City View` (e.g., `/overview` or `/city`)
        *   `Mint` (if still relevant or for other collections)
        *   `Stake` (e.g., `/stake` for staking NFTs at the Altar)
    *   **Wallet Display/Actions:** The connected wallet information remains visible. Clicking on it might open a dropdown (`wallet-dropdown`) with options like:
        *   View full address.
        *   Copy address.
        *   Disconnect wallet.

## 4. Main User Journeys (Authenticated)

### 4.1. Accessing the Dashboard (`DashboardPage`)

1.  **User navigates to the Dashboard.**
    *   Requires wallet connection, NFT verification, and potentially being in a city (`AccessControl.canAccessDashboard`).
2.  **Dashboard Content:**
    *   Displays an overview of the player's status, assets, city information, quick actions, etc.
    *   (Specific content depends on `DashboardPage.js` implementation - e.g., player stats, resources, links to game areas).

### 4.2. Interacting with the World Map (`MapPage`)

1.  **User navigates to the Map.**
    *   This might be the default page after login/NFT verification if the user is not yet in a city or `AccessControl.checkCityAccess()` fails for dashboard/game views.
2.  **Map Content & Actions:**
    *   Displays a world map with selectable regions or cities.
    *   User can interact with the map to choose a city to join or view city information.
    *   May involve transactions for joining a city.

### 4.3. Entering and Managing a City/Game View (`GamePage`, `CityPage`)

1.  **User navigates to their city or the game overview.**
    *   Requires `AccessControl.checkCityAccess()` (wallet connected, NFT verified, and player is part of a city).
2.  **Game View (`GamePage` - likely the 3D city view/overview):**
    *   The main interactive view of the player's city or their portion of it.
    *   Renders the 3D environment using `Three.js` (`Game.js`).
    *   **Building:** Players can select and place buildings on a grid (`GridManager`).
    *   **Resource Display:** Shows current player resources (e.g., gold, materials), updated periodically.
    *   **Interactions:** Players can click on buildings or UI elements to manage their city, collect resources, or initiate other actions.
    *   Loading screens (`LoadingScreen.js`) are shown during asset loading or initialization.
3.  **City Management (`CityPage`, `DistrictPage`, `HousePage` - likely more specific 2D management UIs):**
    *   These pages would provide interfaces for managing specific aspects of the city, districts, or individual properties/buildings.
    *   May include forms, lists, and data displays related to city governance, upgrades, resource allocation etc.

### 4.4. Staking NFTs (`StakePage`)

1.  **User navigates to the Stake Page.**
2.  **Staking Interface:**
    *   Displays the user's eligible NFTs for staking.
    *   Provides information on staking benefits (e.g., building slots from `Altar.sol`).
    *   Allows the user to select NFTs and initiate a staking transaction.
    *   Allows users to unstake NFTs.
3.  **Staking/Unstaking Process:**
    *   Triggers smart contract interactions (`Altar.sol`).
    *   User approves transactions in their wallet.
    *   UI updates to reflect staked status.

## 5. Disconnecting Wallet

1.  **User clicks on their wallet address in the `Navbar`.**
2.  **User selects "Disconnect" or "Sign Out" from the `wallet-dropdown`.**
3.  **Application State Update:**
    *   `appState.walletConnected` becomes false.
    *   User might be redirected to the `AccessPage` or public sections of the site.
    *   `AccessControl` rules will now restrict access to protected routes.

## Notes:

*   **Error Handling:** Modals (`Modal.js`) are used throughout the app to display errors (e.g., transaction failures, access denied messages from `AccessControl`).
*   **State Management:** `appState` (`src/js/core/state.js`) is crucial for tracking wallet connection, NFT verification, and other global states that influence the flow.
*   **Routing:** The application uses client-side routing (`main.js` `handleRoute` function) to switch between pages without full page reloads.

This flow is based on the current understanding of the codebase. Specific details within each page (e.g., exact content of Dashboard) would be defined by their respective JavaScript and HTML/CSS files. 