/**
 * Network Status Banner Component
 *
 * Shows network connection status and warnings
 */

import React from "react";
import { useAccount } from "wagmi";

interface NetworkStatusProps {
  isHealthy?: boolean;
  network?: string;
  totalSchemas?: number;
  lastSyncTimestamp?: number;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isHealthy = true,
  network = "testnet",
  totalSchemas = 0,
  lastSyncTimestamp,
}) => {
  const { chain, isConnected } = useAccount();

  // Check if wrong network
  const isWrongNetwork = isConnected && chain && chain.id !== 5031;

  // Show wrong network warning (highest priority)
  if (isWrongNetwork) {
    return (
      <div className="bg-red-950 border-b border-red-900 px-6 py-3 flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-red-400 rounded-full shrink-0 animate-pulse"></div>
        <span>
          ⚠️ Wrong Network: Please switch to Somnia Testnet (Chain ID: 5031) in
          your wallet
        </span>
      </div>
    );
  }

  // Show indexer status
  return (
    <div
      className={`${
        isHealthy
          ? "bg-green-950 border-green-900"
          : "bg-red-950 border-red-900"
      } border-b px-6 py-3 flex items-center gap-2 text-sm`}
    >
      <div
        className={`w-2 h-2 ${
          isHealthy ? "bg-green-400" : "bg-red-400"
        } rounded-full shrink-0`}
      ></div>
      <span>
        {isHealthy
          ? `Connected to Somnia ${network} - ${totalSchemas} schemas indexed${
              lastSyncTimestamp
                ? ` (Last sync: ${new Date(
                    lastSyncTimestamp * 1000
                  ).toLocaleTimeString()})`
                : ""
            }`
          : "Indexer offline - data may be stale"}
      </span>
    </div>
  );
};

export default NetworkStatus;
