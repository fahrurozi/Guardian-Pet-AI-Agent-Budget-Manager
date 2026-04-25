# 🐾 Guardian Pet — Hackathon Demo Guide

## TL;DR
On-chain spending firewall for AI agents on Monad. Each "pet" = one agent wallet with a daily MON budget enforced by smart contract. No agent can bypass it — not even the owner.

---

## Live Demo Flow (16 minutes)

### Phase 1 — Deploy (Jam 0–4)

```bash
# 1. Fund your deployer wallet via Monad testnet faucet:
#    https://testnet.monad.xyz/faucet  OR  https://faucet.monad.xyz

# 2. Deploy + verify contract
export PRIVATE_KEY=0x<your-deployer-private-key>
bash scripts/deploy.sh

# 3. Contract address is printed and auto-written to frontend/src/lib/constants.ts
# 4. Verify on explorer:
#    https://testnet.monadscan.com/address/<CONTRACT_ADDRESS>
```

### Phase 2 — x402 Flow (Jam 4–8)

```bash
# Start the mock API server
cd x402-server && npm install && node server.js

# In another terminal — run the AI agent demo
export PRIVATE_KEY=0x<agent-wallet-private-key>
export GUARDIAN_CONTRACT_ADDRESS=<deployed-contract-address>
node x402-server/agent-demo.mjs
```

**What happens:**
1. Agent tries to call `/api/premium-data` → gets 402 Payment Required
2. Agent calls `executePayment()` on GuardianBudgetManager
3. Contract checks daily limit → approves or reverts
4. Agent retries with `X-Payment-Proof: <txHash>` → gets data
5. Every payment is verifiable on [Monad Testnet Explorer](https://testnet.monadscan.com)

### Phase 3 — UI Dashboard (Jam 8–12)

```bash
# Start frontend
cd frontend && npm run dev
# Open http://localhost:5173
```

**UI demo flow:**
1. Connect MetaMask (Monad Testnet — chainId 10143)
2. Deposit MON to contract (💰 button)
3. Add Pet → register agent wallet with daily limit
4. Watch live event feed as agent makes payments
5. Demonstrate limit enforcement: agent tries to exceed → blocked
6. Owner raises limit → agent succeeds
7. Revoke agent → instant access revocation

### Phase 4 — Polish (Jam 12–16)

```bash
# Deploy frontend to Vercel (no CLI needed)
cd frontend && git add -A && git commit -m "guardian pet frontend"
bash ../.agents/skills/monskill/vercel-deploy/deploy.sh ./
```

---

## Smart Contract

**File:** [smart-contracts/src/GuardianBudgetManager.sol](smart-contracts/src/GuardianBudgetManager.sol)

| Function | Who | What |
|----------|-----|------|
| `deposit()` | Owner | Fund the contract with MON |
| `registerAgent(addr, name, emoji, limit)` | Owner | Register new pet/agent |
| `setDailyLimit(agent, amount)` | Owner | Change daily budget |
| `executePayment(to, amount, reason)` | Agent | **Only way agent can transfer** |
| `revokeAgent(agent)` | Owner | Instantly cut agent access |
| `restoreAgent(agent)` | Owner | Restore revoked agent |
| `resetDailySpend(agent)` | Owner | Manual reset of daily counter |
| `getAgent(addr)` | Anyone | Read agent state + remaining budget |
| `getAgentList()` | Anyone | All registered agents |

**Events (visible in live feed + explorer):**
- `PaymentExecuted` — successful payment
- `LimitExceeded` — blocked payment (amount, remaining shown)
- `AgentRegistered` — new pet born
- `DailyLimitSet` — limit changed
- `AgentRevoked` / `AgentRestored`
- `Deposited`
- `DailySpendReset`

### Run tests

```bash
cd smart-contracts && forge test -v
```

---

## Why Monad?

- **Parallel execution** — 5 agents paying simultaneously has zero bottleneck. Monad handles it.
- **400ms block time** — payment confirmed before the API even times out.
- **10,000 TPS** — scales to enterprise multi-agent deployments.
- **EVM-identical** — standard Solidity, no new tooling.
- **`eth_sendRawTransactionSync`** — agent gets receipt in one call (ultra-fast UX).

---

## x402 Protocol

[x402](https://x402.org) is an emerging standard for HTTP-native micropayments:
- API returns `402 Payment Required` with payment info in JSON
- Client pays via smart contract → gets tx hash
- Client retries with `X-Payment-Proof: <txHash>` header
- Server verifies on-chain → returns data

Guardian Pet is a perfect x402 enforcement layer: the contract acts as the trustless gatekeeper for every API call an agent makes.

---

## Architecture

```
Owner (UI/MetaMask)
      │
      ├── deposit()           → funds contract treasury
      ├── registerAgent()     → creates pet with daily limit  
      └── setDailyLimit()     → adjusts budget on-chain

AI Agent Wallet
      │
      └── executePayment()    → only way to transfer MON
                │
                └── GuardianBudgetManager.sol
                          │
                          ├── daily limit check (auto-resets 24h)
                          ├── emits PaymentExecuted ✓  OR  LimitExceeded ✗
                          └── direct transfer to recipient (real MON on Monad testnet)

x402 Server
      │
      ├── GET /api/premium-data    → 402 (no proof)
      ├── GET /api/premium-data    → 200 (with valid txHash proof)
      └── GET /api/agent-status    → read agent budget from chain

Frontend (React + wagmi)
      │
      ├── PetCard          → live budget bar per agent
      ├── TxFeed           → real-time contract events
      ├── AddPetModal      → register agent via wallet
      ├── DepositModal     → fund the contract
      └── SetLimitModal    → adjust daily budget
```

---

## Addresses

After deployment, update these:
- Contract: `frontend/src/lib/constants.ts` → `GUARDIAN_CONTRACT_ADDRESS`
- x402 server: `GUARDIAN_CONTRACT_ADDRESS` env var
- Agent demo: `GUARDIAN_CONTRACT_ADDRESS` env var

---

## Testnet Explorer

All transactions are publicly verifiable:
- **MonadScan:** https://testnet.monadscan.com
- **MonadVision:** https://testnet.monadvision.io
- **Socialscan:** https://monad-testnet.socialscan.io
