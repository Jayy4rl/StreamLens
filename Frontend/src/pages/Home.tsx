/**
 * Home Page Component
 * 
 * Main landing page displaying trending and recent data streams
 */

import React, { useState, useEffect, useCallback } from "react";
import { getDataStreams, getPlatformStats } from "../services/api";
import type { DataStream, PlatformStats } from "../types/schema";
import StreamDetailsModal from "../components/StreamDetailsModal";
import StreamCard from "../components/StreamCard";

const Home: React.FC = () => {
  const [dataStreams, setDataStreams] = useState<DataStream[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<DataStream[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [sortBy, setSortBy] = useState<"popular" | "recent">("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedStream, setSelectedStream] = useState<DataStream | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch data on mount and when sort changes
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [streamsData, statsData] = await Promise.all([
        getDataStreams({ sort: sortBy, limit: 50 }),
        getPlatformStats(),
      ]);

      setDataStreams(streamsData);
      setFilteredStreams(streamsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to connect to StreamLens backend. Please ensure the API server is running.");
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enhanced search functionality
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredStreams(dataStreams);
      setIsSearching(false);
      setViewMode("table");
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = dataStreams.filter((stream) => {
      // Search in basic fields
      const matchesBasic =
        stream.schemaName.toLowerCase().includes(searchLower) ||
        stream.publisherAddress.toLowerCase().includes(searchLower) ||
        stream.schemaId.toLowerCase().includes(searchLower) ||
        stream.transactionHash.toLowerCase().includes(searchLower);

      // Search in metadata
      const matchesTags =
        stream.metadata?.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) || false;
      const matchesDescription =
        stream.metadata?.description?.toLowerCase().includes(searchLower) || false;

      return matchesBasic || matchesTags || matchesDescription;
    });

    setFilteredStreams(filtered);
    setIsSearching(true);
    setViewMode("cards");
  }, [searchTerm, dataStreams]);

  // Auto-search on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  // Sort filtered streams
  const sortedStreams = [...filteredStreams].sort((a, b) => {
    if (sortBy === "recent") {
      return b.timestamp - a.timestamp;
    } else {
      // Sort by popularity (usage count)
      const usageA = a.metadata?.usageCount || 0;
      const usageB = b.metadata?.usageCount || 0;
      return usageB - usageA;
    }
  });

  // Handle stream click
  const handleStreamClick = (stream: DataStream) => {
    setSelectedStream(stream);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedStream(null), 300);
  };

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
    // Generate a simple icon based on schema name
    const icons = ["📊", "🔄", "📈", "💾", "🌐", "⚡", "🔗", "📡", "🎯", "🔍"];
    const index = schemaName.length % icons.length;
    return icons[index];
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="text-2xl font-bold text-orange-400">
              STREAMLENS
            </a>
            <nav className="hidden lg:flex gap-6 text-sm">
              <a href="/" className="text-orange-400">
                HOME
              </a>
              <a href="/activity" className="hover:text-orange-400 transition">
                ACTIVITY
              </a>
              <a href="#" className="hover:text-orange-400 transition">
                CREATE
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-gray-900 rounded items-center overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2">
                <svg
                  className="w-4 h-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search schemas and publishers"
                  className="bg-transparent text-xs outline-none w-48 placeholder-gray-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <kbd className="text-xs text-gray-600">⌘ K</kbd>
              </div>
              <button
                onClick={handleSearch}
                className="bg-orange-400 text-black px-4 py-2 font-bold text-xs hover:bg-orange-500 transition h-full"
                aria-label="Search"
              >
                SEARCH
              </button>
            </div>
            <button className="bg-orange-400 text-black px-4 py-2 rounded font-bold text-sm hover:bg-orange-500 transition">
              CONNECT WALLET
            </button>
          </div>
        </div>
      </header>

      {/* Network Status Banner */}
      {stats && (
        <div
          className={`${
            stats.isHealthy ? "bg-green-950 border-green-900" : "bg-red-950 border-red-900"
          } border-b px-6 py-3 flex items-center gap-2 text-sm`}
        >
          <div
            className={`w-2 h-2 ${
              stats.isHealthy ? "bg-green-400" : "bg-red-400"
            } rounded-full shrink-0`}
          ></div>
          <span>
            {stats.isHealthy
              ? `Connected to Somnia ${stats.network} - ${stats.totalSchemas} schemas indexed`
              : "Indexer offline - data may be stale"}
          </span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950 border-b border-red-900 px-6 py-3 flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-red-400 rounded-full shrink-0"></div>
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto text-orange-400 hover:text-orange-300 font-bold"
          >
            RETRY
          </button>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 border-r border-gray-800 p-6 hidden lg:block bg-gray-950">
          {/* Sort Filter */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
              <span className="text-sm font-bold uppercase">Sort By</span>
            </div>
            <div className="space-y-3">
              {[
                { value: "popular", label: "MOST POPULAR" },
                { value: "recent", label: "MOST RECENT" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    value={option.value}
                    checked={sortBy === option.value}
                    onChange={(e) => setSortBy(e.target.value as "popular" | "recent")}
                    className="w-4 h-4 accent-orange-400"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Platform Stats */}
          {stats && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-sm font-bold uppercase">Stats</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span className="text-gray-400">Total Schemas</span>
                  <span className="font-bold">{stats.totalSchemas.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span className="text-gray-400">Publishers</span>
                  <span className="font-bold">{stats.uniquePublishers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span className="text-gray-400">Network</span>
                  <span className="font-bold uppercase">{stats.network}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-black">
          {/* Search Results Header */}
          {isSearching && (
            <div className="mb-6 bg-gray-950 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-bold">
                      Search Results for "{searchTerm}"
                    </div>
                    <div className="text-xs text-gray-500">
                      Found {sortedStreams.length} stream{sortedStreams.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setIsSearching(false);
                    setViewMode("table");
                  }}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  CLEAR SEARCH
                </button>
              </div>
            </div>
          )}

          {/* Trending Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                {isSearching
                  ? "Search Results"
                  : sortBy === "popular"
                  ? "Most Popular Data Streams"
                  : "Recent Data Streams"}
              </h2>
              
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-900 rounded p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    viewMode === "table"
                      ? "bg-orange-400 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                  aria-label="Table view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    viewMode === "cards"
                      ? "bg-orange-400 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                  aria-label="Card view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
              </div>
            ) : sortedStreams.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg mb-2">No data streams found</p>
                <p className="text-sm">
                  {searchTerm ? "Try adjusting your search" : "Start by running the indexer"}
                </p>
              </div>
            ) : viewMode === "cards" ? (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedStreams.map((stream) => (
                  <StreamCard
                    key={stream.schemaId}
                    stream={stream}
                    onClick={() => handleStreamClick(stream)}
                  />
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500">
                      <th className="text-left py-3 px-4 font-bold">SCHEMA NAME</th>
                      <th className="text-right py-3 px-4 font-bold">USAGE COUNT</th>
                      <th className="text-left py-3 px-4 font-bold">PUBLISHER</th>
                      <th className="text-right py-3 px-4 font-bold">BLOCK</th>
                      <th className="text-right py-3 px-4 font-bold">CREATED</th>
                      <th className="text-center py-3 px-4 font-bold">PUBLIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStreams.map((stream) => (
                      <tr
                        key={stream.schemaId}
                        onClick={() => handleStreamClick(stream)}
                        className="border-b border-gray-900 hover:bg-gray-900 transition cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getIconForSchema(stream.schemaName)}</span>
                            <div>
                              <div className="font-semibold">
                                {stream.schemaName || "Unnamed Schema"}
                              </div>
                              <div className="text-gray-500 font-mono text-xs">
                                {formatAddress(stream.schemaId)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-orange-400">
                          {stream.metadata?.usageCount?.toLocaleString() || 0}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {formatAddress(stream.publisherAddress)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {stream.blockNumber.toString()}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-500">
                          {formatTimestamp(stream.timestamp)}
                        </td>
                        <td className="text-center py-3 px-4">
                          {stream.isPublic ? (
                            <span className="text-green-400">✓</span>
                          ) : (
                            <span className="text-gray-600">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-xs text-gray-600 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>LIVE DATA ACTIVE</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-gray-400">
            Twitter
          </a>
          <a href="#" className="hover:text-gray-400">
            Discord
          </a>
          <span>StreamLens © 2025</span>
        </div>
      </footer>

      {/* Stream Details Modal */}
      {selectedStream && (
        <StreamDetailsModal
          stream={selectedStream}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default Home;
