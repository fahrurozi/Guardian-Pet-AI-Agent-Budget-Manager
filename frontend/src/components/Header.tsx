import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractBalance } from "../hooks/useGuardian";
import { formatEther } from "viem";
import { MONAD_TESTNET_EXPLORER, GUARDIAN_CONTRACT_ADDRESS } from "../lib/constants";

export default function Header() {
  const { data: balance } = useContractBalance();

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo-emoji">🐾</span>
        <div className="logo-text">
          <span className="logo-title">Guardian Pet</span>
          <span className="logo-sub">AI Agent Budget Manager</span>
        </div>
      </div>

      <div className="header-center">
        {GUARDIAN_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" && (
          <a
            href={`${MONAD_TESTNET_EXPLORER}/address/${GUARDIAN_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contract-badge"
          >
            <span className="dot dot-green" />
            <span className="contract-label">
              Contract:{" "}
              {GUARDIAN_CONTRACT_ADDRESS.slice(0, 6)}…{GUARDIAN_CONTRACT_ADDRESS.slice(-4)}
            </span>
            {balance !== undefined && (
              <span className="contract-balance">
                {parseFloat(formatEther(balance as bigint)).toFixed(4)} MON
              </span>
            )}
          </a>
        )}
      </div>

      <div className="header-right">
        <ConnectButton
          chainStatus="icon"
          accountStatus="avatar"
          showBalance={false}
        />
      </div>
    </header>
  );
}
