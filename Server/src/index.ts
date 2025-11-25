import * as dotenv from "dotenv";
import { createPublicClient, http } from "viem";
import { createLogger } from "./utils/logger";
import { getChain, getStreamsContractAddress } from "./config/chains";
import { UnifiedSchemaRepository } from "./indexer/UnifiedSchemaRepository";
import { HistoricalScanner } from "./indexer/HistoricalScanner";
import { SchemaEnricher } from "./indexer/SchemaEnricher";
import { IndexerConfig } from "./types/schema";
import {
  RealtimeMonitor,
  WebhookManager,
  WebhookEventType,
  indexerEvents,
} from "./realtime";

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
  private realtimeMonitor: RealtimeMonitor | null = null;
  private webhookManager: WebhookManager | null = null;
  private config: IndexerConfig;
  private historicalScanInterval: NodeJS.Timeout | null = null;

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

      // Step 4: Start real-time monitoring (if enabled)
      await this.startRealtimeMonitoring();

      // Display final stats
      logger.info("");
      logger.success("✨ Indexing complete!");
      await this.displayStats();
    } catch (error) {
      logger.error("Indexer failed", error);
      await this.shutdown();
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
   * Start real-time monitoring with WebSocket
   */
  private async startRealtimeMonitoring(): Promise<void> {
    // Check if real-time monitoring is enabled
    const enableRealtime = process.env.ENABLE_REALTIME !== "false";

    if (!enableRealtime) {
      logger.info("Real-time monitoring is disabled");
      return;
    }

    logger.info("");
    logger.info("🔴 Phase 4: Real-Time Monitoring");
    logger.info("━".repeat(50));

    try {
      // Initialize webhook manager
      this.webhookManager = new WebhookManager(this.config.network);
      this.setupWebhooks();
      this.webhookManager.start();

      // Initialize real-time monitor with HTTP RPC URL
      this.realtimeMonitor = new RealtimeMonitor(
        {
          rpcUrl: this.config.rpcUrl, // Use HTTP RPC URL for polling
          contractAddress: this.config.contractAddress,
          network: this.config.network,
          reconnectDelay: 5000,
          maxReconnectAttempts: 10,
        },
        this.repository
      );

      // Subscribe to events for auto-enrichment
      this.setupEventListeners();

      // Start monitoring
      await this.realtimeMonitor.start();

      logger.success("Real-time monitoring started ✓");

      // Start periodic historical scans (hybrid mode)
      this.startPeriodicHistoricalScans();

      logger.info("Listening for new schema registrations...");
      logger.info("Press Ctrl+C to stop");
    } catch (error) {
      logger.error("Failed to start real-time monitoring", error);
      logger.warn("Continuing without real-time monitoring");
    }
  }

  /**
   * Start periodic historical scans to catch any missed events
   * Runs every ~10 minutes (10,000 blocks at ~1 second per block)
   */
  private startPeriodicHistoricalScans(): void {
    // Default: scan every 10,000 blocks worth of time
    const blockInterval = parseInt(
      process.env.HISTORICAL_SCAN_BLOCKS || "10000"
    );
    // Somnia block time is ~1 second, so 10,000 blocks = ~10,000 seconds = ~167 minutes
    // But we'll check more frequently to ensure we don't miss anything
    const intervalMs = parseInt(
      process.env.HISTORICAL_SCAN_INTERVAL_MS || "600000"
    ); // Default: 10 minutes

    logger.info("");
    logger.info("⏰ Hybrid Mode: Periodic Historical Scans");
    logger.info("━".repeat(50));
    logger.info(`Scan Interval: Every ${intervalMs / 1000 / 60} minutes`);
    logger.info(`Expected Block Range per Scan: ~${blockInterval} blocks`);
    logger.info("━".repeat(50));

    this.historicalScanInterval = setInterval(async () => {
      try {
        logger.info("");
        logger.info("🔄 [Periodic Scan] Starting catch-up historical scan...");

        const state = await this.repository.getState();
        const startBlock =
          state.lastScannedBlock > 0n
            ? state.lastScannedBlock + 1n
            : this.config.startBlock;

        logger.info(`[Periodic Scan] Scanning from block ${startBlock}`);

        await this.scanner.scan(startBlock);

        logger.success("[Periodic Scan] Catch-up scan complete ✓");

        // Enrich any new schemas found
        const unenrichedCount = await this.getUnenrichedCount();
        if (unenrichedCount > 0) {
          logger.info(
            `[Periodic Scan] Enriching ${unenrichedCount} new schemas...`
          );
          await this.enricher.enrichAllSchemas();
        }

        await this.displayStats();
      } catch (error) {
        logger.error("[Periodic Scan] Failed to complete catch-up scan", error);
      }
    }, intervalMs);

    logger.info("✅ Periodic historical scans enabled");
  }

  /**
   * Get count of unenriched schemas
   */
  private async getUnenrichedCount(): Promise<number> {
    const allSchemas = await this.repository.getAllSchemas();
    return allSchemas.filter((s) => !s.schemaName || !s.schemaDefinition)
      .length;
  }

  /**
   * Setup webhooks from environment variables
   */
  private setupWebhooks(): void {
    if (!this.webhookManager) return;

    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      logger.info("No webhook URL configured");
      return;
    }

    // Parse event types from env (comma-separated)
    const eventTypesStr =
      process.env.WEBHOOK_EVENTS || "schema.discovered,schema.indexed";
    const eventTypes = eventTypesStr
      .split(",")
      .map((e) => e.trim() as WebhookEventType);

    this.webhookManager.registerWebhook("default", {
      url: webhookUrl,
      events: eventTypes,
      headers: process.env.WEBHOOK_SECRET
        ? { Authorization: `Bearer ${process.env.WEBHOOK_SECRET}` }
        : undefined,
    });

    logger.info(`Webhook registered: ${webhookUrl}`);
  }

  /**
   * Setup event listeners for auto-enrichment
   */
  private setupEventListeners(): void {
    // Auto-enrich schemas when they're indexed
    indexerEvents.onSchemaIndexed(async (event) => {
      if (event.isNew) {
        logger.info(
          `🔄 Auto-enriching newly discovered schema: ${event.schema.schemaId}`
        );
        try {
          const enriched = await this.enricher.enrichSchema(event.schema);
          if (enriched) {
            await this.repository.saveSchema(enriched);
            indexerEvents.emitSchemaEnriched({ schema: enriched });
          }
        } catch (error) {
          logger.error(
            `Failed to auto-enrich schema ${event.schema.schemaId}`,
            error
          );
        }
      }
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("🛑 Shutting down...");

    // Clear periodic scan interval
    if (this.historicalScanInterval) {
      clearInterval(this.historicalScanInterval);
      this.historicalScanInterval = null;
      logger.info("Stopped periodic historical scans");
    }

    if (this.realtimeMonitor) {
      await this.realtimeMonitor.stop();
    }

    if (this.webhookManager) {
      this.webhookManager.stop();
    }

    logger.success("Shutdown complete");
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
  const shutdownHandler = async () => {
    logger.info("\n👋 Shutting down gracefully...");
    await indexer.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

  try {
    await indexer.start();

    // Display sample schemas
    await indexer.getSampleSchemas(10);

    // Keep process alive if real-time monitoring is running
    if (process.env.ENABLE_REALTIME !== "false") {
      logger.info("");
      logger.info("🔄 Indexer running in real-time mode...");
      logger.info("Press Ctrl+C to stop");

      // Keep process alive
      await new Promise(() => {
        // This promise never resolves, keeping the process alive
        // until SIGINT/SIGTERM is received
      });
    }
  } catch (error) {
    logger.error("Fatal error", error);
    await indexer.shutdown();
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
