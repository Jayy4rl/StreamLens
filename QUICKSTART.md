# 🚀 Quick Start Guide

## Before You Begin

Ensure you have:
- ✅ Node.js v18 or higher installed
- ✅ npm or pnpm package manager
- ✅ Access to Somnia RPC endpoints (public endpoints provided)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@somnia-chain/streams` - Official Somnia SDK
- `viem` - Ethereum library
- `dotenv` - Environment configuration
- TypeScript tooling

### 2. Configure Environment

The `.env` file is already configured with defaults:

```env
NETWORK=mainnet                              # Choose: mainnet or testnet
MAINNET_RPC_URL=https://mainnet-rpc.somnia.network
TESTNET_RPC_URL=https://testnet-rpc.somnia.network
START_BLOCK=0                                # 0 = scan from genesis
BATCH_SIZE=10000                             # Blocks per batch
```

**Recommended for first run**: Start with testnet to test faster
```env
NETWORK=testnet
START_BLOCK=0
BATCH_SIZE=5000
```

### 3. Run the Indexer

```bash
# Option 1: Development mode (with ts-node)
npm run dev

# Option 2: Build then run
npm run build
npm start
```

### 4. Watch the Progress

You'll see output like:

```
🚀 Starting StreamLens Schema Indexer...
Network: MAINNET

📊 Current Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Schemas: 0
Unique Publishers: 0
Public Schemas: 0
Last Scanned Block: 0
Last Sync: 1970-01-01T00:00:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 Phase 1: Historical Scan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scanning blocks 0 to 9999...
Found 5 schema registration events in this batch
...
```

### 5. Check Results

**Indexed Schemas**: `data/schemas.json`
```bash
cat data/schemas.json | head -50
```

**Indexer State**: `data/state.json`
```bash
cat data/state.json
```

## 🎯 What Happens During Indexing

### Phase 1: Historical Scan (5-30 minutes depending on chain)
- Scans all blocks from genesis (or START_BLOCK)
- Finds `DataSchemaRegistered` events
- Extracts: schemaId, publisher, block, transaction
- Saves progress after each batch

### Phase 2: Schema Enrichment (2-10 minutes)
- Fetches schema names from SDK
- Retrieves full schema definitions
- Identifies parent schemas
- Counts usage statistics

### Phase 3: Verification (1-2 minutes)
- Cross-checks with SDK's `getAllSchemas()`
- Identifies any missing schemas
- Confirms completeness

## 🔄 Resuming After Interruption

The indexer is **fully resumable**:

1. Stop anytime with `Ctrl+C`
2. Restart with `npm run dev`
3. It will continue from the last scanned block

No need to re-scan already processed blocks!

## 📊 Example Output

After completion, you'll see:

```
✨ Indexing complete!

📊 Current Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Schemas: 42
Unique Publishers: 15
Public Schemas: 42
Last Scanned Block: 500000
Last Sync: 2024-11-19T10:30:45.123Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Sample Schemas (showing 10)

1. GPS Location Schema
   Schema ID: 0x1234...
   Publisher: 0xabcd...
   Definition: uint64 timestamp, int32 latitude, int32 longitude
   Block: 12345
   Usage Count: 42
...
```

## 🐛 Troubleshooting

### Error: "Cannot connect to RPC"
**Fix**: Check your network configuration in `.env`
```env
NETWORK=testnet  # Try testnet first
```

### Error: "Rate limited"
**Fix**: Reduce batch size
```env
BATCH_SIZE=5000  # Lower batch size
```

### No schemas found
**Possible reasons**:
- Testnet may have very few schemas
- Start block might be too high
- Try mainnet: `NETWORK=mainnet`

### Build errors
**Fix**: Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📈 Performance Tips

### For Faster Indexing
1. Use a premium RPC endpoint (if available)
2. Increase `BATCH_SIZE` to 20000
3. Run during off-peak hours

### For Stability
1. Keep `BATCH_SIZE` at 10000 or lower
2. Let it run uninterrupted
3. Monitor `data/state.json` for progress

## 🎯 Next Actions

After successful indexing:

1. **Explore the Data**:
   ```bash
   cat data/schemas.json | jq '.[] | {name: .schemaName, id: .schemaId}'
   ```

2. **Check Statistics**:
   - Total schemas indexed
   - Unique publishers
   - Most used schemas

3. **Plan Next Phase**:
   - Web dashboard for browsing
   - Real-time monitoring
   - Code generation tools

## 📚 Understanding the Output

### Schema Fields Explained

```json
{
  "schemaId": "0x1234...",           // Unique identifier (bytes32)
  "schemaName": "GPS Location",      // Human-readable name
  "schemaDefinition": "uint64...",   // Solidity-style schema
  "publisherAddress": "0xabcd...",   // Who registered it
  "blockNumber": "12345",            // When registered (block)
  "timestamp": 1700000000,           // When registered (unix time)
  "transactionHash": "0x5678...",    // Registration transaction
  "parentSchemaId": "0x9abc...",     // Parent if extends another
  "isPublic": true,                  // Whether publicly registered
  "metadata": {
    "usageCount": 42                 // Times this schema was used
  }
}
```

## 🔍 Querying the Data

### Find schemas by publisher
```bash
cat data/schemas.json | jq '.[] | select(.publisherAddress == "0xYOUR_ADDRESS")'
```

### Count total schemas
```bash
cat data/schemas.json | jq '. | length'
```

### Find most used schemas
```bash
cat data/schemas.json | jq 'sort_by(.metadata.usageCount) | reverse | .[0:5]'
```

## 💡 Tips

- **First Run**: Test on testnet (faster, fewer schemas)
- **Production**: Use mainnet for complete data
- **Monitoring**: Watch `data/state.json` for progress
- **Interrupting**: Safe to Ctrl+C anytime, state is saved
- **Re-running**: Will skip already scanned blocks

## 🎉 Success Indicators

You'll know it's working when you see:
- ✅ "Scanning blocks..." messages appearing
- ✅ "Found X schema registration events" messages
- ✅ `data/schemas.json` file growing
- ✅ `lastScannedBlock` incrementing in `data/state.json`
- ✅ No repeated error messages

## 📞 Need Help?

1. Check `IMPLEMENTATION.md` for detailed documentation
2. Review `README.md` for architecture overview
3. Examine log output for specific errors
4. Verify RPC connectivity: `curl https://mainnet-rpc.somnia.network`

---

**Ready to start?** Run `npm run dev` and watch the magic happen! ✨
