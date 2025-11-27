const hre = require("hardhat");

async function main() {
  const swapAddress = "0x96F07b406C02b0225C02B002d7470b8Ab769b559";
  const pulseAddress = "0x25718cf963455f09081EA27C5DfAd6CE4CF4292C";

  const swap = await hre.ethers.getContractAt("PulseSwapV1", swapAddress);
  const pulse = await hre.ethers.getContractAt("IERC20", pulseAddress);

  console.log("=== Contract State ===");
  console.log("Version:", await swap.version());
  console.log("getPulseBalance():", hre.ethers.formatUnits(await swap.getPulseBalance(), 18));
  console.log("getUsdcBalance():", hre.ethers.formatUnits(await swap.getUsdcBalance(), 6));
  console.log("");
  console.log("=== Raw Token Balances ===");
  console.log("PULSE.balanceOf(swap):", hre.ethers.formatUnits(await pulse.balanceOf(swapAddress), 18));
  console.log("");
  console.log("=== Rates ===");
  console.log("usdcRate:", (await swap.usdcRate()).toString());
  console.log("swapFeeBps:", (await swap.swapFeeBps()).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
