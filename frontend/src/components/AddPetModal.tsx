import { useState, useEffect } from "react";
import { useRegisterAgent } from "../hooks/useGuardian";
import { PET_EMOJIS, DEFAULT_DAILY_LIMIT_MON } from "../lib/constants";

interface AddPetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPetModal({ onClose, onSuccess }: AddPetModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState(PET_EMOJIS[0]);
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_DAILY_LIMIT_MON);
  const [error, setError] = useState("");

  const { registerAgent, isPending, isConfirming, isSuccess } = useRegisterAgent();

  useEffect(() => {
    if (isSuccess) {
      onSuccess();
      onClose();
    }
  }, [isSuccess, onSuccess, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Pet name is required");
    if (!/^0x[0-9a-fA-F]{40}$/.test(address))
      return setError("Invalid Ethereum address");
    if (parseFloat(dailyLimit) <= 0) return setError("Daily limit must be > 0");

    registerAgent(address as `0x${string}`, name.trim(), selectedEmoji, dailyLimit);
  };

  const isBusy = isPending || isConfirming;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🐣 Add New Pet</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Emoji picker */}
          <div className="form-group">
            <label className="form-label">Pet Avatar</label>
            <div className="emoji-picker">
              {PET_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-option ${selectedEmoji === emoji ? "emoji-selected" : ""}`}
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Pet Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Whiskers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
          </div>

          {/* Agent address */}
          <div className="form-group">
            <label className="form-label">Agent Wallet Address</label>
            <input
              className="form-input form-input-mono"
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <span className="form-hint">
              The wallet this agent uses to call executePayment()
            </span>
          </div>

          {/* Daily limit */}
          <div className="form-group">
            <label className="form-label">Daily Limit (MON)</label>
            <input
              className="form-input"
              type="number"
              step="any"
              min="0"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
            />
            <span className="form-hint">
              Max MON this agent can spend per 24 hours — enforced on-chain
            </span>
          </div>

          {error && <div className="form-error">{error}</div>}

          {isBusy && (
            <div className="form-pending">
              {isPending ? "Confirm in wallet…" : "Waiting for confirmation…"}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? "Adding…" : `${selectedEmoji} Add Pet`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
