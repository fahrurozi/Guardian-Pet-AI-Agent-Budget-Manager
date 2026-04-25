// ── Contract ──────────────────────────────────────────────────────────────────
// Updated automatically by scripts/deploy.sh after deployment
export const GUARDIAN_CONTRACT_ADDRESS = "0x1e17c67f42211cA93a007a00b82638a572a2ac4F" as `0x${string}`;

// ── Monad Testnet ─────────────────────────────────────────────────────────────
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz";
export const MONAD_TESTNET_EXPLORER = "https://testnet.monadscan.com";
export const MONAD_TESTNET_EXPLORER_ALT = "https://testnet.monadvision.io";

// ── Pet emojis for new pet picker ─────────────────────────────────────────────
export const PET_EMOJIS = ["🐱", "🐶", "🦊", "🐸", "🦜", "🐼", "🐨", "🐯", "🦁", "🐺"];

// ── Default daily limit (0.01 MON) ───────────────────────────────────────────
export const DEFAULT_DAILY_LIMIT_MON = "0.01";

// ── Explorer tx link helper ───────────────────────────────────────────────────
export const txLink = (hash: string) => `${MONAD_TESTNET_EXPLORER}/tx/${hash}`;
export const addrLink = (addr: string) => `${MONAD_TESTNET_EXPLORER}/address/${addr}`;
