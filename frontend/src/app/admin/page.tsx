"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useContractAddresses } from "@/hooks/useContractAddresses";
import { pulseIDOABI, erc20ABI } from "@/lib/contracts";
import { projectConfig } from "@/config/project";

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const contractAddresses = useContractAddresses();
  const [tgeDate, setTgeDate] = useState("");
  const [tgeTime, setTgeTime] = useState("");
  const [allocationPoolId, setAllocationPoolId] = useState("0");
  const [allocationAddress, setAllocationAddress] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Fetch contract owner
  const { data: owner } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "owner",
  });

  // Fetch TGE time
  const { data: currentTgeTime, refetch: refetchTgeTime } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "tgeTime",
  });

  // Fetch treasury
  const { data: treasury } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "treasury",
  });

  // Fetch paused status
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "paused",
  });

  // Fetch pools
  const { data: pools, refetch: refetchPools } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "getAllPools",
  });

  // Fetch payment token (USDC) balance in contract
  const { data: paymentToken } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "paymentToken",
  });

  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: paymentToken as `0x${string}`,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: contractAddresses.pulseIDO ? [contractAddresses.pulseIDO] : undefined,
    query: { enabled: !!paymentToken && !!contractAddresses.pulseIDO },
  });

  // Fetch sale token balance in contract
  const { data: saleToken } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "saleToken",
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: saleToken as `0x${string}`,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: contractAddresses.pulseIDO ? [contractAddresses.pulseIDO] : undefined,
    query: { enabled: !!saleToken && !!contractAddresses.pulseIDO },
  });

  // Write contract hooks
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isOwner = owner && address && owner.toLowerCase() === address.toLowerCase();

  const handleSetPoolActive = (poolId: number, isActive: boolean) => {
    if (!contractAddresses.pulseIDO) return;
    writeContract({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "setPoolActive",
      args: [BigInt(poolId), isActive],
    });
  };

  const handleSetTGETime = () => {
    if (!contractAddresses.pulseIDO || !tgeDate || !tgeTime) return;
    const dateTime = new Date(`${tgeDate}T${tgeTime}`);
    const timestamp = Math.floor(dateTime.getTime() / 1000);
    writeContract({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "setTGETime",
      args: [BigInt(timestamp)],
    });
  };

  const handleAddAllocation = () => {
    if (!contractAddresses.pulseIDO || !allocationAddress || !allocationAmount) return;
    const amount = parseEther(allocationAmount);
    writeContract({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "addAllocation",
      args: [BigInt(allocationPoolId), allocationAddress as `0x${string}`, amount],
    });
  };

  const handleWithdrawFunds = () => {
    if (!contractAddresses.pulseIDO) return;
    writeContract({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "withdrawFunds",
    });
  };

  const handleWithdrawTokens = () => {
    if (!contractAddresses.pulseIDO || !withdrawAmount) return;
    const amount = parseEther(withdrawAmount);
    writeContract({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: "withdrawTokens",
      args: [amount],
    });
  };

  const handlePause = () => {
    if (!contractAddresses.pulseIDO) return;
    writeContract({
      address: contractAddresses.pulseIDO,
      abi: pulseIDOABI,
      functionName: isPaused ? "unpause" : "pause",
    });
  };

  // Refetch data after successful transaction
  if (isTxSuccess) {
    refetchPools();
    refetchTgeTime();
    refetchPaused();
    refetchUsdcBalance();
    refetchTokenBalance();
  }

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

  const currentTgeDate = currentTgeTime && Number(currentTgeTime) > 0
    ? new Date(Number(currentTgeTime) * 1000)
    : null;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Admin Panel</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Manage {projectConfig.tokenSymbol} IDO pools and settings
          </p>
        </div>

        {!isConnected ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60 mb-4">Connect your wallet to access admin panel</p>
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
        ) : !isOwner ? (
          <div className="glass-card p-8 text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xl font-semibold">Access Denied</p>
            </div>
            <p className="text-white/60 mb-2">Only the contract owner can access this page.</p>
            <p className="text-sm text-white/40">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
            <p className="text-sm text-white/40">
              Owner: {owner ? `${String(owner).slice(0, 6)}...${String(owner).slice(-4)}` : "Loading..."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Transaction Status */}
            {isTxPending && (
              <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-center gap-3">
                  <span className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
                  <span className="text-yellow-400">Transaction pending...</span>
                </div>
              </div>
            )}

            {/* Contract Info */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Contract Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50 mb-1">Owner</p>
                  <p className="font-mono text-sm truncate">{owner ? String(owner) : "..."}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50 mb-1">Treasury</p>
                  <p className="font-mono text-sm truncate">{treasury ? String(treasury) : "..."}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50 mb-1">TGE Time</p>
                  <p className="text-sm">
                    {currentTgeDate
                      ? currentTgeDate.toLocaleString()
                      : <span className="text-yellow-400">Not Set</span>}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50 mb-1">Contract Status</p>
                  <p className={`text-sm font-medium ${isPaused ? "text-red-400" : "text-green-400"}`}>
                    {isPaused ? "PAUSED" : "ACTIVE"}
                  </p>
                </div>
              </div>
            </div>

            {/* TGE Settings */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">TGE Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Date</label>
                  <input
                    type="date"
                    value={tgeDate}
                    onChange={(e) => setTgeDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Time</label>
                  <input
                    type="time"
                    value={tgeTime}
                    onChange={(e) => setTgeTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSetTGETime}
                    disabled={!tgeDate || !tgeTime || isTxPending}
                    className="w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Set TGE Time
                  </button>
                </div>
              </div>
            </div>

            {/* Pool Management */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Pool Management</h2>
              <div className="space-y-3">
                {pools?.map((pool, index) => {
                  const progress = pool.hardCap > 0
                    ? (Number(pool.totalAllocated) / Number(pool.hardCap)) * 100
                    : 0;
                  const cliffMonths = Number(pool.vesting.cliffDuration) / SECONDS_PER_MONTH;
                  const vestingMonths = Number(pool.vesting.vestingDuration) / SECONDS_PER_MONTH;

                  return (
                    <div key={index} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getPoolColor(pool.name)} flex items-center justify-center`}
                          >
                            <span className="text-white font-bold text-sm">
                              {pool.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium">{pool.name}</h3>
                            <p className="text-xs text-white/50">
                              {pool.isPurchasable ? "Purchasable" : "Admin Allocated"} |
                              TGE: {Number(pool.vesting.tgePercent)}% |
                              Cliff: {cliffMonths}mo |
                              Vesting: {vestingMonths}mo
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">
                              {formatTokens(pool.totalAllocated)} / {formatTokens(pool.hardCap)}
                            </p>
                            <p className="text-xs text-white/50">{progress.toFixed(1)}% allocated</p>
                          </div>
                          <button
                            onClick={() => handleSetPoolActive(index, !pool.isActive)}
                            disabled={isTxPending}
                            className={`px-4 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50 ${
                              pool.isActive
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            }`}
                          >
                            {pool.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Allocation */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Add Allocation</h2>
              <p className="text-sm text-white/60 mb-4">
                Manually allocate tokens to users (for Team, Advisors, etc.)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Pool</label>
                  <select
                    value={allocationPoolId}
                    onChange={(e) => setAllocationPoolId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500/50"
                  >
                    {pools?.map((pool, index) => (
                      <option key={index} value={index} className="bg-slate-800">
                        {pool.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">User Address</label>
                  <input
                    type="text"
                    value={allocationAddress}
                    onChange={(e) => setAllocationAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Amount ({projectConfig.tokenSymbol})</label>
                  <input
                    type="number"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                    placeholder="1000000"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddAllocation}
                    disabled={!allocationAddress || !allocationAmount || isTxPending}
                    className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Allocation
                  </button>
                </div>
              </div>
            </div>

            {/* Treasury Management */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Treasury Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* USDC Balance */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-white/60">USDC Balance</p>
                      <p className="text-2xl font-bold">
                        ${usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <button
                      onClick={handleWithdrawFunds}
                      disabled={!usdcBalance || Number(usdcBalance) === 0 || isTxPending}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Withdraw All
                    </button>
                  </div>
                  <p className="text-xs text-white/40">
                    Withdraws to treasury: {treasury ? `${String(treasury).slice(0, 10)}...` : "..."}
                  </p>
                </div>

                {/* Token Balance */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="mb-4">
                    <p className="text-sm text-white/60">{projectConfig.tokenSymbol} Balance</p>
                    <p className="text-2xl font-bold">
                      {tokenBalance ? formatTokens(tokenBalance as bigint) : "0"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Amount to withdraw"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                      onClick={handleWithdrawTokens}
                      disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || isTxPending}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Controls */}
            <div className="glass-card p-6 border-red-500/20">
              <h2 className="text-xl font-semibold mb-4 text-red-400">Emergency Controls</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60">Contract Status</p>
                  <p className="text-sm text-white/40">
                    {isPaused
                      ? "Contract is paused. No contributions or claims allowed."
                      : "Contract is active and accepting transactions."}
                  </p>
                </div>
                <button
                  onClick={handlePause}
                  disabled={isTxPending}
                  className={`px-6 py-3 rounded-lg font-medium transition-opacity disabled:opacity-50 ${
                    isPaused
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  }`}
                >
                  {isPaused ? "Unpause Contract" : "Pause Contract"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
