#!/bin/bash

# Sonic Anvil Fork Script
# This script starts Anvil forked from Sonic blockchain with persistent state

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SONIC_RPC="https://rpc.soniclabs.com"
CHAIN_ID=146
PORT=8545
HOST="0.0.0.0"
STATE_FILE=".anvil-state/sonic-fork.json"
ACCOUNTS=10
MNEMONIC="test test test test test test test test test test test junk"

# Create state directory
mkdir -p .anvil-state

echo -e "${GREEN}🚀 Starting Anvil with Sonic Fork${NC}"
echo -e "${BLUE}📡 Sonic RPC: ${SONIC_RPC}${NC}"
echo -e "${BLUE}🔗 Chain ID: ${CHAIN_ID}${NC}"
echo -e "${BLUE}🌐 Local endpoint: http://${HOST}:${PORT}${NC}"
echo -e "${BLUE}💾 State file: ${STATE_FILE}${NC}"
echo -e "${YELLOW}⚠️  Press Ctrl+C to stop and save state${NC}"
echo ""

# Check if state file exists
if [ -f "$STATE_FILE" ]; then
    echo -e "${GREEN}📂 Found existing state file, loading previous state...${NC}"
    LOAD_STATE="--load-state $STATE_FILE"
else
    echo -e "${YELLOW}📁 No previous state found, starting fresh...${NC}"
    LOAD_STATE=""
fi

# Start Anvil with Sonic fork
anvil \
  --fork-url "$SONIC_RPC" \
  --chain-id "$CHAIN_ID" \
  --port "$PORT" \
  --host "$HOST" \
  --accounts "$ACCOUNTS" \
  --mnemonic "$MNEMONIC" \
  --dump-state "$STATE_FILE" \
  $LOAD_STATE \
  --block-time 2 \
  --gas-limit 12000000 \
  --gas-price 8000000000

echo -e "${RED}🛑 Anvil stopped. State saved to ${STATE_FILE}${NC}" 