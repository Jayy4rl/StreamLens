/**
 * Test script for Supabase connection
 *
 * Run this to verify that the Supabase connection is working correctly.
 * Usage: npm run test:db
 */

import { config } from "dotenv";

// Load environment variables FIRST before any other imports
config();

import {
  getSupabaseClient,
  testConnection,
  getConnectionInfo,
  closeConnection,
} from "./supabase";
import { Logger } from "../utils/logger";

const logger = new Logger("DatabaseTest");

async function main() {
  logger.info("=== Supabase Connection Test ===\n");

  try {
    // Display connection info
    const info = getConnectionInfo();
    logger.info("Connection Configuration:");
    console.log(`  - URL: ${info.url}`);
    console.log(`  - Pool Size: ${info.poolSize}`);
    console.log("");

    // Get the client
    const client = getSupabaseClient();
    logger.success("✓ Supabase client initialized");

    // Test the connection
    const isConnected = await testConnection();

    if (isConnected) {
      logger.success("✓ Database connection successful!\n");

      // Try a simple query to get database version/info
      logger.info("Fetching database information...");
      const { data, error } = await client.rpc("version" as any);

      if (!error && data) {
        logger.success("Database version info retrieved");
      } else {
        logger.info(
          "Could not retrieve version (this is normal - function may not exist)"
        );
      }

      logger.success("\n=== All Tests Passed! ===");
      logger.info(
        "\nYour Supabase connection is properly configured and working."
      );
      logger.info(
        "You can now proceed with database schema creation and migration."
      );
    } else {
      logger.error("✗ Database connection failed");
      logger.error("\nPlease check your .env file and ensure:");
      console.log("  1. NEXT_PUBLIC_SUPABASE_URL is correct");
      console.log("  2. NEXT_PUBLIC_SUPABASE_ANON_KEY is valid");
      console.log("  3. Your Supabase project is active");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Connection test failed with error:");
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    closeConnection();
  }
}

// Run the test
main();
