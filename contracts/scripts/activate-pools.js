const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Activating pools with account:", deployer.address);

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/polygonAmoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const pulseIDO = await hre.ethers.getContractAt("PulseIDO", deployment.contracts.PulseIDO);

  // Activate purchasable pools (Seed, Private, Public)
  console.log("\nActivating pools...");

  // Activate Seed Sale (pool 0)
  console.log("Activating Seed Sale (pool 0)...");
  await (await pulseIDO.setPoolActive(0, true)).wait();
  console.log("Seed Sale activated!");

  // Activate Private Sale (pool 1)
  console.log("Activating Private Sale (pool 1)...");
  await (await pulseIDO.setPoolActive(1, true)).wait();
  console.log("Private Sale activated!");

  // Activate Public Sale (pool 2)
  console.log("Activating Public Sale (pool 2)...");
  await (await pulseIDO.setPoolActive(2, true)).wait();
  console.log("Public Sale activated!");

  console.log("\n========================================");
  console.log("All purchasable pools are now active!");
  console.log("========================================");

  // Verify status
  const poolCount = await pulseIDO.getPoolCount();
  for (let i = 0; i < poolCount; i++) {
    const pool = await pulseIDO.getPool(i);
    console.log(`Pool ${i} (${pool.name}): ${pool.isActive ? "ACTIVE" : "INACTIVE"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
