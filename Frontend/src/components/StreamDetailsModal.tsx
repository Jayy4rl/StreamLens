/**
 * StreamDetailsModal Component
 * 
 * Modal dialog displaying comprehensive details of a data stream
 */

import React, { useState } from "react";
import type { DataStream } from "../types/schema";

interface StreamDetailsModalProps {
  stream: DataStream;
  isOpen: boolean;
  onClose: () => void;
}

interface CopyButtonProps {
  text: string;
  fieldName: string;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, fieldName, copiedField, onCopy }) => (
  <button
    onClick={() => onCopy(text, fieldName)}
    className="ml-2 p-1 hover:bg-gray-700 rounded transition text-gray-400 hover:text-orange-400"
    title="Copy to clipboard"
    aria-label={`Copy ${fieldName}`}
  >
    {copiedField === fieldName ? (
      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    )}
  </button>
);

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  copyable?: boolean;
  copyText?: string;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, copyable, copyText, copiedField, onCopy }) => (
  <div className="py-3 px-4 border-b border-gray-800 hover:bg-gray-900 transition">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="text-xs text-gray-500 font-bold uppercase mb-1">{label}</div>
        <div className="text-sm break-all">{value}</div>
      </div>
      {copyable && copyText && (
        <CopyButton text={copyText} fieldName={label} copiedField={copiedField} onCopy={onCopy} />
      )}
    </div>
  </div>
);

const StreamDetailsModal: React.FC<StreamDetailsModalProps> = ({
  stream,
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-gray-950 border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-800 p-6 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-orange-400 mb-1">
                {stream.schemaName || "Unnamed Schema"}
              </h2>
              <p className="text-xs text-gray-500 font-mono">Stream Details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded transition"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {/* Basic Information */}
            <div className="border-b border-gray-800">
              <div className="p-4 bg-gray-900">
                <h3 className="text-sm font-bold uppercase text-gray-400">Basic Information</h3>
              </div>
              <DetailRow
                label="Schema ID"
                value={<span className="font-mono text-orange-400">{stream.schemaId}</span>}
                copyable
                copyText={stream.schemaId}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              <DetailRow
                label="Schema Name"
                value={stream.schemaName || "N/A"}
                copyable
                copyText={stream.schemaName}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              <DetailRow
                label="Publisher Address"
                value={<span className="font-mono">{stream.publisherAddress}</span>}
                copyable
                copyText={stream.publisherAddress}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              <DetailRow
                label="Transaction Hash"
                value={<span className="font-mono">{stream.transactionHash}</span>}
                copyable
                copyText={stream.transactionHash}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            </div>

            {/* Blockchain Information */}
            <div className="border-b border-gray-800">
              <div className="p-4 bg-gray-900">
                <h3 className="text-sm font-bold uppercase text-gray-400">Blockchain Information</h3>
              </div>
              <DetailRow
                label="Block Number"
                value={stream.blockNumber.toString()}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              <DetailRow
                label="Timestamp"
                value={
                  <div>
                    <div>{formatTimestamp(stream.timestamp)}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(stream.timestamp)}</div>
                  </div>
                }
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              <DetailRow
                label="Public Schema"
                value={
                  stream.isPublic ? (
                    <span className="inline-flex items-center gap-2 text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      No
                    </span>
                  )
                }
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
              {stream.parentSchemaId && (
                <DetailRow
                  label="Parent Schema ID"
                  value={<span className="font-mono">{stream.parentSchemaId}</span>}
                  copyable
                  copyText={stream.parentSchemaId}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
            </div>

            {/* Metadata */}
            {stream.metadata && (
              <div className="border-b border-gray-800">
                <div className="p-4 bg-gray-900">
                  <h3 className="text-sm font-bold uppercase text-gray-400">Metadata</h3>
                </div>
                {stream.metadata.usageCount !== undefined && (
                  <DetailRow
                    label="Usage Count"
                    value={stream.metadata.usageCount.toLocaleString()}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}
                {stream.metadata.lastUsedBlock && (
                  <DetailRow
                    label="Last Used Block"
                    value={stream.metadata.lastUsedBlock}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}
                {stream.metadata.description && (
                  <DetailRow
                    label="Description"
                    value={stream.metadata.description}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}
                {stream.metadata.tags && stream.metadata.tags.length > 0 && (
                  <DetailRow
                    label="Tags"
                    value={
                      <div className="flex flex-wrap gap-2">
                        {stream.metadata.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-800 rounded text-xs text-orange-400 border border-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    }
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}
                {stream.metadata.versions && stream.metadata.versions.length > 0 && (
                  <div className="py-3 px-4 border-b border-gray-800">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-2">Version History</div>
                    <div className="space-y-2">
                      {stream.metadata.versions.map((version, idx) => (
                        <div key={idx} className="p-2 bg-gray-800 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-orange-400">{version.version}</span>
                            <span className="text-gray-500">
                              {new Date(version.createdAt * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          {version.changes && <div className="text-gray-400">{version.changes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schema Definition */}
            <div className="border-b border-gray-800">
              <div className="p-4 bg-gray-900 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase text-gray-400">Schema Definition</h3>
                <CopyButton
                  text={stream.schemaDefinition}
                  fieldName="Schema Definition"
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              </div>
              <div className="p-4 bg-black">
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-green-400">
                  {stream.schemaDefinition}
                </pre>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-800 p-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition text-sm font-bold"
            >
              CLOSE
            </button>
            <a
              href={`https://explorer.somnia.network/tx/${stream.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-orange-400 text-black hover:bg-orange-500 rounded transition text-sm font-bold inline-flex items-center gap-2"
            >
              VIEW ON EXPLORER
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default StreamDetailsModal;
