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

# ── Get verification data ─────────────────────────────────────────────────────
echo -e "${YELLOW}► Preparing verification data...${NC}"

forge verify-contract "$CONTRACT_ADDRESS" "$CONTRACT_PATH" \
    --chain "$CHAIN_ID" \
    --show-standard-json-input > /tmp/guardian-standard-input.json

COMPILER_VERSION=$(cat out/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json | grep -o '"solcVersion":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$COMPILER_VERSION" ]; then
    COMPILER_VERSION="v0.8.28+commit.7893614a"
fi

cat out/${CONTRACT_NAME}.sol/${CONTRACT_NAME}.json | python3 -c "
import json,sys
data = json.load(sys.stdin)
print(json.dumps(data.get('metadata', {})))
" > /tmp/guardian-metadata.json

# ── Verify on all explorers ───────────────────────────────────────────────────
echo -e "${YELLOW}► Verifying on all Monad explorers...${NC}"

STANDARD_INPUT=$(cat /tmp/guardian-standard-input.json)
FOUNDRY_METADATA=$(cat /tmp/guardian-metadata.json)

VERIFY_PAYLOAD=$(cat << EOF
{
  "chainId": ${CHAIN_ID},
  "contractAddress": "${CONTRACT_ADDRESS}",
  "contractName": "${CONTRACT_PATH}",
  "compilerVersion": "${COMPILER_VERSION}",
  "standardJsonInput": ${STANDARD_INPUT},
  "foundryMetadata": ${FOUNDRY_METADATA}
}
EOF
)

echo "$VERIFY_PAYLOAD" > /tmp/guardian-verify.json

VERIFY_RESPONSE=$(curl -s -X POST https://agents.devnads.com/v1/verify \
    -H "Content-Type: application/json" \
    -d @/tmp/guardian-verify.json)

echo "Verification response: $VERIFY_RESPONSE"

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
