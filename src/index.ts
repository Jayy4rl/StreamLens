import * as dotenv from "dotenv";
import { createPublicClient, http } from "viem";
import { createLogger } from "./utils/logger";
import { getChain, getStreamsContractAddress } from "./config/chains";
import { UnifiedSchemaRepository } from "./indexer/UnifiedSchemaRepository";
import { HistoricalScanner } from "./indexer/HistoricalScanner";
import { SchemaEnricher } from "./indexer/SchemaEnricher";
import { IndexerConfig } from "./types/schema";

// Load environment variables
dotenv.config();

const logger = createLogger("Main");

/**
 * Main indexer application
 */
class StreamLensIndexer {
  private repository: UnifiedSchemaRepository;
  private scanner: HistoricalScanner;
  private enricher: SchemaEnricher;
  private config: IndexerConfig;

  constructor() {
    // Load configuration from environment
    this.config = this.loadConfig();

    // Initialize repository
    this.repository = new UnifiedSchemaRepository("./data");

    // Create public client for blockchain interaction
    const publicClient = createPublicClient({
      chain: getChain(this.config.network),
      transport: http(this.config.rpcUrl, {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    });

    // Initialize scanner and enricher
    this.scanner = new HistoricalScanner(
      publicClient,
      this.repository,
      this.config.contractAddress,
      this.config.batchSize
    );

    this.enricher = new SchemaEnricher(publicClient, this.repository);
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): IndexerConfig {
    const network = (process.env.NETWORK || "mainnet") as "mainnet" | "testnet";
    const rpcUrl = "https://dream-rpc.somnia.network";
    // network === "mainnet"
    //   ? process.env.MAINNET_RPC_URL || "https://somnia-rpc.publicnode.com"
    //   : process.env.TESTNET_RPC_URL || "https://dream-rpc.somnia.network";

    const wsUrl =
      network === "mainnet"
        ? process.env.MAINNET_WS_URL
        : process.env.TESTNET_WS_URL;

    const chain = getChain(network);
    const contractAddress = getStreamsContractAddress(chain.id);

    const config: IndexerConfig = {
      network,
      rpcUrl,
      wsUrl,
      startBlock: BigInt(process.env.START_BLOCK || "234833000"),
      batchSize: parseInt(process.env.BATCH_SIZE || "1000"),
      contractAddress,
    };

    logger.info("Configuration loaded", {
      network: config.network,
      rpcUrl: config.rpcUrl,
      contractAddress: config.contractAddress,
      startBlock: config.startBlock.toString(),
      batchSize: config.batchSize,
    });

    return config;
  }

  /**
   * Start the indexing process
   */
  async start(): Promise<void> {
    try {
      logger.info("🚀 Starting StreamLens Schema Indexer...");
      logger.info(`Network: ${this.config.network.toUpperCase()}`);
      logger.info(`Storage: ${this.repository.getStorageType()}`);

      // Initialize repository
      await this.repository.initialize();

      // Display initial stats
      await this.displayStats();

      // Step 1: Historical scan
      await this.runHistoricalScan();

      // Step 2: Enrich schemas with metadata
      await this.runEnrichment();

      // Step 3: Verify with SDK
      await this.runVerification();

      // Display final stats
      logger.info("");
      logger.success("✨ Indexing complete!");
      await this.displayStats();
    } catch (error) {
      logger.error("Indexer failed", error);
      process.exit(1);
    }
  }

  /**
   * Run historical scan
   */
  private async runHistoricalScan(): Promise<void> {
    logger.info("");
    logger.info("📜 Phase 1: Historical Scan");
    logger.info("━".repeat(50));

    const state = await this.repository.getState();
    const startBlock =
      state.lastScannedBlock > 0n
        ? state.lastScannedBlock + 1n
        : this.config.startBlock;

    logger.info(`Starting from block ${startBlock}`);

    await this.scanner.scan(startBlock);

    logger.info("Historical scan complete ✓");
  }

  /**
   * Run schema enrichment
   */
  private async runEnrichment(): Promise<void> {
    logger.info("");
    logger.info("🔍 Phase 2: Schema Enrichment");
    logger.info("━".repeat(50));

    await this.enricher.enrichAllSchemas();

    logger.info("Schema enrichment complete ✓");
  }

  /**
   * Run verification with SDK
   */
  private async runVerification(): Promise<void> {
    logger.info("");
    logger.info("✅ Phase 3: Verification");
    logger.info("━".repeat(50));

    await this.enricher.verifySchemasWithSDK();

    logger.info("Verification complete ✓");
  }

  /**
   * Display current statistics
   */
  private async displayStats(): Promise<void> {
    const stats = await this.repository.getStats();

    logger.info("");
    logger.info("📊 Current Statistics");
    logger.info("━".repeat(50));
    logger.info(`Total Schemas: ${stats.totalSchemas}`);
    logger.info(`Unique Publishers: ${stats.uniquePublishers}`);
    logger.info(`Public Schemas: ${stats.publicSchemas}`);
    logger.info(`Last Scanned Block: ${stats.lastScannedBlock}`);
    logger.info(`Last Sync: ${stats.lastSync}`);
    logger.info("━".repeat(50));
  }

  /**
   * Get a sample of indexed schemas
   */
  async getSampleSchemas(count: number = 5): Promise<void> {
    const schemas = (await this.repository.getAllSchemas()).slice(0, count);

    if (schemas.length === 0) {
      logger.info("No schemas indexed yet");
      return;
    }

    logger.info("");
    logger.info(`📋 Sample Schemas (showing ${schemas.length})`);
    logger.info("━".repeat(50));

    schemas.forEach((schema, index) => {
      logger.info(`\n${index + 1}. ${schema.schemaName || "Unnamed Schema"}`);
      logger.info(`   Schema ID: ${schema.schemaId}`);
      logger.info(`   Publisher: ${schema.publisherAddress}`);
      logger.info(`   Definition: ${schema.schemaDefinition || "N/A"}`);
      logger.info(`   Block: ${schema.blockNumber.toString()}`);
      if (schema.metadata?.usageCount) {
        logger.info(`   Usage Count: ${schema.metadata.usageCount}`);
      }
    });

    logger.info("━".repeat(50));
  }
}

/**
 * Main execution
 */
async function main() {
  const indexer = new StreamLensIndexer();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.info("\n👋 Shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("\n👋 Shutting down gracefully...");
    process.exit(0);
  });

  try {
    await indexer.start();

    // Display sample schemas
    await indexer.getSampleSchemas(10);
  } catch (error) {
    logger.error("Fatal error", error);
    process.exit(1);
  }
}

// Run the indexer
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { StreamLensIndexer };
