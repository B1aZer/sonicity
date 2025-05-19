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
ALTAR=$(jq -r '.altarProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
GAME_STATE=$(jq -r '.gameStateProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
DISTRICT_BUILDINGS=$(jq -r '.districtBuildingsProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")
GRID_BUILDINGS=$(jq -r '.gridBuildingsProxy' "$PROJECT_ROOT/contracts/deployed-addresses.json")

# Check if jq was successful
if [ -z "$SONICITY_NFT" ] || [ -z "$SONICITY_FARM" ] || [ -z "$ALTAR" ] || [ -z "$GAME_STATE" ] || [ -z "$DISTRICT_BUILDINGS" ] || [ -z "$GRID_BUILDINGS" ]; then
    echo "Error: Failed to read addresses from deployed-addresses.json"
    exit 1
fi

# Update constants.js
sed -i '' "s/SONICITY_NFT: \".*\"/SONICITY_NFT: \"$SONICITY_NFT\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/SONICITY_FARM: \".*\"/SONICITY_FARM: \"$SONICITY_FARM\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/ALTAR: \".*\"/ALTAR: \"$ALTAR\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/GAME_STATE: \".*\"/GAME_STATE: \"$GAME_STATE\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/DISTRICT_BUILDINGS: \".*\"/DISTRICT_BUILDINGS: \"$DISTRICT_BUILDINGS\"/" "$PROJECT_ROOT/src/js/utils/constants.js"
sed -i '' "s/GRID_BUILDINGS: \".*\"/GRID_BUILDINGS: \"$GRID_BUILDINGS\"/" "$PROJECT_ROOT/src/js/utils/constants.js"

echo "Contract addresses updated successfully!"
echo "SonicityNFT: $SONICITY_NFT"
echo "SonicityFarm: $SONICITY_FARM"
echo "Altar: $ALTAR"
echo "GameState: $GAME_STATE"
echo "DistrictBuildings: $DISTRICT_BUILDINGS"
echo "GridBuildings: $GRID_BUILDINGS" 