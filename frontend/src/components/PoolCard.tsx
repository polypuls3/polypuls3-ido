"use client";

import Link from "next/link";
import { formatEther } from "viem";

interface Pool {
  name: string;
  totalAllocated: bigint;
  totalClaimed: bigint;
  pricePerToken: bigint;
  hardCap: bigint;
  vesting: {
    tgePercent: bigint;
    cliffDuration: bigint;
    vestingDuration: bigint;
  };
  isPurchasable: boolean;
  isActive: boolean;
}

interface PoolCardProps {
  pool: Pool;
  poolId: number;
}

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

export function PoolCard({ pool, poolId }: PoolCardProps) {
  const progress = pool.hardCap > 0
    ? (Number(pool.totalAllocated) / Number(pool.hardCap)) * 100
    : 0;

  const cliffMonths = Number(pool.vesting.cliffDuration) / SECONDS_PER_MONTH;
  const vestingMonths = Number(pool.vesting.vestingDuration) / SECONDS_PER_MONTH;

  // Price in USD (6 decimals for USDC precision)
  const priceUSD = Number(pool.pricePerToken) / 1e6;

  // Format large numbers
  const formatTokens = (value: bigint) => {
    const num = Number(formatEther(value));
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  // Pool color based on type
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

  return (
    <div className="glass-card p-6 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getPoolColor(pool.name)} flex items-center justify-center`}>
            <span className="text-white font-bold text-sm">
              {pool.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold">{pool.name}</h3>
            <p className="text-xs text-white/50">
              {pool.isPurchasable ? "Purchasable" : "Admin Allocated"}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          pool.isActive
            ? "bg-green-500/20 text-green-400"
            : "bg-white/10 text-white/50"
        }`}>
          {pool.isActive ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-white/60">Allocated</span>
          <span className="text-white/80">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getPoolColor(pool.name)} transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 text-white/50">
          <span>{formatTokens(pool.totalAllocated)}</span>
          <span>{formatTokens(pool.hardCap)}</span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {pool.isPurchasable && pool.pricePerToken > 0 && (
          <div className="flex justify-between">
            <span className="text-white/60">Price</span>
            <span className="text-white/90">${priceUSD.toFixed(4)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-white/60">TGE Unlock</span>
          <span className="text-white/90">{Number(pool.vesting.tgePercent)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Cliff</span>
          <span className="text-white/90">
            {cliffMonths > 0 ? `${cliffMonths} months` : "None"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/60">Vesting</span>
          <span className="text-white/90">
            {vestingMonths > 0 ? `${vestingMonths} months` : "None"}
          </span>
        </div>
      </div>

      {/* Action Button */}
      {pool.isPurchasable && pool.isActive && (
        <Link
          href={`/sale?pool=${poolId}`}
          className="mt-4 block w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-center font-medium hover:opacity-90 transition-opacity"
        >
          Contribute
        </Link>
      )}
    </div>
  );
}
