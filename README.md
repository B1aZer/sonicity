# Sonicity

A browser city-builder and PvP strategy game whose state lives on-chain, on the
[Sonic](https://www.soniclabs.com/) network. A browser and a wallet are all a player needs: buildings,
heroes, tactics and battles are contracts, and the Three.js client is a view onto them.

Built solo between April and October 2025: about 9,000 lines of Solidity across 17 contracts, and
about 27,000 lines of client JavaScript.

> **Assets are not included.** 3D models, textures, images, music and fonts were bought or licensed
> and can't be redistributed, so they were removed from the whole history. The code is here; to run the
> client you'd supply your own assets at the same paths. Source links for the packs used are in
> [`docs/dev-notes.md`](docs/dev-notes.md).

## What's in it

**Contracts** (`contracts/contracts/`, Hardhat)

- `GameState`: central player state and resources
- `GridBuildings`, `DistrictBuildings`: plot-level buildings (houses, farms, diamond stations, rep
  forges, yield stations) and city-level infrastructure
- `Altar`: stake NFTs to create buildings
- `BattleSystem`, `MatchmakingSystem`, `AdventureSystem`: hero PvP, matchmaking, and PvE adventures
- `HeroNFT`, `TacticsNFT`, `RelicNFT`, `CosmeticItems`: heroes, battle tactics, relics, cosmetics
- `SonicityNFT`, `SonicityFarm`, `SonicityDiamond`, `SonicityRep`, `SonicityYieldNFT`: building NFTs
- `SonicityArtProxy`: metadata/art proxy

Deployment order and cross-contract wiring are in [`contracts/README.md`](contracts/README.md).
Tests are in `contracts/test/`.

**Client** (`src/`, Vite + Three.js + ethers v6)

- `src/js/`: scene and grid managers, building placement, grass/river/trees, fog and particles, one binding class per contract
- `src/pages/`: one page per building (City Hall, Barracks, Tavern, Scout Guild, Adventure Hub, ...)

**Design docs** (`docs/`): economy iterations, game loop, PRD, contract split plan.

## Running locally

Node 20.

```bash
# contracts: local chain + deploy
cd contracts
npm install
cp env.example .env        # fill in your own values
npx hardhat node           # or: npm run anvil:sonic (Anvil fork of Sonic)
npm run deploy             # deploys all contracts and writes addresses for the client

# client
cd ..
npm install
npm run dev
```

Testnet and mainnet deploy scripts are in `contracts/package.json` (`deploy:testnet`,
`deploy:mainnet`); they read `PRIVATE_KEY` from `contracts/.env`.

## Controls

- Left click a building to open its page
- Right drag to orbit, scroll to zoom
- `D` toggles the debug GUI, `P` the performance monitor

## License

MIT, for the code. See [LICENSE](LICENSE).
