"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractAddresses } from "@/hooks/useContractAddresses";
import { pulseIDOABI } from "@/lib/contracts";
import { projectConfig } from "@/config/project";

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

export default function MyAllocationsPage() {
  const { address, isConnected } = useAccount();
  const contractAddresses = useContractAddresses();

  // Fetch pools
  const { data: pools } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "getAllPools",
  });

  // Fetch TGE time
  const { data: tgeTime } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "tgeTime",
  });

  // Fetch user allocations for each pool
  const allocationContracts = useMemo(() => {
    if (!pools || !address) return [];
    return pools.map((_, index) => ({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "getUserAllocation" as const,
      args: [BigInt(index), address] as const,
    }));
  }, [pools, address]);

  const { data: allocationsData, refetch: refetchAllocations } = useReadContracts({
    contracts: allocationContracts,
    query: { enabled: !!address && !!pools && pools.length > 0 },
  });

  // Get claimable amounts for all pools
  const claimableContracts = useMemo(() => {
    if (!pools || !address) return [];
    return pools.map((_, index) => ({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "getClaimableAmount" as const,
      args: [BigInt(index), address] as const,
    }));
  }, [pools, address]);

  const { data: claimableData } = useReadContracts({
    contracts: claimableContracts,
    query: { enabled: !!address && !!pools && pools.length > 0 },
  });

  // Claim tokens
  const { writeContract: claimTokens, data: claimHash } = useWriteContract();
  const { isLoading: isClaiming, isSuccess: isClaimed } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // Refetch after claiming
  if (isClaimed) {
    refetchAllocations();
  }

  const handleClaim = (poolId: number) => {
    if (!contractAddresses.pulseIDO) return;
    claimTokens({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "claimTokens",
      args: [BigInt(poolId)],
    });
  };

  // Filter to only pools where user has allocation
  const userAllocations = useMemo(() => {
    if (!allocationsData || !pools) return [];
    return allocationsData
      .map((result, index) => {
        const allocation = result.result as {
          totalAmount: bigint;
          claimedAmount: bigint;
          contributedAmount: bigint;
          allocationTime: bigint;
        } | undefined;
        if (!allocation || allocation.totalAmount === BigInt(0)) return null;
        return {
          poolId: index,
          pool: pools[index],
          allocation,
          claimable: (claimableData?.[index]?.result as bigint) || BigInt(0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [allocationsData, pools, claimableData]);

  const formatTokens = (value: bigint) => {
    const num = Number(formatEther(value));
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getPoolColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("seed")) return "from-amber-500 to-orange-600";
    if (lower.includes("private")) return "from-indigo-500 to-purple-600";
    if (lower.includes("public")) return "from-sky-500 to-cyan-600";
    if (lower.includes("team")) return "from-emerald-500 to-green-600";
    if (lower.includes("advisor")) return "from-violet-500 to-purple-600";
    if (lower.includes("liquidity")) return "from-rose-500 to-pink-600";
    return "from-gray-500 to-slate-600";
  };

  const tgeDate = tgeTime ? new Date(Number(tgeTime) * 1000) : null;
  const isTGESet = tgeTime && Number(tgeTime) > 0;
  const isTGEPassed = tgeDate && tgeDate < new Date();

  // Calculate totals
  const totalAllocated = userAllocations.reduce(
    (acc, item) => acc + item.allocation.totalAmount,
    BigInt(0)
  );

  const totalClaimed = userAllocations.reduce(
    (acc, item) => acc + item.allocation.claimedAmount,
    BigInt(0)
  );

  const totalClaimable = userAllocations.reduce(
    (acc, item) => acc + item.claimable,
    BigInt(0)
  );

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">My Allocations</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Track your {projectConfig.tokenSymbol} allocations and claim vested tokens
          </p>
        </div>

        {!isConnected ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60 mb-4">Connect your wallet to view your allocations</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : !contractAddresses.pulseIDO ? (
          <div className="glass-card p-8 text-center">
            <div className="bg-yellow-500/20 text-yellow-400 p-4 rounded-lg mb-4">
              Contracts not yet deployed on this network. Please switch to Polygon Amoy for testing.
            </div>
            <p className="text-white/60">
              Use the network selector in the top right to switch networks.
            </p>
          </div>
        ) : (
          <>
            {/* TGE Status Banner */}
            {!isTGESet ? (
              <div className="glass-card p-4 mb-6 border-blue-500/30 bg-blue-500/10">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-blue-400">
                    TGE has not been set. Token claiming will be available after TGE.
                  </span>
                </div>
              </div>
            ) : !isTGEPassed ? (
              <div className="glass-card p-4 mb-6 border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-yellow-400">
                    TGE scheduled for {tgeDate?.toLocaleDateString()} {tgeDate?.toLocaleTimeString()}. Token claiming will be available after TGE.
                  </span>
                </div>
              </div>
            ) : (
              <div className="glass-card p-4 mb-6 border-green-500/30 bg-green-500/10">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400">
                    TGE is live! You can now claim your vested tokens.
                  </span>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="glass-card p-6">
                <p className="text-sm text-white/60 mb-1">Total Allocated</p>
                <p className="text-2xl font-bold">
                  {formatTokens(totalAllocated)}
                  <span className="text-lg text-white/50 ml-2">{projectConfig.tokenSymbol}</span>
                </p>
              </div>
              <div className="glass-card p-6">
                <p className="text-sm text-white/60 mb-1">Total Claimed</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatTokens(totalClaimed)}
                  <span className="text-lg text-white/50 ml-2">{projectConfig.tokenSymbol}</span>
                </p>
              </div>
              <div className="glass-card p-6">
                <p className="text-sm text-white/60 mb-1">Available to Claim</p>
                <p className="text-2xl font-bold text-indigo-400">
                  {formatTokens(totalClaimable)}
                  <span className="text-lg text-white/50 ml-2">{projectConfig.tokenSymbol}</span>
                </p>
              </div>
            </div>

            {/* Allocations List */}
            {userAllocations.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-white/60 mb-2">You don&apos;t have any allocations yet.</p>
                <p className="text-sm text-white/40">
                  Purchase tokens from active pools or wait for admin allocation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Allocations</h2>
                {userAllocations.map(({ poolId, pool, allocation, claimable }) => {
                  const progress = allocation.totalAmount > BigInt(0)
                    ? (Number(allocation.claimedAmount) / Number(allocation.totalAmount)) * 100
                    : 0;

                  const cliffMonths = Number(pool.vesting.cliffDuration) / SECONDS_PER_MONTH;
                  const vestingMonths = Number(pool.vesting.vestingDuration) / SECONDS_PER_MONTH;

                  return (
                    <div key={poolId} className="glass-card p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Pool Info */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPoolColor(pool.name)} flex items-center justify-center`}
                          >
                            <span className="text-white font-bold">
                              {pool.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{pool.name}</h3>
                            <p className="text-sm text-white/50">
                              {pool.isPurchasable ? "Purchasable" : "Admin Allocated"}
                            </p>
                          </div>
                        </div>

                        {/* Allocation Details */}
                        <div className="flex flex-wrap gap-6 lg:gap-8">
                          <div>
                            <p className="text-xs text-white/50">Allocated</p>
                            <p className="font-medium">{formatTokens(allocation.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">Claimed</p>
                            <p className="font-medium text-green-400">{formatTokens(allocation.claimedAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">TGE</p>
                            <p className="font-medium">{Number(pool.vesting.tgePercent)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">Cliff</p>
                            <p className="font-medium">{cliffMonths > 0 ? `${cliffMonths}mo` : "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50">Vesting</p>
                            <p className="font-medium">{vestingMonths > 0 ? `${vestingMonths}mo` : "-"}</p>
                          </div>
                        </div>

                        {/* Claim Button */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => handleClaim(poolId)}
                            disabled={!isTGEPassed || claimable === BigInt(0) || isClaiming}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {isClaiming ? (
                              <span className="flex items-center gap-2">
                                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Claiming...
                              </span>
                            ) : (
                              `Claim ${formatTokens(claimable)}`
                            )}
                          </button>
                          <p className="text-xs text-white/50">
                            {!isTGEPassed ? "Claiming starts after TGE" : claimable === BigInt(0) ? "Nothing to claim" : ""}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/50">Claim Progress</span>
                          <span className="text-white/70">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getPoolColor(pool.name)} transition-all duration-500`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Success Message */}
            {isClaimed && (
              <div className="fixed bottom-4 right-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 shadow-lg">
                Tokens claimed successfully!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
