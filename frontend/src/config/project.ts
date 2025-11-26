export const projectConfig = {
  // Branding
  name: "PULSE IDO",
  tokenSymbol: "PULSE",
  tokenName: "Pulse Token",
  logo: "/logo.svg",

  // Links
  website: "https://polypuls3.io",
  twitter: "https://twitter.com/polypuls3",
  telegram: "https://t.me/polypuls3",
  discord: "https://discord.gg/polypuls3",
  docs: "https://docs.polypuls3.io",

  // Theme colors (Tailwind classes)
  primaryColor: "indigo",
  accentColor: "sky",

  // Static content
  description: "Decentralized Token Distribution",
  tagline: "Participate in the future of decentralized finance",

  // Tokenomics (static display values)
  totalSupply: "1,000,000,000",
  totalSupplyRaw: 1_000_000_000,
  idoAllocation: "35%",
  ecosystemAllocation: "55%",
  otherAllocation: "10%", // Polls dapp allocation

  // Token decimals
  tokenDecimals: 18,
  paymentDecimals: 6, // USDC has 6 decimals
};

export type ProjectConfig = typeof projectConfig;
