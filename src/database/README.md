# Supabase Database Setup

This directory contains the Supabase database connection configuration for StreamLens.

## ✅ Connection Status

The Supabase connection has been successfully established and tested.

## Files

### `supabase.ts`
Main database connection module that provides:
- **`getSupabaseClient()`** - Returns a singleton Supabase client instance
- **`testConnection()`** - Tests the database connection
- **`getConnectionInfo()`** - Returns connection metadata
- **`closeConnection()`** - Cleanup function for graceful shutdown

### `testConnection.ts`
Test script to verify the Supabase connection is working correctly.

## Usage

### Testing the Connection

```bash
npm run test:db
```

This will:
1. Load environment variables from `.env`
2. Initialize the Supabase client
3. Test the connection
4. Display connection information

### Using in Code

```typescript
import { getSupabaseClient } from './database/supabase';

// Get the client
const supabase = getSupabaseClient();

// Query data
const { data, error } = await supabase
  .from('your_table')
  .select('*');
```

## Configuration

The connection uses the following environment variables from `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qqcstyliaabflyuklfyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
DB_POOL_SIZE=10
```

## Connection Details

- **Project URL**: `https://qqcstyliaabflyuklfyp.supabase.co`
- **Connection Pool Size**: 10
- **SSL**: Enabled by default
- **Authentication**: Anonymous key (for public operations)

## Next Steps

Now that the connection is established, you can proceed with:

1. **Database Schema Design** - Create tables for storing indexed schemas
2. **Migration Scripts** - Migrate data from JSON files to PostgreSQL
3. **Repository Updates** - Update `SchemaRepository.ts` to use Supabase instead of JSON files
4. **Query Optimization** - Implement efficient queries with indexes

## Security Notes

- The anon key is used for public read/write operations
- Row Level Security (RLS) should be configured in Supabase dashboard
- Consider using service role key for admin operations (not checked into git)
- Never commit the `.env` file to version control

## Troubleshooting

If you encounter connection issues:

1. Verify your `.env` file has the correct credentials
2. Check that your Supabase project is active
3. Ensure you're not hitting API rate limits
4. Check network connectivity to Supabase

Run the test script to diagnose issues:
```bash
npm run test:db
```
