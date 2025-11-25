#!/bin/bash

# StreamLens Hybrid Mode Verification Script
# This script helps verify that both real-time monitoring and periodic scans are active

echo "🔍 StreamLens Hybrid Mode Verification"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Load environment variables
source .env

echo "📋 Configuration Check:"
echo "-----------------------"
echo "ENABLE_REALTIME: ${ENABLE_REALTIME:-not set}"
echo "HISTORICAL_SCAN_INTERVAL_MS: ${HISTORICAL_SCAN_INTERVAL_MS:-not set (default: 600000)}"
echo ""

if [ "$ENABLE_REALTIME" != "true" ]; then
    echo "⚠️  Warning: ENABLE_REALTIME is not set to 'true'"
    echo "   Hybrid mode requires real-time monitoring to be enabled"
fi

echo ""
echo "🚀 Starting indexer in background..."
npm run dev > streamlens.log 2>&1 &
INDEXER_PID=$!

echo "   Process ID: $INDEXER_PID"
echo "   Log file: streamlens.log"
echo ""

# Wait for startup
echo "⏳ Waiting for startup (30 seconds)..."
sleep 30

echo ""
echo "📊 Checking Status:"
echo "-------------------"

# Check if process is still running
if ! ps -p $INDEXER_PID > /dev/null; then
    echo "❌ Indexer process died during startup"
    echo "   Check streamlens.log for errors"
    exit 1
fi

echo "✅ Process is running"

# Check for real-time monitoring
if grep -q "Real-time monitor started successfully" streamlens.log; then
    echo "✅ Real-time monitoring active"
else
    echo "❌ Real-time monitoring not detected"
fi

# Check for periodic scans
if grep -q "Periodic historical scans enabled" streamlens.log; then
    echo "✅ Periodic scans enabled"
    
    # Extract interval
    INTERVAL=$(grep "Scan Interval:" streamlens.log | head -1 | sed 's/.*Every \([0-9.]*\) minutes.*/\1/')
    if [ -n "$INTERVAL" ]; then
        echo "   ├─ Interval: Every $INTERVAL minutes"
    fi
else
    echo "❌ Periodic scans not detected"
fi

# Check for event watcher
if grep -q "Event watcher configured" streamlens.log; then
    echo "✅ Event watcher configured"
else
    echo "⚠️  Event watcher status unknown"
fi

echo ""
echo "📈 Recent Activity:"
echo "-------------------"
echo "Last 10 log lines:"
tail -n 10 streamlens.log

echo ""
echo "⏰ Periodic Scan Monitor:"
echo "-------------------------"
echo "Waiting for first periodic scan (this may take up to 10 minutes)..."
echo "Press Ctrl+C to stop monitoring"
echo ""

# Monitor for periodic scan activity
START_TIME=$(date +%s)
while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Check if process is still running
    if ! ps -p $INDEXER_PID > /dev/null; then
        echo ""
        echo "❌ Indexer process stopped unexpectedly"
        echo "   Check streamlens.log for errors"
        exit 1
    fi
    
    # Check for periodic scan
    if grep -q "\[Periodic Scan\]" streamlens.log; then
        echo ""
        echo "✅ Periodic scan detected!"
        echo ""
        echo "Periodic scan logs:"
        grep "\[Periodic Scan\]" streamlens.log | tail -n 5
        echo ""
        echo "🎉 Hybrid mode is working correctly!"
        echo ""
        echo "📋 Summary:"
        echo "   ✅ Real-time monitoring: Active"
        echo "   ✅ Periodic scans: Working"
        echo "   ✅ Process: Healthy"
        echo ""
        echo "To stop the indexer:"
        echo "   kill $INDEXER_PID"
        echo ""
        echo "To view logs:"
        echo "   tail -f streamlens.log"
        exit 0
    fi
    
    # Show progress
    printf "\r   Elapsed: %02d:%02d (Process running, waiting for periodic scan...)" $((ELAPSED / 60)) $((ELAPSED % 60))
    
    sleep 5
done
