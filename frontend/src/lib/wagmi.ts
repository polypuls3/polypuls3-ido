import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy, polygon } from "wagmi/chains";

// Custom Polygon Amoy chain config (in case it's not in wagmi)
const polygonAmoyChain = {
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
    public: {
      http: ["https://rpc-amoy.polygon.technology"],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: "https://amoy.polygonscan.com",
    },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: "PULSE IDO",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [
    polygonAmoy ?? polygonAmoyChain,
    polygon,
  ],
  ssr: true,
});
