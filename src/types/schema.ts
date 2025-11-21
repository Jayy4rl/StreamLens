import { Address, Hex } from "viem";

/**
 * Represents an indexed schema from the Somnia Data Streams registry
 */
export interface IndexedSchema {
  schemaId: Hex; // bytes32 hex identifier
  schemaName: string; // Human-readable name
  schemaDefinition: string; // CSV format schema definition
  publisherAddress: Address; // Address that registered the schema
  blockNumber: bigint; // Block when registered
  timestamp: number; // Block timestamp
  transactionHash: Hex; // Registration transaction
  parentSchemaId?: Hex; // Parent schema if this extends another
  isPublic: boolean; // Whether schema is publicly registered
  metadata?: SchemaMetadata; // Additional metadata
}

/**
 * Additional metadata for a schema
 */
export interface SchemaMetadata {
  usageCount?: number; // Number of times schema has been used
  lastUsedBlock?: bigint; // Last block where schema was used
  description?: string; // Optional description
  tags?: string[]; // Categorization tags
  versions?: SchemaVersion[]; // Version history if applicable
}

/**
 * Schema version information
 */
export interface SchemaVersion {
  version: string;
  schemaId: Hex;
  createdAt: number;
  changes?: string;
}

/**
 * Indexer state for tracking progress
 */
export interface IndexerState {
  network: "mainnet" | "testnet";
  lastScannedBlock: bigint;
  lastSyncTimestamp: number;
  totalSchemasIndexed: number;
  isHealthy: boolean;
}

/**
 * Event data from DataSchemaRegistered event
 */
export interface SchemaRegisteredEvent {
  schemaId: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
  timestamp?: number;
}

/**
 * Configuration for the indexer
 */
export interface IndexerConfig {
  network: "mainnet" | "testnet";
  rpcUrl: string;
  wsUrl?: string;
  startBlock: bigint;
  batchSize: number;
  contractAddress: Address;
}
