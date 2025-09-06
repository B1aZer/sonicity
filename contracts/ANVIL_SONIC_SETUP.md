# Anvil + Sonic Blockchain Fork Setup

This setup allows you to use Anvil (from Foundry) to fork the Sonic blockchain with **persistent nonces and state** across restarts.

## 🚀 Quick Start

### 1. Start Anvil with Sonic Fork (Persistent State)

```bash
npm run anvil:sonic
```

This will:
- Fork from Sonic mainnet (`https://rpc.soniclabs.com`)
- Save state to `.anvil-state/sonic-fork.json`
- Restore previous state on restart
- Provide 10 test accounts with the standard test mnemonic
- Run on `http://localhost:8545` with Chain ID `146`

### 2. Reset State (Fresh Start)

```bash
npm run anvil:reset
```

This will delete all saved state and start fresh.

### 3. Use Sonic Testnet

```bash
npm run anvil:testnet
```

Forks from Sonic testnet instead of mainnet.

## 🔧 Configuration

### Networks Available

- **localhost**: Points to your Anvil fork (Chain ID: 146)
- **sonic**: Sonic mainnet (Chain ID: 146)
- **sonicTestnet**: Sonic testnet (Chain ID: 64165)

### Environment Setup

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Add your private key (for live network deployments):
   ```
   PRIVATE_KEY=your_private_key_without_0x_prefix
   ```

## 📝 Usage Examples

### Deploy to Anvil Fork

```bash
# Start Anvil fork in one terminal
npm run anvil:sonic

# Deploy in another terminal
npm run deploy
```

### Test with Persistent State

1. Start Anvil: `npm run anvil:sonic`
2. Deploy contracts and interact with them
3. Stop Anvil (Ctrl+C) - state is automatically saved
4. Restart Anvil: `npm run anvil:sonic` - all state restored!

### Deploy to Live Networks

```bash
# Sonic mainnet
npx hardhat run scripts/deploy.js --network sonic

# Sonic testnet  
npx hardhat run scripts/deploy.js --network sonicTestnet
```

## 🌟 Benefits of This Setup

### ✅ Persistent Nonces
- Nonces persist across Anvil restarts
- No more "nonce too low" errors
- Faster development iteration

### ✅ Realistic Testing
- Fork from live Sonic blockchain
- Access to real deployed contracts
- Real network conditions

### ✅ Fast Local Development
- 2-second block times (configurable)
- Instant transaction confirmation
- No network fees

### ✅ State Management
- Save blockchain state between sessions
- Reset when needed
- Multiple environments (mainnet/testnet fork)

## 🔍 State File Location

Your blockchain state is saved in:
```
.anvil-state/sonic-fork.json
```

This file is git-ignored and contains:
- All account balances and nonces
- Deployed contract state
- Transaction history
- Block data

## 🛠 Advanced Configuration

### Custom RPC Endpoints

Edit `scripts/start-anvil-sonic.sh` to use different RPC endpoints:

```bash
# Use a custom RPC
SONIC_RPC="https://your-custom-rpc-endpoint.com"
```

### Different Block Times

```bash
# Faster blocks (1 second)
--block-time 1

# Slower blocks (5 seconds)  
--block-time 5
```

### More Test Accounts

```bash
# Generate 20 accounts instead of 10
--accounts 20
```

## 🔗 Network Information

### Sonic Mainnet
- **RPC**: `https://rpc.soniclabs.com`
- **Chain ID**: `146`
- **Explorer**: `https://sonicscan.org`
- **Currency**: `S`

### Sonic Testnet
- **RPC**: `https://api.testnet.sonic.game`
- **Chain ID**: `64165`
- **Explorer**: `https://testnet.sonicscan.org`
- **Faucet**: `https://faucet.sonic.game`

## 🐛 Troubleshooting

### "Connection Refused" Error
Make sure Anvil is running: `npm run anvil:sonic`

### "Nonce Too High" Error
Reset the state: `npm run anvil:reset`

### "Network Not Found" Error
Check that your wallet is connected to `http://localhost:8545` with Chain ID `146`

### Fork Sync Issues
If the fork gets out of sync, restart with: `npm run anvil:reset`

## 📚 Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Anvil Documentation](https://book.getfoundry.sh/anvil/)
- [Sonic Documentation](https://docs.soniclabs.com)
- [Hardhat Documentation](https://hardhat.org/docs) 