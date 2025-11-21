import { SDK } from "@somnia-chain/streams";
import { PublicClient, Hex, Address } from "viem";
import { createLogger } from "../utils/logger";
import { retryWithBackoff, RateLimiter } from "../utils/retry";
import { SchemaRepository } from "./SchemaRepository";
import { IndexedSchema } from "../types/schema";

const logger = createLogger("SchemaEnricher");

/**
 * Enriches indexed schemas with metadata from the SDK
 */
export class SchemaEnricher {
  private sdk: SDK;
  private rateLimiter: RateLimiter;

  constructor(
    private publicClient: PublicClient,
    private repository: SchemaRepository
  ) {
    // Initialize SDK with public client only (read-only)
    this.sdk = new SDK({
      public: publicClient,
    });

    // Rate limiter for SDK calls
    this.rateLimiter = new RateLimiter(3, 300);
  }

  /**
   * Enrich all schemas that are missing metadata
   */
  async enrichAllSchemas(): Promise<void> {
    const schemas = this.repository.getAllSchemas();
    const schemasToEnrich = schemas.filter(
      (schema) => !schema.schemaName || !schema.schemaDefinition
    );

    if (schemasToEnrich.length === 0) {
      logger.info("All schemas are already enriched");
      return;
    }

    logger.info(`Enriching ${schemasToEnrich.length} schemas...`);

    let enriched = 0;
    let failed = 0;

    for (const schema of schemasToEnrich) {
      try {
        const enrichedSchema = await this.enrichSchema(schema);
        if (enrichedSchema) {
          await this.repository.saveSchema(enrichedSchema);
          enriched++;

          if (enriched % 10 === 0) {
            logger.info(
              `Progress: ${enriched}/${schemasToEnrich.length} schemas enriched`
            );
          }
        }
      } catch (error) {
        failed++;
        logger.warn(`Failed to enrich schema ${schema.schemaId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Small delay between enrichments
      await this.sleep(100);
    }

    logger.success(
      `Enrichment complete: ${enriched} enriched, ${failed} failed`
    );
  }

  /**
   * Enrich a single schema with metadata
   */
  async enrichSchema(schema: IndexedSchema): Promise<IndexedSchema | null> {
    try {
      // Fetch schema name
      const schemaName = await this.fetchSchemaName(schema.schemaId);

      // Fetch schema definition
      const schemaDefinition = await this.fetchSchemaDefinition(
        schema.schemaId
      );

      // Fetch parent schema ID if it exists
      const parentSchemaId = await this.fetchParentSchemaId(schema.schemaId);

      // Count usage (how many times this schema has been used)
      const usageCount = await this.fetchUsageCount(
        schema.schemaId,
        schema.publisherAddress
      );

      return {
        ...schema,
        schemaName: schemaName || schema.schemaId,
        schemaDefinition: schemaDefinition || "",
        parentSchemaId:
          parentSchemaId !==
          "0x0000000000000000000000000000000000000000000000000000000000000000"
            ? parentSchemaId
            : undefined,
        metadata: {
          ...schema.metadata,
          usageCount,
        },
      };
    } catch (error) {
      logger.error(`Failed to enrich schema ${schema.schemaId}`, error);
      return null;
    }
  }

  /**
   * Fetch schema name from SDK
   */
  private async fetchSchemaName(schemaId: Hex): Promise<string> {
    try {
      const result = await this.rateLimiter.execute(() =>
        retryWithBackoff(
          () => this.sdk.streams.schemaIdToSchemaName(schemaId),
          { maxRetries: 3 },
          `Fetching schema name for ${schemaId}`
        )
      );

      if (result instanceof Error) {
        throw result;
      }

      return result || schemaId;
    } catch (error) {
      logger.debug(`Could not fetch name for schema ${schemaId}`);
      return schemaId; // Fallback to schemaId
    }
  }

  /**
   * Fetch schema definition from SDK
   */
  private async fetchSchemaDefinition(schemaId: Hex): Promise<string> {
    try {
      const result = await this.rateLimiter.execute(() =>
        retryWithBackoff(
          () => this.sdk.streams.getSchemaFromSchemaId(schemaId),
          { maxRetries: 3 },
          `Fetching schema definition for ${schemaId}`
        )
      );

      if (result instanceof Error) {
        throw result;
      }

      // The SDK returns an object with baseSchema and finalSchema
      return result.finalSchema || result.baseSchema || "";
    } catch (error) {
      logger.debug(`Could not fetch definition for schema ${schemaId}`);
      return "";
    }
  }

  /**
   * Fetch parent schema ID
   */
  private async fetchParentSchemaId(schemaId: Hex): Promise<Hex> {
    try {
      const result = await this.rateLimiter.execute(() =>
        retryWithBackoff(
          () => this.sdk.streams.parentSchemaId(schemaId),
          { maxRetries: 3 },
          `Fetching parent schema for ${schemaId}`
        )
      );

      if (result instanceof Error) {
        throw result;
      }

      return result;
    } catch (error) {
      logger.debug(`Could not fetch parent schema for ${schemaId}`);
      return "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
    }
  }

  /**
   * Fetch usage count for a schema
   */
  private async fetchUsageCount(
    schemaId: Hex,
    publisher: Address
  ): Promise<number> {
    try {
      const result = await this.rateLimiter.execute(() =>
        retryWithBackoff(
          () =>
            this.sdk.streams.totalPublisherDataForSchema(schemaId, publisher),
          { maxRetries: 3 },
          `Fetching usage count for ${schemaId}`
        )
      );

      if (result instanceof Error) {
        throw result;
      }

      return Number(result);
    } catch (error) {
      logger.debug(`Could not fetch usage count for schema ${schemaId}`);
      return 0;
    }
  }

  /**
   * Verify all schemas using SDK's getAllSchemas
   */
  async verifySchemasWithSDK(): Promise<void> {
    try {
      logger.info("Verifying schemas with SDK getAllSchemas...");

      const result = await retryWithBackoff(
        () => this.sdk.streams.getAllSchemas(),
        { maxRetries: 5 },
        "Fetching all schemas from SDK"
      );

      if (result instanceof Error) {
        throw result;
      }

      const sdkSchemas = result as string[];
      logger.info(`SDK reports ${sdkSchemas.length} public schemas`);

      // For each SDK schema, compute its ID and check if we have it
      let missing = 0;
      for (const schemaStr of sdkSchemas) {
        const schemaIdResult = await this.sdk.streams.computeSchemaId(
          schemaStr
        );

        if (!(schemaIdResult instanceof Error)) {
          const schemaId = schemaIdResult as Hex;
          const existing = this.repository.getSchema(schemaId);

          if (!existing) {
            logger.warn(
              `Schema ${schemaId} exists in SDK but not in our index!`
            );
            missing++;

            // Could optionally add it here with minimal data
            // This would catch any schemas we might have missed
          }
        }
      }

      if (missing > 0) {
        logger.warn(
          `Found ${missing} schemas in SDK that are missing from our index`
        );
      } else {
        logger.success("All SDK schemas are indexed!");
      }
    } catch (error) {
      logger.error("Failed to verify schemas with SDK", error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
