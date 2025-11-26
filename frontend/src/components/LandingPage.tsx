"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { ExternalLink, Shield, Zap, Globe, Twitter, Send, BookOpen } from "lucide-react";
import { projectConfig } from "@/config/project";
import { useContractAddresses } from "@/hooks/useContractAddresses";
import { pulseIDOABI } from "@/lib/contracts";

export function LandingPage() {
  const contractAddresses = useContractAddresses();

  // Fetch TGE time
  const { data: tgeTime } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "tgeTime",
  });

  // Fetch pools to get public sale info
  const { data: pools } = useReadContract({
    address: contractAddresses.pulseIDO,
    abi: pulseIDOABI,
    functionName: "getAllPools",
  });

  const tgeDate = tgeTime ? new Date(Number(tgeTime) * 1000) : null;
  const isTGESet = tgeTime && Number(tgeTime) > 0;
  const isTGEPassed = tgeDate && tgeDate < new Date();

  // Find public sale pool (index 2)
  const publicSalePool = pools?.[2];
  const publicSalePrice = publicSalePool
    ? (Number(publicSalePool.pricePerToken) / 1e6).toFixed(4)
    : "0.0100";
  const publicSaleTGE = publicSalePool
    ? Number(publicSalePool.vesting.tgePercent)
    : 20;
  const publicSaleVesting = publicSalePool
    ? Number(publicSalePool.vesting.vestingDuration) / (30 * 24 * 60 * 60)
    : 6;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            {isTGEPassed ? "LIVE NOW" : isTGESet ? "LAUNCHING SOON" : "COMING SOON"}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">{projectConfig.tokenSymbol}</span> Token IDO
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Fair and transparent token distribution with multi-pool vesting on Polygon
          </p>
        </div>
      </div>

      {/* TGE Announcement Card */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="glass-card p-6 md:p-8 text-center bg-gradient-to-r from-slate-800/80 to-slate-900/80">
          <h2 className="text-xl md:text-2xl font-semibold mb-3">
            Token Generation Event (TGE) Announcement
          </h2>
          {isTGESet ? (
            <p className="text-white/60 mb-6">
              {isTGEPassed
                ? "The TGE is live! Participate in the public sale now."
                : `TGE scheduled for ${tgeDate?.toLocaleDateString()} at ${tgeDate?.toLocaleTimeString()}. Join our community to be notified.`}
            </p>
          ) : (
            <p className="text-white/60 mb-6">
              Stay tuned for the official TGE date announcement. Join our community to be notified first.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={projectConfig.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 rounded-lg font-medium transition-colors"
            >
              <Twitter className="w-4 h-4" />
              Follow on X
            </a>
            <a
              href={projectConfig.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors border border-white/20"
            >
              <Send className="w-4 h-4" />
              Join Telegram
            </a>
          </div>
        </div>
      </div>

      {/* Public Sale & Token Details */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Public Sale Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-white/90">Public Sale</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">Price</span>
                <span className="font-medium">
                  {publicSalePool?.isActive ? `$${publicSalePrice} per PULSE` : <span className="text-white/50 italic">TBA</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">TGE Unlock</span>
                <span className="font-medium">{publicSaleTGE}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">Vesting</span>
                <span className="font-medium">{publicSaleVesting} months linear</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/60">Payment</span>
                <span className="font-medium">USDC</span>
              </div>
            </div>
          </div>

          {/* Token Details Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-white/90">Token Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">Total Supply</span>
                <span className="font-medium">{projectConfig.totalSupply} PULSE</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">Standard</span>
                <span className="font-medium">ERC-20</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60">Network</span>
                <span className="font-medium text-purple-400">Polygon</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/60">Platform</span>
                <span className="font-medium">Decentralized</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prepare Your USDC Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold mb-2">
              Prepare Your USDC for the Sale
            </h2>
            <p className="text-white/60">
              The {projectConfig.tokenSymbol} IDO accepts <span className="text-white font-medium">USDC</span> on Polygon as payment. Get ready by acquiring USDC before the sale begins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* What is USDC */}
            <div>
              <h4 className="font-semibold mb-3">What is USDC?</h4>
              <p className="text-sm text-white/60">
                USDC is a fully-reserved stablecoin pegged 1:1 to the US Dollar. It&apos;s one of the most trusted stablecoins, enabling fast and low-cost transactions on Polygon.
              </p>
            </div>

            {/* Why USDC */}
            <div>
              <h4 className="font-semibold mb-3">Why USDC?</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Stable value (pegged to USD)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Fast and cheap transactions on Polygon
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Widely supported by exchanges
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Low gas fees for transfers
                </li>
              </ul>
            </div>
          </div>

          {/* How to Get USDC */}
          <div className="bg-slate-800/50 rounded-xl p-6">
            <h4 className="font-semibold mb-4">How to Get USDC on Polygon</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Bridge from Ethereum (Recommended)</p>
                  <p className="text-sm text-white/60 mb-2">
                    Use the official Polygon Bridge or third-party bridges to transfer USDC from Ethereum to Polygon.
                  </p>
                  <a
                    href="https://portal.polygon.technology/bridge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Open Polygon Bridge
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Buy on DEX</p>
                  <p className="text-sm text-white/60 mb-2">
                    Swap POL or other tokens for USDC on decentralized exchanges like QuickSwap or Uniswap.
                  </p>
                  <a
                    href="https://quickswap.exchange/#/swap"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Open QuickSwap
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Withdraw from Exchange</p>
                  <p className="text-sm text-white/60">
                    Withdraw USDC directly to Polygon from supported exchanges like Coinbase, Binance, or Kraken.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-white/60">USDC Contract on Polygon:</span>
                <code className="px-3 py-1 bg-white/5 rounded text-xs font-mono text-purple-400">
                  0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Participate Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-8 text-center">
            Why Participate in {projectConfig.tokenSymbol} IDO?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-500/20 mb-4">
                <Shield className="w-7 h-7 text-indigo-400" />
              </div>
              <h4 className="font-semibold mb-2">Transparent Vesting</h4>
              <p className="text-sm text-white/60">
                All vesting schedules are on-chain and verifiable. No hidden terms or surprises.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 mb-4">
                <Zap className="w-7 h-7 text-amber-400" />
              </div>
              <h4 className="font-semibold mb-2">Fair Distribution</h4>
              <p className="text-sm text-white/60">
                Multi-pool system ensures fair allocation across different participant types.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-4">
                <Globe className="w-7 h-7 text-emerald-400" />
              </div>
              <h4 className="font-semibold mb-2">Decentralized</h4>
              <p className="text-sm text-white/60">
                Built entirely on Polygon. No centralized intermediaries controlling your tokens.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/sale"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go to Sale
            <ExternalLink className="w-4 h-4" />
          </Link>
          <Link
            href="/tokenomics"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors border border-white/20"
          >
            <BookOpen className="w-4 h-4" />
            View Tokenomics
          </Link>
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-sm text-white/40">
          Follow our official channels for the latest updates and announcements.
        </p>
        <p className="text-sm text-white/40 mt-1">
          Beware of scams - we will never ask for your private keys or seed phrases.
        </p>
      </div>
    </div>
  );
}
