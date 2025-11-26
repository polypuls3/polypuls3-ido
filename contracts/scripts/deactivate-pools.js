const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deactivating pools with account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/polygonAmoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const pulseIDO = await hre.ethers.getContractAt("PulseIDO", deployment.contracts.PulseIDO);

  console.log("\nDeactivating all purchasable pools...");

  // Deactivate Seed Sale (pool 0)
  console.log("Deactivating Seed Sale (pool 0)...");
  await (await pulseIDO.setPoolActive(0, false)).wait();
  console.log("Seed Sale deactivated!");

  // Deactivate Private Sale (pool 1)
  console.log("Deactivating Private Sale (pool 1)...");
  await (await pulseIDO.setPoolActive(1, false)).wait();
  console.log("Private Sale deactivated!");

  // Deactivate Public Sale (pool 2)
  console.log("Deactivating Public Sale (pool 2)...");
  await (await pulseIDO.setPoolActive(2, false)).wait();
  console.log("Public Sale deactivated!");

  console.log("\n========================================");
  console.log("All purchasable pools are now INACTIVE");
  console.log("========================================");

  // Verify status
  const poolCount = await pulseIDO.getPoolCount();
  for (let i = 0; i < poolCount; i++) {
    const pool = await pulseIDO.getPool(i);
    console.log(`Pool ${i} (${pool.name}): ${pool.isActive ? "ACTIVE" : "INACTIVE"}`);
  }

  console.log("\nYou can activate pools from the Admin page when ready.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
