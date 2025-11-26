"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { contractAddresses } from "@/lib/wagmi";
import { pulseIDOABI, erc20ABI } from "@/lib/contracts";
import { projectConfig } from "@/config/project";

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

function SaleContent() {
  const searchParams = useSearchParams();
  const selectedPoolParam = searchParams.get("pool");
  const [selectedPool, setSelectedPool] = useState<number>(0);
  const [amount, setAmount] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);

  const { address, isConnected } = useAccount();

  // Fetch pools
  const { data: pools, isLoading: poolsLoading } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "getAllPools",
  });

  // Fetch payment token address
  const { data: paymentToken } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "paymentToken",
  });

  // Fetch user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: paymentToken as `0x${string}`,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!paymentToken },
  });

  // Fetch user's USDC allowance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: paymentToken as `0x${string}`,
    abi: erc20ABI,
    functionName: "allowance",
    args: address && contractAddresses.pulseIDO ? [address, contractAddresses.pulseIDO] : undefined,
    query: { enabled: !!address && !!paymentToken && !!contractAddresses.pulseIDO },
  });

  // Write contract hooks
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: contribute, data: contributeHash } = useWriteContract();

  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isContributing, isSuccess: isContributed } = useWaitForTransactionReceipt({
    hash: contributeHash,
  });

  // Set selected pool from URL param
  useEffect(() => {
    if (selectedPoolParam) {
      setSelectedPool(Number(selectedPoolParam));
    }
  }, [selectedPoolParam]);

  // Check if approval is needed
  useEffect(() => {
    if (usdcAllowance !== undefined && amount) {
      const amountInWei = parseUnits(amount || "0", 6);
      setNeedsApproval(BigInt(usdcAllowance as bigint) < amountInWei);
    }
  }, [usdcAllowance, amount]);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproved) {
      refetchAllowance();
    }
  }, [isApproved, refetchAllowance]);

  // Reset amount after successful contribution
  useEffect(() => {
    if (isContributed) {
      setAmount("");
    }
  }, [isContributed]);

  const purchasablePools = pools?.filter((p) => p.isPurchasable && p.isActive) || [];
  const currentPool = purchasablePools[selectedPool];

  const handleApprove = () => {
    if (!paymentToken || !amount || !contractAddresses.pulseIDO) return;
    const amountInWei = parseUnits(amount, 6);
    approve({
      address: paymentToken as `0x${string}`,
      abi: erc20ABI,
      functionName: "approve",
      args: [contractAddresses.pulseIDO, amountInWei],
    });
  };

  const handleContribute = () => {
    if (!currentPool || !amount || !contractAddresses.pulseIDO) return;
    const poolIndex = pools?.findIndex((p) => p.name === currentPool.name) ?? -1;
    if (poolIndex === -1) return;

    const amountInWei = parseUnits(amount, 6);
    contribute({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "contribute",
      args: [BigInt(poolIndex), amountInWei],
    });
  };

  // Calculate token amount user will receive
  const calculateTokens = () => {
    if (!currentPool || !amount || Number(amount) <= 0) return "0";
    const pricePerToken = Number(currentPool.pricePerToken) / 1e6;
    if (pricePerToken <= 0) return "0";
    const tokens = Number(amount) / pricePerToken;
    return formatNumber(tokens);
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatTokens = (value: bigint) => {
    const num = Number(formatEther(value));
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getPoolColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("seed")) return "from-amber-500 to-orange-600";
    if (lower.includes("private")) return "from-indigo-500 to-purple-600";
    if (lower.includes("public")) return "from-sky-500 to-cyan-600";
    return "from-gray-500 to-slate-600";
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Token Sale</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Contribute USDC to purchase {projectConfig.tokenSymbol} tokens
          </p>
        </div>

        {!isConnected ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60 mb-4">Connect your wallet to participate in the sale</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : !contractAddresses.pulseIDO ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60">
              Contract not deployed yet. Configure the environment variables to connect.
            </p>
          </div>
        ) : poolsLoading ? (
          <div className="glass-card p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : purchasablePools.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60">No active sale pools at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pool Selection */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-semibold mb-4">Select Pool</h2>
              {purchasablePools.map((pool, index) => {
                const progress = pool.hardCap > 0
                  ? (Number(pool.totalAllocated) / Number(pool.hardCap)) * 100
                  : 0;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedPool(index)}
                    className={`w-full glass-card p-4 text-left transition-colors ${
                      selectedPool === index
                        ? "border-indigo-500/50 bg-indigo-500/10"
                        : "hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getPoolColor(pool.name)} flex items-center justify-center`}
                      >
                        <span className="text-white font-bold text-xs">
                          {pool.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium">{pool.name}</h3>
                        <p className="text-xs text-white/50">
                          ${(Number(pool.pricePerToken) / 1e6).toFixed(4)} per token
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getPoolColor(pool.name)}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      {formatTokens(pool.totalAllocated)} / {formatTokens(pool.hardCap)} allocated
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Contribution Form */}
            <div className="lg:col-span-2">
              {currentPool && (
                <div className="glass-card p-6">
                  <h2 className="text-lg font-semibold mb-6">Contribute to {currentPool.name}</h2>

                  {/* Pool Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-white/50 mb-1">Price</p>
                      <p className="font-medium">
                        ${(Number(currentPool.pricePerToken) / 1e6).toFixed(4)}
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-white/50 mb-1">TGE Unlock</p>
                      <p className="font-medium">{Number(currentPool.vesting.tgePercent)}%</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-white/50 mb-1">Cliff</p>
                      <p className="font-medium">
                        {Number(currentPool.vesting.cliffDuration) / SECONDS_PER_MONTH > 0
                          ? `${Number(currentPool.vesting.cliffDuration) / SECONDS_PER_MONTH} months`
                          : "None"}
                      </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-white/50 mb-1">Vesting</p>
                      <p className="font-medium">
                        {Number(currentPool.vesting.vestingDuration) / SECONDS_PER_MONTH > 0
                          ? `${Number(currentPool.vesting.vestingDuration) / SECONDS_PER_MONTH} months`
                          : "None"}
                      </p>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-6">
                    <label className="block text-sm text-white/60 mb-2">
                      Amount (USDC)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (usdcBalance) {
                              setAmount((Number(usdcBalance) / 1e6).toString());
                            }
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          MAX
                        </button>
                        <span className="text-white/50">USDC</span>
                      </div>
                    </div>
                    {usdcBalance !== undefined && (
                      <p className="text-xs text-white/50 mt-1">
                        Balance: {(Number(usdcBalance) / 1e6).toFixed(2)} USDC
                      </p>
                    )}
                  </div>

                  {/* Token Preview */}
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">You will receive</span>
                      <span className="text-xl font-bold text-indigo-400">
                        {calculateTokens()} {projectConfig.tokenSymbol}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {needsApproval ? (
                      <button
                        onClick={handleApprove}
                        disabled={!amount || Number(amount) <= 0 || isApproving}
                        className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApproving ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Approving...
                          </span>
                        ) : (
                          "Approve USDC"
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleContribute}
                        disabled={!amount || Number(amount) <= 0 || isContributing}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isContributing ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Contributing...
                          </span>
                        ) : (
                          "Contribute"
                        )}
                      </button>
                    )}
                  </div>

                  {/* Success Message */}
                  {isContributed && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center">
                      Contribution successful! Check your allocations page to track your tokens.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      </div>
    }>
      <SaleContent />
    </Suspense>
  );
}
