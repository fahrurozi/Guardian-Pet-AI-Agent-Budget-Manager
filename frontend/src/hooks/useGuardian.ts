import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseEther } from "viem";
import { GUARDIAN_ABI } from "../lib/abi";
import { GUARDIAN_CONTRACT_ADDRESS } from "../lib/constants";

export function useContractBalance() {
  return useReadContract({
    abi: GUARDIAN_ABI,
    address: GUARDIAN_CONTRACT_ADDRESS,
    functionName: "getContractBalance",
  });
}

export function useOwner() {
  return useReadContract({
    abi: GUARDIAN_ABI,
    address: GUARDIAN_CONTRACT_ADDRESS,
    functionName: "owner",
  });
}

export function useIsOwner() {
  const { address } = useAccount();
  const { data: owner } = useOwner();
  return address && owner
    ? address.toLowerCase() === (owner as string).toLowerCase()
    : false;
}

export function useAgentList() {
  return useReadContract({
    abi: GUARDIAN_ABI,
    address: GUARDIAN_CONTRACT_ADDRESS,
    functionName: "getAgentList",
  });
}

export function useAgentData(agentAddress: `0x${string}` | undefined) {
  return useReadContract({
    abi: GUARDIAN_ABI,
    address: GUARDIAN_CONTRACT_ADDRESS,
    functionName: "getAgent",
    args: agentAddress ? [agentAddress] : undefined,
    query: { enabled: !!agentAddress },
  });
}

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = (amountMon: string) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "deposit",
      value: parseEther(amountMon),
    });
  };

  return { deposit, isPending, isConfirming, isSuccess, hash, error };
}

export function useRegisterAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const registerAgent = (
    address: `0x${string}`,
    name: string,
    petEmoji: string,
    dailyLimitMon: string
  ) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "registerAgent",
      args: [address, name, petEmoji, parseEther(dailyLimitMon)],
    });
  };

  return { registerAgent, isPending, isConfirming, isSuccess, hash, error };
}

export function useSetDailyLimit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const setDailyLimit = (agentAddress: `0x${string}`, newLimitMon: string) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "setDailyLimit",
      args: [agentAddress, parseEther(newLimitMon)],
    });
  };

  return { setDailyLimit, isPending, isConfirming, isSuccess, hash, error };
}

export function useRevokeAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const revokeAgent = (agentAddress: `0x${string}`) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "revokeAgent",
      args: [agentAddress],
    });
  };

  return { revokeAgent, isPending, isConfirming, isSuccess, hash, error };
}

export function useRestoreAgent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const restoreAgent = (agentAddress: `0x${string}`) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "restoreAgent",
      args: [agentAddress],
    });
  };

  return { restoreAgent, isPending, isConfirming, isSuccess, hash, error };
}

export function useResetDailySpend() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const resetDailySpend = (agentAddress: `0x${string}`) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "resetDailySpend",
      args: [agentAddress],
    });
  };

  return { resetDailySpend, isPending, isConfirming, isSuccess, hash, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = (amountMon: string) => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "withdraw",
      args: [parseEther(amountMon)],
    });
  };

  const withdrawAll = () => {
    writeContract({
      abi: GUARDIAN_ABI,
      address: GUARDIAN_CONTRACT_ADDRESS,
      functionName: "withdrawAll",
    });
  };

  return { withdraw, withdrawAll, isPending, isConfirming, isSuccess, hash, error };
}
