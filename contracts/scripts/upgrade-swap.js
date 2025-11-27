const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrading PulseSwap with account:", deployer.address);

  // Load existing deployment to get proxy address
  const deploymentPath = path.join(__dirname, "../deployments/polygonAmoy.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Please deploy the contract first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const proxyAddress = deployment.contracts?.PulseSwap;

  if (!proxyAddress) {
    throw new Error("PulseSwap proxy address not found in deployment.");
  }

  console.log("Current Proxy Address:", proxyAddress);

  // Get old implementation address
  const oldImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Old Implementation Address:", oldImplementationAddress);

  // Get current version before upgrade
  const oldContract = await hre.ethers.getContractAt("PulseSwapV1", proxyAddress);
  const oldVersion = await oldContract.version();
  console.log("Old Version:", oldVersion);

  // Change this to the new contract version (e.g., PulseSwapV2)
  const NEW_CONTRACT_NAME = "PulseSwapV1"; // Update this for future versions

  console.log("\nUpgrading to", NEW_CONTRACT_NAME, "...");

  const NewPulseSwap = await hre.ethers.getContractFactory(NEW_CONTRACT_NAME);

  // Perform the upgrade
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, NewPulseSwap, {
    kind: "uups"
  });

  await upgraded.waitForDeployment();

  // Get new implementation address
  const newImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  const newVersion = await upgraded.version();

  console.log("\n========================================");
  console.log("UPGRADE COMPLETE");
  console.log("========================================");
  console.log("Proxy Address (unchanged):", proxyAddress);
  console.log("Old Implementation:", oldImplementationAddress);
  console.log("New Implementation:", newImplementationAddress);
  console.log("Old Version:", oldVersion);
  console.log("New Version:", newVersion);

  // Update deployment file
  deployment.contracts.PulseSwapImplementation = newImplementationAddress;
  deployment.swapConfig.version = newVersion;
  deployment.lastUpgrade = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info updated at:", deploymentPath);

  // Verify new implementation
  console.log("\nTo verify the new implementation on Polygonscan:");
  console.log(`npx hardhat verify --network polygonAmoy ${newImplementationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
