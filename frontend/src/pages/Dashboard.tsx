import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  useAgentList,
  useIsOwner,
  useContractBalance,
  useRevokeAgent,
  useRestoreAgent,
  useResetDailySpend,
  useWithdraw,
} from "../hooks/useGuardian";
import PetCard from "../components/PetCard";
import TxFeed from "../components/TxFeed";
import AddPetModal from "../components/AddPetModal";
import DepositModal from "../components/DepositModal";
import SetLimitModal from "../components/SetLimitModal";
import { formatEther } from "viem";
import { GUARDIAN_CONTRACT_ADDRESS, addrLink } from "../lib/constants";

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { data: agentList, refetch: refetchList } = useAgentList();
  const { data: balance } = useContractBalance();
  const isOwner = useIsOwner();

  const [showAddPet, setShowAddPet] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [limitModal, setLimitModal] = useState<{
    addr: `0x${string}`;
    currentLimit: string;
  } | null>(null);

  const { revokeAgent } = useRevokeAgent();
  const { restoreAgent } = useRestoreAgent();
  const { resetDailySpend } = useResetDailySpend();
  const { withdrawAll, isPending: isWithdrawing } = useWithdraw();

  const handleSuccess = useCallback(() => {
    refetchList();
  }, [refetchList]);

  const agents = (agentList as `0x${string}`[]) ?? [];

  if (!isConnected) {
    return (
      <div className="dashboard-empty">
        <div className="empty-hero">
          <div className="empty-pet">🐾</div>
          <h1 className="empty-title">Guardian Pet</h1>
          <p className="empty-sub">
            On-chain spending firewall for AI agents on Monad.
            <br />
            Connect your wallet to manage your pets.
          </p>
          <div className="feature-pills">
            <span className="pill">🔒 Trustless Enforcement</span>
            <span className="pill">⚡ Monad Speed</span>
            <span className="pill">💸 x402 Payments</span>
            <span className="pill">🤖 Multi-Agent</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">Contract Balance</span>
          <span className="stat-value">
            {balance !== undefined
              ? parseFloat(formatEther(balance as bigint)).toFixed(4)
              : "—"}{" "}
            MON
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Active Pets</span>
          <span className="stat-value">{agents.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Network</span>
          <span className="stat-value stat-network">Monad Testnet</span>
        </div>
        {GUARDIAN_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" && (
          <div className="stat">
            <span className="stat-label">Contract</span>
            <a
              className="stat-value stat-link"
              href={addrLink(GUARDIAN_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {GUARDIAN_CONTRACT_ADDRESS.slice(0, 6)}…{GUARDIAN_CONTRACT_ADDRESS.slice(-4)} ↗
            </a>
          </div>
        )}
      </div>

      {/* Action bar (owner only) */}
      {isOwner && (
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowAddPet(true)}>
            ➕ Add Pet
          </button>
          <button className="btn btn-outline" onClick={() => setShowDeposit(true)}>
            💰 Deposit MON
          </button>
          <button
            className="btn btn-outline btn-danger-outline"
            onClick={() => {
              if (confirm("Withdraw all MON from contract to your wallet?")) withdrawAll();
            }}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? "Withdrawing…" : "↩️ Withdraw All"}
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="dashboard-layout">
        {/* Pets grid */}
        <div className="pets-section">
          {agents.length === 0 ? (
            <div className="no-pets">
              <span className="no-pets-emoji">🥚</span>
              <p className="no-pets-text">No pets yet.</p>
              {isOwner && (
                <p className="no-pets-hint">
                  Click <strong>Add Pet</strong> to register your first AI agent.
                </p>
              )}
            </div>
          ) : (
            <div className="pets-grid">
              {agents.map((addr) => (
                <PetCard
                  key={addr}
                  agentAddress={addr}
                  isOwner={isOwner}
                  onSetLimit={(a, limit) => setLimitModal({ addr: a, currentLimit: limit })}
                  onRevoke={(a) => revokeAgent(a)}
                  onRestore={(a) => restoreAgent(a)}
                  onReset={(a) => resetDailySpend(a)}
                />
              ))}
            </div>
          )}
        </div>

        {/* TX Feed sidebar */}
        <TxFeed />
      </div>

      {/* x402 demo info banner */}
      <div className="x402-banner">
        <div className="x402-banner-inner">
          <span className="x402-icon">⚡</span>
          <div>
            <span className="x402-title">x402 Payment Flow Active</span>
            <span className="x402-desc">
              Run <code>node x402-server/server.js</code> to start the mock API server, then{" "}
              <code>node x402-server/agent-demo.mjs</code> to simulate an AI agent making x402 payments through the firewall.
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddPet && (
        <AddPetModal
          onClose={() => setShowAddPet(false)}
          onSuccess={handleSuccess}
        />
      )}
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {limitModal && (
        <SetLimitModal
          agentAddress={limitModal.addr}
          currentLimit={limitModal.currentLimit}
          onClose={() => setLimitModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
