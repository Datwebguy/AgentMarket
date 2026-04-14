import { ethers, network } from "hardhat";

// ─── MAINNET CONFIGURATION ──────────────────────────────────────────────────
// XLayer Mainnet (chain ID 196)
const MAINNET_USDC = "0x74b7F16337b8972027F6196A17a631aC6dE26d22";
const MAINNET_RPC  = "https://rpc.xlayer.tech";
const OKLINK_EXPLORER = "https://www.oklink.com/xlayer/address/";

const USDC_ADDRESSES: Record<string, string> = {
  xlayer:        MAINNET_USDC,
  xlayerTestnet: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
  hardhat:       "",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);
  const balanceOKB = parseFloat(ethers.formatEther(balance));

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  AgentRegistry — XLayer MAINNET Deployment");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Network:     ${network.name}`);
  console.log(`  Chain ID:    ${network.config.chainId}`);
  console.log(`  RPC:         ${MAINNET_RPC}`);
  console.log(`  Deployer:    ${deployer.address}`);
  console.log(`  OKB Balance: ${balanceOKB.toFixed(6)} OKB`);
  console.log(`  USDC:        ${MAINNET_USDC}`);
  console.log("═══════════════════════════════════════════════════════\n");

  // Safety checks before spending real gas
  if (network.name === "xlayer") {
    if (balanceOKB < 0.01) {
      throw new Error(
        `Insufficient OKB for gas. Need at least 0.01 OKB, have ${balanceOKB.toFixed(6)}.\n` +
        `Fund your wallet at: https://www.okx.com/xlayer/bridge`
      );
    }
    console.log("✓ Sufficient OKB for deployment");
    console.log("✓ Deploying to XLayer MAINNET — this uses real funds\n");
  }

  const usdcAddress = USDC_ADDRESSES[network.name];
  if (!usdcAddress && network.name !== "hardhat") {
    throw new Error(`No USDC address configured for network: ${network.name}`);
  }

  // Deploy AgentRegistry
  console.log("Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy(usdcAddress, {
    gasLimit: 3_000_000,
  });

  console.log(`Transaction hash: ${registry.deploymentTransaction()?.hash}`);
  console.log("Waiting for confirmation...");

  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT SUCCESSFUL");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Contract:  ${address}`);
  console.log(`  Explorer:  ${OKLINK_EXPLORER}${address}`);
  console.log("\n  Add these to your .env files NOW:");
  console.log(`  AGENT_REGISTRY_ADDRESS="${address}"`);
  console.log(`  NEXT_PUBLIC_REGISTRY_ADDRESS="${address}"`);
  console.log("═══════════════════════════════════════════════════════\n");

  // Verify contract source on OKLink
  if (network.name === "xlayer") {
    console.log("Verifying contract source on OKLink...");
    try {
      const { run } = await import("hardhat");
      await run("verify:verify", {
        address,
        constructorArguments: [usdcAddress],
      });
      console.log("✓ Contract verified and public on OKLink");
      console.log(`  ${OKLINK_EXPLORER}${address}#code`);
    } catch (err: any) {
      if (err.message?.includes("Already Verified")) {
        console.log("✓ Contract already verified");
      } else {
        console.log("Verification failed — verify manually on OKLink:", err.message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗ Deployment failed:", err.message);
    process.exit(1);
  });
