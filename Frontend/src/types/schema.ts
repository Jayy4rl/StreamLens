/**
 * Type definitions for Data Stream Schemas
 * Matches the backend IndexedSchema interface
 */

export interface DataStream {
  schemaId: string;
  schemaName: string;
  schemaDefinition: string;
  publisherAddress: string;
  blockNumber: string; // Serialized from BigInt
  timestamp: number;
  transactionHash: string;
  parentSchemaId?: string;
  isPublic: boolean;
  metadata?: SchemaMetadata;
}

export interface SchemaMetadata {
  usageCount?: number;
  lastUsedBlock?: string; // Serialized from BigInt
  description?: string;
  tags?: string[];
  versions?: SchemaVersion[];
}

export interface SchemaVersion {
  version: string;
  schemaId: string;
  createdAt: number;
  changes?: string;
}

export interface PlatformStats {
  totalSchemas: number;
  uniquePublishers: number;
  lastSyncedBlock: string; // Changed to string to match BigInt serialization
  lastSyncTimestamp: number;
  lastSchemaTimestamp: number;
  isHealthy: boolean;
  network: string;
}

export interface Publisher {
  publisher_address: string;
  total_schemas: number;
  first_schema_at: string;
  last_schema_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  message?: string;
}
