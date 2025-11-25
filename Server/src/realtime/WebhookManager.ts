import { createLogger } from "../utils/logger";
import {
  indexerEvents,
  SchemaDiscoveredEvent,
  SchemaIndexedEvent,
  SchemaEnrichedEvent,
} from "./EventEmitter";

const logger = createLogger("WebhookManager");

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: WebhookEventType[];
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

/**
 * Types of events that can trigger webhooks
 */
export enum WebhookEventType {
  SCHEMA_DISCOVERED = "schema.discovered",
  SCHEMA_INDEXED = "schema.indexed",
  SCHEMA_ENRICHED = "schema.enriched",
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: number;
  data: unknown;
  metadata: {
    network: string;
    indexer: string;
  };
}

/**
 * Manages webhook subscriptions for real-time events
 */
export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private network: "mainnet" | "testnet";
  private isActive: boolean = false;

  constructor(network: "mainnet" | "testnet") {
    this.network = network;
  }

  /**
   * Start the webhook manager and subscribe to events
   */
  start(): void {
    if (this.isActive) {
      logger.warn("Webhook manager is already active");
      return;
    }

    logger.info("🪝 Starting webhook manager...");

    // Subscribe to indexer events
    indexerEvents.onSchemaDiscovered((event) =>
      this.handleSchemaDiscovered(event)
    );
    indexerEvents.onSchemaIndexed((event) => this.handleSchemaIndexed(event));
    indexerEvents.onSchemaEnriched((event) => this.handleSchemaEnriched(event));

    this.isActive = true;
    logger.success("✅ Webhook manager started");
  }

  /**
   * Stop the webhook manager
   */
  stop(): void {
    logger.info("Stopping webhook manager...");
    this.isActive = false;
    logger.success("Webhook manager stopped");
  }

  /**
   * Register a webhook
   */
  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, {
      retries: 3,
      timeout: 5000,
      ...config,
    });
    logger.info(`Registered webhook: ${id} -> ${config.url}`);
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      logger.info(`Unregistered webhook: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all registered webhooks
   */
  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Handle schema discovered events
   */
  private async handleSchemaDiscovered(
    event: SchemaDiscoveredEvent
  ): Promise<void> {
    await this.triggerWebhooks(WebhookEventType.SCHEMA_DISCOVERED, event);
  }

  /**
   * Handle schema indexed events
   */
  private async handleSchemaIndexed(event: SchemaIndexedEvent): Promise<void> {
    await this.triggerWebhooks(WebhookEventType.SCHEMA_INDEXED, event);
  }

  /**
   * Handle schema enriched events
   */
  private async handleSchemaEnriched(
    event: SchemaEnrichedEvent
  ): Promise<void> {
    await this.triggerWebhooks(WebhookEventType.SCHEMA_ENRICHED, event);
  }

  /**
   * Trigger webhooks for a specific event type
   */
  private async triggerWebhooks(
    eventType: WebhookEventType,
    data: unknown
  ): Promise<void> {
    const eligibleWebhooks = Array.from(
      this.webhooks.entries()
    ).filter(([_, config]) => config.events.includes(eventType));

    if (eligibleWebhooks.length === 0) {
      return;
    }

    logger.info(
      `🔔 Triggering ${eligibleWebhooks.length} webhook(s) for ${eventType}`
    );

    const promises = eligibleWebhooks.map(([id, config]) =>
      this.sendWebhook(id, config, eventType, data)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send webhook request with retries
   */
  private async sendWebhook(
    id: string,
    config: WebhookConfig,
    eventType: WebhookEventType,
    data: unknown
  ): Promise<void> {
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: Date.now(),
      data,
      metadata: {
        network: this.network,
        indexer: "StreamLens",
      },
    };

    let lastError: Error | null = null;
    const maxRetries = config.retries || 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "StreamLens-Indexer/1.0",
            ...config.headers,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(
            `Webhook returned ${response.status}: ${response.statusText}`
          );
        }

        logger.success(`✅ Webhook ${id} delivered successfully`);
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `Webhook ${id} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${
            lastError.message
          }`
        );

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(
      `❌ Webhook ${id} failed after ${maxRetries + 1} attempts`,
      lastError
    );
  }

  /**
   * Get webhook statistics
   */
  getStats(): {
    active: boolean;
    webhookCount: number;
    eventTypes: Record<WebhookEventType, number>;
  } {
    const eventTypes: Record<WebhookEventType, number> = {
      [WebhookEventType.SCHEMA_DISCOVERED]: 0,
      [WebhookEventType.SCHEMA_INDEXED]: 0,
      [WebhookEventType.SCHEMA_ENRICHED]: 0,
    };

    for (const config of this.webhooks.values()) {
      for (const eventType of config.events) {
        eventTypes[eventType]++;
      }
    }

    return {
      active: this.isActive,
      webhookCount: this.webhooks.size,
      eventTypes,
    };
  }
}
