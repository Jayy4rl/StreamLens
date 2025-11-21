import * as fs from "fs";
import * as path from "path";
import { IndexedSchema, IndexerState } from "../types/schema";
import { createLogger } from "../utils/logger";
import { Hex } from "viem";

const logger = createLogger("SchemaRepository");

/**
 * Repository for storing and retrieving indexed schemas
 * Currently uses JSON file storage, can be migrated to a database later
 */
export class SchemaRepository {
  private schemasPath: string;
  private statePath: string;
  private schemas: Map<Hex, IndexedSchema> = new Map();
  private state: IndexerState;

  constructor(dataDir: string = "./data") {
    this.schemasPath = path.join(dataDir, "schemas.json");
    this.statePath = path.join(dataDir, "state.json");

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize state
    this.state = this.loadState();

    // Load existing schemas
    this.loadSchemas();
  }

  /**
   * Load schemas from disk
   */
  private loadSchemas(): void {
    try {
      if (fs.existsSync(this.schemasPath)) {
        const data = fs.readFileSync(this.schemasPath, "utf-8");
        const schemasArray: IndexedSchema[] = JSON.parse(data, (key, value) => {
          // Handle BigInt serialization
          if (typeof value === "string" && value.match(/^\d+n$/)) {
            return BigInt(value.slice(0, -1));
          }
          return value;
        });

        schemasArray.forEach((schema) => {
          this.schemas.set(schema.schemaId, schema);
        });

        logger.info(`Loaded ${this.schemas.size} schemas from disk`);
      } else {
        logger.info("No existing schemas found, starting fresh");
      }
    } catch (error) {
      logger.error("Failed to load schemas from disk", error);
      this.schemas.clear();
    }
  }

  /**
   * Load indexer state from disk
   */
  private loadState(): IndexerState {
    try {
      if (fs.existsSync(this.statePath)) {
        const data = fs.readFileSync(this.statePath, "utf-8");
        const state = JSON.parse(data, (key, value) => {
          if (key === "lastScannedBlock" && typeof value === "string") {
            return BigInt(value);
          }
          return value;
        });
        logger.info("Loaded indexer state", state);
        return state;
      }
    } catch (error) {
      logger.error("Failed to load state from disk", error);
    }

    // Default state
    return {
      network: (process.env.NETWORK as "mainnet" | "testnet") || "mainnet",
      lastScannedBlock: BigInt(process.env.START_BLOCK || "0"),
      lastSyncTimestamp: 0,
      totalSchemasIndexed: 0,
      isHealthy: true,
    };
  }

  /**
   * Save all schemas to disk
   */
  private saveSchemasToFile(): void {
    try {
      const schemasArray = Array.from(this.schemas.values());
      const data = JSON.stringify(
        schemasArray,
        (key, value) => {
          // Handle BigInt serialization
          if (typeof value === "bigint") {
            return value.toString() + "n";
          }
          return value;
        },
        2
      );

      fs.writeFileSync(this.schemasPath, data, "utf-8");
      logger.debug(`Saved ${schemasArray.length} schemas to disk`);
    } catch (error) {
      logger.error("Failed to save schemas to disk", error);
      throw error;
    }
  }

  /**
   * Save indexer state to disk
   */
  private saveState(): void {
    try {
      const data = JSON.stringify(
        this.state,
        (key, value) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        },
        2
      );

      fs.writeFileSync(this.statePath, data, "utf-8");
      logger.debug("Saved indexer state");
    } catch (error) {
      logger.error("Failed to save state to disk", error);
      throw error;
    }
  }

  /**
   * Add or update a schema
   */
  async saveSchema(schema: IndexedSchema): Promise<void> {
    const existing = this.schemas.get(schema.schemaId);

    if (existing) {
      // Update existing schema
      this.schemas.set(schema.schemaId, {
        ...existing,
        ...schema,
      });
      logger.debug(`Updated schema ${schema.schemaId}`);
    } else {
      // Add new schema
      this.schemas.set(schema.schemaId, schema);
      this.state.totalSchemasIndexed++;
      logger.info(`Added new schema: ${schema.schemaName || schema.schemaId}`, {
        schemaId: schema.schemaId,
        publisher: schema.publisherAddress,
        blockNumber: schema.blockNumber.toString(),
      });
    }

    this.saveSchemasToFile();
  }

  /**
   * Batch save multiple schemas
   */
  async saveSchemas(schemas: IndexedSchema[]): Promise<void> {
    let newCount = 0;
    let updateCount = 0;

    for (const schema of schemas) {
      if (this.schemas.has(schema.schemaId)) {
        updateCount++;
      } else {
        newCount++;
      }
      this.schemas.set(schema.schemaId, schema);
    }

    this.state.totalSchemasIndexed += newCount;
    this.saveSchemasToFile();

    logger.success(
      `Batch saved schemas: ${newCount} new, ${updateCount} updated`
    );
  }

  /**
   * Get a schema by ID
   */
  getSchema(schemaId: Hex): IndexedSchema | undefined {
    return this.schemas.get(schemaId);
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): IndexedSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get schemas by publisher
   */
  getSchemasByPublisher(publisherAddress: string): IndexedSchema[] {
    return Array.from(this.schemas.values()).filter(
      (schema) =>
        schema.publisherAddress.toLowerCase() === publisherAddress.toLowerCase()
    );
  }

  /**
   * Search schemas by name
   */
  searchSchemasByName(query: string): IndexedSchema[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.schemas.values()).filter((schema) =>
      schema.schemaName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Update indexer state
   */
  updateState(updates: Partial<IndexerState>): void {
    this.state = { ...this.state, ...updates };
    this.saveState();
  }

  /**
   * Get current indexer state
   */
  getState(): IndexerState {
    return { ...this.state };
  }

  /**
   * Get statistics
   */
  getStats() {
    const schemas = this.getAllSchemas();
    const publishers = new Set(schemas.map((s) => s.publisherAddress));

    return {
      totalSchemas: this.schemas.size,
      uniquePublishers: publishers.size,
      publicSchemas: schemas.filter((s) => s.isPublic).length,
      lastScannedBlock: this.state.lastScannedBlock.toString(),
      lastSync: new Date(this.state.lastSyncTimestamp).toISOString(),
    };
  }
}
