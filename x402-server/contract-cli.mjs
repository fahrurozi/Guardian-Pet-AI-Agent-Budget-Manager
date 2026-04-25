import "dotenv/config";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const RPC_URL = process.env.RPC_URL || "https://testnet-rpc.monad.xyz";
const CONTRACT_ADDRESS = process.env.GUARDIAN_CONTRACT_ADDRESS;
const DEFAULT_PRIVATE_KEY = process.env.PRIVATE_KEY;

const abi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getContractBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getAgentList",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "petEmoji", type: "string" },
      { name: "dailyLimit", type: "uint256" },
      { name: "spentToday", type: "uint256" },
      { name: "lastResetTimestamp", type: "uint256" },
      { name: "isRegistered", type: "bool" },
      { name: "isRevoked", type: "bool" },
      { name: "remainingToday", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "name", type: "string" },
      { name: "petEmoji", type: "string" },
      { name: "dailyLimit", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setDailyLimit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
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
  {
    type: "function",
    name: "revokeAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "restoreAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resetDailySpend",
    stateMutability: "nonpayable",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawAll",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
];

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL),
});

function usage() {
  console.log(`
GuardianBudgetManager onchain test CLI

Config from x402-server/.env:
  GUARDIAN_CONTRACT_ADDRESS=0x...
  PRIVATE_KEY=0x...              # signer for send commands
  RPC_URL=https://testnet-rpc.monad.xyz optional

Usage:
  node contract-cli.mjs status
  node contract-cli.mjs owner
  node contract-cli.mjs balance
  node contract-cli.mjs agents
  node contract-cli.mjs agent <agentAddress>

  node contract-cli.mjs deposit <amountMON>
  node contract-cli.mjs register <agentAddress> <name> <petEmoji> <dailyLimitMON>
  node contract-cli.mjs set-limit <agentAddress> <dailyLimitMON>
  node contract-cli.mjs pay <recipientAddress> <amountMON> [reason]
  node contract-cli.mjs revoke <agentAddress>
  node contract-cli.mjs restore <agentAddress>
  node contract-cli.mjs reset-spend <agentAddress>
  node contract-cli.mjs withdraw <amountMON>
  node contract-cli.mjs withdraw-all
  node contract-cli.mjs transfer-owner <newOwnerAddress>

Options:
  --pk=0x...       override PRIVATE_KEY for this command
  --gas=250000     override gas limit

Examples:
  node contract-cli.mjs register 0xAgent Whiskers cat 0.1
  node contract-cli.mjs deposit 1
  node contract-cli.mjs pay 0xRecipient 0.001 "Premium API Access" --pk=0xAGENT_PRIVATE_KEY
`);
}

function requireContract() {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Set GUARDIAN_CONTRACT_ADDRESS in .env");
  }
}

function getOption(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

function argsWithoutOptions() {
  return process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
}

function getWalletClient() {
  const privateKey = getOption("pk") || DEFAULT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Set PRIVATE_KEY in .env or pass --pk=0x...");
  }

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(RPC_URL),
  });

  return { account, walletClient };
}

function parseMon(value, label) {
  if (!value) throw new Error(`Missing ${label}`);
  return parseEther(value);
}

function parseGas(defaultGas) {
  const gas = getOption("gas");
  return gas ? BigInt(gas) : BigInt(defaultGas);
}

function printTx(hash) {
  console.log(`Tx: ${hash}`);
  console.log(`Explorer: https://testnet.monadscan.com/tx/${hash}`);
}

async function wait(hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Status: ${receipt.status}`);
  console.log(`Block: ${receipt.blockNumber}`);
}

async function write(functionName, args = [], options = {}) {
  requireContract();
  const { account, walletClient } = getWalletClient();
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName,
    args,
    account,
    value: options.value || 0n,
    gas: parseGas(options.gas || 250000),
  });
  printTx(hash);
  await wait(hash);
}

function formatAgent(data) {
  const [
    name,
    petEmoji,
    dailyLimit,
    spentToday,
    lastResetTimestamp,
    isRegistered,
    isRevoked,
    remainingToday,
  ] = data;

  return {
    name,
    petEmoji,
    dailyLimitMON: formatEther(dailyLimit),
    spentTodayMON: formatEther(spentToday),
    lastResetTimestamp: lastResetTimestamp.toString(),
    isRegistered,
    isRevoked,
    remainingTodayMON: formatEther(remainingToday),
  };
}

async function main() {
  const [command, ...args] = argsWithoutOptions();
  if (!command || command === "help" || command === "--help") {
    usage();
    return;
  }

  requireContract();

  switch (command) {
    case "status": {
      const [owner, balance, agents] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "owner" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "getContractBalance" }),
        publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "getAgentList" }),
      ]);
      console.log({
        contract: CONTRACT_ADDRESS,
        owner,
        balanceMON: formatEther(balance),
        agentCount: agents.length,
        agents,
      });
      break;
    }
    case "owner": {
      const owner = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "owner",
      });
      console.log(owner);
      break;
    }
    case "balance": {
      const balance = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "getContractBalance",
      });
      console.log(`${formatEther(balance)} MON`);
      break;
    }
    case "agents": {
      const agents = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "getAgentList",
      });
      console.log(agents);
      break;
    }
    case "agent": {
      const [agent] = args;
      if (!agent) throw new Error("Usage: node contract-cli.mjs agent <agentAddress>");
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "getAgent",
        args: [agent],
      });
      console.log(formatAgent(data));
      break;
    }
    case "deposit": {
      const [amount] = args;
      await write("deposit", [], { value: parseMon(amount, "amountMON"), gas: 70000 });
      break;
    }
    case "register": {
      const [agent, name, petEmoji, dailyLimit] = args;
      if (!agent || !name || !petEmoji || !dailyLimit) {
        throw new Error("Usage: node contract-cli.mjs register <agentAddress> <name> <petEmoji> <dailyLimitMON>");
      }
      await write("registerAgent", [agent, name, petEmoji, parseMon(dailyLimit, "dailyLimitMON")], {
        gas: 300000,
      });
      break;
    }
    case "set-limit": {
      const [agent, dailyLimit] = args;
      if (!agent || !dailyLimit) {
        throw new Error("Usage: node contract-cli.mjs set-limit <agentAddress> <dailyLimitMON>");
      }
      await write("setDailyLimit", [agent, parseMon(dailyLimit, "dailyLimitMON")], { gas: 100000 });
      break;
    }
    case "pay": {
      const [recipient, amount, ...reasonParts] = args;
      if (!recipient || !amount) {
        throw new Error("Usage: node contract-cli.mjs pay <recipientAddress> <amountMON> [reason]");
      }
      const reason = reasonParts.join(" ") || "Manual onchain test payment";
      await write("executePayment", [recipient, parseMon(amount, "amountMON"), reason], { gas: 250000 });
      break;
    }
    case "revoke": {
      const [agent] = args;
      if (!agent) throw new Error("Usage: node contract-cli.mjs revoke <agentAddress>");
      await write("revokeAgent", [agent], { gas: 100000 });
      break;
    }
    case "restore": {
      const [agent] = args;
      if (!agent) throw new Error("Usage: node contract-cli.mjs restore <agentAddress>");
      await write("restoreAgent", [agent], { gas: 100000 });
      break;
    }
    case "reset-spend": {
      const [agent] = args;
      if (!agent) throw new Error("Usage: node contract-cli.mjs reset-spend <agentAddress>");
      await write("resetDailySpend", [agent], { gas: 100000 });
      break;
    }
    case "withdraw": {
      const [amount] = args;
      await write("withdraw", [parseMon(amount, "amountMON")], { gas: 120000 });
      break;
    }
    case "withdraw-all": {
      await write("withdrawAll", [], { gas: 120000 });
      break;
    }
    case "transfer-owner": {
      const [newOwner] = args;
      if (!newOwner) throw new Error("Usage: node contract-cli.mjs transfer-owner <newOwnerAddress>");
      await write("transferOwnership", [newOwner], { gas: 100000 });
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.shortMessage || error.message}`);
  process.exit(1);
});
