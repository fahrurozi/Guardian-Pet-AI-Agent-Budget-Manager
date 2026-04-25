import { useState, useEffect } from "react";
import { useSetDailyLimit } from "../hooks/useGuardian";

interface SetLimitModalProps {
  agentAddress: `0x${string}`;
  currentLimit: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SetLimitModal({
  agentAddress,
  currentLimit,
  onClose,
  onSuccess,
}: SetLimitModalProps) {
  const [newLimit, setNewLimit] = useState(currentLimit);
  const { setDailyLimit, isPending, isConfirming, isSuccess } = useSetDailyLimit();

  useEffect(() => {
    if (isSuccess) {
      onSuccess();
      onClose();
    }
  }, [isSuccess, onSuccess, onClose]);

  const isBusy = isPending || isConfirming;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚙️ Set Daily Limit</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          <div className="form-group">
            <label className="form-label">Agent Address</label>
            <div className="form-input form-input-mono form-input-readonly">
              {agentAddress}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Daily Limit (MON)</label>
            <input
              className="form-input"
              type="number"
              step="0.001"
              min="0.0001"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
            />
            <span className="form-hint">
              Current: {currentLimit} MON/day
            </span>
          </div>

          <div className="quick-amounts">
            {["0.01", "0.05", "0.1", "0.5", "1.0"].map((v) => (
              <button
                key={v}
                className={`btn btn-sm btn-outline ${newLimit === v ? "btn-active" : ""}`}
                onClick={() => setNewLimit(v)}
              >
                {v} MON
              </button>
            ))}
          </div>

          {isBusy && (
            <p className="form-pending">
              {isPending ? "Confirm in wallet…" : "Confirming…"}
            </p>
          )}

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={isBusy || parseFloat(newLimit) <= 0}
              onClick={() => setDailyLimit(agentAddress, newLimit)}
            >
              {isBusy ? "Updating…" : "Update Limit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
