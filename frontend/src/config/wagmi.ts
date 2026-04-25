import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "wagmi/chains";
import { http } from "wagmi";
import { MONAD_TESTNET_RPC } from "../lib/constants";

export const wagmiConfig = getDefaultConfig({
  appName: "Guardian Pet — AI Agent Budget Manager",
  // Set VITE_WALLETCONNECT_PROJECT_ID in .env.local for WalletConnect support
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "guardian-pet-demo",
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(MONAD_TESTNET_RPC),
  },
  ssr: false,
});
