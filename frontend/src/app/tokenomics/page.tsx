"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { projectConfig } from "@/config/project";
import { contractAddresses } from "@/lib/wagmi";
import { pulseIDOABI } from "@/lib/contracts";

const COLORS = ["#f59e0b", "#6366f1", "#0ea5e9", "#10b981", "#8b5cf6", "#ec4899"];

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

export default function Tokenomics() {
  // Fetch all pools from contract
  const { data: pools, isLoading } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "getAllPools",
  });

  // Prepare chart data
  const chartData = pools?.map((pool, index) => ({
    name: pool.name,
    value: Number(formatEther(pool.hardCap)),
    color: COLORS[index % COLORS.length],
  })) || [];

  // Add ecosystem allocation for display
  const totalIDO = chartData.reduce((acc, item) => acc + item.value, 0);
  const ecosystemValue = (projectConfig.totalSupplyRaw * 0.55); // 55% ecosystem

  const fullChartData = [
    ...chartData,
    { name: "Future Ecosystem", value: ecosystemValue, color: "#64748b" },
  ];

  // Vesting table data
  const vestingData = pools?.map((pool) => ({
    name: pool.name,
    allocation: Number(formatEther(pool.hardCap)),
    tgePercent: Number(pool.vesting.tgePercent),
    cliffMonths: Number(pool.vesting.cliffDuration) / SECONDS_PER_MONTH,
    vestingMonths: Number(pool.vesting.vestingDuration) / SECONDS_PER_MONTH,
    isPurchasable: pool.isPurchasable,
    priceUSD: pool.pricePerToken > 0 ? Number(pool.pricePerToken) / 1e6 : null,
  })) || [];

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Tokenomics</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            {projectConfig.tokenSymbol} token distribution and vesting schedules
          </p>
        </div>

        {/* Token Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-card p-6 text-center">
            <p className="text-white/60 mb-2">Total Supply</p>
            <p className="text-3xl font-bold gradient-text">
              {projectConfig.totalSupply}
            </p>
            <p className="text-white/50 text-sm mt-1">{projectConfig.tokenSymbol}</p>
          </div>
          <div className="glass-card p-6 text-center">
            <p className="text-white/60 mb-2">IDO Allocation</p>
            <p className="text-3xl font-bold text-indigo-400">
              {projectConfig.idoAllocation}
            </p>
            <p className="text-white/50 text-sm mt-1">of total supply</p>
          </div>
          <div className="glass-card p-6 text-center">
            <p className="text-white/60 mb-2">Ecosystem Reserve</p>
            <p className="text-3xl font-bold text-emerald-400">
              {projectConfig.ecosystemAllocation}
            </p>
            <p className="text-white/50 text-sm mt-1">for future development</p>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-6">Token Distribution</h2>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fullChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {fullChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-6">Allocation Breakdown</h2>
            <div className="space-y-4">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-white/80">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatNumber(item.value)}</span>
                    <span className="text-white/50 text-sm ml-2">
                      ({((item.value / projectConfig.totalSupplyRaw) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-white/80">Future Ecosystem</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatNumber(ecosystemValue)}</span>
                  <span className="text-white/50 text-sm ml-2">(55%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vesting Schedule Table */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Vesting Schedule</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="pb-4 text-white/60 font-medium">Pool</th>
                  <th className="pb-4 text-white/60 font-medium">Allocation</th>
                  <th className="pb-4 text-white/60 font-medium">Price</th>
                  <th className="pb-4 text-white/60 font-medium">TGE Unlock</th>
                  <th className="pb-4 text-white/60 font-medium">Cliff</th>
                  <th className="pb-4 text-white/60 font-medium">Vesting</th>
                </tr>
              </thead>
              <tbody>
                {vestingData.map((pool, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {pool.name}
                      </div>
                    </td>
                    <td className="py-4">{formatNumber(pool.allocation)}</td>
                    <td className="py-4">
                      {pool.priceUSD ? `$${pool.priceUSD.toFixed(4)}` : "N/A"}
                    </td>
                    <td className="py-4">
                      <span className={pool.tgePercent > 0 ? "text-green-400" : ""}>
                        {pool.tgePercent}%
                      </span>
                    </td>
                    <td className="py-4">
                      {pool.cliffMonths > 0 ? `${pool.cliffMonths}mo` : "-"}
                    </td>
                    <td className="py-4">
                      {pool.vestingMonths > 0 ? `${pool.vestingMonths}mo` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Token Utility */}
        <div className="mt-12 glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Token Utility</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Governance</h3>
              <p className="text-sm text-white/60">
                Vote on platform decisions and protocol upgrades
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Staking</h3>
              <p className="text-sm text-white/60">
                Stake tokens to earn rewards and access premium features
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Access</h3>
              <p className="text-sm text-white/60">
                Unlock exclusive platform features and early access
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
