# Guardian Pet - AI Agent Budget Manager

Guardian Pet is a Monad Testnet dapp that gives AI agents an on-chain spending firewall. Each registered agent is represented as a "pet" with a daily MON budget. Payments must go through the `GuardianBudgetManager` smart contract, which enforces limits, revocation, spend resets, and treasury balance checks before funds can move.

The repository also includes a mock x402-style paid API flow: an agent calls a premium endpoint, receives `402 Payment Required`, pays through the Guardian contract, then retries the request with the transaction hash as proof.

## Features

- On-chain daily spending limits for AI agent wallets
- Agent registration, revocation, restoration, and limit management
- Treasury deposits and owner withdrawals
- React dashboard for managing agents and contract funds
- Mock x402 paid API server with on-chain payment proof verification
- CLI utilities for contract operations and demo agent payments
- Monad Testnet support through Wagmi, RainbowKit, Viem, and Foundry

## Repository Structure

```text
.
|-- frontend/          # Vite + React dashboard
|-- smart-contracts/   # Foundry Solidity contracts, scripts, and tests
|-- x402-server/       # Express mock x402 API server and agent demo
|-- scripts/           # Deployment helper scripts
`-- screenshots/       # Project screenshots
```

## Tech Stack

- Frontend: React, TypeScript, Vite, Wagmi, RainbowKit, Viem
- Smart contracts: Solidity, Foundry, OpenZeppelin
- Server: Node.js, Express, Viem
- Network: Monad Testnet, chain ID `10143`
- Deployed contract: `0x1e17c67f42211cA93a007a00b82638a572a2ac4F`

## Prerequisites

- Node.js 20 or newer
- npm
- Foundry (`forge`, `cast`)
- A Monad Testnet wallet with test MON
- WalletConnect project ID, optional but recommended for mobile wallet support

Install Foundry if needed:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Environment Setup

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### x402 Server

```bash
cd x402-server
cp .env.example .env
```

Edit `x402-server/.env`:

```env
GUARDIAN_CONTRACT_ADDRESS=0x1e17c67f42211cA93a007a00b82638a572a2ac4F
PRIVATE_KEY=0xYourAgentOrOwnerPrivateKey
PORT=3001
RECIPIENT_ADDRESS=
PAYMENT_AMOUNT_WEI=1000000000000000
X402_SERVER=http://localhost:3001
PAYMENT_AMOUNT=0.001
```

Never commit real private keys or funded wallet secrets.

## Installation

Install dependencies for each Node.js package:

```bash
cd frontend
npm install

cd ../x402-server
npm install
```

Install Foundry dependencies from the smart contract package if they are not already present:

```bash
cd smart-contracts
forge install
```

## Smart Contracts

Build and test:

```bash
cd smart-contracts
forge build
forge test -v
```

Deploy to Monad Testnet:

```bash
PRIVATE_KEY=0xYourDeployerPrivateKey bash scripts/deploy.sh
```

The deployment script:

- Builds the contracts
- Runs the Foundry test suite
- Deploys `GuardianBudgetManager`
- Attempts contract verification through the configured Sourcify endpoint
- Updates `frontend/src/lib/constants.ts` with the deployed contract address

After deployment, fund the contract treasury:

```bash
cast send 0xYourGuardianContract \
  --value 0.1ether \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key 0xYourOwnerPrivateKey
```

## Run the Frontend

```bash
cd frontend
npm run dev
```

Open the Vite URL printed in the terminal. The app connects to Monad Testnet and uses the contract address from `frontend/src/lib/constants.ts`.

## Run the x402 Server

```bash
cd x402-server
npm run server
```

## Mock x402 API Endpoints

Base URL for local development:

```text
http://localhost:3001
```

| Method | Endpoint | Required Headers | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Returns server status, Guardian contract address, payment amount, and network metadata. |
| `GET` | `/api/premium-data` | None for the first request | Returns `402 Payment Required` with payment instructions when no proof is provided. |
| `GET` | `/api/premium-data` | `X-Payment-Proof`, `X-Agent-Address` | Verifies the Monad Testnet transaction hash and returns premium data if the proof is valid. |
| `GET` | `/api/agent-status` | `X-Agent-Address` | Reads the Guardian contract and returns the agent name, pet, daily limit, spent amount, remaining budget, and revoked status. |

### `GET /health`

Example:

```bash
curl http://localhost:3001/health
```

Returns:

- Service status
- Guardian contract address
- Required payment amount
- Network name and chain ID

### `GET /api/premium-data`

First request, without payment proof:

```bash
curl http://localhost:3001/api/premium-data
```

Expected behavior:

- Returns HTTP `402`
- Includes payment instructions
- Uses Guardian contract `0x1e17c67f42211cA93a007a00b82638a572a2ac4F`
- Requires a payment through `GuardianBudgetManager.executePayment(recipientAddress, amount, reason)`

Retry after payment:

```bash
curl http://localhost:3001/api/premium-data \
  -H "X-Payment-Proof: 0xTransactionHash" \
  -H "X-Agent-Address: 0xAgentWalletAddress"
```

Expected behavior:

- Validates the transaction receipt on Monad Testnet
- Rejects reused payment proofs
- Returns premium data when payment verification succeeds

### `GET /api/agent-status`

Example:

```bash
curl http://localhost:3001/api/agent-status \
  -H "X-Agent-Address: 0xAgentWalletAddress"
```

Returns:

- Agent wallet address
- Agent name and pet emoji
- Daily limit in MON
- Spent amount for the current day
- Remaining budget for the current day
- Revocation status

## Agent Demo Flow

Before running the demo, register the agent wallet in the Guardian contract and make sure the contract treasury has enough MON.

You can register an agent through the frontend or with the CLI:

```bash
cd x402-server
npm run contract -- register 0xAgentAddress Whiskers cat 0.01
```

Run the x402 payment demo:

```bash
cd x402-server
npm run demo
```

The demo performs this flow:

1. Calls the premium API without payment proof.
2. Receives `402 Payment Required`.
3. Calls `GuardianBudgetManager.executePayment(...)` from the registered agent wallet.
4. Waits for the Monad Testnet transaction.
5. Retries the API request with `X-Payment-Proof: <txHash>`.
6. Receives the premium response if the payment is valid and within budget.

## Contract CLI

The x402 package includes a CLI for reading and writing contract state:

```bash
cd x402-server
npm run contract -- status
npm run contract -- balance
npm run contract -- agents
npm run contract -- agent 0xAgentAddress
npm run contract -- deposit 0.1
npm run contract -- set-limit 0xAgentAddress 0.02
npm run contract -- pay 0xRecipient 0.001 "Premium API Access" --pk=0xAgentPrivateKey
npm run contract -- revoke 0xAgentAddress
npm run contract -- restore 0xAgentAddress
```

The CLI reads configuration from `x402-server/.env`.

## Scripts

### Frontend

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check and build production assets
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

### x402 Server

```bash
npm run server    # Start Express API server
npm run demo      # Run the AI agent x402 payment demo
npm run contract  # Run contract CLI commands
```

### Smart Contracts

```bash
forge build       # Compile contracts
forge test -v     # Run tests
forge fmt         # Format Solidity files
```

## Configuration Reference

| Name | Location | Description |
| --- | --- | --- |
| `GUARDIAN_CONTRACT_ADDRESS` | `x402-server/.env` | Deployed `GuardianBudgetManager` address |
| `PRIVATE_KEY` | `x402-server/.env` or shell | Signer used by demo and write CLI commands |
| `PORT` | `x402-server/.env` | Express server port, defaults to `3001` |
| `RECIPIENT_ADDRESS` | `x402-server/.env` | x402 payment recipient, defaults to the Guardian contract |
| `PAYMENT_AMOUNT_WEI` | `x402-server/.env` | API payment amount in wei |
| `PAYMENT_AMOUNT` | `x402-server/.env` | Agent demo payment amount in MON |
| `VITE_WALLETCONNECT_PROJECT_ID` | `frontend/.env.local` | WalletConnect project ID for RainbowKit |

## Security Notes

- This is a hackathon/demo project. Review and audit contracts before production use.
- Keep private keys out of source control and shell history where possible.
- Use separate deployer, owner, and agent wallets for realistic testing.
- The x402 server stores used payment proofs in memory, so replay protection resets when the server restarts.
- The mock x402 server verifies that a transaction called the Guardian contract, but production payment verification should validate the exact event fields, payer, recipient, amount, and replay state in persistent storage.

## Network

Default network configuration:

- Network: Monad Testnet
- Chain ID: `10143`
- RPC URL: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadscan.com`
- Guardian contract: `0x1e17c67f42211cA93a007a00b82638a572a2ac4F`
- Web App : `https://guardian-pet-ai-agent-budget-manage.vercel.app/`

## License

No license file is currently included. Add a license before publishing or accepting external contributions.
