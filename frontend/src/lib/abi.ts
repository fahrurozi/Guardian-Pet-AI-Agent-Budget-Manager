export const GUARDIAN_ABI = [
  // ── Write ──────────────────────────────────────────────────────────────────
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
  // ── Read ───────────────────────────────────────────────────────────────────
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
    name: "getAgentList",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getContractBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "by", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "petEmoji", type: "string", indexed: false },
      { name: "dailyLimit", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DailyLimitSet",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "newLimit", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PaymentExecuted",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LimitExceeded",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "attempted", type: "uint256", indexed: false },
      { name: "remaining", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentRevoked",
    inputs: [{ name: "agent", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "AgentRestored",
    inputs: [{ name: "agent", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "DailySpendReset",
    inputs: [{ name: "agent", type: "address", indexed: true }],
  },
] as const;
