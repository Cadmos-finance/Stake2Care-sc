import { ethers } from "hardhat";

async function main() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const deployerAddress = await deployer.getAddress();
  
  console.log("Operating from account:", deployerAddress);
  console.log("---");

  // Contract addresses
  const testUSDT = "0x32750B785C79a815f290968C5107fa7574767BAf";
  const testUSDC = "0xeF768722F994b2caf166F1C96139F3cF1dC7812B";
  const USDTVault = "0xbE7D1b19dCE9ccdbbFE8c1c67944B2119Ac49B0A";
  const USDCVault = "0xcb251b137f6Fa1ea0A99A9Ca1dC07D1aE8CA7dAB";
  const USDTImpactVault = "0xaa7Fa059F07bAa6B5D3B867c8bfc69a190d237B7";
  const USDCImpactVault = "0xAfeD3ef4B4E400b65e4780A6E59f4d44dcb0e15e";

  // Get contract instances
  const usdtToken = await ethers.getContractAt("MockERC20", testUSDT);
  const usdcToken = await ethers.getContractAt("MockERC20", testUSDC);
  const usdtVault = await ethers.getContractAt("UnderlyingVaultMock", USDTVault);
  const usdcVault = await ethers.getContractAt("UnderlyingVaultMock", USDCVault);
  const usdtImpactVault = await ethers.getContractAt("ERC4626ImpactVault", USDTImpactVault);
  const usdcImpactVault = await ethers.getContractAt("ERC4626ImpactVault", USDCImpactVault);

  const depositAmount = ethers.parseUnits("100", 6); // 100 tokens
  const donationAmount = ethers.parseUnits("1", 6); // $1 donation

  // ===== USDT Flow =====
  console.log("🔹 USDT Flow");
  console.log("---");

  // 1. Approve USDT for USDTVault
  console.log("Approving USDT for USDTVault...");
  let tx = await usdtToken.approve(USDTVault, depositAmount);
  await tx.wait();
  console.log("✓ Approved");

  // 2. Deposit USDT into USDTVault
  console.log("Depositing USDT into USDTVault...");
  tx = await usdtVault.deposit(depositAmount, deployerAddress);
  await tx.wait();
  console.log("✓ Deposited");

  // 3. Check vault share balance
  const usdtVaultBalance = await usdtVault.balanceOf(deployerAddress);
  console.log("USDTVault shares:", ethers.formatUnits(usdtVaultBalance, 6));

  // 4. Transfer (donate) vault shares to Impact Vault
  console.log("Transferring (donating) to USDTImpactVault...");
  tx = await usdtVault.transfer(USDTImpactVault, donationAmount);
  await tx.wait();
  console.log("✓ Donated");

  console.log("---");

  // ===== USDC Flow =====
  console.log("🔹 USDC Flow");
  console.log("---");

  // 1. Approve USDC for USDCVault
  console.log("Approving USDC for USDCVault...");
  tx = await usdcToken.approve(USDCVault, depositAmount);
  await tx.wait();
  console.log("✓ Approved");

  // 2. Deposit USDC into USDCVault
  console.log("Depositing USDC into USDCVault...");
  tx = await usdcVault.deposit(depositAmount, deployerAddress);
  await tx.wait();
  console.log("✓ Deposited");

  // 3. Check vault share balance
  const usdcVaultBalance = await usdcVault.balanceOf(deployerAddress);
  console.log("USDCVault shares:", ethers.formatUnits(usdcVaultBalance, 6));

  // 4. Transfer (donate) vault shares to Impact Vault
  console.log("Transferring (donating) to USDCImpactVault...");
  tx = await usdcVault.transfer(USDCImpactVault, donationAmount);
  await tx.wait();
  console.log("✓ Donated");

  console.log("---");
  console.log("✅ All operations completed successfully!");
  
  // Final balances
  console.log("\n📊 Final Balances:");
  const usdtImpactBalance = await usdtVault.balanceOf(USDTImpactVault);
  const usdcImpactBalance = await usdcVault.balanceOf(USDCImpactVault);
  console.log("USDTImpactVault holds:", ethers.formatUnits(usdtImpactBalance, 6), "USDTVault shares");
  console.log("USDCImpactVault holds:", ethers.formatUnits(usdcImpactBalance, 6), "USDCVault shares");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});