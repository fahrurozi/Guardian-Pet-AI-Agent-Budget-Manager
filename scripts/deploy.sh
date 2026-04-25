#!/bin/bash
# Guardian Pet — Deploy & Verify on Monad Testnet
# Usage: PRIVATE_KEY=0x... bash scripts/deploy.sh

set -e

CHAIN_ID=10143
RPC_URL="https://testnet-rpc.monad.xyz"
CONTRACT_NAME="GuardianBudgetManager"
CONTRACT_PATH="src/${CONTRACT_NAME}.sol:${CONTRACT_NAME}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Guardian Pet — Deploy to Monad Testnet ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}ERROR: PRIVATE_KEY env var not set${NC}"
    echo "  Export your private key: export PRIVATE_KEY=0x..."
    echo "  Or use agent wallet: PRIVATE_KEY=\$(cast wallet decrypt-keystore --keystore-dir ~/.monskills/keystore \$(ls ~/.monskills/keystore | head -1) --unsafe-password '')"
    exit 1
fi

if ! command -v forge &> /dev/null; then
    echo -e "${RED}ERROR: Foundry not installed.${NC}"
    echo "  Install: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

cd smart-contracts

echo -e "${YELLOW}► Building contracts...${NC}"
forge build

echo -e "${YELLOW}► Running tests...${NC}"
forge test -v

# ── Deploy ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}► Deploying ${CONTRACT_NAME} to Monad Testnet (chainId ${CHAIN_ID})...${NC}"

DEPLOY_OUTPUT=$(forge script script/DeployGuardianBudgetManager.s.sol:DeployGuardianBudgetManager \
    --rpc-url "$RPC_URL" \
    --broadcast \
    --private-key "$PRIVATE_KEY" \
    --gas-limit 3000000 \
    -vvv 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract deployed address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "GuardianBudgetManager deployed at:" | awk '{print $NF}')

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}ERROR: Could not extract contract address from deploy output${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Deployed at: ${CONTRACT_ADDRESS}${NC}"
echo -e "${CYAN}  Explorer: https://testnet.monadscan.com/address/${CONTRACT_ADDRESS}${NC}"
echo ""

# ── Verify on Monad Testnet (Sourcify via BlockVision) ────────────────────────
echo -e "${YELLOW}► Verifying contract on Monad testnet explorer...${NC}"
echo -e "   (uses Sourcify endpoint: https://sourcify-api-monad.blockvision.org/)"

# Primary: forge verify-contract with Sourcify endpoint (configured in foundry.toml)
if forge verify-contract "$CONTRACT_ADDRESS" "$CONTRACT_PATH" \
    --rpc-url "$RPC_URL" \
    --etherscan-api-key placeholder \
    --verifier-url "https://sourcify-api-monad.blockvision.org/" \
    --chain "$CHAIN_ID" \
    --watch 2>&1; then
    echo -e "${GREEN}✓ Contract verified on Sourcify (BlockVision)${NC}"
    echo -e "${CYAN}  MonadScan:    https://testnet.monadscan.com/address/${CONTRACT_ADDRESS}${NC}"
    echo -e "${CYAN}  MonadVision:  https://testnet.monadvision.io/address/${CONTRACT_ADDRESS}${NC}"
    echo -e "${CYAN}  Socialscan:   https://monad-testnet.socialscan.io/address/${CONTRACT_ADDRESS}${NC}"
else
    echo -e "${YELLOW}⚠ Sourcify verification failed — you can verify manually:${NC}"
    echo -e "  1. Run: forge verify-contract ${CONTRACT_ADDRESS} ${CONTRACT_PATH} \\"
    echo -e "             --rpc-url ${RPC_URL} \\"
    echo -e "             --etherscan-api-key placeholder \\"
    echo -e "             --verifier-url 'https://sourcify-api-monad.blockvision.org/' \\"
    echo -e "             --chain ${CHAIN_ID}"
    echo -e "  2. Or use Sourcify UI: https://sourcify.dev/#/verifier"
fi

# ── Write contract address to frontend ────────────────────────────────────────
echo ""
echo -e "${YELLOW}► Writing contract address to frontend...${NC}"

cd ..
CONSTANTS_FILE="frontend/src/lib/constants.ts"

if [ -f "$CONSTANTS_FILE" ]; then
    # Replace the placeholder address
    sed -i "s/GUARDIAN_CONTRACT_ADDRESS = \"0x[^\"]*\"/GUARDIAN_CONTRACT_ADDRESS = \"${CONTRACT_ADDRESS}\"/" "$CONSTANTS_FILE"
    echo -e "${GREEN}✓ Updated ${CONSTANTS_FILE}${NC}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT COMPLETE 🐾                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Contract:    ${CYAN}${CONTRACT_ADDRESS}${NC}"
echo -e "  Explorer:    ${CYAN}https://testnet.monadscan.com/address/${CONTRACT_ADDRESS}${NC}"
echo -e "  Network:     Monad Testnet (chainId ${CHAIN_ID})"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Fund contract: cast send ${CONTRACT_ADDRESS} --value 0.1ether --rpc-url ${RPC_URL} --private-key \$PRIVATE_KEY"
echo -e "  2. Start frontend: cd frontend && npm run dev"
echo -e "  3. Start x402 server: cd x402-server && node server.js"
echo ""
