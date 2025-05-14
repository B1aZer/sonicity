# Backend Structure Document - Sonicity\n\nThis document outlines the backend structure for Sonicity, primarily focusing on the on-chain (smart contract) components, data schemas, and authentication mechanisms.\n\n## 1. Overview\n\nThe backend for Sonicity is predominantly blockchain-based, utilizing smart contracts deployed on an EVM-compatible network. These contracts manage game state, player assets (NFTs), and core game logic.\n\n## 2. Smart Contract Architecture\n\n*   **Primary Language:** Solidity (`^0.8.22`)\n*   **Key Contracts:**
    *   `GameState.sol`: The central contract for managing global game parameters, city states, player data within cities, building information, and tier progression. It acts as a source of truth for much of the game\'s persistent state.
    *   `Altar.sol`: Manages the staking of Sonicity NFTs. It interacts with `GameState.sol` to grant players benefits based on their staked NFTs (e.g., building slots).
    *   `SonicityNFT.sol` (Assumed): The ERC721 contract defining the core Non-Fungible Tokens used in Sonicity. These NFTs likely represent land, characters, or special access passes.\n*   **Design Pattern:** UUPSUpgradeable (Universal Upgradeable Proxy Standard) is used for major contracts (`GameState`, `Altar`), allowing for future upgrades without data migration.\n*   **Modularity:** Contracts are designed with separation of concerns (e.g., game state logic in `GameState`, staking logic in `Altar`).\n*   **Ownership & Access Control:** `OwnableUpgradeable` is used to manage administrative privileges on contracts (e.g., for upgrades or setting key parameters). Specific functions may have their own access controls (e.g., `onlyOwner`).\n*   **Security:** `ReentrancyGuardUpgradeable` is implemented to prevent reentrancy attacks.\n\n## 3. Data Schemas & Storage (On-Chain)\n\n### 3.1. `GameState.sol` Data Structures\n
*   **`NFTMetadata` Struct:**
    *   `district`: `uint8` (District number, e.g., 0-9)
    *   `buildingSlots`: `uint8` (Number of building slots, e.g., 1-5)
    *   *Mapping:* `mapping(address => mapping(uint256 => NFTMetadata)) public nftMetadata;` (NFT contract address -> token ID -> metadata)
*   **`ApprovedCollections` Mapping:**
    *   `mapping(address => bool) public approvedCollections;` (NFT contract address -> boolean indicating if approved)
*   **`City` Struct:**
    *   `treasury`: `uint256` (City\'s gold/resource reserve)
    *   `tier`: `uint8` (Current tier of the city)
    *   `lastTierUpgrade`: `uint256` (Timestamp of the last tier upgrade)
    *   `peaceShield`: `bool` (Status of peace shield)
    *   `playerGold`: `mapping(address => uint256)` (Player address -> gold amount in this city)
    *   `playerRep`: `mapping(address => uint256)` (Player address -> reputation in this city)
    *   `playerBuildingSlots`: `mapping(address => uint256)` (Player address -> current used building slots in this city)
    *   `playerMaxBuildingSlots`: `mapping(address => uint256)` (Player address -> max building slots from NFTs/other sources in this city)
    *   *Mapping:* `mapping(uint256 => City) public cities;` (City ID -> City data)
*   **`PlayerCity` Mapping:**
    *   `mapping(address => uint256) public playerCity;` (Player address -> ID of the city they belong to)
*   **`TierRequirements` Mapping:**
    *   `mapping(uint8 => uint256) public tierRequirements;` (Tier number -> gold/resource cost to upgrade to this tier)
*   **Building Data (Implicit):**
    *   `buildingCosts`: `mapping(string => uint256)` (Building type name -> cost)
    *   `buildingProductionRates`: `mapping(string => uint256)` (Building type name -> production rate)
    *   `buildingRequirements`: `mapping(uint8 => mapping(string => uint256))` (Tier -> Building Name -> Cost)
    *   Player-specific building instances are likely managed via events and off-chain tracking, or potentially another mapping if stored directly on-chain (not explicitly shown in provided snippets but essential for a city builder).

### 3.2. `Altar.sol` Data Structures\n
*   **`Stake` Struct:**
    *   `tokenId`: `uint256` (ID of the staked NFT)
    *   `stakedAt`: `uint256` (Timestamp of when staking occurred)
    *   `owner`: `address` (Address of the NFT owner who staked)
    *   `isActive`: `bool` (Whether the stake is currently active)
    *   *Mapping:* `mapping(uint256 => Stake) public stakes;` (Token ID -> Stake data)
*   **`UserStakes` Mapping:**
    *   `mapping(address => uint256[]) public userStakes;` (User address -> array of their staked token IDs)
*   **`MinStakingDuration`:** `uint256` (Minimum duration for a stake)
*   **`SlotsPerBuildingSlot` Mapping:**
    *   `mapping(uint8 => uint256) public slotsPerBuildingSlot;` (NFT building slots attribute -> actual game building slots granted)

### 3.3. NFT Contract (`SonicityNFT.sol` - Assumed)

*   Standard ERC721 storage for token ownership (`ownerOf`, `balanceOf`).
*   Metadata URI (`tokenURI`) pointing to off-chain metadata (likely JSON files on IPFS) which would include attributes like `name`, `description`, `image`, and custom `attributes` (e.g., district, buildingSlots used by `GameState.sol`).

## 4. Authentication & Authorization (On-Chain Context)\n
*   **Authentication:** Primarily wallet-based. A user is identified by their blockchain address (`msg.sender` in contract calls).
*   **Authorization (Contract Functions):**
    *   **`OwnableUpgradeable`:** Restricts sensitive administrative functions to the contract owner.
    *   **Custom Logic:** Individual functions may have `require` statements to check specific conditions before execution, such as:
        *   NFT ownership (e.g., `require(sonicityNFT.ownerOf(tokenId) == msg.sender)` in `Altar.sol` for staking).
        *   Whether a player is in a city.
        *   Minimum staking duration.
        *   Sufficient funds for an action.
    *   The `altarAddress` in `GameState.sol` likely serves as an authorization mechanism, allowing only the `Altar` contract to call certain functions (e.g., updating player building slots after staking).

## 5. Key Backend Flows (Interactions with Contracts)\n
*   **NFT Minting:** User calls `mint` function on `SonicityNFT.sol`.
*   **NFT Staking (`Altar.sol`):**
    1.  User approves `Altar.sol` to manage their NFT.
    2.  User calls `stake(tokenId)` on `Altar.sol`.
    3.  `Altar.sol` verifies ownership, records the stake, and potentially calls `GameState.sol` to update player\'s maximum building slots based on the staked NFT\'s attributes.
*   **Joining a City (`GameState.sol`):**
    1.  User calls a function (e.g., `joinCity(cityId)`) on `GameState.sol`.
    2.  Contract verifies requirements (e.g., NFT ownership, city not full) and updates `playerCity` mapping.
*   **Building Structures (`GameState.sol` or a dedicated BuildingManager contract):**
    1.  User calls a function like `build(buildingType, position)`.
    2.  Contract checks resources (`playerGold`), building slot availability (`playerBuildingSlots` vs `playerMaxBuildingSlots`), and tier requirements.
    3.  Deducts resources and records the new building (potentially emitting an event for off-chain indexing).
*   **Collecting Resources (`GameState.sol`):**
    1.  User calls a function like `collectGold(buildingId)`.
    2.  Contract calculates resources generated since last collection (based on `buildingProductionRates` and time elapsed), updates `playerGold`, and emits an event.
*   **Upgrading City Tier (`GameState.sol`):**
    1.  Authorized player (e.g., city mayor or via a voting mechanism) calls `upgradeTier()`.
    2.  Contract checks if `cities[cityId].treasury` meets `tierRequirements`.
    3.  Updates city tier and deducts cost from treasury.

## 6. Off-Chain Backend Components (Potential/Implied)

While the core logic is on-chain, a complete dApp typically requires some off-chain services:

*   **Event Indexer/Listener:** A service to listen to smart contract events (e.g., `NFTStaked`, `BuildingPlaced`, `GoldCollected`). This data is then stored in a traditional database for faster querying and to build rich APIs for the frontend, avoiding direct and numerous `eth_call` requests for complex data views.
*   **Metadata Server:** For serving NFT metadata (JSON files) if not pinned directly to IPFS by users or during minting.
*   **Caching Layer:** To cache frequently accessed on-chain data that doesn't change often.
*   **API Server:** If an event indexer and database are used, an API server would expose this data to the frontend.

These off-chain components are not explicitly detailed in the provided file structure but are common in Web3 application architectures.

This document should be kept in sync with any changes to the smart contracts or backend architecture. 