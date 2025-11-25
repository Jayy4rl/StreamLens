/**
 * Schema Repository Interface
 *
 * Common interface for schema storage implementations.
 * Allows different storage backends (JSON, Supabase, etc.)
 */

import { IndexedSchema, IndexerState } from "../types/schema";
import { Hex, Address } from "viem";

export interface ISchemaRepository {
  /**
   * Save a single schema
   */
  saveSchema(schema: IndexedSchema): Promise<void>;

  /**
   * Batch save multiple schemas
   */
  saveSchemas(schemas: IndexedSchema[]): Promise<void>;

  /**
   * Get a schema by ID
   */
  getSchema(
    schemaId: Hex
  ): IndexedSchema | Promise<IndexedSchema | undefined> | undefined;

  /**
   * Get all schemas
   */
  getAllSchemas(): IndexedSchema[] | Promise<IndexedSchema[]>;

  /**
   * Get schemas by publisher
   */
  getSchemasByPublisher(
    publisherAddress: Address
  ): IndexedSchema[] | Promise<IndexedSchema[]>;

  /**
   * Search schemas by name
   */
  searchSchemasByName(
    query: string
  ): IndexedSchema[] | Promise<IndexedSchema[]>;

  /**
   * Update indexer state
   */
  updateState(updates: Partial<IndexerState>): void | Promise<void>;

  /**
   * Get current indexer state
   */
  getState(): IndexerState | Promise<IndexerState>;

  /**
   * Get statistics
   */
  getStats(): any | Promise<any>;
}
