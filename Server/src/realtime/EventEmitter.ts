import { EventEmitter as NodeEventEmitter } from "events";
import { IndexedSchema } from "../types/schema";
import { createLogger } from "../utils/logger";

const logger = createLogger("EventEmitter");

/**
 * Event types emitted by the indexer
 */
export enum IndexerEventType {
  SCHEMA_DISCOVERED = "schema:discovered",
  SCHEMA_INDEXED = "schema:indexed",
  SCHEMA_ENRICHED = "schema:enriched",
  CONNECTION_ESTABLISHED = "connection:established",
  CONNECTION_LOST = "connection:lost",
  ERROR = "error",
}

/**
 * Event payload interfaces
 */
export interface SchemaDiscoveredEvent {
  schemaId: string;
  blockNumber: bigint;
  timestamp: number;
  transactionHash: string;
}

export interface SchemaIndexedEvent {
  schema: IndexedSchema;
  isNew: boolean;
}

export interface SchemaEnrichedEvent {
  schema: IndexedSchema;
}

export interface ConnectionEvent {
  type: "websocket" | "rpc" | "http";
  message: string;
}

export interface ErrorEvent {
  error: Error;
  context?: string;
}

/**
 * Type-safe event emitter for indexer events
 */
export class IndexerEventEmitter extends NodeEventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // Allow multiple listeners
  }

  /**
   * Emit schema discovered event
   */
  emitSchemaDiscovered(event: SchemaDiscoveredEvent): void {
    logger.info("🔔 Event: Schema discovered", {
      schemaId: event.schemaId,
      block: event.blockNumber.toString(),
    });
    this.emit(IndexerEventType.SCHEMA_DISCOVERED, event);
  }

  /**
   * Emit schema indexed event
   */
  emitSchemaIndexed(event: SchemaIndexedEvent): void {
    logger.info("🔔 Event: Schema indexed", {
      schemaId: event.schema.schemaId,
      isNew: event.isNew,
    });
    this.emit(IndexerEventType.SCHEMA_INDEXED, event);
  }

  /**
   * Emit schema enriched event
   */
  emitSchemaEnriched(event: SchemaEnrichedEvent): void {
    logger.info("🔔 Event: Schema enriched", {
      schemaId: event.schema.schemaId,
      name: event.schema.schemaName,
    });
    this.emit(IndexerEventType.SCHEMA_ENRICHED, event);
  }

  /**
   * Emit connection established event
   */
  emitConnectionEstablished(event: ConnectionEvent): void {
    logger.success(`🔔 Event: ${event.type} connection established`);
    this.emit(IndexerEventType.CONNECTION_ESTABLISHED, event);
  }

  /**
   * Emit connection lost event
   */
  emitConnectionLost(event: ConnectionEvent): void {
    logger.warn(`🔔 Event: ${event.type} connection lost`);
    this.emit(IndexerEventType.CONNECTION_LOST, event);
  }

  /**
   * Emit error event
   */
  emitError(event: ErrorEvent): void {
    logger.error("🔔 Event: Error occurred", event.error);
    this.emit(IndexerEventType.ERROR, event);
  }

  /**
   * Subscribe to schema discovered events
   */
  onSchemaDiscovered(
    callback: (event: SchemaDiscoveredEvent) => void
  ): () => void {
    this.on(IndexerEventType.SCHEMA_DISCOVERED, callback);
    return () => this.off(IndexerEventType.SCHEMA_DISCOVERED, callback);
  }

  /**
   * Subscribe to schema indexed events
   */
  onSchemaIndexed(callback: (event: SchemaIndexedEvent) => void): () => void {
    this.on(IndexerEventType.SCHEMA_INDEXED, callback);
    return () => this.off(IndexerEventType.SCHEMA_INDEXED, callback);
  }

  /**
   * Subscribe to schema enriched events
   */
  onSchemaEnriched(callback: (event: SchemaEnrichedEvent) => void): () => void {
    this.on(IndexerEventType.SCHEMA_ENRICHED, callback);
    return () => this.off(IndexerEventType.SCHEMA_ENRICHED, callback);
  }

  /**
   * Subscribe to connection events
   */
  onConnectionEstablished(
    callback: (event: ConnectionEvent) => void
  ): () => void {
    this.on(IndexerEventType.CONNECTION_ESTABLISHED, callback);
    return () => this.off(IndexerEventType.CONNECTION_ESTABLISHED, callback);
  }

  /**
   * Subscribe to connection lost events
   */
  onConnectionLost(callback: (event: ConnectionEvent) => void): () => void {
    this.on(IndexerEventType.CONNECTION_LOST, callback);
    return () => this.off(IndexerEventType.CONNECTION_LOST, callback);
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (event: ErrorEvent) => void): () => void {
    this.on(IndexerEventType.ERROR, callback);
    return () => this.off(IndexerEventType.ERROR, callback);
  }

  /**
   * Get listener count for debugging
   */
  getListenerStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const eventType of Object.values(IndexerEventType)) {
      stats[eventType] = this.listenerCount(eventType);
    }
    return stats;
  }
}

/**
 * Singleton instance
 */
export const indexerEvents = new IndexerEventEmitter();
