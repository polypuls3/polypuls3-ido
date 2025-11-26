const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Pool configuration from JSON
const poolsConfig = require("../config/pools.json");

// Months to seconds conversion
const MONTH_IN_SECONDS = 30 * 24 * 60 * 60;

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Configuring pools with the account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, `../deployments/${hre.network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}. Run deploy.js first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const pulseIDOAddress = deployment.contracts.PulseIDO;
  const pulseTokenAddress = deployment.contracts.PulseToken;

  console.log("PulseIDO address:", pulseIDOAddress);
  console.log("PulseToken address:", pulseTokenAddress);

  // Get contract instances
  const pulseIDO = await hre.ethers.getContractAt("PulseIDO", pulseIDOAddress);
  const pulseToken = await hre.ethers.getContractAt("PulseToken", pulseTokenAddress);

  // Check if already initialized
  const isInitialized = await pulseIDO.isInitialized();

  if (!isInitialized) {
    // Payment token address (USDC on Polygon Amoy - use mock for testing)
    // For mainnet, use actual USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
    let paymentTokenAddress;

    if (hre.network.name === "polygon") {
      // Polygon Mainnet USDC
      paymentTokenAddress = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
    } else if (hre.network.name === "polygonAmoy") {
      // For testnet, you might need to deploy a mock USDC or use a faucet token
      // This is a placeholder - replace with actual testnet USDC
      paymentTokenAddress = process.env.USDC_ADDRESS || "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
    } else {
      // For local testing, we'll deploy a mock token
      console.log("Deploying mock USDC for local testing...");
      const MockToken = await hre.ethers.getContractFactory("PulseToken");
      const mockUSDC = await MockToken.deploy("Mock USDC", "USDC", 1_000_000_000, 6, deployer.address);
      await mockUSDC.waitForDeployment();
      paymentTokenAddress = await mockUSDC.getAddress();
      console.log("Mock USDC deployed to:", paymentTokenAddress);
    }

    // Initialize the IDO contract
    console.log("\n1. Initializing PulseIDO...");
    const initTx = await pulseIDO.initialize(
      pulseTokenAddress,
      paymentTokenAddress,
      deployer.address // Treasury address - change for production
    );
    await initTx.wait();
    console.log("PulseIDO initialized!");
    console.log("   Sale Token:", pulseTokenAddress);
    console.log("   Payment Token:", paymentTokenAddress);
    console.log("   Treasury:", deployer.address);
  } else {
    console.log("PulseIDO already initialized, skipping...");
  }

  // Add pools
  console.log("\n2. Adding pools...");
  const currentPoolCount = await pulseIDO.getPoolCount();
  console.log("Current pool count:", currentPoolCount.toString());

  if (currentPoolCount < poolsConfig.pools.length) {
    for (let i = Number(currentPoolCount); i < poolsConfig.pools.length; i++) {
      const pool = poolsConfig.pools[i];

      console.log(`\nAdding pool ${i}: ${pool.name}`);
      console.log("   Hard Cap:", pool.hardCap);
      console.log("   Price:", pool.pricePerToken);
      console.log("   TGE%:", pool.tgePercent);
      console.log("   Cliff:", pool.cliffMonths, "months");
      console.log("   Vesting:", pool.vestingMonths, "months");
      console.log("   Purchasable:", pool.isPurchasable);

      const tx = await pulseIDO.addPool(
        pool.name,
        pool.pricePerToken,
        pool.hardCap,
        pool.tgePercent,
        pool.cliffMonths * MONTH_IN_SECONDS,
        pool.vestingMonths * MONTH_IN_SECONDS,
        pool.isPurchasable
      );
      await tx.wait();
      console.log(`   Pool ${pool.name} added!`);
    }
  } else {
    console.log("All pools already configured, skipping...");
  }

  // Transfer tokens to IDO contract
  console.log("\n3. Checking token allocation...");
  const idoTokenBalance = await pulseToken.balanceOf(pulseIDOAddress);
  console.log("IDO contract token balance:", hre.ethers.formatEther(idoTokenBalance));

  // Calculate total hard cap
  let totalHardCap = BigInt(0);
  for (const pool of poolsConfig.pools) {
    totalHardCap += BigInt(pool.hardCap);
  }
  console.log("Total hard cap needed:", hre.ethers.formatEther(totalHardCap));

  if (idoTokenBalance < totalHardCap) {
    const needed = totalHardCap - idoTokenBalance;
    console.log("Tokens needed:", hre.ethers.formatEther(needed));

    const deployerBalance = await pulseToken.balanceOf(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(deployerBalance));

    if (deployerBalance >= needed) {
      console.log("Transferring tokens to IDO contract...");
      const transferTx = await pulseToken.transfer(pulseIDOAddress, needed);
      await transferTx.wait();
      console.log("Tokens transferred!");
    } else {
      console.log("WARNING: Deployer doesn't have enough tokens to fund the IDO!");
      console.log("Please transfer", hre.ethers.formatEther(needed), "tokens to the IDO contract.");
    }
  } else {
    console.log("IDO contract already has sufficient tokens.");
  }

  // Print summary
  console.log("\n========================================");
  console.log("Configuration Summary:");
  console.log("========================================");

  const poolCount = await pulseIDO.getPoolCount();
  for (let i = 0; i < poolCount; i++) {
    const pool = await pulseIDO.getPool(i);
    console.log(`\nPool ${i}: ${pool.name}`);
    console.log("   Active:", pool.isActive);
    console.log("   Purchasable:", pool.isPurchasable);
    console.log("   Allocated:", hre.ethers.formatEther(pool.totalAllocated), "/", hre.ethers.formatEther(pool.hardCap));
  }

  console.log("\n========================================");
  console.log("\nNext steps:");
  console.log("1. Set TGE time: pulseIDO.setTGETime(timestamp)");
  console.log("2. Activate pools: pulseIDO.setPoolActive(poolId, true)");
  console.log("3. Add team/advisor allocations if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
