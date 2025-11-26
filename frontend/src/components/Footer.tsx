"use client";

import Link from "next/link";
import { Twitter, Send, Github } from "lucide-react";
import { projectConfig } from "@/config/project";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-900/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="font-semibold mb-4">{projectConfig.name}</h4>
            <p className="text-sm text-white/60 mb-4">
              Decentralized token distribution platform with multi-pool vesting mechanisms built on Polygon.
            </p>
            <div className="flex gap-3">
              <a
                href={projectConfig.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href={projectConfig.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/polypuls3"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/sale" className="text-white/60 hover:text-white transition-colors">
                  Public Sale
                </Link>
              </li>
              <li>
                <Link href="/tokenomics" className="text-white/60 hover:text-white transition-colors">
                  Tokenomics
                </Link>
              </li>
              <li>
                <Link href="/my-allocations" className="text-white/60 hover:text-white transition-colors">
                  My Allocations
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={projectConfig.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://polygon.technology"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  About Polygon
                </a>
              </li>
              <li>
                <a
                  href="https://quickswap.exchange"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  QuickSwap
                </a>
              </li>
              <li>
                <a
                  href="https://polygonscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  PolygonScan
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-white/60 hover:text-white transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} {projectConfig.name}. All rights reserved.
          </p>
          <p className="text-sm text-white/40">
            Built on{" "}
            <a
              href="https://polygon.technology"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              Polygon
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
