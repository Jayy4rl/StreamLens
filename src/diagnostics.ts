/**
 * Diagnostic script to check indexer state and find issues
 */

import * as dotenv from "dotenv";
import { createPublicClient, http, parseAbi } from "viem";
import { getChain, getStreamsContractAddress } from "./config/chains";
import { createLogger } from "./utils/logger";

dotenv.config();

const logger = createLogger("Diagnostics");

async function runDiagnostics() {
  logger.info("🔍 Running StreamLens Diagnostics...\n");

  // 1. Check environment configuration
  logger.info("1️⃣ Environment Configuration:");
  console.log("   NETWORK:", process.env.NETWORK || "mainnet");
  console.log("   START_BLOCK:", process.env.START_BLOCK);
  console.log("   BATCH_SIZE:", process.env.BATCH_SIZE);
  console.log("   RPC_URL:", process.env.MAINNET_RPC_URL || "default");
  console.log("");

  // 2. Check state file
  logger.info("2️⃣ Current State:");
  try {
    const fs = await import("fs");
    const stateData = fs.readFileSync("./data/state.json", "utf-8");
    const state = JSON.parse(stateData);
    console.log("   Last Scanned Block:", state.lastScannedBlock);
    console.log("   Total Schemas Indexed:", state.totalSchemasIndexed);
    console.log(
      "   Last Sync:",
      new Date(state.lastSyncTimestamp).toISOString()
    );
    console.log("");
  } catch (error) {
    logger.error("   Failed to read state file:", error);
  }

  // 3. Check schemas file
  logger.info("3️⃣ Schemas Storage:");
  try {
    const fs = await import("fs");
    const schemasData = fs.readFileSync("./data/schemas.json", "utf-8");
    const schemas = JSON.parse(schemasData);
    console.log("   Schemas in storage:", schemas.length);
    console.log("");
  } catch (error) {
    logger.error("   Failed to read schemas file:", error);
  }

  // 4. Test RPC connection and query a sample block
  logger.info("4️⃣ Testing RPC Connection:");
  try {
    const network = (process.env.NETWORK || "mainnet") as "mainnet" | "testnet";
    const rpcUrl = "https://dream-rpc.somnia.network";

    const publicClient = createPublicClient({
      chain: getChain(network),
      transport: http(rpcUrl, {
        timeout: 30_000,
      }),
    });

    const currentBlock = await publicClient.getBlockNumber();
    console.log("   Current block number:", currentBlock.toString());
    console.log("   RPC connection: ✓ Working");
    console.log("");

    // 5. Query for schemas in a sample range
    logger.info("5️⃣ Sample Schema Query:");
    const contractAddress = getStreamsContractAddress(getChain(network).id);
    const SCHEMA_REGISTERED_ABI = parseAbi([
      "event DataSchemaRegistered(bytes32 indexed schemaId)",
    ]);

    // Try last 1000 blocks (RPC limit)
    const fromBlock = currentBlock - 1000n;
    const toBlock = currentBlock;

    console.log(`   Querying blocks ${fromBlock} to ${toBlock}...`);

    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: SCHEMA_REGISTERED_ABI[0],
      fromBlock,
      toBlock,
    });

    console.log(`   Schemas found in last 1k blocks: ${logs.length}`);

    if (logs.length > 0) {
      console.log("\n   Sample schema events:");
      logs.slice(0, 3).forEach((log, i) => {
        console.log(`   ${i + 1}. SchemaId: ${log.args.schemaId}`);
        console.log(`      Block: ${log.blockNumber}`);
        console.log(`      Tx: ${log.transactionHash}`);
      });
    }
    console.log("");

    // 6. Check if schemas exist in configured range
    logger.info("6️⃣ Checking Configured Block Range:");
    const startBlock = BigInt(process.env.START_BLOCK || "233873000");
    const batchSize = parseInt(process.env.BATCH_SIZE || "1000");
    const sampleEnd = startBlock + BigInt(batchSize);

    console.log(`   Configured start: ${startBlock}`);
    console.log(`   Sample range: ${startBlock} to ${sampleEnd}`);

    const sampleLogs = await publicClient.getLogs({
      address: contractAddress,
      event: SCHEMA_REGISTERED_ABI[0],
      fromBlock: startBlock,
      toBlock: sampleEnd,
    });

    console.log(`   Schemas in first batch: ${sampleLogs.length}`);
    console.log("");

    logger.success("✅ Diagnostics Complete!");

    if (sampleLogs.length === 0) {
      logger.warn(
        "\n⚠️  WARNING: No schemas found in the configured START_BLOCK range."
      );
      logger.warn("   This could mean:");
      console.log("   1. No schemas were registered in that block range");
      console.log("   2. The START_BLOCK might be set too high");
      console.log("   3. Schemas might be registered later in the chain");
      console.log(
        "\n   Suggestion: Try querying recent blocks where we found schemas."
      );
    }
  } catch (error) {
    logger.error("RPC test failed:", error);
  }
}

runDiagnostics().catch(console.error);
