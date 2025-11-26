const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Token configuration
  const tokenConfig = {
    name: "Pulse Token",
    symbol: "PULSE",
    totalSupply: 1_000_000_000, // 1 billion tokens
    decimals: 18,
  };

  // Deploy PulseToken
  console.log("\n1. Deploying PulseToken...");
  const PulseToken = await hre.ethers.getContractFactory("PulseToken");
  const pulseToken = await PulseToken.deploy(
    tokenConfig.name,
    tokenConfig.symbol,
    tokenConfig.totalSupply,
    tokenConfig.decimals,
    deployer.address // Tokens go to deployer initially
  );
  await pulseToken.waitForDeployment();
  const pulseTokenAddress = await pulseToken.getAddress();
  console.log("PulseToken deployed to:", pulseTokenAddress);

  // Deploy PulseIDO
  console.log("\n2. Deploying PulseIDO...");
  const PulseIDO = await hre.ethers.getContractFactory("PulseIDO");
  const pulseIDO = await PulseIDO.deploy();
  await pulseIDO.waitForDeployment();
  const pulseIDOAddress = await pulseIDO.getAddress();
  console.log("PulseIDO deployed to:", pulseIDOAddress);

  // Save deployment addresses
  const deployment = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      PulseToken: pulseTokenAddress,
      PulseIDO: pulseIDOAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\nDeployment saved to: ${deploymentPath}`);

  console.log("\n========================================");
  console.log("Deployment Summary:");
  console.log("========================================");
  console.log("Network:", hre.network.name);
  console.log("PulseToken:", pulseTokenAddress);
  console.log("PulseIDO:", pulseIDOAddress);
  console.log("========================================");

  console.log("\nNext steps:");
  console.log("1. Run 'npx hardhat run scripts/configure-pools.js --network", hre.network.name + "'");
  console.log("2. Transfer IDO allocation tokens to PulseIDO contract");
  console.log("3. Update frontend .env with contract addresses");

  // Verify contracts if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log("\nVerifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: pulseTokenAddress,
        constructorArguments: [
          tokenConfig.name,
          tokenConfig.symbol,
          tokenConfig.totalSupply,
          tokenConfig.decimals,
          deployer.address,
        ],
      });
      console.log("PulseToken verified!");
    } catch (error) {
      console.log("PulseToken verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: pulseIDOAddress,
        constructorArguments: [],
      });
      console.log("PulseIDO verified!");
    } catch (error) {
      console.log("PulseIDO verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
