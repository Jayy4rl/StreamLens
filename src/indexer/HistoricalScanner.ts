import { PublicClient, Hex, parseAbi, Address } from "viem";
import { createLogger } from "../utils/logger";
import { retryWithBackoff, RateLimiter } from "../utils/retry";
import { SchemaRepository } from "./SchemaRepository";
import { SchemaRegisteredEvent, IndexedSchema } from "../types/schema";

const logger = createLogger("HistoricalScanner");

/**
 * ABI for DataSchemaRegistered event
 */
const SCHEMA_REGISTERED_ABI = parseAbi([
  "event DataSchemaRegistered(bytes32 indexed schemaId)",
]);

/**
 * Scans historical blocks for DataSchemaRegistered events
 */
export class HistoricalScanner {
  private rateLimiter: RateLimiter;

  constructor(
    private publicClient: PublicClient,
    private repository: SchemaRepository,
    private contractAddress: Address,
    private batchSize: number = 1000
  ) {
    // Rate limiter: max 5 concurrent requests, 200ms between calls
    this.rateLimiter = new RateLimiter(5, 200);
  }

  /**
   * Scan historical blocks from startBlock to endBlock
   */
  async scan(startBlock: bigint, endBlock?: bigint): Promise<void> {
    try {
      // Get current block if endBlock not specified
      const currentBlock = endBlock || (await this.getCurrentBlock());

      logger.info(`Starting historical scan`, {
        startBlock: startBlock.toString(),
        endBlock: currentBlock.toString(),
        totalBlocks: (currentBlock - startBlock).toString(),
      });

      // Scan in batches
      let fromBlock = startBlock;
      let totalEvents = 0;

      while (fromBlock <= currentBlock) {
        const toBlock =
          fromBlock + BigInt(this.batchSize) - 1n > currentBlock
            ? currentBlock
            : fromBlock + BigInt(this.batchSize) - 1n;

        logger.info(`Scanning blocks ${fromBlock} to ${toBlock}...`);

        const events = await this.scanBatch(fromBlock, toBlock);
        totalEvents += events.length;

        if (events.length > 0) {
          logger.success(
            `Found ${events.length} schema registration events in this batch`
          );
        }

        // Update state after each batch
        this.repository.updateState({
          lastScannedBlock: toBlock,
          lastSyncTimestamp: Date.now(),
        });

        fromBlock = toBlock + 1n;

        // Small delay between batches to be nice to the RPC
        await this.sleep(500);
      }

      logger.success(`Historical scan complete!`, {
        totalEvents,
        finalBlock: currentBlock.toString(),
      });
    } catch (error) {
      logger.error("Historical scan failed", error);
      throw error;
    }
  }

  /**
   * Scan a single batch of blocks
   */
  private async scanBatch(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<SchemaRegisteredEvent[]> {
    try {
      // Get logs for DataSchemaRegistered events
      const logs = await this.rateLimiter.execute(() =>
        retryWithBackoff(
          () =>
            this.publicClient.getLogs({
              address: this.contractAddress,
              event: SCHEMA_REGISTERED_ABI[0],
              fromBlock,
              toBlock,
            }),
          { maxRetries: 5 },
          `Fetching logs for blocks ${fromBlock}-${toBlock}`
        )
      );

      if (logs.length === 0) {
        return [];
      }

      logger.info(`Found ${logs.length} schema registration events`);

      // Process events
      const events: SchemaRegisteredEvent[] = logs.map((log) => ({
        schemaId: log.args.schemaId as Hex,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      }));

      // Enrich events with additional data and save
      await this.enrichAndSaveEvents(events);

      return events;
    } catch (error) {
      logger.error(`Failed to scan batch ${fromBlock}-${toBlock}`, error);
      throw error;
    }
  }

  /**
   * Enrich events with block timestamps and transaction data
   */
  private async enrichAndSaveEvents(
    events: SchemaRegisteredEvent[]
  ): Promise<void> {
    const schemas: IndexedSchema[] = [];

    for (const event of events) {
      try {
        // Get block to extract timestamp
        const block = await this.rateLimiter.execute(() =>
          retryWithBackoff(
            () =>
              this.publicClient.getBlock({ blockNumber: event.blockNumber }),
            { maxRetries: 3 },
            `Fetching block ${event.blockNumber}`
          )
        );

        // Get transaction to extract publisher address
        const transaction = await this.rateLimiter.execute(() =>
          retryWithBackoff(
            () =>
              this.publicClient.getTransaction({ hash: event.transactionHash }),
            { maxRetries: 3 },
            `Fetching transaction ${event.transactionHash}`
          )
        );

        const schema: IndexedSchema = {
          schemaId: event.schemaId,
          schemaName: "", // Will be enriched later by SchemaEnricher
          schemaDefinition: "", // Will be enriched later
          publisherAddress: transaction.from,
          blockNumber: event.blockNumber,
          timestamp: Number(block.timestamp),
          transactionHash: event.transactionHash,
          isPublic: true, // Assume public for now
        };

        schemas.push(schema);
      } catch (error) {
        logger.error(`Failed to enrich event ${event.schemaId}`, error);
        // Continue with other events
      }
    }

    // Batch save all schemas
    if (schemas.length > 0) {
      await this.repository.saveSchemas(schemas);
    }
  }

  /**
   * Get current block number
   */
  private async getCurrentBlock(): Promise<bigint> {
    return await retryWithBackoff(
      () => this.publicClient.getBlockNumber(),
      { maxRetries: 5 },
      "Fetching current block number"
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get scan progress
   */
  async getProgress(): Promise<{
    lastScannedBlock: string;
    currentBlock: string;
    progress: number;
    remaining: string;
  }> {
    const state = this.repository.getState();
    const currentBlock = await this.getCurrentBlock();
    const totalBlocks = currentBlock;
    const scanned = state.lastScannedBlock;
    const progress =
      totalBlocks > 0n ? Number((scanned * 100n) / totalBlocks) : 0;

    return {
      lastScannedBlock: scanned.toString(),
      currentBlock: currentBlock.toString(),
      progress: Math.min(100, progress),
      remaining: (totalBlocks - scanned).toString(),
    };
  }
}
