/**
 * StreamLens API Server
 *
 * Express.js REST API for serving indexed Data Streams schema data
 * from Supabase to the frontend application.
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "dotenv";
import { getSupabaseClient } from "../database/supabase";
import { createLogger } from "../utils/logger";
import { IndexedSchema, IndexerState } from "../types/schema";

// Load environment variables
config();

const logger = createLogger("API-Server");
const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "StreamLens API",
  });
});

/**
 * GET /api/schemas
 * Get all indexed schemas with optional filtering and sorting
 *
 * Query params:
 * - sort: 'popular' | 'recent' (default: 'recent')
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - publisher: filter by publisher address
 */
app.get("/api/schemas", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { sort = "recent", limit = 100, offset = 0, publisher } = req.query;

    let query = supabase.from("indexed_schemas").select("*");

    // Filter by publisher if provided
    if (publisher && typeof publisher === "string") {
      query = query.eq("publisher_address", publisher);
    }

    // Apply sorting
    if (sort === "popular") {
      // Sort by usage count in metadata
      query = query.order("metadata->usage_count", {
        ascending: false,
        nullsFirst: false,
      });
    } else {
      // Default: sort by timestamp (most recent first)
      query = query.order("timestamp", { ascending: false });
    }

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);
    const offsetNum = parseInt(offset as string) || 0;
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching schemas:", error);
      return res.status(500).json({
        error: "Failed to fetch schemas",
        message: error.message,
      });
    }

    // Transform data to match frontend expectations
    const schemas = data?.map(transformDbSchemaToIndexedSchema) || [];

    res.json({
      success: true,
      count: schemas.length,
      data: schemas,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/schemas:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/schemas/:id
 * Get a specific schema by ID
 */
app.get("/api/schemas/:id", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;

    const { data, error } = await supabase
      .from("indexed_schemas")
      .select("*")
      .eq("schema_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Schema not found",
          schemaId: id,
        });
      }
      logger.error("Error fetching schema:", error);
      return res.status(500).json({
        error: "Failed to fetch schema",
        message: error.message,
      });
    }

    const schema = transformDbSchemaToIndexedSchema(data);

    res.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/schemas/:id:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/stats
 * Get overall platform statistics
 */
app.get("/api/stats", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();

    // Get indexer state
    const { data: stateData, error: stateError } = await supabase
      .from("indexer_state")
      .select("*")
      .eq("id", 1)
      .single();

    if (stateError) {
      logger.error("Error fetching indexer state:", stateError);
    }

    // Get total schemas count
    const { count: totalSchemas, error: countError } = await supabase
      .from("indexed_schemas")
      .select("*", { count: "exact", head: true });

    if (countError) {
      logger.error("Error counting schemas:", countError);
    }

    // Get unique publishers count
    const {
      data: publishersData,
      error: publishersError,
    } = await supabase
      .from("indexed_schemas")
      .select("publisher_address", { count: "exact", head: false });

    let uniquePublishersCount = 0;
    if (!publishersError && publishersData) {
      const uniquePublishers = new Set(
        publishersData.map((item: any) => item.publisher_address)
      );
      uniquePublishersCount = uniquePublishers.size;
    } else if (publishersError) {
      logger.warn("Error counting publishers:", publishersError);
    }

    // Get most recent schema
    const { data: recentSchema, error: recentError } = await supabase
      .from("indexed_schemas")
      .select("timestamp")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (recentError && recentError.code !== "PGRST116") {
      logger.error("Error fetching recent schema:", recentError);
    }

    res.json({
      success: true,
      data: {
        totalSchemas: totalSchemas || stateData?.total_schemas_indexed || 0,
        uniquePublishers: uniquePublishersCount,
        lastSyncedBlock: stateData?.last_scanned_block?.toString() || "0",
        lastSyncTimestamp: stateData?.last_sync_timestamp || 0,
        lastSchemaTimestamp: recentSchema?.timestamp || 0,
        isHealthy: stateData?.is_healthy || false,
        network: stateData?.network || "mainnet",
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/stats:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/publishers
 * Get list of publishers with their schema counts
 */
app.get("/api/publishers", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { limit = 50, offset = 0 } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 500);
    const offsetNum = parseInt(offset as string) || 0;

    const { data, error } = await supabase
      .from("schema_publishers")
      .select("*")
      .order("total_schemas", { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      logger.error("Error fetching publishers:", error);
      return res.status(500).json({
        error: "Failed to fetch publishers",
        message: error.message,
      });
    }

    res.json({
      success: true,
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/publishers:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/activity
 * Get recent schema registration activity
 *
 * Query params:
 * - limit: number (default: 15, max: 100)
 * - timeRange: string ('24H', '7D', '30D', 'ALL' - default: '30D')
 */
app.get("/api/activity", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { limit = 15, timeRange = "30D" } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 15, 100);

    // Calculate time threshold based on range
    let timeThreshold = 0;
    const now = Math.floor(Date.now() / 1000);

    switch (timeRange) {
      case "24H":
        timeThreshold = now - 24 * 60 * 60;
        break;
      case "7D":
        timeThreshold = now - 7 * 24 * 60 * 60;
        break;
      case "30D":
        timeThreshold = now - 30 * 24 * 60 * 60;
        break;
      case "ALL":
      default:
        timeThreshold = 0;
        break;
    }

    let query = supabase
      .from("indexed_schemas")
      .select("*")
      .order("timestamp", { ascending: false });

    // Apply time filter if not ALL
    if (timeThreshold > 0) {
      query = query.gte("timestamp", timeThreshold);
    }

    query = query.limit(limitNum);

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching activity:", error);
      return res.status(500).json({
        error: "Failed to fetch activity",
        message: error.message,
      });
    }

    // Transform to activity format
    const activities =
      data?.map((schema: any) => ({
        id: schema.schema_id,
        type: "REGISTER",
        schemaName: schema.schema_name || "Unnamed Schema",
        schemaId: schema.schema_id,
        publisher: schema.publisher_address,
        blockNumber: schema.block_number?.toString() || "0",
        timestamp: schema.timestamp,
        transactionHash: schema.transaction_hash,
      })) || [];

    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/activity:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/activity/chart
 * Get activity chart data for visualization
 *
 * Query params:
 * - timeRange: string ('24H', '7D', '30D' - default: '7D')
 */
app.get("/api/activity/chart", async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { timeRange = "7D" } = req.query;

    // Calculate time threshold and interval
    const now = Math.floor(Date.now() / 1000);
    let timeThreshold = 0;
    let intervalSeconds = 3600; // 1 hour default

    switch (timeRange) {
      case "24H":
        timeThreshold = now - 24 * 60 * 60;
        intervalSeconds = 3600; // 1 hour intervals
        break;
      case "7D":
        timeThreshold = now - 7 * 24 * 60 * 60;
        intervalSeconds = 6 * 3600; // 6 hour intervals
        break;
      case "30D":
        timeThreshold = now - 30 * 24 * 60 * 60;
        intervalSeconds = 24 * 3600; // 1 day intervals
        break;
      default:
        timeThreshold = now - 7 * 24 * 60 * 60;
        intervalSeconds = 6 * 3600;
    }

    const { data, error } = await supabase
      .from("indexed_schemas")
      .select("timestamp")
      .gte("timestamp", timeThreshold)
      .order("timestamp", { ascending: true });

    if (error) {
      logger.error("Error fetching chart data:", error);
      return res.status(500).json({
        error: "Failed to fetch chart data",
        message: error.message,
      });
    }

    // Group data by time intervals
    const chartData: { timestamp: number; count: number }[] = [];
    const buckets = new Map<number, number>();

    data?.forEach((schema: any) => {
      const bucketTime =
        Math.floor(schema.timestamp / intervalSeconds) * intervalSeconds;
      buckets.set(bucketTime, (buckets.get(bucketTime) || 0) + 1);
    });

    // Convert to array and sort
    buckets.forEach((count, timestamp) => {
      chartData.push({ timestamp, count });
    });

    chartData.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      success: true,
      data: chartData,
      timeRange,
      intervalSeconds,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/activity/chart:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Transform database schema to IndexedSchema type
 * Converts BigInt to string for JSON serialization
 */
function transformDbSchemaToIndexedSchema(dbSchema: any): any {
  return {
    schemaId: dbSchema.schema_id,
    schemaName: dbSchema.schema_name || "",
    schemaDefinition: dbSchema.schema_definition || "",
    publisherAddress: dbSchema.publisher_address,
    blockNumber: dbSchema.block_number?.toString() || "0",
    timestamp: dbSchema.timestamp,
    transactionHash: dbSchema.transaction_hash,
    parentSchemaId: dbSchema.parent_schema_id || undefined,
    isPublic: dbSchema.is_public ?? true,
    metadata: {
      usageCount: dbSchema.metadata?.usageCount || 0,
      lastUsedBlock: dbSchema.metadata?.lastUsedBlock?.toString() || undefined,
      description: dbSchema.metadata?.description,
      tags: dbSchema.metadata?.tags || [],
      versions: dbSchema.metadata?.versions || [],
    },
  };
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});

/**
 * Start the server
 */
export function startServer() {
  const server = app.listen(PORT, () => {
    logger.success(`StreamLens API Server running on http://localhost:${PORT}`);
    logger.info("Available endpoints:");
    logger.info("  GET /api/health");
    logger.info("  GET /api/schemas");
    logger.info("  GET /api/schemas/:id");
    logger.info("  GET /api/stats");
    logger.info("  GET /api/publishers");
    logger.info("  GET /api/activity");
    logger.info("  GET /api/activity/chart");
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, closing server...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });

  return server;
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}
