const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Withdrawing from old PulseSwap with account:", deployer.address);

  // Old PulseSwap contract address
  const oldSwapAddress = "0x224FdD5342871f1d557649f33bA6dc37669B7dea";

  // Minimal ABI for withdrawal
  const oldSwapABI = [
    "function emergencyWithdrawAll() external",
    "function getPulseBalance() external view returns (uint256)",
    "function getUsdcBalance() external view returns (uint256)",
    "function owner() external view returns (address)",
  ];

  const oldSwap = new hre.ethers.Contract(oldSwapAddress, oldSwapABI, deployer);

  // Check ownership
  const owner = await oldSwap.owner();
  console.log("\nContract owner:", owner);
  console.log("Your address:", deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("ERROR: You are not the owner of this contract!");
    return;
  }

  // Check balances before withdrawal
  const pulseBefore = await oldSwap.getPulseBalance();
  const usdcBefore = await oldSwap.getUsdcBalance();

  console.log("\n--- Balances in Old Contract ---");
  console.log("PULSE:", hre.ethers.formatUnits(pulseBefore, 18));
  console.log("USDC:", hre.ethers.formatUnits(usdcBefore, 6));

  if (pulseBefore === 0n && usdcBefore === 0n) {
    console.log("\nNo funds to withdraw. Contract is empty.");
    return;
  }

  // Perform emergency withdrawal
  console.log("\nExecuting emergencyWithdrawAll()...");
  const tx = await oldSwap.emergencyWithdrawAll();
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Verify withdrawal
  const pulseAfter = await oldSwap.getPulseBalance();
  const usdcAfter = await oldSwap.getUsdcBalance();

  console.log("\n--- Balances After Withdrawal ---");
  console.log("PULSE in contract:", hre.ethers.formatUnits(pulseAfter, 18));
  console.log("USDC in contract:", hre.ethers.formatUnits(usdcAfter, 6));

  console.log("\n✅ Successfully withdrawn:");
  console.log("   PULSE:", hre.ethers.formatUnits(pulseBefore, 18));
  console.log("   USDC:", hre.ethers.formatUnits(usdcBefore, 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
