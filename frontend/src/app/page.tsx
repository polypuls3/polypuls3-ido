"use client";

import { useReadContract } from "wagmi";
import { projectConfig } from "@/config/project";
import { useContractAddresses } from "@/hooks/useContractAddresses";
import { pulseIDOABI } from "@/lib/contracts";
import { PoolCard } from "@/components/PoolCard";
import { StatsCard } from "@/components/StatsCard";

export default function Dashboard() {
  const contractAddresses = useContractAddresses();

  // Fetch all pools from contract
  const { data: pools, isLoading: poolsLoading } = useReadContract({
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

  const tgeDate = tgeTime ? new Date(Number(tgeTime) * 1000) : null;
  const isTGESet = tgeTime && Number(tgeTime) > 0;
  const isTGEPassed = tgeDate && tgeDate < new Date();

  // Calculate total stats
  const totalAllocated = pools?.reduce(
    (acc, pool) => acc + BigInt(pool.totalAllocated),
    BigInt(0)
  ) || BigInt(0);

  const totalHardCap = pools?.reduce(
    (acc, pool) => acc + BigInt(pool.hardCap),
    BigInt(0)
  ) || BigInt(0);

  // Count purchasable pools that are active
  const activePools = pools?.filter(p => p.isActive && p.isPurchasable).length || 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">{projectConfig.tokenSymbol}</span> IDO
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              {projectConfig.tagline}
            </p>

            {/* TGE Status */}
            {isTGESet ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
                {isTGEPassed ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 font-medium">TGE Live</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-yellow-400 font-medium">
                      TGE: {tgeDate?.toLocaleDateString()} {tgeDate?.toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-blue-400 font-medium">Coming Soon</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Supply"
            value={projectConfig.totalSupply}
            suffix={projectConfig.tokenSymbol}
          />
          <StatsCard
            title="IDO Allocation"
            value={projectConfig.idoAllocation}
            subtitle={`of total supply`}
          />
          <StatsCard
            title="Active Pools"
            value={activePools.toString()}
            subtitle="open for contribution"
          />
          <StatsCard
            title="Total Allocated"
            value={totalHardCap > 0
              ? `${((Number(totalAllocated) / Number(totalHardCap)) * 100).toFixed(1)}%`
              : "0%"
            }
            subtitle="of IDO allocation"
          />
        </div>
      </div>

      {/* Pools Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">Token Sale Pools</h2>

        {!contractAddresses.pulseIDO ? (
          <div className="glass-card p-8 text-center">
            <div className="bg-yellow-500/20 text-yellow-400 p-4 rounded-lg mb-4">
              Contracts not yet deployed on this network. Please switch to Polygon Amoy for testing.
            </div>
            <p className="text-white/60">
              Use the network selector in the top right to switch networks.
            </p>
          </div>
        ) : poolsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/2 mb-4" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : pools && pools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool, index) => (
              <PoolCard key={index} pool={pool} poolId={index} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60">No pools configured yet.</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">How to Participate</h3>
            <ol className="space-y-3 text-white/70">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">1</span>
                <span>Connect your wallet (MetaMask, WalletConnect, etc.)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">2</span>
                <span>Ensure you have USDC on Polygon network</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">3</span>
                <span>Go to the Sale page and contribute to an active pool</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-sm">4</span>
                <span>Claim your vested tokens after TGE</span>
              </li>
            </ol>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Vesting Information</h3>
            <p className="text-white/70 mb-4">
              Tokens are distributed according to vesting schedules that vary by pool:
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span><strong>TGE Unlock:</strong> Percentage available immediately at token launch</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span><strong>Cliff Period:</strong> Lock-up time before vesting begins</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span><strong>Linear Vesting:</strong> Gradual token release over time</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
