/**
 * Guardian Pet — AI Agent Demo (x402 Payment Flow)
 *
 * This script simulates an AI agent that:
 *   1. Tries to call a premium API endpoint
 *   2. Gets a 402 Payment Required response
 *   3. Calls GuardianBudgetManager.executePayment() on Monad testnet
 *   4. Retries the API with the tx hash as payment proof
 *   5. Receives the premium data
 *
 * Usage:
 *   PRIVATE_KEY=0x... GUARDIAN_CONTRACT=0x... node agent-demo.mjs
 */

import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

// ── Config ────────────────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const GUARDIAN_CONTRACT = process.env.GUARDIAN_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const X402_SERVER = process.env.X402_SERVER || "http://localhost:3001";
const PAYMENT_RECIPIENT = process.env.PAYMENT_RECIPIENT || GUARDIAN_CONTRACT; // for demo, pay back to contract treasury
const PAYMENT_AMOUNT_MON = process.env.PAYMENT_AMOUNT || "0.001";

if (!PRIVATE_KEY) {
  console.error("ERROR: Set PRIVATE_KEY env var to your agent wallet private key");
  console.error("  export PRIVATE_KEY=0x...");
  process.exit(1);
}

if (GUARDIAN_CONTRACT === "0x0000000000000000000000000000000000000000") {
  console.error("ERROR: Set GUARDIAN_CONTRACT_ADDRESS env var");
  console.error("  export GUARDIAN_CONTRACT_ADDRESS=0x...");
  process.exit(1);
}

// ── Clients ────────────────────────────────────────────────────────────────────
const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http("https://testnet-rpc.monad.xyz"),
});

const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http("https://testnet-rpc.monad.xyz"),
});

// ── Guardian ABI (executePayment only) ────────────────────────────────────────
const EXECUTE_PAYMENT_ABI = [
  {
    type: "function",
    name: "executePayment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function runAgentDemo() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║     Guardian Pet — AI Agent x402 Demo               ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  log("🤖", `Agent wallet:      ${account.address}`);
  log("📋", `Guardian contract: ${GUARDIAN_CONTRACT}`);
  log("💰", `Payment amount:    ${PAYMENT_AMOUNT_MON} MON per request`);
  log("🌐", `x402 server:       ${X402_SERVER}`);
  console.log();

  // ── Step 1: Check agent budget status ────────────────────────────────────────
  log("📊", "Checking agent budget status...");
  try {
    const statusRes = await fetch(`${X402_SERVER}/api/agent-status`, {
      headers: { "X-Agent-Address": account.address },
    });
    if (statusRes.ok) {
      const status = await statusRes.json();
      log("✓", `Pet: ${status.petEmoji} ${status.name}`);
      log("✓", `Daily limit:   ${status.dailyLimitMon} MON`);
      log("✓", `Spent today:   ${status.spentTodayMon} MON`);
      log("✓", `Remaining:     ${status.remainingTodayMon} MON`);
      if (status.isRevoked) {
        log("🚫", "Agent is REVOKED — cannot make payments");
        return;
      }
    }
  } catch (_) {
    log("⚠", "Could not reach x402 server — make sure it's running");
  }
  console.log();

  // ── Step 2: First request (no payment) → expect 402 ──────────────────────────
  log("🔍", "Step 1: Requesting premium data (no payment)...");
  const res402 = await fetch(`${X402_SERVER}/api/premium-data`, {
    headers: { "X-Agent-Address": account.address },
  });

  if (res402.status !== 402) {
    log("❌", `Expected 402, got ${res402.status}`);
    return;
  }

  const paymentInfo = await res402.json();
  log("⚡", `Got 402 Payment Required!`);
  log("📋", `  Contract:  ${paymentInfo.payment?.contract}`);
  log("💰", `  Amount:    ${paymentInfo.payment?.amount} MON`);
  log("🎯", `  Reason:    ${paymentInfo.payment?.reason}`);
  console.log();

  // ── Step 3: Execute payment via Guardian contract ─────────────────────────────
  log("🔒", "Step 2: Calling GuardianBudgetManager.executePayment()...");
  log("   ", "  (Contract will enforce daily limit on-chain)");

  let txHash;
  try {
    const callData = encodeFunctionData({
      abi: EXECUTE_PAYMENT_ABI,
      functionName: "executePayment",
      args: [
        PAYMENT_RECIPIENT,
        parseEther(PAYMENT_AMOUNT_MON),
        "Guardian Pet Premium API Access",
      ],
    });

    txHash = await walletClient.sendTransaction({
      to: GUARDIAN_CONTRACT,
      data: callData,
      gas: 200000n,
    });

    log("⏳", `Tx submitted: ${txHash}`);
    log("   ", `  Explorer: https://testnet.monadscan.com/tx/${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      log("❌", "Transaction failed (likely daily limit exceeded)");
      log("🚨", "Guardian Pet protected you from overspending!");
      return;
    }

    log("✅", `Transaction confirmed in block ${receipt.blockNumber}!`);
  } catch (err) {
    if (err.message?.includes("Daily limit exceeded")) {
      log("🚫", "BLOCKED! Guardian Pet enforced daily limit on-chain.");
      log("🐾", "Your AI agent tried to overspend but was stopped by the firewall.");
    } else {
      log("❌", `Transaction error: ${err.message}`);
    }
    return;
  }
  console.log();

  // ── Step 4: Retry with payment proof ─────────────────────────────────────────
  log("🔑", "Step 3: Retrying API with payment proof...");
  await sleep(1000); // brief pause for indexing

  const res200 = await fetch(`${X402_SERVER}/api/premium-data`, {
    headers: {
      "X-Payment-Proof": txHash,
      "X-Agent-Address": account.address,
    },
  });

  if (!res200.ok) {
    const err = await res200.json();
    log("❌", `API rejected payment: ${err.error}`);
    return;
  }

  const premiumData = await res200.json();

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║              PREMIUM DATA UNLOCKED 🎉               ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  log("📦", `Insight: ${premiumData.data?.premiumInsight}`);
  log("🐾", `Status:  ${premiumData.data?.agentBudgetStatus}`);
  log("🔗", `Proof:   https://testnet.monadscan.com/tx/${premiumData.payment?.txHash}`);
  log("📊", `Block:   ${premiumData.payment?.blockNumber}`);

  console.log("\n✨ x402 payment flow complete!");
  console.log("   The Guardian Pet contract enforced the budget — trustlessly, on Monad.\n");
}

runAgentDemo().catch(console.error);
