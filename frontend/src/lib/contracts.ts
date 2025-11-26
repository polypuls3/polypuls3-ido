// Chain-indexed contract addresses
export const contractAddresses: Record<number, {
  pulseToken: `0x${string}` | undefined;
  pulseIDO: `0x${string}` | undefined;
  usdc: `0x${string}` | undefined;
}> = {
  // Polygon Amoy (testnet)
  80002: {
    pulseToken: "0x25718cf963455f09081EA27C5DfAd6CE4CF4292C",
    pulseIDO: "0xE706e943285149167234590Fb765d9DcEBa2947B",
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  },
  // Polygon Mainnet
  137: {
    pulseToken: undefined, // Placeholder - deploy later
    pulseIDO: undefined,
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Official USDC on Polygon
  },
};

// Helper to get addresses for current chain
export function getContractAddresses(chainId: number) {
  return contractAddresses[chainId] || contractAddresses[80002]; // fallback to Amoy
}

// Contract ABIs (extracted from compiled contracts)

export const pulseTokenABI = [
  {
    inputs: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "totalSupply_", type: "uint256" },
      { name: "decimals_", type: "uint8" },
      { name: "recipient_", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const pulseIDOABI = [
  // View functions
  {
    inputs: [],
    name: "saleToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paymentToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tgeTime",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isInitialized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPoolCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "getPool",
    outputs: [
      {
        components: [
          { name: "name", type: "string" },
          { name: "totalAllocated", type: "uint256" },
          { name: "totalClaimed", type: "uint256" },
          { name: "pricePerToken", type: "uint256" },
          { name: "hardCap", type: "uint256" },
          {
            name: "vesting",
            type: "tuple",
            components: [
              { name: "tgePercent", type: "uint256" },
              { name: "cliffDuration", type: "uint256" },
              { name: "vestingDuration", type: "uint256" },
            ],
          },
          { name: "isPurchasable", type: "bool" },
          { name: "isActive", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllPools",
    outputs: [
      {
        components: [
          { name: "name", type: "string" },
          { name: "totalAllocated", type: "uint256" },
          { name: "totalClaimed", type: "uint256" },
          { name: "pricePerToken", type: "uint256" },
          { name: "hardCap", type: "uint256" },
          {
            name: "vesting",
            type: "tuple",
            components: [
              { name: "tgePercent", type: "uint256" },
              { name: "cliffDuration", type: "uint256" },
              { name: "vestingDuration", type: "uint256" },
            ],
          },
          { name: "isPurchasable", type: "bool" },
          { name: "isActive", type: "bool" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    name: "getUserAllocation",
    outputs: [
      {
        components: [
          { name: "totalAmount", type: "uint256" },
          { name: "claimedAmount", type: "uint256" },
          { name: "contributedAmount", type: "uint256" },
          { name: "allocationTime", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getAllUserAllocations",
    outputs: [
      {
        components: [
          { name: "totalAmount", type: "uint256" },
          { name: "claimedAmount", type: "uint256" },
          { name: "contributedAmount", type: "uint256" },
          { name: "allocationTime", type: "uint256" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    name: "getVestedAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    name: "getClaimableAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getTotalClaimableAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    name: "getVestingStatus",
    outputs: [
      { name: "totalAmount", type: "uint256" },
      { name: "vestedAmount", type: "uint256" },
      { name: "claimedAmount", type: "uint256" },
      { name: "claimableAmount", type: "uint256" },
      { name: "vestingPercentage", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "participantCounts",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "paymentAmount", type: "uint256" },
    ],
    name: "contribute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "poolId", type: "uint256" }],
    name: "claimTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimAllTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Admin functions
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "_isActive", type: "bool" },
    ],
    name: "setPoolActive",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_tgeTime", type: "uint256" }],
    name: "setTGETime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "addAllocation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "users", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "batchAddAllocation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdrawTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_treasury", type: "address" }],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "paymentAmount", type: "uint256" },
      { indexed: false, name: "tokenAmount", type: "uint256" },
    ],
    name: "Contribution",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "TokensClaimed",
    type: "event",
  },
] as const;

// ERC20 ABI for USDC approval
export const erc20ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
