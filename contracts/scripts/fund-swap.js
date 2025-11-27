const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Funding PulseSwap with account:", deployer.address);

  // Load deployment
  const deploymentPath = path.join(__dirname, "../deployments/polygonAmoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const pulseSwapAddress = deployment.contracts.PulseSwap;
  const pulseTokenAddress = deployment.contracts.PulseToken;
  const usdcAddress = deployment.swapConfig.usdcAddress;

  console.log("\nContract Addresses:");
  console.log("PulseSwap:", pulseSwapAddress);
  console.log("PulseToken:", pulseTokenAddress);
  console.log("USDC:", usdcAddress);

  // Get contract instances
  const pulseToken = await hre.ethers.getContractAt("IERC20", pulseTokenAddress);
  const usdc = await hre.ethers.getContractAt("IERC20", usdcAddress);
  const pulseSwap = await hre.ethers.getContractAt("PulseSwap", pulseSwapAddress);

  // Check current balances
  const deployerPulseBalance = await pulseToken.balanceOf(deployer.address);
  const deployerUsdcBalance = await usdc.balanceOf(deployer.address);
  const swapPulseBalance = await pulseSwap.getPulseBalance();
  const swapUsdcBalance = await pulseSwap.getUsdcBalance();

  console.log("\n--- Current Balances ---");
  console.log("Your PULSE balance:", hre.ethers.formatUnits(deployerPulseBalance, 18));
  console.log("Your USDC balance:", hre.ethers.formatUnits(deployerUsdcBalance, 6));
  console.log("Swap contract PULSE:", hre.ethers.formatUnits(swapPulseBalance, 18));
  console.log("Swap contract USDC:", hre.ethers.formatUnits(swapUsdcBalance, 6));

  // ============ CONFIGURE AMOUNTS HERE ============
  // Set how much liquidity you want to add
  const pulseAmountToDeposit = hre.ethers.parseUnits("100000", 18); // 100,000 PULSE
  const usdcAmountToDeposit = hre.ethers.parseUnits("0", 6);        // 0 USDC (skip for now)
  // ================================================

  console.log("\n--- Amounts to Deposit ---");
  console.log("PULSE to deposit:", hre.ethers.formatUnits(pulseAmountToDeposit, 18));
  console.log("USDC to deposit:", hre.ethers.formatUnits(usdcAmountToDeposit, 6));

  // Deposit PULSE (for users buying PULSE with USDC)
  if (deployerPulseBalance >= pulseAmountToDeposit && pulseAmountToDeposit > 0) {
    console.log("\n1. Approving PULSE...");
    const approvePulseTx = await pulseToken.approve(pulseSwapAddress, pulseAmountToDeposit);
    await approvePulseTx.wait();
    console.log("   PULSE approved");

    console.log("2. Depositing PULSE...");
    const depositPulseTx = await pulseSwap.depositPulse(pulseAmountToDeposit);
    await depositPulseTx.wait();
    console.log("   PULSE deposited!");
  } else if (pulseAmountToDeposit > 0) {
    console.log("\n⚠️  Insufficient PULSE balance to deposit");
  }

  // Deposit USDC (for users selling PULSE for USDC)
  if (deployerUsdcBalance >= usdcAmountToDeposit && usdcAmountToDeposit > 0) {
    console.log("\n3. Approving USDC...");
    const approveUsdcTx = await usdc.approve(pulseSwapAddress, usdcAmountToDeposit);
    await approveUsdcTx.wait();
    console.log("   USDC approved");

    console.log("4. Depositing USDC...");
    const depositUsdcTx = await pulseSwap.depositUsdc(usdcAmountToDeposit);
    await depositUsdcTx.wait();
    console.log("   USDC deposited!");
  } else if (usdcAmountToDeposit > 0) {
    console.log("\n⚠️  Insufficient USDC balance to deposit");
  }

  // Check final balances
  const finalSwapPulse = await pulseSwap.getPulseBalance();
  const finalSwapUsdc = await pulseSwap.getUsdcBalance();

  console.log("\n--- Final Swap Contract Balances ---");
  console.log("PULSE liquidity:", hre.ethers.formatUnits(finalSwapPulse, 18));
  console.log("USDC liquidity:", hre.ethers.formatUnits(finalSwapUsdc, 6));

  // Show current rate
  const usdcRate = await pulseSwap.usdcRate();
  console.log("\n--- Exchange Rate ---");
  console.log("1 PULSE =", Number(usdcRate) / 1e6, "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
