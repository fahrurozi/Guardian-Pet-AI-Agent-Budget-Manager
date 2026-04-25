import { formatEther } from "viem";
import { useAgentData } from "../hooks/useGuardian";
import { addrLink } from "../lib/constants";

interface PetCardProps {
  agentAddress: `0x${string}`;
  isOwner: boolean;
  onSetLimit: (addr: `0x${string}`, currentLimit: string) => void;
  onRevoke: (addr: `0x${string}`) => void;
  onRestore: (addr: `0x${string}`) => void;
  onReset: (addr: `0x${string}`) => void;
}

export default function PetCard({
  agentAddress,
  isOwner,
  onSetLimit,
  onRevoke,
  onRestore,
  onReset,
}: PetCardProps) {
  const { data, isLoading } = useAgentData(agentAddress);

  if (isLoading || !data) {
    return (
      <div className="pet-card pet-card-loading">
        <div className="loading-pulse" />
      </div>
    );
  }

  const [name, petEmoji, dailyLimit, spentToday, , , isRevoked, remainingToday] =
    data as [string, string, bigint, bigint, bigint, boolean, boolean, bigint];

  const limitNum = parseFloat(formatEther(dailyLimit));
  const spentNum = parseFloat(formatEther(spentToday));
  const remainingNum = parseFloat(formatEther(remainingToday));
  const pctUsed = limitNum > 0 ? (spentNum / limitNum) * 100 : 0;

  const happiness = isRevoked ? 0 : Math.max(0, 100 - pctUsed);
  const happinessEmoji =
    happiness > 70 ? "😊" : happiness > 40 ? "😐" : happiness > 10 ? "😟" : "😰";

  const barColor =
    pctUsed < 50 ? "bar-green" : pctUsed < 80 ? "bar-yellow" : "bar-red";

  return (
    <div className={`pet-card ${isRevoked ? "pet-card-revoked" : ""}`}>
      {/* Header */}
      <div className="pet-card-header">
        <div className="pet-avatar">{petEmoji || "🐾"}</div>
        <div className="pet-info">
          <div className="pet-name">{name}</div>
          <a
            href={addrLink(agentAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="pet-address"
          >
            {agentAddress.slice(0, 6)}…{agentAddress.slice(-4)} ↗
          </a>
        </div>
        <div className="pet-happiness">
          <span className="happiness-emoji">{isRevoked ? "🚫" : happinessEmoji}</span>
          {!isRevoked && (
            <span className="happiness-value">{Math.round(happiness)}%</span>
          )}
          {isRevoked && <span className="revoked-label">Revoked</span>}
        </div>
      </div>

      {/* Budget bar */}
      <div className="budget-section">
        <div className="budget-labels">
          <span className="budget-label-left">Daily Budget</span>
          <span className="budget-label-right">
            {spentNum.toFixed(4)} / {limitNum.toFixed(4)} MON
          </span>
        </div>
        <div className="budget-bar-track">
          <div
            className={`budget-bar-fill ${barColor}`}
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
        </div>
        <div className="budget-remaining">
          <span>{remainingNum.toFixed(4)} MON remaining today</span>
          <span className="budget-pct">{pctUsed.toFixed(1)}% used</span>
        </div>
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="pet-actions">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onSetLimit(agentAddress, formatEther(dailyLimit))}
          >
            Set Limit
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onReset(agentAddress)}
          >
            Reset Spend
          </button>
          {!isRevoked ? (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onRevoke(agentAddress)}
            >
              Revoke
            </button>
          ) : (
            <button
              className="btn btn-sm btn-success"
              onClick={() => onRestore(agentAddress)}
            >
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}
