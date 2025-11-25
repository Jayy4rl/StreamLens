/**
 * Supabase Schema Repository
 *
 * Database layer for storing and retrieving indexed schemas using Supabase.
 * Provides methods for schema management, querying, and statistics.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { IndexedSchema, IndexerState } from "../types/schema";
import { Hex, Address } from "viem";
import { Logger } from "../utils/logger";

const logger = new Logger("SupabaseSchemaRepository");

/**
 * Database schema type definitions
 */
interface DbSchema {
  schema_id: string;
  schema_name: string;
  schema_definition: string;
  publisher_address: string;
  block_number: string; // BigInt stored as string
  timestamp: string; // BigInt stored as string
  transaction_hash: string;
  parent_schema_id: string | null;
  is_public: boolean;
  metadata: Record<string, any>;
  indexed_at: string;
  updated_at: string;
}

interface DbIndexerState {
  id: number;
  network: string;
  last_scanned_block: string; // BigInt stored as string
  last_sync_timestamp: string; // BigInt stored as string
  total_schemas_indexed: number;
  is_healthy: boolean;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for Supabase database operations
 */
export class SupabaseSchemaRepository {
  private supabase: SupabaseClient;
  private cachedState: IndexerState | null = null;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Initialize the repository and load state
   */
  async initialize(): Promise<void> {
    logger.info("Initializing Supabase repository...");

    // Load initial state
    await this.loadState();

    logger.success("Supabase repository initialized");
  }

  /**
   * Convert database schema to application schema
   */
  private dbToSchema(dbSchema: DbSchema): IndexedSchema {
    return {
      schemaId: dbSchema.schema_id as Hex,
      schemaName: dbSchema.schema_name,
      schemaDefinition: dbSchema.schema_definition,
      publisherAddress: dbSchema.publisher_address as Address,
      blockNumber: BigInt(dbSchema.block_number),
      timestamp: Number(dbSchema.timestamp),
      transactionHash: dbSchema.transaction_hash as Hex,
      parentSchemaId: dbSchema.parent_schema_id as Hex | undefined,
      isPublic: dbSchema.is_public,
      metadata: dbSchema.metadata,
    };
  }

  /**
   * Convert application schema to database schema
   */
  private schemaToDb(
    schema: IndexedSchema
  ): Omit<DbSchema, "indexed_at" | "updated_at"> {
    return {
      schema_id: schema.schemaId,
      schema_name: schema.schemaName,
      schema_definition: schema.schemaDefinition,
      publisher_address: schema.publisherAddress,
      block_number: schema.blockNumber.toString(),
      timestamp: schema.timestamp.toString(),
      transaction_hash: schema.transactionHash,
      parent_schema_id: schema.parentSchemaId || null,
      is_public: schema.isPublic,
      metadata: schema.metadata || {},
    };
  }

  /**
   * Save a single schema (upsert)
   */
  async saveSchema(schema: IndexedSchema): Promise<void> {
    try {
      const dbSchema = this.schemaToDb(schema);

      const { error } = await this.supabase
        .from("indexed_schemas")
        .upsert(dbSchema, {
          onConflict: "schema_id",
        });

      if (error) {
        logger.error("Failed to save schema:", error);
        throw error;
      }

      logger.info(`Saved schema: ${schema.schemaName || schema.schemaId}`);

      // Invalidate cached state to force reload
      this.cachedState = null;
    } catch (error) {
      logger.error("Error saving schema:", error);
      throw error;
    }
  }

  /**
   * Batch save multiple schemas (upsert)
   */
  async saveSchemas(schemas: IndexedSchema[]): Promise<void> {
    if (schemas.length === 0) {
      return;
    }

    try {
      const dbSchemas = schemas.map((s) => this.schemaToDb(s));

      const { error } = await this.supabase
        .from("indexed_schemas")
        .upsert(dbSchemas, {
          onConflict: "schema_id",
        });

      if (error) {
        logger.error("Failed to batch save schemas:", error);
        throw error;
      }

      logger.success(`Batch saved ${schemas.length} schemas`);

      // Invalidate cached state
      this.cachedState = null;
    } catch (error) {
      logger.error("Error batch saving schemas:", error);
      throw error;
    }
  }

  /**
   * Get a schema by ID
   */
  async getSchema(schemaId: Hex): Promise<IndexedSchema | undefined> {
    try {
      const { data, error } = await this.supabase
        .from("indexed_schemas")
        .select("*")
        .eq("schema_id", schemaId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Not found
          return undefined;
        }
        throw error;
      }

      return data ? this.dbToSchema(data as DbSchema) : undefined;
    } catch (error) {
      logger.error(`Error getting schema ${schemaId}:`, error);
      throw error;
    }
  }

  /**
   * Get all schemas (paginated)
   */
  async getAllSchemas(
    limit: number = 1000,
    offset: number = 0
  ): Promise<IndexedSchema[]> {
    try {
      const { data, error } = await this.supabase
        .from("indexed_schemas")
        .select("*")
        .order("block_number", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return (data as DbSchema[]).map((d) => this.dbToSchema(d));
    } catch (error) {
      logger.error("Error getting all schemas:", error);
      throw error;
    }
  }

  /**
   * Get schemas by publisher
   */
  async getSchemasByPublisher(
    publisherAddress: Address
  ): Promise<IndexedSchema[]> {
    try {
      const { data, error } = await this.supabase
        .from("indexed_schemas")
        .select("*")
        .eq("publisher_address", publisherAddress.toLowerCase())
        .order("block_number", { ascending: false });

      if (error) {
        throw error;
      }

      return (data as DbSchema[]).map((d) => this.dbToSchema(d));
    } catch (error) {
      logger.error(
        `Error getting schemas by publisher ${publisherAddress}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Search schemas by name
   */
  async searchSchemasByName(query: string): Promise<IndexedSchema[]> {
    try {
      const { data, error } = await this.supabase
        .from("indexed_schemas")
        .select("*")
        .ilike("schema_name", `%${query}%`)
        .order("block_number", { ascending: false });

      if (error) {
        throw error;
      }

      return (data as DbSchema[]).map((d) => this.dbToSchema(d));
    } catch (error) {
      logger.error(`Error searching schemas by name "${query}":`, error);
      throw error;
    }
  }

  /**
   * Load indexer state from database
   */
  private async loadState(): Promise<IndexerState> {
    try {
      const { data, error } = await this.supabase
        .from("indexer_state")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        throw error;
      }

      const dbState = data as DbIndexerState;

      this.cachedState = {
        network: dbState.network as "mainnet" | "testnet",
        lastScannedBlock: BigInt(dbState.last_scanned_block),
        lastSyncTimestamp: Number(dbState.last_sync_timestamp),
        totalSchemasIndexed: dbState.total_schemas_indexed,
        isHealthy: dbState.is_healthy,
      };

      logger.info("Loaded indexer state from database", {
        lastScannedBlock: this.cachedState.lastScannedBlock.toString(),
        totalSchemas: this.cachedState.totalSchemasIndexed,
      });

      return this.cachedState;
    } catch (error) {
      logger.error("Error loading state from database:", error);

      // Return default state on error
      this.cachedState = {
        network: (process.env.NETWORK as "mainnet" | "testnet") || "mainnet",
        lastScannedBlock: BigInt(process.env.START_BLOCK || "0"),
        lastSyncTimestamp: 0,
        totalSchemasIndexed: 0,
        isHealthy: true,
      };

      return this.cachedState;
    }
  }

  /**
   * Update indexer state
   */
  async updateState(updates: Partial<IndexerState>): Promise<void> {
    try {
      // Merge with cached state
      if (this.cachedState) {
        this.cachedState = { ...this.cachedState, ...updates };
      } else {
        await this.loadState();
        this.cachedState = { ...this.cachedState!, ...updates };
      }

      // Prepare database update
      const dbUpdates: any = {};

      if (updates.network) dbUpdates.network = updates.network;
      if (updates.lastScannedBlock !== undefined) {
        dbUpdates.last_scanned_block = updates.lastScannedBlock.toString();
      }
      if (updates.lastSyncTimestamp !== undefined) {
        dbUpdates.last_sync_timestamp = updates.lastSyncTimestamp.toString();
      }
      if (updates.totalSchemasIndexed !== undefined) {
        dbUpdates.total_schemas_indexed = updates.totalSchemasIndexed;
      }
      if (updates.isHealthy !== undefined) {
        dbUpdates.is_healthy = updates.isHealthy;
      }

      const { error } = await this.supabase
        .from("indexer_state")
        .update(dbUpdates)
        .eq("id", 1);

      if (error) {
        throw error;
      }

      logger.debug("Updated indexer state");
    } catch (error) {
      logger.error("Error updating state:", error);
      throw error;
    }
  }

  /**
   * Get current indexer state
   */
  async getState(): Promise<IndexerState> {
    if (!this.cachedState) {
      await this.loadState();
    }
    return { ...this.cachedState! };
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      // Get schema count
      const {
        count: totalSchemas,
        error: countError,
      } = await this.supabase
        .from("indexed_schemas")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      // Get public schema count
      const { count: publicSchemas, error: publicError } = await this.supabase
        .from("indexed_schemas")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true);

      if (publicError) throw publicError;

      // Get publisher count
      const {
        count: uniquePublishers,
        error: publisherError,
      } = await this.supabase
        .from("schema_publishers")
        .select("*", { count: "exact", head: true });

      if (publisherError) throw publisherError;

      // Get state
      const state = await this.getState();

      return {
        totalSchemas: totalSchemas || 0,
        uniquePublishers: uniquePublishers || 0,
        publicSchemas: publicSchemas || 0,
        lastScannedBlock: state.lastScannedBlock.toString(),
        lastSync: new Date(state.lastSyncTimestamp).toISOString(),
      };
    } catch (error) {
      logger.error("Error getting stats:", error);
      throw error;
    }
  }
}
