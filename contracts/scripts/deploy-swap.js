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

  // POL rate: 1e16 = 0.01 POL per PULSE
  // At POL price of ~$0.50, this means PULSE = $0.005 in POL terms
  // Adjust based on desired POL/PULSE ratio
  const initialPolRate = hre.ethers.parseUnits("0.01", 18); // 0.01 POL per PULSE

  console.log("\nDeploying PulseSwap...");
  console.log("PULSE Token:", pulseTokenAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("Initial USDC Rate:", initialUsdcRate, "(0.01 USDC per PULSE)");
  console.log("Initial POL Rate:", initialPolRate.toString(), "(0.01 POL per PULSE)");

  const PulseSwap = await hre.ethers.getContractFactory("PulseSwap");
  const pulseSwap = await PulseSwap.deploy(
    pulseTokenAddress,
    usdcAddress,
    initialUsdcRate,
    initialPolRate
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
    initialPolRate: initialPolRate.toString(),
  };
  deployment.deployedAt = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  // Verify contract (optional)
  console.log("\nTo verify on Polygonscan:");
  console.log(`npx hardhat verify --network polygonAmoy ${pulseSwapAddress} ${pulseTokenAddress} ${usdcAddress} ${initialUsdcRate} ${initialPolRate}`);

  console.log("\n========================================");
  console.log("NEXT STEPS:");
  console.log("========================================");
  console.log("1. Fund the swap contract with PULSE tokens:");
  console.log(`   - Approve PulseSwap to spend PULSE`);
  console.log(`   - Call depositPulse(amount)`);
  console.log("\n2. Fund the swap contract with USDC (for PULSE → USDC swaps):");
  console.log(`   - Approve PulseSwap to spend USDC`);
  console.log(`   - Call depositUsdc(amount)`);
  console.log("\n3. Fund the swap contract with POL (for PULSE → POL swaps):");
  console.log(`   - Call depositPol() with value`);
  console.log("\n4. Adjust rates if needed:");
  console.log(`   - Call setUsdcRate(newRate)`);
  console.log(`   - Call setPolRate(newRate)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
