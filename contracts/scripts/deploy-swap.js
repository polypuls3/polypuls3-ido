const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PulseSwap with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Load existing deployment to get PULSE token address
  const deploymentPath = path.join(__dirname, "../deployments/polygonAmoy.json");
  let deployment = {};

  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }

  const pulseTokenAddress = deployment.contracts?.PulseToken;
  if (!pulseTokenAddress) {
    throw new Error("PulseToken not found in deployment. Please deploy PulseToken first.");
  }

  // USDC address on Polygon Amoy (testnet)
  const usdcAddress = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";

  // Initial rates
  // USDC rate: 10000 = 0.01 USDC per PULSE ($0.01 price)
  const initialUsdcRate = 10000;

  // Swap fee: 250 basis points = 2.5%
  const initialSwapFeeBps = 250;

  console.log("\nDeploying PulseSwap...");
  console.log("PULSE Token:", pulseTokenAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("Initial USDC Rate:", initialUsdcRate, "(0.01 USDC per PULSE)");
  console.log("Initial Swap Fee:", initialSwapFeeBps / 100, "%");

  const PulseSwap = await hre.ethers.getContractFactory("PulseSwap");
  const pulseSwap = await PulseSwap.deploy(
    pulseTokenAddress,
    usdcAddress,
    initialUsdcRate,
    initialSwapFeeBps
  );

  await pulseSwap.waitForDeployment();
  const pulseSwapAddress = await pulseSwap.getAddress();

  console.log("\nPulseSwap deployed to:", pulseSwapAddress);

  // Update deployment file
  deployment.contracts = deployment.contracts || {};
  deployment.contracts.PulseSwap = pulseSwapAddress;
  deployment.swapConfig = {
    usdcAddress,
    initialUsdcRate: initialUsdcRate.toString(),
    initialSwapFeeBps: initialSwapFeeBps.toString(),
  };
  deployment.deployedAt = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  // Verify contract (optional)
  console.log("\nTo verify on Polygonscan:");
  console.log(`npx hardhat verify --network polygonAmoy ${pulseSwapAddress} ${pulseTokenAddress} ${usdcAddress} ${initialUsdcRate} ${initialSwapFeeBps}`);

  console.log("\n========================================");
  console.log("NEXT STEPS:");
  console.log("========================================");
  console.log("1. Fund the swap contract with PULSE tokens:");
  console.log(`   - Approve PulseSwap to spend PULSE`);
  console.log(`   - Call depositPulse(amount)`);
  console.log("\n2. Fund the swap contract with USDC (for PULSE → USDC swaps):");
  console.log(`   - Approve PulseSwap to spend USDC`);
  console.log(`   - Call depositUsdc(amount)`);
  console.log("\n3. Adjust rate or fee if needed:");
  console.log(`   - Call setUsdcRate(newRate)`);
  console.log(`   - Call setSwapFee(newFeeBps) // 250 = 2.5%`);
  console.log("\n4. Withdraw accumulated fees:");
  console.log(`   - Call withdrawFees()`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
