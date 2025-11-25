/**
 * Deploy database schema to Supabase
 *
 * This script reads the schema.sql file and executes it against the Supabase database
 * using the PostgreSQL connection string to create all necessary tables, indexes,
 * triggers, and policies.
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

if (!SUPABASE_DB_URL) {
  console.error("❌ Missing required environment variable: SUPABASE_DB_URL");
  console.error("\nPlease add this to your .env file.");
  console.error("\nYou can find the connection string in:");
  console.error("Supabase Dashboard → Settings → Database → Connection string");
  console.error('Choose the "Connection string" tab and select "URI"');
  console.error("\nExample format:");
  console.error(
    "SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
  );
  process.exit(1);
}

async function deploySchema() {
  console.log("🚀 Starting schema deployment...\n");

  // Read schema file
  const schemaPath = path.join(__dirname, "../../supabase/schema.sql");
  console.log(`📄 Reading schema from: ${schemaPath}`);

  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  console.log("✅ Schema file loaded\n");

  // Connect to database
  console.log("🔌 Connecting to Supabase database...");
  const client = new Client({
    connectionString: SUPABASE_DB_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("✅ Connected to database\n");

    // Execute the entire schema as one transaction
    console.log("📊 Executing schema...");
    await client.query("BEGIN");

    try {
      await client.query(schemaSql);
      await client.query("COMMIT");
      console.log("✅ Schema executed successfully\n");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    // Verify tables were created
    console.log("🔍 Verifying table creation...\n");

    const expectedTables = [
      "indexed_schemas",
      "indexer_state",
      "schema_publishers",
    ];

    for (const tableName of expectedTables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      if (result.rows[0].exists) {
        console.log(`   ✅ Table '${tableName}': Created successfully`);
      } else {
        console.log(`   ❌ Table '${tableName}': Not found`);
      }
    }

    // Verify indexes
    console.log("\n🔍 Verifying indexes...\n");
    const indexResult = await client.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('indexed_schemas', 'indexer_state', 'schema_publishers')
      ORDER BY tablename, indexname
    `);

    console.log(`   Found ${indexResult.rows.length} indexes:`);
    for (const row of indexResult.rows) {
      console.log(`   ✅ ${row.tablename}.${row.indexname}`);
    }

    // Verify triggers
    console.log("\n🔍 Verifying triggers...\n");
    const triggerResult = await client.query(`
      SELECT event_object_table, trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);

    console.log(`   Found ${triggerResult.rows.length} triggers:`);
    for (const row of triggerResult.rows) {
      console.log(`   ✅ ${row.event_object_table}.${row.trigger_name}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Schema deployment complete!");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log("  1. Run the indexer: npm run dev");
    console.log("  2. Monitor progress in Supabase dashboard");
    console.log("  3. Query data: SELECT * FROM indexed_schemas;\n");
  } catch (error) {
    const err = error as Error & { detail?: string };
    console.error("\n❌ Deployment failed:", err.message);
    if (err.detail) {
      console.error("   Details:", err.detail);
    }
    throw error;
  } finally {
    await client.end();
    console.log("🔌 Database connection closed\n");
  }
}

// Run deployment
deploySchema()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
