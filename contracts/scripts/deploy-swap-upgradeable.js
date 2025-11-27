const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PulseSwapV1 (Upgradeable) with account:", deployer.address);
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

  console.log("\nDeploying PulseSwapV1 as UUPS Proxy...");
  console.log("PULSE Token:", pulseTokenAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("Initial USDC Rate:", initialUsdcRate, "(0.01 USDC per PULSE)");
  console.log("Initial Swap Fee:", initialSwapFeeBps / 100, "%");

  const PulseSwapV1 = await hre.ethers.getContractFactory("PulseSwapV1");

  // Deploy as UUPS proxy
  const pulseSwap = await hre.upgrades.deployProxy(
    PulseSwapV1,
    [pulseTokenAddress, usdcAddress, initialUsdcRate, initialSwapFeeBps],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );

  await pulseSwap.waitForDeployment();
  const proxyAddress = await pulseSwap.getAddress();

  // Get implementation address
  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("Proxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("Version:", await pulseSwap.version());

  // Update deployment file
  deployment.contracts = deployment.contracts || {};
  deployment.contracts.PulseSwap = proxyAddress;
  deployment.contracts.PulseSwapImplementation = implementationAddress;
  deployment.swapConfig = {
    usdcAddress,
    initialUsdcRate: initialUsdcRate.toString(),
    initialSwapFeeBps: initialSwapFeeBps.toString(),
    proxyType: "UUPS",
    version: "1.0.0",
  };
  deployment.deployedAt = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);

  // Verify contracts
  console.log("\nTo verify the implementation contract on Polygonscan:");
  console.log(`npx hardhat verify --network polygonAmoy ${implementationAddress}`);

  console.log("\n========================================");
  console.log("NEXT STEPS:");
  console.log("========================================");
  console.log("1. Update frontend with new contract address:", proxyAddress);
  console.log("\n2. Fund the swap contract with PULSE tokens:");
  console.log(`   - Approve PulseSwap to spend PULSE`);
  console.log(`   - Call depositPulse(amount)`);
  console.log("\n3. Fund the swap contract with USDC (for PULSE → USDC swaps):");
  console.log(`   - Approve PulseSwap to spend USDC`);
  console.log(`   - Call depositUsdc(amount)`);
  console.log("\n4. To upgrade in the future:");
  console.log(`   - Create PulseSwapV2.sol with new features`);
  console.log(`   - Run: npx hardhat run scripts/upgrade-swap.js --network polygonAmoy`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
