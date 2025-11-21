# 🔍 StreamLens - Somnia Data Streams Schema Indexer

> A block explorer meets npm for Data Streams schemas: indexing, discovering, and exploring every registered schema on Somnia

## 🎯 Overview

**StreamLens** is a comprehensive schema registry indexer for the Somnia Data Streams ecosystem. It solves the critical problem of schema discoverability by:

- 📜 **Indexing** all historical `DataSchemaRegistered` events from the Somnia blockchain
- 🔍 **Enriching** schemas with metadata from the SDK
- 🔄 **Real-time monitoring** for newly registered schemas (coming soon)
- 📊 **Providing** searchable, queryable access to all public schemas

### The Problem

Right now, discovering reusable data streams is nearly impossible:
- Developers hardcode `schemaId` values
- No central registry to browse available schemas
- Schema metadata is scattered across GitHub repos
- No way to discover what schemas others have published

### The Solution

StreamLens creates a **searchable, discoverable public goods hub** for Somnia Data Streams - like The Graph's subgraph marketplace, but native and instant.

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ and npm
- Access to Somnia RPC endpoint (mainnet or testnet)

### Installation

```bash
# Clone or navigate to the repository
cd StreamLens

# Install dependencies
npm install

# Configure environment
cp .env.example .env  # (or edit existing .env)
```

### Configuration

Edit `.env` file:

```env
# Network selection
NETWORK=mainnet

# RPC Endpoints (defaults provided)
MAINNET_RPC_URL=https://mainnet-rpc.somnia.network
TESTNET_RPC_URL=https://testnet-rpc.somnia.network

# Indexer settings
START_BLOCK=0        # Start from genesis (0) or specific block
BATCH_SIZE=10000     # Blocks per batch (adjust based on RPC limits)
```

### Run the Indexer

```bash
# Run with ts-node (development)
npm run dev

# Or build and run
npm run build
npm start
```

## 📁 Project Structure

```
StreamLens/
├── src/
│   ├── indexer/
│   │   ├── HistoricalScanner.ts    # Scans past DataSchemaRegistered events
│   │   ├── SchemaEnricher.ts       # Fetches metadata from SDK
│   │   ├── SchemaRepository.ts     # Data storage and retrieval
│   │   └── RealtimeMonitor.ts      # [TODO] WebSocket monitoring
│   ├── types/
│   │   └── schema.ts               # TypeScript type definitions
│   ├── config/
│   │   └── chains.ts               # Chain configurations
│   ├── utils/
│   │   ├── logger.ts               # Logging utility
│   │   └── retry.ts                # Retry logic and rate limiting
│   └── index.ts                    # Main entry point
├── data/
│   ├── schemas.json                # Indexed schema data
│   └── state.json                  # Indexer state (last block, etc.)
├── .env                            # Configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 🔄 How It Works

### Phase 1: Historical Scanning

The **HistoricalScanner** queries the Somnia blockchain for all past `DataSchemaRegistered` events:

1. Starts from genesis (block 0) or configured `START_BLOCK`
2. Scans in batches (configurable via `BATCH_SIZE`)
3. Extracts: `schemaId`, `blockNumber`, `transactionHash`, `publisher`
4. Saves progress incrementally to resume on interruption

### Phase 2: Schema Enrichment

The **SchemaEnricher** fetches additional metadata using the Somnia SDK:

- `schemaName` - Human-readable name
- `schemaDefinition` - Full schema structure (CSV format)
- `parentSchemaId` - Parent schema if this extends another
- `usageCount` - Number of times the schema has been used

### Phase 3: Verification

Cross-references indexed schemas with SDK's `getAllSchemas()` to ensure completeness.

### Data Storage

Currently uses **JSON file storage** (`data/schemas.json`) for simplicity:
- Easy to inspect and debug
- Version control friendly
- Can be migrated to SQLite/PostgreSQL later for scale

## 📊 Data Model

```typescript
interface IndexedSchema {
  schemaId: Hex;              // bytes32 schema identifier
  schemaName: string;         // Human-readable name
  schemaDefinition: string;   // CSV format schema
  publisherAddress: Address;  // Publisher's address
  blockNumber: bigint;        // Registration block
  timestamp: number;          // Block timestamp
  transactionHash: Hex;       // Registration tx
  parentSchemaId?: Hex;       // Parent schema (if extends)
  isPublic: boolean;          // Whether schema is public
  metadata?: {
    usageCount?: number;      // Times used
    lastUsedBlock?: bigint;   // Last usage
    tags?: string[];          // Categorization
  };
}
```

## 🛠️ Development

### Build

```bash
npm run build
```

### Run

```bash
# Development mode with ts-node
npm run dev

# Production mode
npm start

# Just index
npm run index
```

### Project Commands

```bash
npm run build    # Compile TypeScript to JavaScript
npm run dev      # Run with ts-node (development)
npm start        # Run compiled JavaScript
npm run index    # Alias for npm run dev
```

## 🗺️ Roadmap

### ✅ Phase 1: Core Indexing (Current)
- [x] Historical event scanning
- [x] Schema enrichment via SDK
- [x] JSON-based storage
- [x] Progress tracking and resumability
- [x] Rate limiting and retry logic

### 🔄 Phase 2: Real-time Monitoring (Next)
- [ ] WebSocket subscription to new events
- [ ] Incremental updates
- [ ] Usage statistics tracking

### 🌐 Phase 3: Web Dashboard
- [ ] Frontend UI for browsing schemas
- [ ] Search and filtering
- [ ] Schema details pages
- [ ] Publisher profiles

### 🔧 Phase 4: Code Generation
- [ ] One-click TypeScript hook generation
- [ ] Fully-typed viem integration
- [ ] Subscription code templates
- [ ] CLI tool for code generation

### 📦 Phase 5: CLI & SDK
- [ ] Command-line tool for schema discovery
- [ ] Programmatic API for integration
- [ ] npm package for developers

## 🏗️ Architecture Decisions

### Why JSON Storage First?
- **Simplicity**: Easy to debug and inspect
- **No Dependencies**: No database setup required
- **Portability**: Easy to share and version control
- **Migration Path**: Can easily migrate to PostgreSQL/MongoDB later

### Why Batch Scanning?
- **RPC Efficiency**: Reduces total RPC calls
- **Rate Limiting**: Respects endpoint limits
- **Resumability**: Can stop/start without re-scanning
- **Progress Tracking**: Clear visibility into indexing progress

### Why SDK Integration?
- **Metadata**: SDK provides schema names and definitions
- **Verification**: Cross-reference with on-chain data
- **Consistency**: Use official Somnia tooling

## 📝 Contract Details

### Somnia Data Streams Contract

**Mainnet (Chain ID: 50312)**
- Address: `0xC1d833a80469854a7450Dd187224b2ceE5ecE264`
- RPC: `https://mainnet-rpc.somnia.network`

**Testnet (Chain ID: 5031)**
- Address: `0x0000000000000000000000000000000000000000`
- RPC: `https://testnet-rpc.somnia.network`

### Key Events

```solidity
event DataSchemaRegistered(bytes32 indexed schemaId);
event EventSchemaRegistered(bytes32 indexed eventTopic, string id);
```

## 🤝 Contributing

This project is in active development. Contributions welcome!

### Areas for Contribution
- Real-time monitoring implementation
- Frontend dashboard
- Code generation tools
- Database migration
- Documentation improvements

## 📄 License

ISC

## 🔗 Resources

- [Somnia Docs](https://docs.somnia.network/)
- [Somnia Data Streams SDK](https://www.npmjs.com/package/@somnia-chain/streams)
- [Somnia Data Streams Docs](https://docs.somnia.network/somnia-data-streams)

---

**Built with ❤️ for the Somnia ecosystem**
#StreamLens
