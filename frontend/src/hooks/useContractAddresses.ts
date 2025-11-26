"use client";

import { useChainId } from "wagmi";
import { getContractAddresses } from "@/lib/contracts";

export function useContractAddresses() {
  const chainId = useChainId();
  return getContractAddresses(chainId);
}
