/**
 * StreamLens Combined Entry Point
 *
 * Runs both the API server and the Indexer (Historical Scan + Realtime Monitoring)
 * in a single process for efficient deployment.
 */

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
import { startServer } from "./api/server";

// Load environment variables
dotenv.config();

const logger = createLogger("Combined");

/**
 * Combined StreamLens Service
 * Runs API Server + Indexer in single process
 */
class StreamLensCombined {
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
      publicClient as any,
      this.repository,
      this.config.contractAddress,
      this.config.batchSize
    );

    this.enricher = new SchemaEnricher(publicClient as any, this.repository);
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): IndexerConfig {
    const network = (process.env.NETWORK || "mainnet") as "mainnet" | "testnet";
    const rpcUrl = "https://dream-rpc.somnia.network";

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
   * Start the combined service (API + Indexer)
   */
  async start(): Promise<void> {
    try {
      logger.info("🚀 Starting StreamLens Combined Service...");
      logger.info(`Network: ${this.config.network.toUpperCase()}`);

      // Step 1: Start API Server first (so health checks work)
      logger.info("");
      logger.info("🌐 Starting API Server...");
      logger.info("━".repeat(50));
      startServer();
      logger.info("API Server started ✓");

      // Step 2: Initialize repository
      await this.repository.initialize();
      logger.info(`Storage: ${this.repository.getStorageType()}`);

      // Step 3: Run Historical scan
      await this.runHistoricalScan();

      // Step 4: Enrich schemas with metadata
      await this.runEnrichment();

      // Step 5: Verify with SDK
      await this.runVerification();

      // Step 6: Start real-time monitoring
      await this.startRealtimeMonitoring();

      // Step 7: Schedule periodic historical scans
      this.schedulePeriodicScans();

      logger.info("");
      logger.success("✨ StreamLens Combined Service fully operational!");
      logger.info("━".repeat(50));
      logger.info("📡 API Server: Running");
      logger.info("📜 Historical Scanner: Complete");
      logger.info("🔴 Realtime Monitor: Active");
      logger.info("━".repeat(50));

      // Keep process alive
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error("Combined service failed to start", error);
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
   * Start real-time monitoring
   */
  private async startRealtimeMonitoring(): Promise<void> {
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
          rpcUrl: this.config.rpcUrl,
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

      logger.info("Real-time monitoring started ✓");
      logger.info("Listening for new schema registrations...");
    } catch (error) {
      logger.error("Failed to start real-time monitoring", error);
      logger.warn("Continuing without real-time monitoring");
    }
  }

  /**
   * Schedule periodic historical scans
   */
  private schedulePeriodicScans(): void {
    const intervalMs = parseInt(
      process.env.HISTORICAL_SCAN_INTERVAL_MS || "300000"
    ); // 5 minutes default

    if (intervalMs > 0) {
      logger.info(
        `Scheduling periodic historical scans every ${intervalMs / 1000}s`
      );

      this.historicalScanInterval = setInterval(async () => {
        try {
          logger.info("Running periodic historical scan...");
          await this.runHistoricalScan();
          await this.runEnrichment();
        } catch (error) {
          logger.error("Periodic scan failed", error);
        }
      }, intervalMs);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down StreamLens Combined Service...");

    if (this.historicalScanInterval) {
      clearInterval(this.historicalScanInterval);
    }

    if (this.realtimeMonitor) {
      await this.realtimeMonitor.stop();
    }

    if (this.webhookManager) {
      this.webhookManager.stop();
    }

    logger.info("Shutdown complete");
  }
}

// Start the combined service
const service = new StreamLensCombined();
service.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
