/**
 * StreamCard Component
 * 
 * Card view displaying essential information about a data stream
 */

import React from "react";
import type { DataStream } from "../types/schema";

interface StreamCardProps {
  stream: DataStream;
  onClick: () => void;
}

const StreamCard: React.FC<StreamCardProps> = ({ stream, onClick }) => {
  const formatAddress = (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const getIconForSchema = (schemaName: string): string => {
    const icons = ["📊", "🔄", "📈", "💾", "🌐", "⚡", "🔗", "📡", "🎯", "🔍"];
    const index = schemaName.length % icons.length;
    return icons[index];
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-950 border border-gray-800 rounded-lg p-5 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-400/20 transition-all cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for ${stream.schemaName || "Unnamed Schema"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl shrink-0">{getIconForSchema(stream.schemaName)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition truncate">
              {stream.schemaName || "Unnamed Schema"}
            </h3>
            <p className="text-xs text-gray-500 font-mono truncate" title={stream.schemaId}>
              {formatAddress(stream.schemaId)}
            </p>
          </div>
        </div>
        {stream.isPublic && (
          <div
            className="shrink-0 bg-green-950 border border-green-900 text-green-400 text-xs px-2 py-1 rounded"
            title="Public schema"
          >
            PUBLIC
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500 mb-1">Usage Count</div>
          <div className="text-orange-400 font-bold text-lg">
            {stream.metadata?.usageCount?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500 mb-1">Block</div>
          <div className="text-white font-bold text-lg">{stream.blockNumber.toString()}</div>
        </div>
      </div>

      {/* Tags */}
      {stream.metadata?.tags && stream.metadata.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {stream.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400"
              >
                {tag}
              </span>
            ))}
            {stream.metadata.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-500">
                +{stream.metadata.tags.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {stream.metadata?.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 line-clamp-2">{stream.metadata.description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="font-mono">{formatAddress(stream.publisherAddress)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{formatTimestamp(stream.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default StreamCard;
