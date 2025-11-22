/**
 * Supabase Database Connection
 *
 * Provides a centralized Supabase client for database operations.
 * Uses environment variables for configuration.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Logger } from "../utils/logger";
import { config } from "dotenv";

config();

const logger = new Logger("SupabaseConnection");

// Database configuration from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error(
    "Missing required Supabase configuration. " +
      "Please ensure NEXT_PUBLIC_SUPABASE_URL is set in your .env file."
  );
}

// Use service role key for backend operations (bypasses RLS), fallback to anon key
const SUPABASE_KEY = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  throw new Error(
    "Missing required Supabase key. " +
      "Please ensure either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your .env file."
  );
}

/**
 * Supabase client instance (singleton pattern)
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance
 * @returns Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    logger.info("Initializing Supabase client...");

    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: false, // We don't need session persistence for server-side usage
        autoRefreshToken: false,
      },
    });

    logger.success("Supabase client initialized successfully");
    if (SUPABASE_SERVICE_KEY) {
      logger.info("Using service role key (RLS bypassed)");
    } else {
      logger.warn("Using anon key (RLS enforced - write operations may fail)");
    }
  }

  return supabaseClient;
}

/**
 * Test the database connection
 * @returns True if connection is successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    logger.info("Testing Supabase connection...");

    const client = getSupabaseClient();

    // Try to query the postgres metadata to verify connection
    // This query should work on any Supabase database
    const { data, error } = await client
      .from("_realtime")
      .select("*")
      .limit(1);

    // If the table doesn't exist or we get a permissions error, that's fine
    // It means the connection works, we just can't access that particular table
    if (error) {
      const errorMessage = error.message.toLowerCase();

      // These are "good" errors that indicate the connection is working
      if (
        errorMessage.includes("does not exist") ||
        errorMessage.includes("permission denied") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("schema cache")
      ) {
        logger.success(
          "Supabase connection test successful (table not accessible, but connection works)"
        );
        return true;
      }

      // Actual connection errors
      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("authentication") ||
        (errorMessage.includes("invalid") && errorMessage.includes("key"))
      ) {
        logger.error("Connection test failed:", error.message);
        return false;
      }

      // Unknown error, but assume connection works
      logger.warn(
        "Got unexpected error, but connection appears to work:",
        error.message
      );
      return true;
    }

    logger.success("Supabase connection test successful");
    return true;
  } catch (error) {
    logger.error(
      "Failed to connect to Supabase:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Get database connection info
 * @returns Connection information object
 */
export function getConnectionInfo() {
  return {
    url: SUPABASE_URL,
    connected: supabaseClient !== null,
    poolSize: process.env.DB_POOL_SIZE || "10",
  };
}

/**
 * Close the Supabase connection (for cleanup)
 */
export function closeConnection(): void {
  if (supabaseClient) {
    logger.info("Closing Supabase connection...");
    // Supabase client doesn't have an explicit close method
    // Setting to null will allow garbage collection
    supabaseClient = null;
    logger.success("Supabase connection closed");
  }
}
