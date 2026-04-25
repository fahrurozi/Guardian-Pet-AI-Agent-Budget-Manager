import "dotenv/config";

/**
 * Guardian Pet — x402 Mock API Server
 *
 * Simulates a premium API service that requires payment (HTTP 402).
 * Flow:
 *   1. Agent GETs /api/premium-data  → 402 with payment info headers
 *   2. Agent calls GuardianBudgetManager.executePayment() on-chain
 *   3. Agent GETs /api/premium-data with X-Payment-Proof: <txHash>
 *   4. Server verifies tx on Monad testnet → returns data
 */

import express from "express";
import { createPublicClient, http, parseAbiItem } from "viem";
import { monadTestnet } from "viem/chains";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const GUARDIAN_ADDRESS = process.env.GUARDIAN_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const PAYMENT_AMOUNT_WEI = BigInt(process.env.PAYMENT_AMOUNT_WEI || "1000000000000000"); // 0.001 MON
const PAYMENT_AMOUNT_MON = Number(PAYMENT_AMOUNT_WEI) / 1e18;

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http("https://testnet-rpc.monad.xyz"),
});

// Track used payment proofs (prevent replay)
const usedProofs = new Set();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Payment-Proof, X-Agent-Address");
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Guardian Pet x402 Server",
    guardianContract: GUARDIAN_ADDRESS,
    paymentAmount: `${PAYMENT_AMOUNT_MON} MON`,
    network: "Monad Testnet (chainId 10143)",
  });
});

// ── Premium API endpoint ───────────────────────────────────────────────────────
app.get("/api/premium-data", async (req, res) => {
  const paymentProof = req.headers["x-payment-proof"];
  const agentAddress = req.headers["x-agent-address"];

  // No payment proof → return 402 with payment instructions
  if (!paymentProof) {
    return res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires payment via Guardian Pet smart contract.",
      payment: {
        contract: GUARDIAN_ADDRESS,
        network: "Monad Testnet",
        chainId: 10143,
        amount: PAYMENT_AMOUNT_MON.toString(),
        token: "MON (native)",
        recipient: process.env.RECIPIENT_ADDRESS || GUARDIAN_ADDRESS,
        reason: "Guardian Pet Premium API Access",
        instructions: [
          "1. Call GuardianBudgetManager.executePayment(recipientAddress, amount, reason)",
          "2. Get the transaction hash",
          "3. Retry this request with header: X-Payment-Proof: <txHash>",
          "4. Also include: X-Agent-Address: <your-agent-wallet-address>",
        ],
      },
    });
  }

  // Validate tx hash format
  if (!/^0x[0-9a-fA-F]{64}$/.test(paymentProof)) {
    return res.status(400).json({ error: "Invalid payment proof format (expected 0x...txHash)" });
  }

  // Prevent replay
  if (usedProofs.has(paymentProof)) {
    return res.status(402).json({ error: "Payment proof already used" });
  }

  try {
    console.log(`[x402] Verifying payment proof: ${paymentProof}`);

    // Fetch the tx receipt from Monad testnet
    const receipt = await publicClient.getTransactionReceipt({ hash: paymentProof });

    if (!receipt || receipt.status !== "success") {
      return res.status(402).json({ error: "Transaction not confirmed or failed" });
    }

    // Verify the tx was sent TO our Guardian contract
    const tx = await publicClient.getTransaction({ hash: paymentProof });

    if (tx.to?.toLowerCase() !== GUARDIAN_ADDRESS.toLowerCase()) {
      return res.status(402).json({
        error: `Transaction must call Guardian contract at ${GUARDIAN_ADDRESS}`,
        actual: tx.to,
      });
    }

    // Parse PaymentExecuted event from logs
    const paymentLog = receipt.logs.find((log) =>
      log.address.toLowerCase() === GUARDIAN_ADDRESS.toLowerCase()
    );

    if (!paymentLog) {
      return res.status(402).json({ error: "No Guardian payment event found in transaction" });
    }

    // Mark as used
    usedProofs.add(paymentProof);

    console.log(`[x402] ✓ Payment verified! TxHash: ${paymentProof}`);
    console.log(`[x402]   Agent: ${agentAddress || "unknown"}`);
    console.log(`[x402]   Block: ${receipt.blockNumber}`);

    // Return the premium data
    return res.json({
      success: true,
      message: "Payment verified! Here is your premium data.",
      payment: {
        txHash: paymentProof,
        blockNumber: receipt.blockNumber.toString(),
        explorer: `https://testnet.monadscan.com/tx/${paymentProof}`,
      },
      data: {
        timestamp: new Date().toISOString(),
        monadBlockHeight: receipt.blockNumber.toString(),
        premiumInsight: "Monad processes 10,000 TPS with 400ms block time — ideal for high-frequency AI agent payments.",
        agentBudgetStatus: "Payment executed successfully within daily limit enforced by Guardian Pet.",
        secret: "The Guardian Pet contract ensures your AI agents never overspend. 🐾",
      },
    });
  } catch (err) {
    console.error("[x402] Verification error:", err.message);
    return res.status(500).json({ error: "Failed to verify payment on-chain", details: err.message });
  }
});

// ── Status endpoint (for agent to check its own limit) ────────────────────────
app.get("/api/agent-status", async (req, res) => {
  const agentAddress = req.headers["x-agent-address"];
  if (!agentAddress) return res.status(400).json({ error: "X-Agent-Address header required" });

  try {
    const data = await publicClient.readContract({
      address: GUARDIAN_ADDRESS,
      abi: [
        parseAbiItem(
          "function getAgent(address) view returns (string, string, uint256, uint256, uint256, bool, bool, uint256)"
        ),
      ],
      functionName: "getAgent",
      args: [agentAddress],
    });

    const [name, petEmoji, dailyLimit, spentToday, , , isRevoked, remainingToday] = data;

    return res.json({
      agent: agentAddress,
      name,
      petEmoji,
      dailyLimitMon: (Number(dailyLimit) / 1e18).toFixed(6),
      spentTodayMon: (Number(spentToday) / 1e18).toFixed(6),
      remainingTodayMon: (Number(remainingToday) / 1e18).toFixed(6),
      isRevoked,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🐾 Guardian Pet x402 Server running on http://localhost:${PORT}`);
  console.log(`   Guardian Contract: ${GUARDIAN_ADDRESS}`);
  console.log(`   Payment required:  ${PAYMENT_AMOUNT_MON} MON per request`);
  console.log(`   Network:           Monad Testnet (chainId 10143)`);
  console.log(`\n   Endpoints:`);
  console.log(`   GET  /health             — server status`);
  console.log(`   GET  /api/premium-data   — returns 402 without payment, 200 with valid proof`);
  console.log(`   GET  /api/agent-status   — check agent budget (X-Agent-Address header)`);
  console.log(`\n   Run the demo agent: node agent-demo.mjs\n`);
});
