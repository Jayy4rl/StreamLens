/**
 * Unified Schema Repository
 *
 * Provides a unified interface for schema storage that can use either:
 * 1. Supabase (when configured)
 * 2. JSON files (fallback)
 *
 * This allows seamless migration from JSON to database storage.
 */

import { IndexedSchema, IndexerState } from "../types/schema";
import { Hex, Address } from "viem";
import { Logger } from "../utils/logger";
import { getSupabaseClient } from "../database/supabase";
import { SupabaseSchemaRepository } from "../database/SupabaseSchemaRepository";
import { SchemaRepository as JsonSchemaRepository } from "./SchemaRepository";
import { ISchemaRepository } from "./ISchemaRepository";

const logger = new Logger("UnifiedSchemaRepository");

export class UnifiedSchemaRepository implements ISchemaRepository {
  private supabaseRepo: SupabaseSchemaRepository | null = null;
  private jsonRepo: JsonSchemaRepository | null = null;
  private useSupabase: boolean = false;

  constructor(dataDir: string = "./data") {
    // Try to initialize Supabase
    try {
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        const supabaseClient = getSupabaseClient();
        this.supabaseRepo = new SupabaseSchemaRepository(supabaseClient);
        this.useSupabase = true;
        logger.success("Using Supabase for schema storage");
      } else {
        throw new Error("Supabase credentials not configured");
      }
    } catch (error) {
      logger.warn("Supabase not available, falling back to JSON storage");
      logger.debug("Supabase error:", error);
      this.useSupabase = false;
    }

    // Always initialize JSON repo as fallback
    this.jsonRepo = new JsonSchemaRepository(dataDir);

    if (!this.useSupabase) {
      logger.info("Using JSON file storage");
    }
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    if (this.useSupabase && this.supabaseRepo) {
      await this.supabaseRepo.initialize();
    }
    // JSON repo initializes in constructor
    logger.success("Repository initialized");
  }

  /**
   * Save a single schema
   */
  async saveSchema(schema: IndexedSchema): Promise<void> {
    if (this.useSupabase && this.supabaseRepo) {
      await this.supabaseRepo.saveSchema(schema);
    } else if (this.jsonRepo) {
      await this.jsonRepo.saveSchema(schema);
    }
  }

  /**
   * Batch save multiple schemas
   */
  async saveSchemas(schemas: IndexedSchema[]): Promise<void> {
    if (this.useSupabase && this.supabaseRepo) {
      await this.supabaseRepo.saveSchemas(schemas);
    } else if (this.jsonRepo) {
      await this.jsonRepo.saveSchemas(schemas);
    }
  }

  /**
   * Get a schema by ID
   */
  async getSchema(schemaId: Hex): Promise<IndexedSchema | undefined> {
    if (this.useSupabase && this.supabaseRepo) {
      return await this.supabaseRepo.getSchema(schemaId);
    } else if (this.jsonRepo) {
      return this.jsonRepo.getSchema(schemaId);
    }
    return undefined;
  }

  /**
   * Get all schemas
   */
  async getAllSchemas(): Promise<IndexedSchema[]> {
    if (this.useSupabase && this.supabaseRepo) {
      return await this.supabaseRepo.getAllSchemas();
    } else if (this.jsonRepo) {
      return this.jsonRepo.getAllSchemas();
    }
    return [];
  }

  /**
   * Get schemas by publisher
   */
  async getSchemasByPublisher(
    publisherAddress: Address
  ): Promise<IndexedSchema[]> {
    if (this.useSupabase && this.supabaseRepo) {
      return await this.supabaseRepo.getSchemasByPublisher(publisherAddress);
    } else if (this.jsonRepo) {
      return this.jsonRepo.getSchemasByPublisher(publisherAddress);
    }
    return [];
  }

  /**
   * Search schemas by name
   */
  async searchSchemasByName(query: string): Promise<IndexedSchema[]> {
    if (this.useSupabase && this.supabaseRepo) {
      return await this.supabaseRepo.searchSchemasByName(query);
    } else if (this.jsonRepo) {
      return this.jsonRepo.searchSchemasByName(query);
    }
    return [];
  }

  /**
   * Update indexer state
   */
  async updateState(updates: Partial<IndexerState>): Promise<void> {
    if (this.useSupabase && this.supabaseRepo) {
      await this.supabaseRepo.updateState(updates);
    } else if (this.jsonRepo) {
      this.jsonRepo.updateState(updates);
    }
  }

  /**
   * Get current indexer state
   */
  async getState(): Promise<IndexerState> {
    if (this.useSupabase && this.supabaseRepo) {
      return await this.supabaseRepo.getState();
    } else if (this.jsonRepo) {
      return this.jsonRepo.getState();
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
   * Get statistics
   */
  async getStats() {
    if (this.useSupabase && this.supabaseRepo) {
      return await this.supabaseRepo.getStats();
    } else if (this.jsonRepo) {
      return this.jsonRepo.getStats();
    }
    return {
      totalSchemas: 0,
      uniquePublishers: 0,
      publicSchemas: 0,
      lastScannedBlock: "0",
      lastSync: new Date(0).toISOString(),
    };
  }

  /**
   * Check if using Supabase
   */
  isUsingSupabase(): boolean {
    return this.useSupabase;
  }

  /**
   * Get storage type description
   */
  getStorageType(): string {
    return this.useSupabase ? "Supabase (PostgreSQL)" : "JSON Files";
  }
}
