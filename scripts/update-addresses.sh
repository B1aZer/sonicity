#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if deployed-addresses.json exists
if [ ! -f "$PROJECT_ROOT/contracts/deployed-addresses.json" ]; then
    echo "Error: deployed-addresses.json not found at $PROJECT_ROOT/contracts/deployed-addresses.json"
    exit 1
fi

# Read addresses from deployed-addresses.json
SONICITY_NFT=$(jq -r '.sonicityNFT' "$PROJECT_ROOT/contracts/deployed-addresses.json")
SONICITY_FARM=$(jq -r '.sonicityFarm' "$PROJECT_ROOT/contracts/deployed-addresses.json")
SONICITY_DIAMOND=$(jq -r '.sonicityDiamond' "$PROJECT_ROOT/contracts/deployed-addresses.json")
SONICITY_REP=$(jq -r '.sonicityRep' "$PROJECT_ROOT/contracts/deployed-addresses.json")
SONICITY_YIELD_NFT=$(jq -r '.sonicityYieldNFT // empty' "$PROJECT_ROOT/contracts/deployed-addresses.json")
SONICITY_ART_PROXY=$(jq -r '.sonicityArtProxy // empty' "$PROJECT_ROOT/contracts/deployed-addresses.json")
ALTAR=$(jq -r '.altarProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
GAME_STATE=$(jq -r '.gameStateProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
DISTRICT_BUILDINGS=$(jq -r '.districtBuildingsProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
GRID_BUILDINGS=$(jq -r '.gridBuildingsProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
BATTLE_SYSTEM=$(jq -r '.battleSystemProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
MATCHMAKING_SYSTEM=$(jq -r '.matchmakingSystemProxy // empty' "$PROJECT_ROOT/contracts/deployed-addresses.json")
HERO_NFT=$(jq -r '.heroNFTProxy // empty' "$PROJECT_ROOT/contracts/deployed-addresses.json")
TACTICS_NFT=$(jq -r '.tacticsNFTProxy // empty' "$PROJECT_ROOT/contracts/deployed-addresses.json")
COSMETIC_ITEMS=$(jq -r '.cosmeticItemsProxy // empty' "$PROJECT_ROOT/contracts/deployed-addresses.json")

# Check if jq was successful
if [ -z "$SONICITY_NFT" ] || [ -z "$SONICITY_FARM" ] || [ -z "$SONICITY_DIAMOND" ] || [ -z "$SONICITY_REP" ] || [ -z "$ALTAR" ] || [ -z "$GAME_STATE" ] || [ -z "$DISTRICT_BUILDINGS" ] || [ -z "$GRID_BUILDINGS" ] || [ -z "$BATTLE_SYSTEM" ]; then
    echo "Error: Failed to read addresses from deployed-addresses.json"
    exit 1
fi

# Update constants.js
sed -i '' "s/SONICITY_NFT: \".*\"/SONICITY_NFT: \"$SONICITY_NFT\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/SONICITY_FARM: \".*\"/SONICITY_FARM: \"$SONICITY_FARM\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/SONICITY_DIAMOND: \".*\"/SONICITY_DIAMOND: \"$SONICITY_DIAMOND\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/SONICITY_REP: \".*\"/SONICITY_REP: \"$SONICITY_REP\"/" "$PROJECT_ROOT/src/js/utils/constants.js"

# Update REP Forge contracts if they exist
if [ ! -z "$SONICITY_YIELD_NFT" ]; then
    sed -i '' "s/SONICITY_YIELD_NFT: \".*\"/SONICITY_YIELD_NFT: \"$SONICITY_YIELD_NFT\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
fi

if [ ! -z "$SONICITY_ART_PROXY" ]; then
    sed -i '' "s/SONICITY_ART_PROXY: \".*\"/SONICITY_ART_PROXY: \"$SONICITY_ART_PROXY\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
fi

sed -i '' "s/ALTAR: \".*\"/ALTAR: \"$ALTAR\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/GAME_STATE: \".*\"/GAME_STATE: \"$GAME_STATE\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/DISTRICT_BUILDINGS: \".*\"/DISTRICT_BUILDINGS: \"$DISTRICT_BUILDINGS\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/GRID_BUILDINGS: \".*\"/GRID_BUILDINGS: \"$GRID_BUILDINGS\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/BATTLE_SYSTEM: \".*\"/BATTLE_SYSTEM: \"$BATTLE_SYSTEM\"/" "$PROJECT_ROOT/src/js/utils/constants.js"

# Update MatchmakingSystem contract if it exists
if [ ! -z "$MATCHMAKING_SYSTEM" ]; then
    sed -i '' "s/MATCHMAKING_SYSTEM: \".*\"/MATCHMAKING_SYSTEM: \"$MATCHMAKING_SYSTEM\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
fi

# Update Hero & Tactics contracts if they exist
if [ ! -z "$HERO_NFT" ]; then
    sed -i '' "s/HERO_NFT: \".*\"/HERO_NFT: \"$HERO_NFT\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
fi

if [ ! -z "$TACTICS_NFT" ]; then
    sed -i '' "s/TACTICS_NFT: \".*\"/TACTICS_NFT: \"$TACTICS_NFT\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
fi

if [ ! -z "$COSMETIC_ITEMS" ]; then
    sed -i '' "s/COSMETIC_ITEMS: \".*\"/COSMETIC_ITEMS: \"$COSMETIC_ITEMS\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
fi

echo "Contract addresses updated successfully!"
echo "SonicityNFT: $SONICITY_NFT"
echo "SonicityFarm: $SONICITY_FARM"
echo "SonicityDiamond: $SONICITY_DIAMOND"
echo "SonicityRep: $SONICITY_REP"
if [ ! -z "$SONICITY_YIELD_NFT" ]; then
    echo "SonicityYieldNFT: $SONICITY_YIELD_NFT"
fi
if [ ! -z "$SONICITY_ART_PROXY" ]; then
    echo "SonicityArtProxy: $SONICITY_ART_PROXY"
fi
echo "Altar: $ALTAR"
echo "GameState: $GAME_STATE"
echo "DistrictBuildings: $DISTRICT_BUILDINGS"
echo "GridBuildings: $GRID_BUILDINGS"
echo "BattleSystem: $BATTLE_SYSTEM"
if [ ! -z "$MATCHMAKING_SYSTEM" ]; then
    echo "MatchmakingSystem: $MATCHMAKING_SYSTEM"
fi
if [ ! -z "$HERO_NFT" ]; then
    echo "HeroNFT: $HERO_NFT"
fi
if [ ! -z "$TACTICS_NFT" ]; then
    echo "TacticsNFT: $TACTICS_NFT"
fi
if [ ! -z "$COSMETIC_ITEMS" ]; then
    echo "CosmeticItems: $COSMETIC_ITEMS"
fi 