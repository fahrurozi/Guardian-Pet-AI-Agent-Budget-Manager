import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatEther, parseAbiItem, parseEventLogs } from "viem";
import { GUARDIAN_ABI } from "../lib/abi";
import { GUARDIAN_CONTRACT_ADDRESS, txLink } from "../lib/constants";

type FeedEvent = {
  id: string;
  type:
    | "PaymentExecuted"
    | "LimitExceeded"
    | "AgentRegistered"
    | "AgentRevoked"
    | "AgentRestored"
    | "Deposited"
    | "DailySpendReset"
    | "DailyLimitSet"
    | "Withdrawn";
  label: string;
  detail: string;
  txHash: string;
  timestamp: number;
  color: string;
};

const MAX_EVENTS = 30;
const HISTORY_BLOCKS = 300n;

type DecodedLog = {
  eventName: string;
  args: Record<string, unknown>;
  transactionHash?: string;
  logIndex?: number;
};

function parsedLogToEvent(log: DecodedLog): FeedEvent | null {
  const txHash = log.transactionHash ?? "";
  const id = txHash + (log.logIndex ?? 0);
  const args = log.args;

  switch (log.eventName) {
    case "PaymentExecuted":
      return {
        id, type: "PaymentExecuted",
        label: "💸 Payment",
        detail: `${String(args.agent ?? "").slice(0, 6)}…→ ${String(args.to ?? "").slice(0, 6)}… · ${parseFloat(formatEther((args.amount ?? 0n) as bigint)).toFixed(4)} MON · "${args.reason}"`,
        txHash, timestamp: 0, color: "event-payment",
      };
    case "LimitExceeded":
      return {
        id, type: "LimitExceeded",
        label: "🚨 Limit Exceeded",
        detail: `${String(args.agent ?? "").slice(0, 6)}… tried ${parseFloat(formatEther((args.attempted ?? 0n) as bigint)).toFixed(4)} MON · ${parseFloat(formatEther((args.remaining ?? 0n) as bigint)).toFixed(4)} remaining`,
        txHash, timestamp: 0, color: "event-limit",
      };
    case "AgentRegistered":
      return {
        id, type: "AgentRegistered",
        label: `${args.petEmoji ?? "🐾"} New Pet`,
        detail: `"${args.name}" registered · ${parseFloat(formatEther((args.dailyLimit ?? 0n) as bigint)).toFixed(4)} MON/day`,
        txHash, timestamp: 0, color: "event-register",
      };
    case "Deposited":
      return {
        id, type: "Deposited",
        label: "💰 Deposit",
        detail: `${String(args.by ?? "").slice(0, 6)}… deposited ${parseFloat(formatEther((args.amount ?? 0n) as bigint)).toFixed(4)} MON`,
        txHash, timestamp: 0, color: "event-deposit",
      };
    case "AgentRevoked":
      return {
        id, type: "AgentRevoked",
        label: "🚫 Revoked",
        detail: `Agent ${String(args.agent ?? "").slice(0, 6)}… access revoked`,
        txHash, timestamp: 0, color: "event-revoke",
      };
    case "AgentRestored":
      return {
        id, type: "AgentRestored",
        label: "✅ Restored",
        detail: `Agent ${String(args.agent ?? "").slice(0, 6)}… access restored`,
        txHash, timestamp: 0, color: "event-register",
      };
    case "DailyLimitSet":
      return {
        id, type: "DailyLimitSet",
        label: "⚙️ Limit Updated",
        detail: `${String(args.agent ?? "").slice(0, 6)}… → ${parseFloat(formatEther((args.newLimit ?? 0n) as bigint)).toFixed(4)} MON/day`,
        txHash, timestamp: 0, color: "event-deposit",
      };
    case "DailySpendReset":
      return {
        id, type: "DailySpendReset",
        label: "🔄 Spend Reset",
        detail: `Daily spend reset for ${String(args.agent ?? "").slice(0, 6)}…`,
        txHash, timestamp: 0, color: "event-register",
      };
    case "Withdrawn":
      return {
        id, type: "Withdrawn",
        label: "↩️ Withdrawn",
        detail: `Owner withdrew ${parseFloat(formatEther((args.amount ?? 0n) as bigint)).toFixed(4)} MON`,
        txHash, timestamp: 0, color: "event-deposit",
      };
    default:
      return null;
  }
}

export default function TxFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const publicClient = usePublicClient();

  // Load historical events on mount
  useEffect(() => {
    if (!publicClient || GUARDIAN_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setIsLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > HISTORY_BLOCKS ? latestBlock - HISTORY_BLOCKS : 0n;

        const logs = await publicClient.getLogs({
          address: GUARDIAN_CONTRACT_ADDRESS,
          fromBlock,
          toBlock: latestBlock,
        });

        const parsed = parseEventLogs({ abi: GUARDIAN_ABI, logs }) as DecodedLog[];

        const historicEvents: FeedEvent[] = parsed
          .reverse()
          .slice(0, MAX_EVENTS)
          .map(parsedLogToEvent)
          .filter((e): e is FeedEvent => e !== null);

        setEvents(historicEvents);
      } catch (err) {
        console.error("[TxFeed] Failed to load history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [publicClient]);

  // Watch for live events
  useEffect(() => {
    if (!publicClient || GUARDIAN_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000")
      return;

    const addEvent = (ev: FeedEvent) => {
      setEvents((prev) => [ev, ...prev].slice(0, MAX_EVENTS));
    };

    const unsubPayment = publicClient.watchContractEvent({
      address: GUARDIAN_CONTRACT_ADDRESS,
      abi: [
        parseAbiItem(
          "event PaymentExecuted(address indexed agent, address indexed to, uint256 amount, string reason)"
        ),
      ],
      eventName: "PaymentExecuted",
      onLogs: (logs) => {
        logs.forEach((log) => {
          const args = log.args as { agent: string; to: string; amount: bigint; reason: string };
          addEvent({
            id: log.transactionHash + log.logIndex,
            type: "PaymentExecuted",
            label: "💸 Payment",
            detail: `${args.agent?.slice(0, 6)}…→ ${args.to?.slice(0, 6)}… · ${parseFloat(formatEther(args.amount ?? 0n)).toFixed(4)} MON · "${args.reason}"`,
            txHash: log.transactionHash ?? "",
            timestamp: Date.now(),
            color: "event-payment",
          });
        });
      },
    });

    const unsubLimit = publicClient.watchContractEvent({
      address: GUARDIAN_CONTRACT_ADDRESS,
      abi: [
        parseAbiItem(
          "event LimitExceeded(address indexed agent, uint256 attempted, uint256 remaining)"
        ),
      ],
      eventName: "LimitExceeded",
      onLogs: (logs) => {
        logs.forEach((log) => {
          const args = log.args as { agent: string; attempted: bigint; remaining: bigint };
          addEvent({
            id: log.transactionHash + log.logIndex,
            type: "LimitExceeded",
            label: "🚨 Limit Exceeded",
            detail: `${args.agent?.slice(0, 6)}… tried ${parseFloat(formatEther(args.attempted ?? 0n)).toFixed(4)} MON · ${parseFloat(formatEther(args.remaining ?? 0n)).toFixed(4)} remaining`,
            txHash: log.transactionHash ?? "",
            timestamp: Date.now(),
            color: "event-limit",
          });
        });
      },
    });

    const unsubRegister = publicClient.watchContractEvent({
      address: GUARDIAN_CONTRACT_ADDRESS,
      abi: [
        parseAbiItem(
          "event AgentRegistered(address indexed agent, string name, string petEmoji, uint256 dailyLimit)"
        ),
      ],
      eventName: "AgentRegistered",
      onLogs: (logs) => {
        logs.forEach((log) => {
          const args = log.args as { agent: string; name: string; petEmoji: string; dailyLimit: bigint };
          addEvent({
            id: log.transactionHash + log.logIndex,
            type: "AgentRegistered",
            label: `${args.petEmoji} New Pet`,
            detail: `"${args.name}" registered · ${parseFloat(formatEther(args.dailyLimit ?? 0n)).toFixed(4)} MON/day`,
            txHash: log.transactionHash ?? "",
            timestamp: Date.now(),
            color: "event-register",
          });
        });
      },
    });

    const unsubDeposit = publicClient.watchContractEvent({
      address: GUARDIAN_CONTRACT_ADDRESS,
      abi: [parseAbiItem("event Deposited(address indexed by, uint256 amount)")],
      eventName: "Deposited",
      onLogs: (logs) => {
        logs.forEach((log) => {
          const args = log.args as { by: string; amount: bigint };
          addEvent({
            id: log.transactionHash + log.logIndex,
            type: "Deposited",
            label: "💰 Deposit",
            detail: `${args.by?.slice(0, 6)}… deposited ${parseFloat(formatEther(args.amount ?? 0n)).toFixed(4)} MON`,
            txHash: log.transactionHash ?? "",
            timestamp: Date.now(),
            color: "event-deposit",
          });
        });
      },
    });

    const unsubRevoke = publicClient.watchContractEvent({
      address: GUARDIAN_CONTRACT_ADDRESS,
      abi: [parseAbiItem("event AgentRevoked(address indexed agent)")],
      eventName: "AgentRevoked",
      onLogs: (logs) => {
        logs.forEach((log) => {
          const args = log.args as { agent: string };
          addEvent({
            id: log.transactionHash + log.logIndex,
            type: "AgentRevoked",
            label: "🚫 Revoked",
            detail: `Agent ${args.agent?.slice(0, 6)}… access revoked`,
            txHash: log.transactionHash ?? "",
            timestamp: Date.now(),
            color: "event-revoke",
          });
        });
      },
    });

    return () => {
      unsubPayment();
      unsubLimit();
      unsubRegister();
      unsubDeposit();
      unsubRevoke();
    };
  }, [publicClient]);

  return (
    <div className="tx-feed">
      <div className="tx-feed-header">
        <span className="tx-feed-title">Live Event Feed</span>
        <span className="dot dot-pulse dot-green" />
      </div>

      {isLoadingHistory ? (
        <div className="tx-feed-empty">
          <span>Loading on-chain history…</span>
        </div>
      ) : events.length === 0 ? (
        <div className="tx-feed-empty">
          <span>Waiting for on-chain events…</span>
          <span className="tx-feed-empty-sub">Events appear here in real time as agents transact</span>
        </div>
      ) : (
        <div className="tx-feed-list">
          {events.map((ev) => (
            <div key={ev.id} className={`tx-event ${ev.color}`}>
              <div className="tx-event-label">{ev.label}</div>
              <div className="tx-event-detail">{ev.detail}</div>
              {ev.txHash && (
                <a
                  href={txLink(ev.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-event-link"
                >
                  {ev.txHash.slice(0, 10)}… ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
