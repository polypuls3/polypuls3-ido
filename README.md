# Polypuls3 IDO Platform

A configurable/white-label IDO (Initial DEX Offering) platform for token sales with tiered vesting schedules on Polygon.

## Project Structure

```
polypuls3-ido/
├── frontend/          # Next.js application
├── contracts/         # Hardhat smart contracts
└── README.md
```

## Features

- **Configurable Tokenomics**: Dynamic pool configuration with custom vesting schedules
- **Tiered Sales**: Support for Seed, Private, Public sales with different terms
- **Vesting System**: Cliff + linear vesting with TGE unlock support
- **Multi-wallet Support**: MetaMask, WalletConnect, Coinbase Wallet
- **Admin Panel**: Manage allocations, pools, and platform settings

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Smart Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Edit .env with your configuration

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy.js --network polygonAmoy
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with contract addresses

# Development
npm run dev

# Build for production
npm run build
```

## Configuration

### Smart Contract Pools

Edit `contracts/config/pools.json` to configure token sale pools:

```json
{
  "pools": [
    {
      "name": "Public Sale",
      "hardCap": "100000000000000000000000000",
      "pricePerToken": "10000",
      "tgePercent": 20,
      "cliffMonths": 1,
      "vestingMonths": 6,
      "isPurchasable": true
    }
  ]
}
```

### Frontend Branding

Edit `frontend/src/config/project.ts` to customize branding:

```typescript
export const projectConfig = {
  name: "PULSE IDO",
  tokenSymbol: "PULSE",
  primaryColor: "indigo",
  // ...
};
```

## Deployment

### Contracts

1. Configure `.env` with private key and RPC URL
2. Run deployment script: `npx hardhat run scripts/deploy.js --network polygonAmoy`
3. Verify contracts: `npx hardhat verify --network polygonAmoy <address>`

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

## License

MIT
