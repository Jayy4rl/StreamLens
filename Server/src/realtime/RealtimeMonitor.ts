import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  WatchContractEventReturnType,
  Log,
  Hex,
  Address,
} from "viem";
import { createLogger } from "../utils/logger";
import { ISchemaRepository } from "../indexer/ISchemaRepository";
import { IndexedSchema } from "../types/schema";
import { indexerEvents } from "./EventEmitter";
import { retryWithBackoff } from "../utils/retry";

const logger = createLogger("RealtimeMonitor");

/**
 * ABI for DataSchemaRegistered event
 * Using proper ABI JSON format for watchContractEvent
 */
const SCHEMA_REGISTERED_ABI = [
  {
    type: "event",
    name: "DataSchemaRegistered",
    inputs: [
      {
        indexed: true,
        name: "schemaId",
        type: "bytes32",
      },
    ],
  },
] as const;

/**
 * Configuration for realtime monitoring
 */
export interface RealtimeConfig {
  rpcUrl: string; // HTTP RPC URL for polling
  contractAddress: Address;
  network: "mainnet" | "testnet";
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * Real-time monitor for DataSchemaRegistered events using WebSocket
 */
export class RealtimeMonitor {
  private config: RealtimeConfig;
  private repository: ISchemaRepository;
  private wsClient: ReturnType<typeof createPublicClient> | null = null;
  private unwatch: WatchContractEventReturnType | null = null;
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: RealtimeConfig, repository: ISchemaRepository) {
    this.config = {
      reconnectDelay: 5000, // 5 seconds
      maxReconnectAttempts: 10,
      ...config,
    };
    this.repository = repository;
  }

  /**
   * Start real-time monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Real-time monitor is already running");
      return;
    }

    logger.info("🔴 Starting real-time monitor (HTTP polling)...", {
      rpcUrl: this.config.rpcUrl,
      contract: this.config.contractAddress,
    });

    try {
      await this.connect();
      this.isRunning = true;
      logger.success("✅ Real-time monitor started successfully");
    } catch (error) {
      logger.error("Failed to start real-time monitor", error);
      indexerEvents.emitError({
        error: error as Error,
        context: "RealtimeMonitor.start",
      });
      throw error;
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stop(): Promise<void> {
    logger.info("Stopping real-time monitor...");

    this.isRunning = false;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unwatch contract events
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;
    }

    // Close WebSocket connection
    if (this.wsClient) {
      // Viem doesn't expose close method directly, nullify it
      this.wsClient = null;
    }

    logger.success("Real-time monitor stopped");
  }

  /**
   * Connect to RPC endpoint using HTTP transport for polling
   * HTTP polling is more reliable than WebSocket subscriptions
   */
  private async connect(): Promise<void> {
    try {
      // Use HTTP transport for polling
      const transport = http(this.config.rpcUrl, {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1000,
      });

      // Create public client with HTTP transport
      this.wsClient = createPublicClient({
        transport,
      });

      logger.info("📡 RPC connection established (HTTP polling)", {
        url: this.config.rpcUrl,
      });
      indexerEvents.emitConnectionEstablished({
        type: "http",
        message: `Connected to ${this.config.rpcUrl}`,
      });

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;

      // Start watching contract events
      this.watchEvents();
    } catch (error) {
      logger.error("Failed to connect to RPC", error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Watch contract events for schema registrations
   * Uses polling instead of WebSocket subscriptions since Somnia may not support eth_subscribe
   */
  private watchEvents(): void {
    if (!this.wsClient) {
      logger.error("Cannot watch events: WebSocket client not initialized");
      return;
    }

    logger.info("👀 Watching for DataSchemaRegistered events...");

    try {
      // Watch for contract events using polling (not WebSocket subscriptions)
      // This is more compatible with various RPC endpoints
      this.unwatch = this.wsClient.watchContractEvent({
        address: this.config.contractAddress,
        abi: SCHEMA_REGISTERED_ABI,
        eventName: "DataSchemaRegistered",
        onLogs: (logs) => this.handleLogs(logs),
        onError: (error) => {
          // Only log and reconnect for real errors, not empty ErrorEvents
          if (error && error.message) {
            this.handleWatchError(error);
          } else {
            logger.warn(
              "Received empty error event (may be normal for polling)",
              { error }
            );
          }
        },
        poll: true, // Use polling instead of WebSocket subscriptions
        pollingInterval: 2000, // Poll every 2 seconds
      });

      logger.success("✅ Event watcher configured (polling mode)");
    } catch (error) {
      logger.error("Failed to setup event watcher", error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Handle incoming event logs
   */
  private async handleLogs(logs: Log[]): Promise<void> {
    if (logs.length === 0) return;

    logger.info(`📨 Received ${logs.length} new schema registration event(s)`);

    for (const log of logs) {
      try {
        await this.processEvent(log);
      } catch (error) {
        logger.error(`Failed to process event log`, error);
        indexerEvents.emitError({
          error: error as Error,
          context: "RealtimeMonitor.handleLogs",
        });
      }
    }
  }

  /**
   * Process a single schema registration event
   */
  private async processEvent(log: Log): Promise<void> {
    const schemaId = (log as any).topics[1] as Hex;

    logger.info(`🔍 Processing schema registration: ${schemaId}`);

    // Emit discovery event
    indexerEvents.emitSchemaDiscovered({
      schemaId,
      blockNumber: log.blockNumber!,
      timestamp: Date.now(),
      transactionHash: log.transactionHash!,
    });

    // Check if schema already exists (duplicate prevention)
    const existing = await this.repository.getSchema(schemaId);
    if (existing) {
      logger.info(`⏭️  Schema ${schemaId} already indexed, skipping`);
      return;
    }

    // Fetch block details for timestamp
    const block = await retryWithBackoff(
      () => this.wsClient!.getBlock({ blockNumber: log.blockNumber! }),
      { maxRetries: 3 },
      `Fetching block ${log.blockNumber}`
    );

    if (block instanceof Error) {
      throw block;
    }

    // Fetch transaction details for publisher address
    const transaction = await retryWithBackoff(
      () => this.wsClient!.getTransaction({ hash: log.transactionHash! }),
      { maxRetries: 3 },
      `Fetching transaction ${log.transactionHash}`
    );

    if (transaction instanceof Error) {
      throw transaction;
    }

    // Create indexed schema
    const schema: IndexedSchema = {
      schemaId,
      schemaName: "", // Will be enriched later
      schemaDefinition: "", // Will be enriched later
      publisherAddress: transaction.from,
      blockNumber: log.blockNumber!,
      timestamp: Number(block.timestamp),
      transactionHash: log.transactionHash!,
      isPublic: true,
    };

    // Save to repository
    await this.repository.saveSchema(schema);

    logger.success(`✅ Schema ${schemaId} indexed in real-time`);

    // Emit indexed event
    indexerEvents.emitSchemaIndexed({
      schema,
      isNew: true,
    });
  }

  /**
   * Handle watch errors
   */
  private handleWatchError(error: Error): void {
    // Skip empty or non-actionable errors
    if (!error || !error.message) {
      return;
    }

    logger.error("Event watcher error", error);

    indexerEvents.emitError({
      error,
      context: "RealtimeMonitor.watchEvents",
    });

    // Attempt reconnection only for serious errors
    if (
      error.message.includes("connection") ||
      error.message.includes("network")
    ) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Handle connection errors and attempt reconnection
   */
  private handleConnectionError(error: Error): void {
    if (!this.isRunning) {
      // Monitor was stopped intentionally
      return;
    }

    indexerEvents.emitConnectionLost({
      type: "websocket",
      message: error.message,
    });

    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.config.maxReconnectAttempts!) {
      logger.error(
        `Max reconnection attempts (${this.config.maxReconnectAttempts}) reached. Stopping monitor.`
      );
      this.stop();
      return;
    }

    const delay = this.config.reconnectDelay! * this.reconnectAttempts;
    logger.warn(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => {
        logger.error("Reconnection failed", err);
      });
    }, delay);
  }

  /**
   * Get monitor status
   */
  getStatus(): {
    isRunning: boolean;
    reconnectAttempts: number;
    rpcUrl: string;
  } {
    return {
      isRunning: this.isRunning,
      reconnectAttempts: this.reconnectAttempts,
      rpcUrl: this.config.rpcUrl,
    };
  }

  /**
   * Check if monitor is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.wsClient !== null;
  }
}
