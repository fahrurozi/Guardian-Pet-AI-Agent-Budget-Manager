import { useState, useEffect } from "react";
import { useDeposit, useContractBalance } from "../hooks/useGuardian";
import { formatEther } from "viem";

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("0.1");
  const { deposit, isPending, isConfirming, isSuccess, hash } = useDeposit();
  const { data: balance } = useContractBalance();

  useEffect(() => {
    if (isSuccess) onClose();
  }, [isSuccess, onClose]);

  const isBusy = isPending || isConfirming;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">💰 Deposit MON</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          <div className="deposit-balance">
            <span className="deposit-balance-label">Contract Balance</span>
            <span className="deposit-balance-value">
              {balance !== undefined
                ? parseFloat(formatEther(balance as bigint)).toFixed(4)
                : "—"}{" "}
              MON
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (MON)</label>
            <input
              className="form-input"
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="quick-amounts">
            {["0.01", "0.05", "0.1", "0.5"].map((v) => (
              <button
                key={v}
                className={`btn btn-sm btn-outline ${amount === v ? "btn-active" : ""}`}
                onClick={() => setAmount(v)}
              >
                {v} MON
              </button>
            ))}
          </div>

          <p className="deposit-note">
            Deposited MON is held in the contract and used exclusively by registered agents within their daily limits.
          </p>

          {hash && (
            <p className="form-pending">
              {isConfirming ? "Confirming…" : "✓ Confirmed!"}
            </p>
          )}

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={isBusy || parseFloat(amount) <= 0}
              onClick={() => deposit(amount)}
            >
              {isBusy ? "Depositing…" : `Deposit ${amount} MON`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
