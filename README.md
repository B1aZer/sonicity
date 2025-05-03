# Sonicity - 3D City Building Game

A 3D city building game where players can construct and manage a city with various buildings and resources.

## Features

- 3D city building with Three.js
- Resource management (electricity and water)
- Building placement and management
- Income generation from functional buildings
- Bulldoze functionality to remove buildings

## Start

nvm use v20
npm run dev

cd contracts
npx hardhat node

npx hardhat run scripts/deploy.js --network localhost

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/sonicity.git
   cd sonicity
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```  

## Game Controls

- **Left Click**: Place or remove buildings
- **Right Click + Drag**: Rotate camera
- **Scroll Wheel**: Zoom in/out
- **Building Buttons**: Select building type to place
- **Bulldoze Button**: Remove buildings
- **Restart Button**: Reset the game

## Building Types

- **House**: Generates income when functional (needs power and water)
- **Shop**: Consumes resources
- **Power Plant**: Generates electricity with a range effect
- **Water Tower**: Generates water with a range effect

## Development Notes

- The game uses ES modules for JavaScript
- Three.js is used for 3D rendering
- Assets are loaded from zip files containing FBX models and textures

## Future Enhancements

- NFT collection integration
- Liquidity provider rewards
- Bribe markets
- Team-based gameplay
- Weekly rewards based on coalition performance

## Credits

- 3D models from various sources (see Concept.md for details)
- Inspired by city-building games like SimCity

## Models

- https://www.fab.com/listings/c4c8a84a-6c63-4cf0-9e44-fb99a4c5b367
- https://www.fab.com/listings/8cde1ff2-a4e0-47ce-8bce-399226c71dd9
- https://www.fab.com/listings/3e7ec8b1-b604-437c-94a2-9eb94d25441f

## Art

- https://app.leonardo.ai/image-generation

## conecpt #2

- each nft collection receives whiteelist spot and minimal gold. TEAM 1
- Certain buildings could: Increase LP rewards multipliers.Produce extra Gold. Unlock bribe markets (e.g., build a "Bribe Chamber" to accept external bribes officially 😆).
- allow bribes from nft creates. They WOULD PAY to for their team to win
- If players don't build or LP, gold slowly decays
- every week the coalition with the most n receives feem rewards AND voting power by staking nft
- ?(luidity providers vote where rewards should go)
- If staking rewards are reinvested into LP or city upgrades, it strengthens the winning collection even more.

## Game concept

- create wl for fnt collection
- allow to mint basic materials
- recive gold
- receive diamonds for staking LP
- diamonds either erc20 for staking and receiveng fees
- diamond or erc721 for voting and receiving bribes??
- Stake fdiamonds and receive % of the revenue/bribrd/shit
- Revenue ???
- Each nft will work o ntheir own clan and they comete for biggere revenue


## Demo games

- [citybuidler3d](https://dgreenheck.github.io/simcity-threejs-clone/)

## Blokchain dev

- [best cources](https://www.youtube.com/watch?v=cMWL12Jevbg&list=PLvfQp12V0hS02sJXKPJwqTTBClwPnPEqr&index=4)
- [crpytozombies](https://cryptozombies.io/en/lesson/10/chapter/4)

## Asset creator

- https://www.meshy.ai/workspace
- from
- https://blog.pocketcitygame.com/isometric-city-art-first-look/

## Assets

- 
- https://www.cgtrader.com/3d-models/exterior/cityscape/city-low-poly-4-tile-pack
- https://free3d.com/3d-model/isometric-low-poly-city-cartoon-buildings-cars-and-forest-pack-415.html
