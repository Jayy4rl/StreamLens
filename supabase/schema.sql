-- StreamLens Database Schema for Supabase
-- This schema stores indexed Data Stream schemas from the Somnia blockchain

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: indexed_schemas
-- Stores all indexed Data Stream schemas with their metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS indexed_schemas (
    -- Primary identifier (blockchain schema ID as hex string)
    schema_id TEXT PRIMARY KEY,
    
    -- Schema metadata
    schema_name TEXT DEFAULT '',
    schema_definition TEXT DEFAULT '',
    
    -- Blockchain data
    publisher_address TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    
    -- Optional fields
    parent_schema_id TEXT,
    is_public BOOLEAN DEFAULT true,
    
    -- Metadata (JSONB for flexible storage)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT fk_parent_schema FOREIGN KEY (parent_schema_id) 
        REFERENCES indexed_schemas(schema_id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schemas_block_number ON indexed_schemas(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_schemas_publisher ON indexed_schemas(publisher_address);
CREATE INDEX IF NOT EXISTS idx_schemas_timestamp ON indexed_schemas(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_schemas_name ON indexed_schemas(schema_name);
CREATE INDEX IF NOT EXISTS idx_schemas_tx_hash ON indexed_schemas(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_schemas_indexed_at ON indexed_schemas(indexed_at DESC);

-- GIN index for JSONB metadata searches
CREATE INDEX IF NOT EXISTS idx_schemas_metadata ON indexed_schemas USING GIN (metadata);

-- Full-text search index for schema names
CREATE INDEX IF NOT EXISTS idx_schemas_name_fts ON indexed_schemas USING GIN (to_tsvector('english', schema_name));


-- ============================================================================
-- TABLE: indexer_state
-- Stores the current state of the indexer for resume capability
-- ============================================================================
CREATE TABLE IF NOT EXISTS indexer_state (
    -- Single row table (only one active state)
    id INTEGER PRIMARY KEY DEFAULT 1,
    
    -- Network identifier
    network TEXT NOT NULL DEFAULT 'mainnet',
    
    -- Scanning progress
    last_scanned_block BIGINT NOT NULL DEFAULT 0,
    last_sync_timestamp BIGINT NOT NULL DEFAULT 0,
    
    -- Statistics
    total_schemas_indexed INTEGER NOT NULL DEFAULT 0,
    
    -- Health status
    is_healthy BOOLEAN DEFAULT true,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one row exists
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial state if not exists
INSERT INTO indexer_state (id, network, last_scanned_block, last_sync_timestamp, total_schemas_indexed, is_healthy)
VALUES (1, 'mainnet', 0, 0, 0, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- TABLE: schema_publishers
-- Aggregated view of publishers and their schema counts
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_publishers (
    publisher_address TEXT PRIMARY KEY,
    total_schemas INTEGER DEFAULT 0,
    first_schema_at TIMESTAMP WITH TIME ZONE,
    last_schema_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sorting by schema count
CREATE INDEX IF NOT EXISTS idx_publishers_count ON schema_publishers(total_schemas DESC);


-- ============================================================================
-- FUNCTION: update_updated_at_column
-- Automatically update the updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for indexed_schemas
DROP TRIGGER IF EXISTS update_indexed_schemas_updated_at ON indexed_schemas;
CREATE TRIGGER update_indexed_schemas_updated_at
    BEFORE UPDATE ON indexed_schemas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for indexer_state
DROP TRIGGER IF EXISTS update_indexer_state_updated_at ON indexer_state;
CREATE TRIGGER update_indexer_state_updated_at
    BEFORE UPDATE ON indexer_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for schema_publishers
DROP TRIGGER IF EXISTS update_schema_publishers_updated_at ON schema_publishers;
CREATE TRIGGER update_schema_publishers_updated_at
    BEFORE UPDATE ON schema_publishers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- FUNCTION: update_publisher_stats
-- Update publisher statistics when schemas are added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_publisher_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update publisher stats
    INSERT INTO schema_publishers (
        publisher_address,
        total_schemas,
        first_schema_at,
        last_schema_at
    )
    VALUES (
        NEW.publisher_address,
        1,
        NEW.indexed_at,
        NEW.indexed_at
    )
    ON CONFLICT (publisher_address) DO UPDATE SET
        total_schemas = schema_publishers.total_schemas + 1,
        last_schema_at = NEW.indexed_at;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update publisher stats
DROP TRIGGER IF EXISTS update_publisher_stats_trigger ON indexed_schemas;
CREATE TRIGGER update_publisher_stats_trigger
    AFTER INSERT ON indexed_schemas
    FOR EACH ROW
    EXECUTE FUNCTION update_publisher_stats();


-- ============================================================================
-- VIEW: schema_stats
-- Provides quick access to indexer statistics
-- ============================================================================
CREATE OR REPLACE VIEW schema_stats AS
SELECT
    COUNT(*) as total_schemas,
    COUNT(DISTINCT publisher_address) as unique_publishers,
    COUNT(*) FILTER (WHERE is_public = true) as public_schemas,
    COUNT(*) FILTER (WHERE is_public = false) as private_schemas,
    MAX(block_number) as latest_block,
    MAX(timestamp) as latest_timestamp,
    MIN(indexed_at) as first_indexed_at,
    MAX(indexed_at) as last_indexed_at
FROM indexed_schemas;


-- ============================================================================
-- RLS (Row Level Security) Policies
-- Enable RLS for security (adjust based on your needs)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE indexed_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_publishers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to schemas
CREATE POLICY "Public schemas are viewable by everyone"
    ON indexed_schemas FOR SELECT
    USING (is_public = true);

-- Policy: Allow authenticated users to view all schemas
CREATE POLICY "Authenticated users can view all schemas"
    ON indexed_schemas FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to schemas"
    ON indexed_schemas
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow read access to indexer state
CREATE POLICY "Anyone can view indexer state"
    ON indexer_state FOR SELECT
    USING (true);

-- Policy: Service role can update indexer state
CREATE POLICY "Service role can update indexer state"
    ON indexer_state
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow read access to publisher stats
CREATE POLICY "Anyone can view publisher stats"
    ON schema_publishers FOR SELECT
    USING (true);

-- Policy: Service role can update publisher stats
CREATE POLICY "Service role can update publisher stats"
    ON schema_publishers
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================================
-- COMMENTS
-- Document the schema
-- ============================================================================

COMMENT ON TABLE indexed_schemas IS 'Stores all indexed Data Stream schemas from Somnia blockchain';
COMMENT ON TABLE indexer_state IS 'Tracks the current state of the indexer for resume capability';
COMMENT ON TABLE schema_publishers IS 'Aggregated statistics for schema publishers';

COMMENT ON COLUMN indexed_schemas.schema_id IS 'Blockchain schema ID as hex string (primary key)';
COMMENT ON COLUMN indexed_schemas.publisher_address IS 'Ethereum address that registered the schema';
COMMENT ON COLUMN indexed_schemas.block_number IS 'Block number where schema was registered';
COMMENT ON COLUMN indexed_schemas.metadata IS 'Flexible JSONB field for additional schema metadata';

COMMENT ON COLUMN indexer_state.last_scanned_block IS 'Last block number that was successfully scanned';
COMMENT ON COLUMN indexer_state.total_schemas_indexed IS 'Total count of schemas indexed so far';
